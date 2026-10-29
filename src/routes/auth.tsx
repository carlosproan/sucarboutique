import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar · SUCAR Boutique" },
      {
        name: "description",
        content: "Entra na SUCAR Boutique ou cria a conta da tua boutique.",
      },
    ],
  }),
});

type Mode = "signin" | "signup" | "forgot";

function mapAuthError(message: string, mode: Mode): string {
  if (mode === "signin") {
    if (message.includes("Invalid login credentials")) {
      return "Email ou palavra-passe incorretos.";
    }
    if (message.includes("Email not confirmed")) {
      return "Confirma o teu email antes de entrar.";
    }
  }
  if (mode === "signup" && message.includes("already registered")) {
    return "Já existe uma conta com este email. Entra.";
  }
  if (message.toLowerCase().includes("rate limit")) {
    return "Muitas tentativas. Espera um pouco e tenta de novo.";
  }
  return "Não foi possível concluir. Verifica os dados e tenta outra vez.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState<string | null>(null);

  // Já com sessão (ex.: acabou de confirmar o email) → entra direto.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/stock", replace: true });
    });
  }, [navigate]);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setPending(false);
    if (err) {
      setError(mapAuthError(err.message, "signin"));
      return;
    }
    navigate({ to: "/stock", replace: true });
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setPending(false);
    if (err) {
      setError(mapAuthError(err.message, "signup"));
      return;
    }
    if (data.session) {
      navigate({ to: "/stock", replace: true });
      return;
    }
    // Email de confirmação enviado: só entra depois de confirmar.
    setAwaitingConfirm(email.trim());
  }

  async function handleForgot(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    if (err) {
      setError("Não foi possível enviar o email. Tenta outra vez.");
      return;
    }
    setInfo("Enviámos um link de recuperação para o teu email.");
  }

  if (awaitingConfirm) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <BrandMark className="mb-8" />
          <div className="rounded-2xl border bg-card p-8">
            <MailCheck className="mx-auto size-10 text-primary" aria-hidden="true" />
            <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
              Verifica o teu email
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Enviámos um link de confirmação para{" "}
              <span className="font-medium text-foreground">{awaitingConfirm}</span>.
              Confirma a conta para entrares na app.
            </p>
            <Button
              variant="outline"
              className="mt-6 min-h-11 w-full"
              onClick={() => {
                setAwaitingConfirm(null);
                setMode("signin");
              }}
            >
              Voltar
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
          {mode !== "forgot" ? (
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["signin", "signup"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    setError(null);
                    setInfo(null);
                  }}
                  className={
                    "min-h-10 rounded-md text-sm font-medium transition-colors " +
                    (mode === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {value === "signin" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={mode === "signin" ? handleSignIn : mode === "signup" ? handleSignUp : handleForgot}
            className="space-y-4"
            noValidate
          >
            {mode === "forgot" ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Escreve o teu email e enviámos um link para criares uma palavra-passe nova.
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="oteuemail@exemplo.ao"
                autoComplete="email"
                autoCapitalize="none"
                required
                className="min-h-11"
              />
            </div>

            {mode !== "forgot" ? (
              <div className="space-y-2">
                <Label htmlFor="auth-password">Palavra-passe</Label>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "A tua palavra-passe"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  className="min-h-11"
                />
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {info ? (
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground" role="status">
                {info}
              </p>
            ) : null}

            <Button type="submit" className="min-h-12 w-full text-base" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Um momento…
                </>
              ) : mode === "signin" ? (
                "Entrar"
              ) : mode === "signup" ? (
                "Criar conta"
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>
          </form>

          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setInfo(null);
              }}
              className="mt-4 min-h-11 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Esqueci-me da palavra-passe
            </button>
          ) : null}
          {mode === "forgot" ? (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setInfo(null);
              }}
              className="mt-4 min-h-11 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Voltar ao início de sessão
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
