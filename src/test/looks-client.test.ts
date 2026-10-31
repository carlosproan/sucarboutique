import { describe, expect, it } from "vitest";
import {
  buildCaption,
  buildLooks,
  lookCountLabel,
  type LookPiece,
} from "@/lib/looks-client";

function piece(
  id: string,
  category: string,
  price: number,
  size = "M",
): LookPiece {
  return { id, category, size, price, photoUrl: null };
}

describe("buildLooks", () => {
  it("cria o Look 1 com peça de cima + de baixo e soma os preços", () => {
    const looks = buildLooks([
      piece("blusa", "Blusa", 8000),
      piece("saia", "Saia", 10000),
    ]);
    expect(looks).toHaveLength(1);
    expect(looks[0].name).toBe("Blusa + Saia");
    expect(looks[0].totalPrice).toBe(18000);
    expect(looks[0].pieces.map((p) => p.id)).toEqual(["blusa", "saia"]);
  });

  it("cria o Look 2 como vestido completo com acessórios", () => {
    const looks = buildLooks([
      piece("vestido", "Vestido", 25000),
      piece("sapato", "Sapato", 12000),
      piece("bolsa", "Bolsa", 5000),
    ]);
    expect(looks).toHaveLength(1);
    expect(looks[0].name).toBe("Vestido completo");
    expect(looks[0].pieces.map((p) => p.id)).toEqual([
      "vestido",
      "sapato",
      "bolsa",
    ]);
    expect(looks[0].totalPrice).toBe(42000);
  });

  it("cria o Look 3 casual com as peças que sobraram, sem repetir peças", () => {
    const looks = buildLooks([
      piece("blusa1", "Blusa", 8000),
      piece("saia1", "Saia", 10000),
      piece("camisa1", "Camisa", 9000),
      piece("calca1", "Calça", 11000),
    ]);
    expect(looks).toHaveLength(2);
    expect(looks[1].name).toBe("Camisa + Calça");
    const allIds = looks.flatMap((look) => look.pieces.map((p) => p.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("com apenas uma peça de cima e uma de baixo não duplica looks", () => {
    const looks = buildLooks([
      piece("blusa", "Blusa", 8000),
      piece("calca", "Calça", 12000),
    ]);
    expect(looks).toHaveLength(1);
  });

  it("com stock sem pares cria uma combinação casual", () => {
    const looks = buildLooks([piece("blusa", "Blusa", 8000)]);
    expect(looks).toHaveLength(1);
    expect(looks[0].name).toBe("Combinação casual");
    expect(looks[0].totalPrice).toBe(8000);
  });

  it("stock vazio não cria looks", () => {
    expect(buildLooks([])).toEqual([]);
  });
});

describe("buildCaption", () => {
  it("inclui as peças, o total formatado e o nome da loja", () => {
    const caption = buildCaption(
      {
        name: "Blusa + Saia",
        pieces: [piece("blusa", "Blusa", 8000), piece("saia", "Saia", 10000, "L")],
        totalPrice: 18000,
      },
      "Boutique Rosa",
    );
    expect(caption).toContain("✨ Blusa + Saia");
    expect(caption).toContain("Blusa · M — 8.000 Kz");
    expect(caption).toContain("Saia · L — 10.000 Kz");
    expect(caption).toContain("💰 Total: 18.000 Kz");
    expect(caption).toContain("🏷️ Boutique Rosa");
  });
});

describe("lookCountLabel", () => {
  it("usa o singular com 1 look", () => {
    expect(lookCountLabel(1)).toBe("1 look criado em 15s");
  });

  it("usa o plural com 3 looks", () => {
    expect(lookCountLabel(3)).toBe("3 looks criados em 15s");
  });
});
