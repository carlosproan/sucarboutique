import { createServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type StoreRow = Database["public"]["Tables"]["stores"]["Row"];
type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
type UsageRow = Database["public"]["Tables"]["usage"]["Row"];

export interface StoreOverview {
  store: StoreRow | null;
  plan: PlanRow | null;
  usage: UsageRow | null;
  logoUrl: string | null;
}

/** Mês corrente no formato aaaa-mm (espec.: datas em dd/mm/aaaa, consumo por mês). */
export function currentMonthKey(): string {
  return format(new Date(), "yyyy-MM");
}

const instagramSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@+/, ""))
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

const storeInputSchema = z.object({
  name: z.string().trim().min(1, "O nome da loja é obrigatório").max(80),
  logoUrl: z.string().trim().nullable().optional(),
  instagram: instagramSchema,
  whatsapp: z.string().trim().min(1, "O WhatsApp é obrigatório"),
  city: z.string().trim().min(1).default("Luanda"),
  currency: z.string().trim().min(1).default("Kz"),
});

export type StoreInput = z.input<typeof storeInputSchema>;

/** Lê a loja da utilizadora autenticada, com o plano e o consumo do mês. */
export const getMyStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoreOverview> => {
    const { supabase, userId } = context;

    const { data: store, error } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error("Não foi possível carregar a tua loja. Tenta outra vez.");
    }
    if (!store) {
      return { store: null, plan: null, usage: null, logoUrl: null };
    }

    const { data: storePlan } = await supabase
      .from("store_plans")
      .select("plans(*)")
      .eq("store_id", store.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: usage } = await supabase
      .from("usage")
      .select("*")
      .eq("store_id", store.id)
      .eq("month", currentMonthKey())
      .maybeSingle();

    let logoUrl: string | null = null;
    if (store.logo_url) {
      const { data: signed } = await supabase.storage
        .from("logos")
        .createSignedUrl(store.logo_url, 3600);
      logoUrl = signed?.signedUrl ?? null;
    }

    return {
      store,
      plan: (storePlan?.plans as PlanRow | null) ?? null,
      usage: usage ?? null,
      logoUrl,
    };
  });

/** Cria a loja e atribui o plano Grátis com consumo do mês a zero. */
export const createStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => storeInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Uma loja por conta — se já existe, devolvemos essa.
    const { data: existing } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (existing) {
      return { ok: true as const, storeId: existing.id };
    }

    const { data: store, error } = await supabase
      .from("stores")
      .insert({
        owner_id: userId,
        name: data.name,
        logo_url: data.logoUrl ?? null,
        instagram: data.instagram ?? null,
        whatsapp: data.whatsapp,
        city: data.city,
        currency: data.currency,
      })
      .select("id")
      .single();
    if (error || !store) {
      throw new Error("Não foi possível criar a loja. Tenta outra vez.");
    }

    const { data: freePlan } = await supabase
      .from("plans")
      .select("id")
      .eq("name", "Grátis")
      .maybeSingle();
    if (freePlan) {
      const { error: planError } = await supabase
        .from("store_plans")
        .insert({ store_id: store.id, plan_id: freePlan.id });
      if (planError) {
        throw new Error("A loja foi criada mas o plano não foi atribuído. Tenta entrar outra vez.");
      }
    }

    const { error: usageError } = await supabase
      .from("usage")
      .upsert(
        { store_id: store.id, month: currentMonthKey() },
        { onConflict: "store_id,month" },
      );
    if (usageError) {
      throw new Error("A loja foi criada mas o consumo mensal não foi inicializado. Tenta entrar outra vez.");
    }

    return { ok: true as const, storeId: store.id };
  });

/** Atualiza os dados da loja da utilizadora autenticada. */
export const updateStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => storeInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { error } = await supabase
      .from("stores")
      .update({
        name: data.name,
        logo_url: data.logoUrl ?? null,
        instagram: data.instagram ?? null,
        whatsapp: data.whatsapp,
        city: data.city,
        currency: data.currency,
      })
      .eq("owner_id", userId);
    if (error) {
      throw new Error("Não foi possível guardar as alterações. Tenta outra vez.");
    }
    return { ok: true as const };
  });
