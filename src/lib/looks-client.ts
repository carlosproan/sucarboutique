/**
 * Regras do ecrã de Looks (lado do cliente): combinações criadas a partir
 * do stock guardado, legenda pronta para WhatsApp no formato do post e
 * cópia para a área de transferência. Funções puras testáveis.
 */
import { formatKz, maskWhatsapp } from "@/lib/format";

export interface LookPiece {
  id: string;
  category: string;
  size: string;
  price: number;
  photoUrl: string | null;
}

export interface GeneratedLook {
  /** Nome descritivo, ex.: "Blusa + Saia". */
  name: string;
  pieces: LookPiece[];
  totalPrice: number;
  /** Legenda completa, pronta para copiar e colar no WhatsApp. */
  caption: string;
}

const TOP_CATEGORIES = ["Blusa", "Camisa"];
const BOTTOM_CATEGORIES = ["Calça", "Saia"];
const DRESS_CATEGORY = "Vestido";
const SET_CATEGORY = "Conjunto";
const EXTRA_CATEGORIES = ["Sapato", "Bolsa"];

/** Dados da loja usados na legenda: nome, WhatsApp (vai mascarado) e cidade. */
export interface StoreContact {
  name: string;
  whatsapp: string;
  city: string;
}


/**
 * Cria até 3 looks a partir das peças do stock:
 * 1. peça de cima + peça de baixo (ex.: Blusa + Saia)
 * 2. Vestido completo (ou Conjunto completo), com acessórios se houver
 * 3. Combinação casual com as peças que sobraram
 * Nunca repete a mesma peça em dois looks.
 */
export function buildLooks(items: LookPiece[], store?: StoreContact): GeneratedLook[] {
  const unused = new Set(items.map((item) => item.id));
  const findUnused = (predicate: (item: LookPiece) => boolean) =>
    items.find((item) => unused.has(item.id) && predicate(item));
  const take = (piece: LookPiece) => {
    unused.delete(piece.id);
    return piece;
  };
  /** Primeiro acessório livre (sapato antes de bolsa). */
  const takeExtra = (): LookPiece | null => {
    const shoe = findUnused((item) => item.category === "Sapato");
    if (shoe) return take(shoe);
    const bag = findUnused((item) => item.category === "Bolsa");
    return bag ? take(bag) : null;
  };

  const drafts: Array<Omit<GeneratedLook, "caption">> = [];
  const push = (name: string, pieces: Array<LookPiece | null>) => {
    const chosen = pieces.filter((piece): piece is LookPiece => piece !== null);
    if (chosen.length > 0) {
      drafts.push({
        name,
        pieces: chosen,
        totalPrice: chosen.reduce((sum, piece) => sum + piece.price, 0),
      });
    }
  };

  const top = findUnused((item) => TOP_CATEGORIES.includes(item.category));
  const bottom = findUnused((item) => BOTTOM_CATEGORIES.includes(item.category));
  if (top && bottom) {
    push(`${top.category} + ${bottom.category}`, [take(top), take(bottom)]);
  }

  const dress = findUnused((item) => item.category === DRESS_CATEGORY);
  const set = findUnused((item) => item.category === SET_CATEGORY);
  if (dress) {
    push("Vestido completo", [take(dress), takeExtra(), takeExtra()]);
  } else if (set) {
    push("Conjunto completo", [take(set), takeExtra(), takeExtra()]);
  }

  const top2 = findUnused((item) => TOP_CATEGORIES.includes(item.category));
  const bottom2 = findUnused((item) => BOTTOM_CATEGORIES.includes(item.category));
  if (top2 && bottom2) {
    push(`${top2.category} + ${bottom2.category}`, [take(top2), take(bottom2)]);
  } else {
    const dress2 = findUnused((item) => item.category === DRESS_CATEGORY);
    const set2 = findUnused((item) => item.category === SET_CATEGORY);
    const full = dress2 ?? set2;
    if (full) {
      push(`${full.category} casual`, [take(full), takeExtra()]);
    } else {
      const shoe = findUnused((item) => item.category === "Sapato");
      const bag = findUnused((item) => item.category === "Bolsa");
      if (shoe && bag) {
        push("Sapato + Bolsa", [take(shoe), take(bag)]);
      }
    }
  }

  // Fallback: há peças mas nenhuma combinação fechou — junta as duas
  // primeiras peças livres numa combinação casual.
  if (drafts.length === 0) {
    const remaining = items.filter((item) => unused.has(item.id)).slice(0, 2);
    push("Combinação casual", remaining);
  }

  return drafts.map((draft) => ({
    ...draft,
    caption: buildCaption(draft, store),
  }));
}

/** Dias da semana em português, no formato do título do look. */
const WEEKDAY_LABELS = [
  "DOMINGO",
  "SEGUNDA FEIRA",
  "TERÇA FEIRA",
  "QUARTA FEIRA",
  "QUINTA FEIRA",
  "SEXTA FEIRA",
  "SÁBADO",
] as const;

/** Título do dia atual, ex.: "QUINTA FEIRA" → "LOOK DE QUINTA FEIRA ✨". */
export function lookDayTitle(date: Date = new Date()): string {
  return WEEKDAY_LABELS[date.getDay()] ?? "SEGUNDA FEIRA";
}

/**
 * Legenda WhatsApp no formato do post:
 * "LOOK DE QUINTA FEIRA ✨" + frase de impacto + peças com preço +
 * "TOTAL: 85.000 Kz" + "Encomendas: **** 1944" + "Marishop - Luanda".
 */
export function buildCaption(
  look: Pick<GeneratedLook, "pieces" | "totalPrice">,
  store?: StoreContact,
): string {
  const lines = [
    `LOOK DE ${lookDayTitle()} ✨`,
    "",
    "Elegância em todos os detalhes.",
    "",
    ...look.pieces.map((piece) => `${piece.category}: ${formatKz(piece.price)}`),
    "",
    `TOTAL: ${formatKz(look.totalPrice)}`,
  ];
  if (store) {
    lines.push(
      "",
      `Encomendas: ${maskWhatsapp(store.whatsapp)}`,
      `${store.name} - ${store.city}`,
    );
  }
  return lines.join("\n");
}

/** "3 looks criados em 15s" / "1 look criado em 15s". */
export function lookCountLabel(count: number): string {
  return `${count} ${count === 1 ? "look criado" : "looks criados"} em 15s`;
}

/**
 * Copia texto para a área de transferência, com fallback para navegadores
 * sem a API moderna. Devolve true quando copiou.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      return copied;
    } catch {
      return false;
    }
  }
}
