/**
 * Utilitários de formatação da SUCAR Boutique.
 * Interface 100% em português de Angola: moeda Kz, formato "15.000 Kz",
 * datas dd/mm/aaaa, WhatsApp internacional +244.
 */

/** Formata um valor em Kwanza: formatKz(15000) → "15.000 Kz". */
export function formatKz(value: number): string {
  const negative = value < 0;
  const [intPart, decPart] = Math.abs(value).toFixed(2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = decPart === "00" ? "" : `,${decPart}`;
  return `${negative ? "-" : ""}${grouped}${decimals} Kz`;
}

/** Formata uma data como dd/mm/aaaa (aceita Date ou string ISO). */
export function formatDatePt(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

/**
 * Normaliza um número de WhatsApp de Angola para formato internacional:
 * normalizeWhatsapp("923 456 789") → "+244923456789".
 * Devolve null quando o número não é válido (9 dígitos, começa por 9).
 */
export function normalizeWhatsapp(input: string): string | null {
  let number = input.replace(/[^\d]/g, "");
  if (number.startsWith("00244")) number = number.slice(5);
  else if (number.startsWith("244") && number.length > 9) number = number.slice(3);
  // Número local de Angola: 9 dígitos, móvel começa por 9.
  if (!/^9\d{8}$/.test(number)) return null;
  return `+244${number}`;
}

/** Mostra um WhatsApp normalizado com espaços: +244 923 456 789. */
export function displayWhatsapp(normalized: string): string {
  if (!normalized.startsWith("+244") || normalized.length !== 13) return normalized;
  const local = normalized.slice(4);
  return `+244 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
