import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Camera, Copy, LogOut, MessageCircle, Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyStore } from "@/lib/stores.functions";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/hooks/use-theme";
import { formatKz, maskEmail, maskWhatsapp } from "@/lib/format";

/** Número de suporte da SUCAR (WhatsApp de ajuda rápida). */
const SUPPORT_WHATSAPP = "+244923000000";

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
      { name: "description", content: "Dados da loja, plano e ajuda rápida." },
    ],
  }),
});

function PerfilPage() {
  const navigate = useNavigate();
  const overview = Route.useLoaderData();
  const { store } = overview;
  // O loader redireciona quando não há loja; esta guarda é só para o TypeScript.
  if (!store) return null;
  const { plan, usage } = overview;
  const { theme, toggle } = useTheme();
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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

  return (
    <AppShell>
      <PageHeader
        title="Perfil da loja"
        action={
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 px-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: "/editar-loja" })}
          >
            Editar
          </Button>
        }
      />

      {/* Minha loja */}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-display text-base font-semibold text-foreground">Minha loja</h2>
        <div className="mt-4 flex items-center gap-4">
          {overview.logoUrl ? (
            <img
              src={overview.logoUrl}
              alt={`Logótipo de ${store.name}`}
              className="size-16 rounded-full border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border bg-secondary font-display text-2xl font-semibold text-secondary-foreground">
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold text-foreground">
              {store.name}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {store.city} · {store.currency}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Valor do teu stock:{" "}
              {stockValue > 0 ? (
                <span className="font-semibold text-success">{formatKz(stockValue)}</span>
              ) : (
                <span className="font-medium text-foreground">{formatKz(stockValue)}</span>
              )}
            </p>
          </div>
        </div>
        <Separator className="my-4" />
        <dl className="space-y-4 text-sm">
          <div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">WhatsApp de vendas</dt>
              <dd className="font-medium text-foreground">{maskWhatsapp(store.whatsapp)}</dd>
            </div>
            <p className="mt-1 text-xs text-success">
              🔒 Só aparece quando você postar
            </p>
          </div>
          {accountEmail ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Conta</dt>
              <dd className="truncate font-medium text-foreground">{maskEmail(accountEmail)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {/* Teu plano */}
      <section className="mt-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-base font-semibold text-foreground">Teu plano</h2>
          <Badge className="bg-accent text-accent-foreground hover:bg-accent">{planName}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Rápido, fácil e seguro</p>
        <ul className="mt-4 space-y-3 text-sm">
          <UsageRow
            label="Roupas fotografadas"
            used={usage?.photos_processed ?? 0}
            limit={plan?.monthly_photo_limit ?? 0}
            detail={`${formatKz(stockValue)} em stock`}
          />
          <UsageRow
            label="Looks prontos para vender"
            used={usage?.looks_generated ?? 0}
            limit={plan?.monthly_look_limit ?? 0}
          />
        </ul>
        <div className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-xs font-medium text-success">
          ✅ Backup seguro — teu stock guardado mesmo se perderes o telefone
        </div>
      </section>

      {/* Ajuda rápida */}
      <section className="mt-4 rounded-2xl border bg-card p-5">
        <h2 className="font-display text-base font-semibold text-foreground">Ajuda rápida</h2>
        <div className="mt-4 space-y-3">
          <Button
            className="min-h-12 w-full justify-start bg-success text-success-foreground hover:bg-success/90"
            asChild
          >
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Preciso de ajuda com a SUCAR.")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4" />
              Falar com suporte no WhatsApp
            </a>
          </Button>
          <Button
            variant="outline"
            className="min-h-12 w-full justify-start"
            onClick={() => setHelpOpen(true)}
          >
            <Camera className="size-4" />
            Ver como postar em 30s
          </Button>
        </div>
      </section>

      {/* Preferências e sessão */}
      <section className="mt-6 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-10 w-full justify-center text-muted-foreground hover:text-foreground"
          onClick={toggle}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-10 w-full justify-center text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="size-4" />
          {signingOut ? "A terminar sessão…" : "Terminar sessão"}
        </Button>
      </section>

      {/* Como postar em 30s */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Como postar em 30 segundos</DialogTitle>
            <DialogDescription>Três passos simples, sem complicações.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-4 text-sm">
            <HelpStep
              number={1}
              title="Tira foto do teu stock"
              text="Na aba Stock, fotografia as roupas como estão, mesmo amontoadas."
              icon={<Camera className="size-4" />}
            />
            <HelpStep
              number={2}
              title="Nós criamos os looks"
              text="Em 15 segundos tens 3 combinações com preço e legenda prontos."
              icon={<Copy className="size-4" />}
            />
            <HelpStep
              number={3}
              title="Copia e publica"
              text="Copia para o WhatsApp e publica. Só depois é que o teu WhatsApp aparece."
              icon={<MessageCircle className="size-4" />}
            />
          </ol>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function UsageRow({
  label,
  used,
  limit,
  detail,
}: {
  label: string;
  used: number;
  limit: number;
  /** Texto extra à direita, ex.: "0 Kz em stock". */
  detail?: string;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <li>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-right font-medium text-foreground">
          {used} de {limit}
          {detail ? <span className="text-muted-foreground"> | {detail}</span> : null}
        </span>
      </div>
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
    </li>
  );
}

function HelpStep({
  number,
  title,
  text,
  icon,
}: {
  number: number;
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
        {number}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </p>
        <p className="mt-1 text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}
