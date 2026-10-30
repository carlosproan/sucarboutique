import { createServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  MAX_PHOTOS_PER_BATCH,
  STOCK_CATEGORIES,
  STOCK_SIZES,
  type StockCategory,
  type StockSize,
} from "@/lib/stock-client";

/** Assinatura de URL das fotos: 7 dias. */
const PHOTO_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

const saveStockSchema = z.object({
  items: z
    .array(
      z.object({
        photoDataUrl: z
          .string()
          .startsWith("data:image/")
          .max(4_000_000, "Foto demasiado grande. Tenta outra vez."),
        category: z.enum(STOCK_CATEGORIES),
        size: z.enum(STOCK_SIZES),
        price: z.number().min(0).max(999_999_999),
      }),
    )
    .min(1, "Escolhe pelo menos uma foto.")
    .max(MAX_PHOTOS_PER_BATCH, "Máximo de 10 fotos de cada vez."),
});

export interface StockItemView {
  id: string;
  category: string;
  size: string;
  price: number;
  photoUrl: string | null;
  createdAt: string;
}

type TypedSupabase = Parameters<Parameters<typeof requireSupabaseAuth.middleware>[0]["context"]>[never];

/** Converte um data URL JPEG em bytes para o upload. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Lê as peças salvas da loja da utilizadora, com foto assinada. */
export const getStockItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: StockItemView[] }> => {
    const { supabase, userId } = context;

    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!store) {
      return { items: [] };
    }

    const { data: rows, error } = await supabase
      .from("stock_items")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error("Não foi possível carregar o stock. Tenta outra vez.");
    }

    const items = await Promise.all(
      (rows ?? []).map(async (row: Database["public"]["Tables"]["stock_items"]["Row"]) => {
        const { data: signed } = await supabase.storage
          .from("stock-photos")
          .createSignedUrl(row.photo_path, PHOTO_URL_EXPIRY_SECONDS);
        return {
          id: row.id,
          category: row.category,
          size: row.size,
          price: Number(row.price),
          photoUrl: signed?.signedUrl ?? null,
          createdAt: row.created_at,
        } satisfies StockItemView;
      }),
    );

    return { items };
  });

/**
 * Salva as fotos escolhidas: envia cada imagem já recortada para o
 * bucket privado (pasta da própria loja) e cria as peças com tipo,
 * tamanho e preço. Soma ao consumo do mês (peças criadas).
 */
export const saveStockItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saveStockSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ saved: number }> => {
    const { supabase, userId } = context;

    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!store) {
      throw new Error("Não encontrámos a tua loja. Entra outra vez.");
    }

    const month = format(new Date(), "yyyy-MM");

    const inserted: { id: string }[] = [];
    for (const item of data.items) {
      const path = `${store.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("stock-photos")
        .upload(path, dataUrlToBytes(item.photoDataUrl), {
          contentType: "image/jpeg",
        });
      if (uploadError) {
        throw new Error("Não foi possível enviar as fotos. Verifica a rede e tenta outra vez.");
      }

      const { data: row, error: insertError } = await supabase
        .from("stock_items")
        .insert({
          store_id: store.id,
          photo_path: path,
          category: item.category,
          size: item.size,
          price: item.price,
        })
        .select("id")
        .single();
      if (insertError || !row) {
        throw new Error("As fotos foram enviadas mas as peças não foram salvas. Tenta outra vez.");
      }
      inserted.push({ id: row.id });
    }

    const { data: usage } = await supabase
      .from("usage")
      .select("id, items_created")
      .eq("store_id", store.id)
      .eq("month", month)
      .maybeSingle();
    if (usage) {
      await supabase
        .from("usage")
        .update({ items_created: (usage.items_created ?? 0) + inserted.length })
        .eq("id", usage.id);
    } else {
      await supabase
        .from("usage")
        .insert({ store_id: store.id, month, items_created: inserted.length });
    }

    return { saved: inserted.length };
  });
