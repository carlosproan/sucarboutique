/**
 * Looks recomendados por IA: a dona da loja escolhe a ocasião e o estilo,
 * o modelo combina as peças do stock e devolve looks prontos com legenda.
 * A chamada ao AI Gateway vive só aqui, dentro de uma server function.
 */
import { createServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { z } from "zod";
import {
  GatewayError,
  generateResponse,
} from "@lovable.dev/ai-gateway";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import type { LookPiece } from "@/lib/looks-client";
import {
  AI_SYSTEM_INSTRUCTIONS,
  buildAiUserMessage,
  parseAiLooks,
  type AiLookPreview,
} from "@/lib/looks-ai";

const generateSchema = z.object({
  occasion: z.string().trim().min(1, "Escolhe a ocasião.").max(60),
  style: z.string().trim().min(1, "Escolhe o estilo.").max(60),
});

const favoriteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  note: z.string().max(160),
  occasion: z.string().trim().min(1).max(60),
  style: z.string().trim().min(1).max(60),
  pieceIds: z.array(z.string().uuid()).min(1).max(4),
});
const favoriteIdSchema = z.object({ id: z.string().uuid() });
const favoritePieceSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  size: z.string(),
  price: z.number().nonnegative(),
  photoPath: z.string(),
});

const PHOTO_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7;
const MAX_OUTPUT_TOKENS = 1500;

export interface AiLooksResult {
  looks: AiLookPreview[];
  planName: string | null;
}

export interface AiLookFavoriteView extends AiLookPreview {
  id: string;
  occasion: string;
  style: string;
  createdAt: string;
}

type FavoriteRow = Database["public"]["Tables"]["look_favorites"]["Row"];

async function favoriteView(
  supabase: SupabaseClient<Database>,
  row: FavoriteRow,
): Promise<AiLookFavoriteView> {
  const parsedPieces = z.array(favoritePieceSchema).safeParse(row.pieces);
  if (!parsedPieces.success) {
    throw new Error("Não foi possível carregar um look favorito.");
  }
  const pieces = await Promise.all(
    parsedPieces.data.map(async (piece) => {
      const { data: signed } = await supabase.storage
        .from("stock-photos")
        .createSignedUrl(piece.photoPath, PHOTO_URL_EXPIRY_SECONDS);
      return {
        id: piece.id,
        category: piece.category,
        size: piece.size,
        price: piece.price,
        photoUrl: signed?.signedUrl ?? null,
      } satisfies LookPiece;
    }),
  );
  return {
    id: row.id,
    name: row.name,
    note: row.note,
    occasion: row.occasion,
    style: row.style,
    pieces,
    totalPrice: Number(row.total_price),
    createdAt: row.created_at,
  };
}

/** Extrai o texto da resposta do modelo, parte por parte. */
function extractOutputText(response: { output?: unknown }): string {
  const parts: string[] = [];
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object" || !("content" in item)) continue;
    const content = (item as { content: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content as Array<{ text?: unknown }>) {
      if (part && typeof part === "object" && typeof part.text === "string") {
        parts.push(part.text);
      }
    }
  }
  return parts.join("\n");
}

/** Mensagem amigável em português para falhas do gateway. */
function gatewayMessage(error: GatewayError): string {
  if (error.code === "payment_required") {
    return "Os créditos para criar looks com IA acabaram. Fala com quem gere a conta.";
  }
  if (error.code === "rate_limited") {
    return "Muitos pedidos agora. Espera um pouco e tenta outra vez.";
  }
  return "Não foi possível criar os looks agora. Tenta outra vez.";
}

export const generateAiLooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => generateSchema.parse(input))
  .handler(async ({ context, data }): Promise<AiLooksResult> => {
    const { supabase, userId } = context;

    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!store) {
      throw new Error("Não encontrámos a tua loja. Entra outra vez.");
    }

    // Peças do stock, com foto assinada para os cartões.
    const { data: rows, error: stockError } = await supabase
      .from("stock_items")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    if (stockError) {
      throw new Error("Não foi possível carregar o stock. Tenta outra vez.");
    }
    const pieces: LookPiece[] = await Promise.all(
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
        } satisfies LookPiece;
      }),
    );
    if (pieces.length < 2) {
      throw new Error(
        "Adiciona pelo menos 2 peças ao stock antes de criar looks com IA.",
      );
    }

    // Limite do plano: looks por mês.
    const month = format(new Date(), "yyyy-MM");
    const [{ data: storePlan }, { data: usage }] = await Promise.all([
      supabase
        .from("store_plans")
        .select("plans(*)")
        .eq("store_id", store.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("usage")
        .select("id, looks_generated")
        .eq("store_id", store.id)
        .eq("month", month)
        .maybeSingle(),
    ]);
    const plan =
      (storePlan?.plans as Database["public"]["Tables"]["plans"]["Row"] | null) ??
      null;
    if (!plan) {
      throw new Error("A tua loja não tem plano ativo. Fala com o suporte.");
    }
    const used = usage?.looks_generated ?? 0;
    if (used >= plan.monthly_look_limit) {
      throw new Error(
        "Já usaste os teus looks deste mês. Tenta outra vez no próximo mês.",
      );
    }

    // Chamada ao modelo do Lovable AI Gateway.
    let raw = "";
    try {
      const response = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: AI_SYSTEM_INSTRUCTIONS,
        input: buildAiUserMessage(data.occasion, data.style, pieces),
        max_output_tokens: MAX_OUTPUT_TOKENS,
      });
      raw = extractOutputText(response);
    } catch (error) {
      if (error instanceof GatewayError) {
        console.error("[looks-ai] gateway error", error.code, error.ids?.requestId);
        throw new Error(gatewayMessage(error));
      }
      throw error;
    }

    const looks = parseAiLooks(raw, pieces);
    if (looks.length === 0) {
      throw new Error(
        "Não conseguimos combinar as tuas peças com essa ocasião. Tenta outro estilo.",
      );
    }

    // Soma ao consumo do mês (looks gerados).
    if (usage) {
      await supabase
        .from("usage")
        .update({ looks_generated: used + looks.length })
        .eq("id", usage.id);
    } else {
      await supabase
        .from("usage")
        .insert({ store_id: store.id, month, looks_generated: looks.length });
    }

    return { looks, planName: plan.name };
  });

/** Lista os favoritos da loja, incluindo URLs temporárias para as fotos. */
export const getAiLookFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ favorites: AiLookFavoriteView[] }> => {
    const { supabase, userId } = context;
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!store) return { favorites: [] };

    const { data: rows, error } = await supabase
      .from("look_favorites")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os looks favoritos.");

    return {
      favorites: await Promise.all((rows ?? []).map((row) => favoriteView(supabase, row))),
    };
  });

/** Guarda um snapshot do look após validar as peças no stock desta loja. */
export const saveAiLookFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => favoriteSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ favorite: AiLookFavoriteView }> => {
    const { supabase, userId } = context;
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!store) throw new Error("Não encontrámos a tua loja. Entra outra vez.");

    const uniqueIds = [...new Set(data.pieceIds)];
    if (uniqueIds.length !== data.pieceIds.length) {
      throw new Error("Este look contém peças repetidas.");
    }
    const { data: stockRows, error: stockError } = await supabase
      .from("stock_items")
      .select("id, category, size, price, photo_path")
      .eq("store_id", store.id)
      .in("id", uniqueIds);
    if (stockError || !stockRows || stockRows.length !== uniqueIds.length) {
      throw new Error("Uma ou mais peças já não estão no teu stock. Gera outro look.");
    }
    const rowsById = new Map(stockRows.map((row) => [row.id, row]));
    const snapshot = uniqueIds.map((id) => {
      const row = rowsById.get(id);
      if (!row) throw new Error("Uma ou mais peças já não estão no teu stock.");
      return {
        id: row.id,
        category: row.category,
        size: row.size,
        price: Number(row.price),
        photoPath: row.photo_path,
      };
    });
    const { data: existing, error: existingError } = await supabase
      .from("look_favorites")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    if (existingError) throw new Error("Não foi possível guardar este look.");

    const signature = [...uniqueIds].sort().join(":");
    const duplicate = (existing ?? []).find((row) => {
      const parsed = z.array(favoritePieceSchema).safeParse(row.pieces);
      return parsed.success && parsed.data.map((piece) => piece.id).sort().join(":") === signature;
    });
    if (duplicate) {
      return { favorite: await favoriteView(supabase, duplicate) };
    }

    const totalPrice = snapshot.reduce((sum, piece) => sum + piece.price, 0);
    const { data: saved, error: saveError } = await supabase
      .from("look_favorites")
      .insert({
        store_id: store.id,
        name: data.name,
        note: data.note,
        occasion: data.occasion,
        style: data.style,
        pieces: snapshot as Json,
        total_price: totalPrice,
      })
      .select("*")
      .single();
    if (saveError || !saved) throw new Error("Não foi possível guardar este look.");
    return { favorite: await favoriteView(supabase, saved) };
  });

/** Remove um favorito somente da loja autenticada. */
export const deleteAiLookFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => favoriteIdSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ deleted: boolean }> => {
    const { supabase, userId } = context;
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!store) throw new Error("Não encontrámos a tua loja. Entra outra vez.");
    const { data: deleted, error } = await supabase
      .from("look_favorites")
      .delete()
      .eq("store_id", store.id)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("Não foi possível retirar este favorito.");
    return { deleted: Boolean(deleted) };
  });
