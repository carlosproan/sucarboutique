import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Mensagem contextual do que está a acontecer. */
  message: string;
  fullScreen?: boolean;
  className?: string;
}

/** Carregamento com mensagem contextual, sem bloquear a app. */
export function LoadingState({ message, fullScreen, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        fullScreen && "min-h-[60vh]",
        className,
      )}
      role="status"
    >
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
