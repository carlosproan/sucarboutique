import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut, Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyStore } from "@/lib/stores.functions";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/use-theme";
import { displayWhatsapp } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/perfil")({
  loader: async () => {
    const overview = await getMyStore();
    if (!overview.store) {
      throw redirect({ to: "/criar-loja" });
    }
    return overview;
  },
  component: PerfilPage,
  head: () => ({
    meta: [
      { title: "Perfil da loja · SUCAR Boutique" },
      { name: "description", content: "Dados da loja, plano e consumo do mês." },
    ],
  }),
});

function PerfilPage() {
  const navigate = useNavigate();
  const overview = Route.useLoaderData();
  const { store } = overview;
  // O loader redireciona quando não há loja; esta guarda é só para o TypeScript.
  if (!store) return null;
  const { plan, usage, logoUrl } = overview;
  const { theme, toggle } = useTheme();
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAccountEmail(data.user?.email ?? null));
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const { queryClient } = Route.useRouteContext();
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const planName = plan?.name ?? "Sem plano";
  const monthLabel = usage ? usage.month.split("-").reverse().join("/") : "";

  return (
    <AppShell>
      <PageHeader
        title="Perfil da loja"
        action={
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 px-4"
            onClick={() => navigate({ to: "/editar-loja" })}
          >
            Editar
          </Button>
        }
      />

      {/* Dados da loja */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logótipo de ${store.name}`}
              className="size-16 rounded-full border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border bg-secondary font-display text-2xl font-semibold text-secondary-foreground">
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold text-foreground">
              {store.name}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {store.city} · {store.currency}
            </p>
          </div>
        </div>
        <Separator className="my-4" />
        <dl className="space-y-2 text-sm">
          {store.instagram ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Instagram</dt>
              <dd className="truncate font-medium text-foreground">@{store.instagram}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">WhatsApp</dt>
            <dd className="font-medium text-foreground">{displayWhatsapp(store.whatsapp)}</dd>
          </div>
          {accountEmail ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Conta</dt>
              <dd className="truncate font-medium text-foreground">{accountEmail}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {/* Plano e consumo do mês */}
      <section className="mt-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-base font-semibold text-foreground">Plano atual</h3>
          <Badge className="bg-accent text-accent-foreground hover:bg-accent">{planName}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {monthLabel ? `Consumo de ${monthLabel}` : "Consumo do mês"}
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          <UsageRow label="Fotos processadas" used={usage?.photos_processed ?? 0} limit={plan?.monthly_photo_limit ?? 0} />
          <UsageRow label="Looks gerados" used={usage?.looks_generated ?? 0} limit={plan?.monthly_look_limit ?? 0} />
          <UsageRow label="Try-ons" used={usage?.tryons_done ?? 0} limit={plan?.monthly_tryon_limit ?? 0} />
          <UsageRow label="Peças criadas" used={usage?.items_created ?? 0} />
        </ul>
      </section>

      {/* Preferências e sessão */}
      <section className="mt-4 space-y-3">
        <Button
          variant="outline"
          className="min-h-12 w-full justify-start"
          onClick={toggle}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        </Button>
        <Button
          variant="outline"
          className="min-h-12 w-full justify-start border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="size-4" />
          {signingOut ? "A terminar sessão…" : "Terminar sessão"}
        </Button>
      </section>
    </AppShell>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit?: number }) {
  const pct = limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <li>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {used}
          {typeof limit === "number" ? ` de ${limit}` : ""}
        </span>
      </div>
      {typeof limit === "number" ? (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-label={label}
          />
        </div>
      ) : null}
    </li>
  );
}
