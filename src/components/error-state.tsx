import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

/** Estado de erro com mensagem clara e curta — nunca ecrã em branco. */
export function ErrorState({
  title = "Algo falhou",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border bg-card px-6 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
      </div>
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button className="mt-6 min-h-11 px-6" variant="outline" onClick={onRetry}>
          Tentar outra vez
        </Button>
      ) : null}
    </div>
  );
}
