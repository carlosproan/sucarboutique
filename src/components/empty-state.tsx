import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message: string;
  className?: string;
}

/** Estado vazio honesto: sem dados fictícios, só o que ainda não existe. */
export function EmptyState({ icon: Icon, title, message, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary">
          <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
      ) : null}
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}
