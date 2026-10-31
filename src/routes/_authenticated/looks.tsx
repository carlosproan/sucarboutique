import { useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getMyStore } from "@/lib/stores.functions";
import { getStockItems } from "@/lib/stock.functions";
import {
  buildLooks,
  copyText,
  lookCountLabel,
  type GeneratedLook,
} from "@/lib/looks-client";
import { formatKz } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export const Route = createFileRoute("/_authenticated/looks")({
  loader: async () => {
    const overview = await getMyStore();
    if (!overview.store) {
      throw redirect({ to: "/criar-loja" });
    }
    const { items } = await getStockItems();
    return { storeName: overview.store.name, items };
  },
  component: LooksPage,
  head: () => ({
    meta: [
      { title: "Looks · SUCAR Boutique" },
      {
        name: "description",
        content: "Looks prontos para vender, criados com o teu stock.",
      },
    ],
  }),
});

const ctaClasses = "bg-cta text-cta-foreground hover:bg-cta/90";
const whatsappClasses = "bg-success text-success-foreground hover:bg-success/90";

/** Mini-cards de exemplo do estado vazio: borramos o texto, só para desejo. */
const EXAMPLE_LOOKS = [
  "Look 1: Blusa + Saia | Legenda pronta",
  "Look 2: Vestido completo | Preço já incluído",
  "Look 3: Combinação casual",
];

function LooksPage() {
  const { storeName, items } = Route.useLoaderData();
  const looks = useMemo(
    () => buildLooks(items, storeName),
    [items, storeName],
  );
  const [captionLook, setCaptionLook] = useState<GeneratedLook | null>(null);

  async function copyCaption(caption: string) {
    const copied = await copyText(caption);
    if (copied) {
      toast.success("Legenda copiada! Agora é só colar no WhatsApp.");
    } else {
      toast.error("Não conseguimos copiar. Tenta outra vez.");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Looks prontos para vender"
        subtitle="🔒 Só você vê até postar"
      />

      {items.length === 0 ? (
        <section className="space-y-6">
          <div className="rounded-2xl border border-dashed bg-card/50 px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary">
              <Sparkles className="size-6 text-cta" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Os teus looks vão aparecer aqui
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Assim que adicionares o teu stock, nós criamos 3 combinações com
              foto e legenda pronta para WhatsApp em 15 segundos.
            </p>

            <ul className="mt-6 space-y-2" aria-hidden="true">
              {EXAMPLE_LOOKS.map((text) => (
                <li
                  key={text}
                  className="flex items-center gap-2 rounded-xl border bg-card px-3 py-3 text-left"
                >
                  <Lock
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="select-none truncate text-sm text-muted-foreground blur-[3px]">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            asChild
            className={`min-h-14 w-full text-base font-semibold ${ctaClasses}`}
          >
            <Link to="/stock">📸 Adicionar meu stock agora</Link>
          </Button>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Rápido: 10 fotos viram 30 posts
            <br />
            Fácil: só copiar e colar
            <br />
            Seguro: teu stock fica só contigo
          </p>
        </section>
      ) : (
        <section aria-label="Looks criados">
          <p className="mb-4 text-sm font-medium text-muted-foreground" role="status">
            {lookCountLabel(looks.length)}
          </p>

          <ul className="space-y-3">
            {looks.map((look, index) => (
              <li
                key={`${look.name}-${index}`}
                className="flex gap-3 rounded-2xl border bg-card p-3"
              >
                <LookImage pieces={look.pieces} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <h2 className="font-display text-base font-semibold leading-snug text-foreground">
                    Look {index + 1}: {look.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {formatKz(look.totalPrice)}
                  </p>
                  <div className="mt-auto space-y-2 pt-3">
                    <Button
                      className={`min-h-11 w-full text-sm font-semibold ${whatsappClasses}`}
                      onClick={() => void copyCaption(look.caption)}
                    >
                      Copiar para WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-10 w-full text-sm"
                      onClick={() => setCaptionLook(look)}
                    >
                      Ver legenda
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Drawer open={captionLook !== null} onOpenChange={(open) => !open && setCaptionLook(null)}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DrawerTitle className="font-display text-base text-foreground">
              Legenda pronta para WhatsApp
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Copia e cola na conversa com as tuas clientes.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-secondary/50 p-3 font-sans text-sm leading-relaxed text-foreground">
              {captionLook?.caption ?? ""}
            </pre>
            <Button
              className={`min-h-12 w-full text-base font-semibold ${whatsappClasses}`}
              onClick={() => captionLook && void copyCaption(captionLook.caption)}
            >
              Copiar legenda
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}

/** Foto do look: as peças empilhadas (até 2) num quadradinho. */
function LookImage({ pieces }: { pieces: GeneratedLook["pieces"] }) {
  const photos = pieces
    .map((piece) => piece.photoUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 2);
  const extraCount = pieces.length - photos.length;

  return (
    <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border bg-secondary">
      {photos.length === 0 ? (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Sparkles className="size-5" aria-hidden="true" />
        </div>
      ) : photos.length === 1 ? (
        <img src={photos[0]} alt="" className="size-full object-cover" />
      ) : (
        <div className="grid size-full grid-rows-2 gap-px bg-border">
          {photos.map((url) => (
            <img key={url} src={url} alt="" className="size-full object-cover" />
          ))}
        </div>
      )}
      {extraCount > 0 ? (
        <span className="absolute bottom-1 right-1 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
          +{extraCount}
        </span>
      ) : null}
    </div>
  );
}
