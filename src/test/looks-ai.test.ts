import { describe, expect, it } from "vitest";
import {
  buildAiUserMessage,
  extractJsonBlock,
  parseAiLooks,
} from "@/lib/looks-ai";
import type { LookPiece } from "@/lib/looks-client";

function piece(id: string, category: string, price: number): LookPiece {
  return { id, category, size: "M", price, photoUrl: null };
}

const STOCK = [
  piece("p1", "Blusa", 8000),
  piece("p2", "Saia", 10000),
  piece("p3", "Vestido", 25000),
  piece("p4", "Sapato", 15000),
];

describe("extractJsonBlock", () => {
  it("recorta JSON dentro de blocos de código", () => {
    const raw = 'Aqui está:\n```json\n{"looks":[]}\n```';
    expect(extractJsonBlock(raw)).toBe('{"looks":[]}');
  });

  it("falha claramente quando não há JSON", () => {
    expect(() => extractJsonBlock("sem json aqui")).toThrow();
  });
});

describe("parseAiLooks", () => {
  it("mapeia ids para as peças do stock e soma os totais", () => {
    const raw = JSON.stringify({
      looks: [
        { name: "Look de trabalho", note: "Sóbrio e elegante.", piece_ids: ["p1", "p2"] },
      ],
    });
    const looks = parseAiLooks(raw, STOCK);
    expect(looks).toHaveLength(1);
    expect(looks[0].pieces.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(looks[0].totalPrice).toBe(18000);
    expect(looks[0].name).toBe("Look de trabalho");
  });

  it("descarta ids que não existem no stock", () => {
    const raw = JSON.stringify({
      looks: [{ name: "Look", note: "", piece_ids: ["p1", "inexistente", "p4"] }],
    });
    const looks = parseAiLooks(raw, STOCK);
    expect(looks[0].pieces.map((p) => p.id)).toEqual(["p1", "p4"]);
    expect(looks[0].totalPrice).toBe(23000);
  });

  it("não repete a mesma peça em dois looks", () => {
    const raw = JSON.stringify({
      looks: [
        { name: "A", note: "", piece_ids: ["p1", "p2"] },
        { name: "B", note: "", piece_ids: ["p1", "p3"] },
      ],
    });
    const looks = parseAiLooks(raw, STOCK);
    expect(looks).toHaveLength(2);
    expect(looks[1].pieces.map((p) => p.id)).toEqual(["p3"]);
    expect(looks[1].totalPrice).toBe(25000);
  });

  it("devolve no máximo 3 looks", () => {
    const raw = JSON.stringify({
      looks: [
        { name: "A", note: "", piece_ids: ["p1"] },
        { name: "B", note: "", piece_ids: ["p2"] },
        { name: "C", note: "", piece_ids: ["p3"] },
        { name: "D", note: "", piece_ids: ["p4"] },
      ],
    });
    expect(parseAiLooks(raw, STOCK)).toHaveLength(3);
  });

  it("descarta looks sem peças válidas e devolve [] para resposta inválida", () => {
    expect(parseAiLooks(JSON.stringify({ looks: [{ name: "X", piece_ids: ["zzz"] }] }), STOCK)).toHaveLength(0);
    expect(parseAiLooks("resposta sem json", STOCK)).toEqual([]);
    expect(parseAiLooks(JSON.stringify({ outra: 1 }), STOCK)).toEqual([]);
  });
});

describe("buildAiUserMessage", () => {
  it("inclui ocasião, estilo e todas as peças com id e preço", () => {
    const message = buildAiUserMessage("Trabalho", "Sóbrio e clássico", STOCK);
    expect(message).toContain("OCASIÃO: Trabalho");
    expect(message).toContain("ESTILHO DESEJADO: Sóbrio e clássico");
    for (const item of STOCK) {
      expect(message).toContain(`id: ${item.id}`);
      expect(message).toContain(`${item.price} Kz`);
    }
  });
});
