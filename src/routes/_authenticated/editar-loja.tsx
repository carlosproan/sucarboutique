import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { getMyStore, updateStore } from "@/lib/stores.functions";
import { StoreForm } from "@/components/store-form";
import { PageHeader } from "@/components/page-header";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/editar-loja")({
  loader: async () => {
    const overview = await getMyStore();
    if (!overview.store) {
      throw redirect({ to: "/criar-loja" });
    }
    return overview;
  },
  component: EditarLojaPage,
});

function EditarLojaPage() {
  const navigate = useNavigate();
  const overview = Route.useLoaderData();
  const { store } = overview;
  // O loader redireciona quando não há loja; esta guarda é só para o TypeScript.
  if (!store) return null;

  return (
    <AppShell>
      <PageHeader title="Editar loja" onBack={() => navigate({ to: "/perfil" })} />
      <StoreForm
        initial={{
          name: store.name,
          logoUrl: store.logo_url,
          logoSignedUrl: overview.logoUrl,
          instagram: store.instagram,
          whatsapp: store.whatsapp,
          city: store.city,
          currency: store.currency,
        }}
        submitLabel="Guardar alterações"
        pendingMessage="A guardar…"
        onSave={async (values) => {
          await updateStore({ data: values });
          navigate({ to: "/perfil", replace: true });
        }}
      />
    </AppShell>
  );
}
