/**
 * Regras do ecrã de Stock (lado do cliente): limite de fotos por vez,
 * leitura de preços escritos à mão e recorte quadrado das fotos.
 * Funções puras testáveis + um utilitário de canvas (só browser).
 */

/** Máximo de fotos que se pode escolher de uma vez. */
export const MAX_PHOTOS_PER_BATCH = 10;

export const STOCK_CATEGORIES = [
  "Blusa",
  "Camisa",
  "Calça",
  "Vestido",
  "Saia",
  "Conjunto",
  "Sapato",
  "Bolsa",
] as const;

export const STOCK_SIZES = ["M", "L", "XL", "XXL", "Único"] as const;

export type StockCategory = (typeof STOCK_CATEGORIES)[number];
export type StockSize = (typeof STOCK_SIZES)[number];

/**
 * Quantas fotos de uma escolha entram, sem passar do limite de 10 pendentes.
 * planPhotoBatch(0, 12) → { accepted: 10, rejected: 2 }
 */
export function planPhotoBatch(
  currentCount: number,
  incomingCount: number,
): { accepted: number; rejected: number } {
  const space = Math.max(0, MAX_PHOTOS_PER_BATCH - currentCount);
  return {
    accepted: Math.min(space, incomingCount),
    rejected: Math.max(0, incomingCount - space),
  };
}

/**
 * Preço em Kz a partir do que a utilizadora escreveu: aceita espaços e
 * pontos de milhar ("15 000", "2.500"), vírgula decimal e devolve 0
 * quando não há número válido.
 */
export function parsePriceKz(input: string): number {
  // Qualquer sinal de menos torna o preço inválido (nunca preço negativo).
  if (input.includes("-")) return 0;
  const cleaned = input.replace(/[^\d.,]/g, "").trim();
  if (cleaned.length === 0) return 0;
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Recorta a foto ao quadrado (centro) e comprime em JPEG — a mesma
 * imagem serve de pré-visualização e de ficheiro guardado, para o
 * envio ser rápido mesmo com rede fraca.
 */
export async function cropToSquareJpeg(
  file: File,
  maxDim = 1280,
  quality = 0.82,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const out = Math.min(maxDim, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Não foi possível processar a foto.");
    }
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      out,
      out,
    );
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}
