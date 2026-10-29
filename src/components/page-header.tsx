import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
  className?: string;
}

/** Cabeçalho de página editorial com título serif. */
export function PageHeader({ title, subtitle, action, onBack, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-2">
        {onBack ? (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 mt-0.5 size-11 shrink-0"
            onClick={onBack}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5" />
          </Button>
        ) : null}
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0 pt-1">{action}</div> : null}
    </header>
  );
}
