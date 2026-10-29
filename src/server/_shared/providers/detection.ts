/**
 * Adaptador de deteção de peças (foto do stock → lista de peças).
 *
 * FASE 0: só a interface e os tipos. Nenhuma chamada real ainda.
 * A implementação concreta (ex.: modelo de visão) entra numa fase
 * seguinte, por trás desta interface, com a chave em secrets.
 */

/** Caixa delimitadora normalizada (0 a 1) relativamente à imagem. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ItemCategory =
  | "top"
  | "bottom"
  | "dress"
  | "shoes"
  | "bag"
  | "accessory"
  | "other";

/** Cor aproximada da peça, em nome simples (ex.: "vermelho", "preto"). */
export type ItemColor = string;

/** Peça detetada numa foto de stock. */
export interface DetectedItem {
  box: BoundingBox;
  category: ItemCategory;
  color: ItemColor;
}

/** Entrada de imagem aceite pelos adaptadores. */
export type ImageInput = { url: string } | { base64: string; mimeType: string };

/** Adaptador de deteção: foto → lista de peças com caixa, categoria e cor. */
export interface DetectionAdapter {
  readonly info: ProviderInfo;
  detectItems(image: ImageInput): Promise<DetectedItem[]>;
}

export interface ProviderInfo {
  id: string;
  name: string;
}
