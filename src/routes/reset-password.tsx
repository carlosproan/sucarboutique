import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand";
import { LoadingState } from "@/components/loading-state";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Nova palavra-passe · SUCAR Boutique" },
      {
        name: "description",
        content: "Cria uma palavra-passe nova para a tua conta SUCAR Boutique.",
      },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // O link de recuperação chega com sessão temporária no fragmento (#).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) setState("ready");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      if (!cancelled) setState("invalid");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    setPending(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (err) {
      setError(
        err.message.toLowerCase().includes("rate limit")
          ? "Muitas tentativas. Espera um pouco e tenta de novo."
          : "Não foi possível guardar a palavra-passe. Pede um link novo.",
      );
      return;
    }
    navigate({ to: "/stock", replace: true });
  }

  if (state === "checking") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <BrandMark className="mb-8" />
        <LoadingState message="A verificar o link de recuperação…" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <BrandMark className="mb-8" />
          <div className="rounded-2xl border bg-card p-8">
            <h1 className="font-display text-xl font-semibold text-foreground">
              Link inválido ou expirado
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pede um link de recuperação novo e tenta outra vez.
            </p>
            <Button asChild className="mt-6 min-h-11 w-full">
              <Link to="/auth">Voltar ao início de sessão</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <BrandMark className="mb-8" />
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="font-display text-xl font-semibold text-foreground">
            Nova palavra-passe
          </h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Escolhe uma palavra-passe nova para a tua conta.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="reset-password">Palavra-passe nova</Label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Confirmar palavra-passe</Label>
              <Input
                id="reset-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                className="min-h-11"
              />
            </div>
            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="min-h-12 w-full text-base" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  A guardar…
                </>
              ) : (
                "Guardar palavra-passe"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
