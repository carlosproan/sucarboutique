import { createFileRoute, redirect } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { getMyStore } from "@/server/stores";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/looks")({
  loader: async () => {
    const overview = await getMyStore();
    if (!overview.store) {
      throw redirect({ to: "/criar-loja" });
    }
    return overview;
  },
  component: LooksPage,
  head: () => ({
    meta: [
      { title: "Looks · SUCAR Boutique" },
      { name: "description", content: "Os looks gerados a partir do teu stock." },
    ],
  }),
});

function LooksPage() {
  return (
    <AppShell>
      <PageHeader title="Looks" />
      <EmptyState
        icon={Sparkles}
        title="Ainda não tens looks"
        message="Os teus looks aparecem aqui quando tiveres stock."
      />
    </AppShell>
  );
}
