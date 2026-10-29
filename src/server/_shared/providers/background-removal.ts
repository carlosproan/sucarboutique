/**
 * Adaptador de remoção de fundo (imagem → imagem sem fundo).
 *
 * FASE 0: só a interface e os tipos. Nenhuma chamada real ainda.
 * Provedores possíveis (ex.: remove.bg) entram por trás desta
 * interface, com a chave em secrets.
 */
import type { ImageInput, ProviderInfo } from "./detection";

/** Resultado do processamento de imagem. */
export interface ProcessedImage {
  image: ImageInput;
}

/** Adaptador de remoção de fundo: imagem → imagem sem fundo. */
export interface BackgroundRemovalAdapter {
  readonly info: ProviderInfo;
  removeBackground(image: ImageInput): Promise<ProcessedImage>;
}
