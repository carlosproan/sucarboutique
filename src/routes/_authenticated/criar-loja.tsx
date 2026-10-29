import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getMyStore, createStore } from "@/server/stores";
import { StoreForm } from "@/components/store-form";
import { BrandMark } from "@/components/brand";

export const Route = createFileRoute("/_authenticated/criar-loja")({
  loader: async () => {
    const overview = await getMyStore();
    if (overview.store) {
      throw new (await import("@tanstack/react-router")).redirect({ to: "/stock" });
    }
    return null;
  },
  component: CriarLojaPage,
});

function CriarLojaPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <BrandMark className="mb-8" />
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Cria a tua loja
          </h1>
          <p className="mt-1 mb-6 text-sm leading-relaxed text-muted-foreground">
            Conta-nos como se chama a tua boutique para começares.
          </p>
          <StoreForm
            submitLabel="Criar loja"
            pendingMessage="A criar a tua loja…"
            onSave={async (values) => {
              await createStore({ data: values });
              navigate({ to: "/stock", replace: true });
            }}
          />
        </div>
      </div>
    </div>
  );
}
