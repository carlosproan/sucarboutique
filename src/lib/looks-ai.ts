/**
 * Looks com IA (lado do cliente): opções de ocasião/estilo, construção do
 * pedido para o modelo e leitura da resposta em JSON. Funções puras
 * testáveis — a chamada ao modelo vive em looks.functions.ts.
 */
import { buildCaption, type LookPiece, type StoreContact } from "@/lib/looks-client";

export const AI_OCCASIONS = [
  "Trabalho",
  "Passeio",
  "Festa",
  "Casamento",
  "Igreja",
  "Praia",
  "Encontro",
  "Dia a dia",
] as const;

export const AI_STYLES = [
  "Elegante",
  "Casual",
  "Sofisticado",
  "Alegre e colorido",
  "Sóbrio e clássico",
  "Descontraído",
] as const;

export type AiLookPreview = {
  name: string;
  note: string;
  pieces: LookPiece[];
  totalPrice: number;
};

export const AI_SYSTEM_INSTRUCTIONS = [
  "És uma stylist de uma boutique de roupas femininas em Luanda, Angola.",
  "Recebes a lista de peças em stock (com id, tipo, tamanho e preço em Kwanzas)",
  "e um pedido de ocasião e estilo. Escolhes até 3 combinações de looks",
  "usando apenas as peças da lista, sem repetir a mesma peça em dois looks",
  "e sem inventar peças novas.",
  "Responde SEMPRE em JSON com este formato exato:",
  '{"looks":[{"name":"nome curto do look","note":"frase curta em português sobre porque funciona","piece_ids":["id1","id2"]},{"name":"...","note":"...","piece_ids":["..."]}]}',
  "Cada look tem 2 a 4 peças. Escreve name e note em português de Angola.",
].join("\n");

/** Monta a mensagem com o stock e o pedido da dona da loja. */
export function buildAiUserMessage(
  occasion: string,
  style: string,
  items: LookPiece[],
): string {
  const stockLines = items
    .map(
      (item) =>
        `- id: ${item.id} | tipo: ${item.category} | tamanho: ${item.size} | preço: ${item.price} Kz`,
    )
    .join("\n");
  return [
    `OCASIÃO: ${occasion}`,
    `ESTILHO DESEJADO: ${style}`,
    "",
    "PEÇAS DISPONÍVEIS NO STOCK:",
    stockLines,
    "",
    "Cria até 3 combinações com estas peças e responde só com o JSON pedido.",
  ].join("\n");
}

/** Recorta o primeiro bloco JSON completo de uma resposta em texto. */
export function extractJsonBlock(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("A resposta do modelo não tem JSON.");
  }
  return raw.slice(start, end + 1);
}

const MAX_LOOKS = 3;

/**
 * Lê o JSON do modelo e valida: só peças que existem no stock, sem repetir
 * a mesma peça em dois looks, no máximo 3 looks. Descarta looks inválidos.
 */
export function parseAiLooks(raw: string, items: LookPiece[]): AiLookPreview[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonBlock(raw));
  } catch {
    return [];
  }
  const rawLooks = (parsed as { looks?: unknown }).looks;
  if (!Array.isArray(rawLooks)) return [];

  const used = new Set<string>();
  const out: AiLookPreview[] = [];
  for (const entry of rawLooks) {
    if (out.length >= MAX_LOOKS) break;
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as { name?: unknown; note?: unknown; piece_ids?: unknown };
    const ids = Array.isArray(obj.piece_ids)
      ? obj.piece_ids.filter(
          (id): id is string => typeof id === "string" && byId.has(id),
        )
      : [];
    const pieces: LookPiece[] = [];
    for (const id of ids) {
      if (used.has(id) || pieces.some((piece) => piece.id === id)) continue;
      pieces.push(byId.get(id)!);
    }
    if (pieces.length === 0) continue;
    for (const piece of pieces) used.add(piece.id);
    out.push({
      name:
        typeof obj.name === "string" && obj.name.trim()
          ? obj.name.trim().slice(0, 80)
          : "Look sugerido",
      note: typeof obj.note === "string" ? obj.note.trim().slice(0, 160) : "",
      pieces,
      totalPrice: pieces.reduce((sum, piece) => sum + piece.price, 0),
    });
  }
  return out;
}

/** Legenda WhatsApp da sugestão, no mesmo formato dos looks normais. */
export function aiLookCaption(
  look: Pick<AiLookPreview, "pieces" | "totalPrice">,
  store?: StoreContact,
): string {
  return buildCaption(look, store);
}
