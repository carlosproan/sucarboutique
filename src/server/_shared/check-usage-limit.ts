/**
 * Helper de limites de consumo do plano (fase 0: estrutura pronta,
 * ainda sem chamadas na UI).
 *
 * Lê o plano atual da loja e o consumo do mês corrente e devolve se a
 * operação é permitida. As chamadas reais entram nas próximas fases.
 */
import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type UsageMetric = "photos_processed" | "looks_generated" | "tryons_done";

const metricToLimitColumn: Record<UsageMetric, string> = {
  photos_processed: "monthly_photo_limit",
  looks_generated: "monthly_look_limit",
  tryons_done: "monthly_tryon_limit",
};

export interface UsageCheck {
  allowed: boolean;
  metric: UsageMetric;
  used: number;
  limit: number;
  remaining: number;
  planName: string | null;
}

/** Mês corrente no formato aaaa-mm. */
function currentMonthKey(): string {
  return format(new Date(), "yyyy-MM");
}

/**
 * Verifica se a loja pode fazer a operação `metric` este mês.
 * Devolve sempre um resultado; sem plano atribuído, a operação é
 * bloqueada por segurança.
 */
export async function checkUsageLimit(
  supabase: SupabaseClient<Database>,
  storeId: string,
  metric: UsageMetric,
): Promise<UsageCheck> {
  const month = currentMonthKey();

  const [{ data: storePlan, error: planError }, { data: usage, error: usageError }] =
    await Promise.all([
      supabase
        .from("store_plans")
        .select("plans(*)")
        .eq("store_id", storeId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("usage")
        .select("*")
        .eq("store_id", storeId)
        .eq("month", month)
        .maybeSingle(),
    ]);

  if (planError) {
    throw new Error("Não foi possível verificar o plano da loja.");
  }
  if (usageError) {
    throw new Error("Não foi possível verificar o consumo do mês.");
  }

  const plan = (storePlan?.plans as
    | Database["public"]["Tables"]["plans"]["Row"]
    | null
    | undefined) ?? null;

  // Sem plano: bloqueia (não inventa limites).
  if (!plan) {
    return { allowed: false, metric, used: 0, limit: 0, remaining: 0, planName: null };
  }

  type LimitColumn =
    | "monthly_photo_limit"
    | "monthly_look_limit"
    | "monthly_tryon_limit";
  const limitColumn = metricToLimitColumn[metric] as LimitColumn;
  const limit = plan[limitColumn];
  const used = usage?.[metric] ?? 0;

  return {
    allowed: used < limit,
    metric,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    planName: plan.name,
  };
}
