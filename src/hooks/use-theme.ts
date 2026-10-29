import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sucar-theme";

/** Aplica o tema guardado no arranque (chamado uma vez na raiz). */
export function applyStoredTheme() {
  if (typeof document === "undefined") return;
  const stored = localStorage.getItem(STORAGE_KEY);
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const theme = stored === "dark" || (stored === null && prefersDark) ? "dark" : "light";
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Alterna modo claro/escuro e guarda a escolha. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  return { theme, toggle };
}

/** Envia o logótipo para o bucket privado `logos`, na pasta da utilizadora. */
export async function uploadStoreLogo(file: File): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("A sessão expirou. Entra outra vez.");
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
  const path = `${data.user.id}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("logos")
    .upload(path, file, { contentType: file.type || "image/png" });
  if (error) throw new Error("Não foi possível enviar o logótipo. Tenta outra vez.");
  return path;
}
