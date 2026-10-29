import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/brand";
import { LoadingState } from "@/components/loading-state";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SUCAR Boutique" },
      {
        name: "description",
        content:
          "Transforma o stock real da tua boutique em looks prontos para partilhar no WhatsApp e Instagram.",
      },
    ],
  }),
});

// Rota de entrada: com sessão vai para a app, sem sessão vai para o login.
function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      navigate({ to: data.session ? "/stock" : "/auth", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4">
      <BrandMark />
      <LoadingState message="A abrir a SUCAR Boutique…" />
    </div>
  );
}
