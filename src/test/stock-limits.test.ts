import { describe, expect, it } from "vitest";

import {
  MAX_PHOTOS_PER_BATCH,
  parsePriceKz,
  planPhotoBatch,
  sumStockValue,
} from "@/lib/stock-client";

describe("Regras do Stock", () => {
  it("aceita no máximo 10 fotos de uma vez", () => {
    expect(MAX_PHOTOS_PER_BATCH).toBe(10);
    expect(planPhotoBatch(0, 12)).toEqual({ accepted: 10, rejected: 2 });
  });

  it("não adiciona fotos quando já há 10 pendentes", () => {
    expect(planPhotoBatch(10, 3)).toEqual({ accepted: 0, rejected: 3 });
  });

  it("completa até 10 quando já havia algumas", () => {
    expect(planPhotoBatch(8, 5)).toEqual({ accepted: 2, rejected: 3 });
  });

  it("lê preços escritos à mão em Kz", () => {
    expect(parsePriceKz("15 000")).toBe(15000);
    expect(parsePriceKz("2.500")).toBe(2500);
    expect(parsePriceKz("1500,50")).toBe(1500.5);
    expect(parsePriceKz("")).toBe(0);
    expect(parsePriceKz("-5")).toBe(0);
    expect(parsePriceKz("abc")).toBe(0);
  });

  it("soma o valor total do stock em Kz", () => {
    expect(sumStockValue([])).toBe(0);
    expect(sumStockValue([{ price: 120000 }, { price: 65000 }])).toBe(185000);
    expect(sumStockValue([{ price: 0 }])).toBe(0);
  });
});
