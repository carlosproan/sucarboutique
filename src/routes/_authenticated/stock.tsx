import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shirt } from "lucide-react";
import { getMyStore } from "@/lib/stores.functions";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/stock")({
  loader: async () => {
    const overview = await getMyStore();
    if (!overview.store) {
      throw redirect({ to: "/criar-loja" });
    }
    return overview;
  },
  component: StockPage,
  head: () => ({
    meta: [
      { title: "Stock · SUCAR Boutique" },
      { name: "description", content: "As peças da tua boutique na SUCAR Boutique." },
    ],
  }),
});

function StockPage() {
  return (
    <AppShell>
      <PageHeader title="Stock" />
      <EmptyState
        icon={Shirt}
        title="Ainda não tens peças"
        message="Em breve vais poder enviar uma foto do teu cabide ou mesa."
      />
    </AppShell>
  );
}
