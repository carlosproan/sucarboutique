import { cn } from "@/lib/utils";

/** Marca da SUCAR Boutique: serif editorial + detalhe terracota. */
export function BrandMark({ className, size = "lg" }: { className?: string; size?: "lg" | "sm" }) {
  return (
    <div className={cn("text-center", className)}>
      <p
        className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          size === "lg" ? "text-4xl" : "text-2xl",
        )}
      >
        SUCAR
        <span className="text-primary">.</span>
      </p>
      <p
        className={cn(
          "mt-1 font-medium uppercase tracking-[0.35em] text-muted-foreground",
          size === "lg" ? "text-[11px]" : "text-[10px]",
        )}
      >
        Boutique
      </p>
    </div>
  );
}
