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
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
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

const PHOTO_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7;
const MAX_OUTPUT_TOKENS = 1500;

export interface AiLooksResult {
  looks: AiLookPreview[];
  planName: string | null;
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
