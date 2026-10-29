import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Shirt, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/stock", label: "Stock", icon: Shirt },
  { to: "/looks", label: "Looks", icon: Sparkles },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

/**
 * Estrutura da app: conteúdo numa coluna mobile-first (base 375px)
 * com navegação inferior fixa. Áreas de toque com mínimo 44px.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md">
      <main className="px-4 pb-28 pt-6">{children}</main>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-3">
          {TABS.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className={cn("font-medium", active && "font-semibold")}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
