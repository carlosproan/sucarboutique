/**
 * Adaptador de try-on (peças → imagem do look).
 *
 * FASE 0: só a interface e os tipos. Nenhuma chamada real ainda.
 * Provedores possíveis (ex.: FASHN) entram por trás desta interface,
 * com a chave em secrets.
 */
import type { ImageInput, ProviderInfo } from "./detection";
import type { ProcessedImage } from "./background-removal";

export interface TryOnRequest {
  /** Foto de base da pessoa ou da modelo. */
  personImage: ImageInput;
  /** Peças a vestir, por ordem (ex.: top, calças, sapatos). */
  garmentImages: ImageInput[];
}

/** Adaptador de try-on: peças → imagem do look. */
export interface TryOnAdapter {
  readonly info: ProviderInfo;
  generateLook(request: TryOnRequest): Promise<ProcessedImage>;
}
