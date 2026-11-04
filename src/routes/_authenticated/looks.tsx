import { useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getMyStore } from "@/lib/stores.functions";
import { getStockItems } from "@/lib/stock.functions";
import { generateAiLooks } from "@/lib/looks.functions";
import {
  AI_OCCASIONS,
  AI_STYLES,
  aiLookCaption,
  type AiLookPreview,
} from "@/lib/looks-ai";
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
    const { name, whatsapp, city } = overview.store;
    return { store: { name, whatsapp, city }, items };
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
  const { store, items } = Route.useLoaderData();
  const looks = useMemo(
    () => buildLooks(items, store),
    [items, store],
  );
  const [piecesLook, setPiecesLook] = useState<
    Pick<GeneratedLook, "pieces" | "totalPrice"> | null
  >(null);
  const [occasion, setOccasion] = useState<string>(AI_OCCASIONS[0]);
  const [style, setStyle] = useState<string>(AI_STYLES[0]);
  const [aiLooks, setAiLooks] = useState<AiLookPreview[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const generateAiFn = useServerFn(generateAiLooks);

  const canUseAi = items.length >= 2;

  async function generateAi() {
    setAiBusy(true);
    try {
      const { looks: result } = await generateAiFn({ data: { occasion, style } });
      setAiLooks(result);
      toast.success(
        `${result.length} ${result.length === 1 ? "look criado" : "looks criados"} com IA!`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível criar os looks agora. Tenta outra vez.",
      );
    } finally {
      setAiBusy(false);
    }
  }

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

      {canUseAi && (
        <section aria-label="Looks feitos à tua medida" className="mb-6 space-y-3">
          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-cta" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-foreground">
                Looks feitos à tua medida
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Diz a ocasião e o estilo — nós combinamos as tuas peças com IA.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                Ocasião
                <select
                  value={occasion}
                  onChange={(event) => setOccasion(event.target.value)}
                  className="w-full rounded-lg border bg-secondary px-2.5 py-2.5 text-sm text-foreground"
                  disabled={aiBusy}
                >
                  {AI_OCCASIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                Estilo
                <select
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                  className="w-full rounded-lg border bg-secondary px-2.5 py-2.5 text-sm text-foreground"
                  disabled={aiBusy}
                >
                  {AI_STYLES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button
              className={`min-h-12 w-full text-sm font-semibold ${ctaClasses}`}
              disabled={aiBusy}
              onClick={() => void generateAi()}
            >
              {aiBusy ? "✨ A criar os teus looks…" : "✨ Criar looks com IA"}
            </Button>
          </div>

          {aiLooks.length > 0 && (
            <ul className="space-y-3">
              {aiLooks.map((look, index) => (
                <li
                  key={`${look.name}-${index}`}
                  className="flex gap-3 rounded-2xl border bg-card p-3"
                >
                  <LookImage pieces={look.pieces} totalPrice={look.totalPrice} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="font-display text-base font-semibold leading-snug text-foreground">
                      {look.name}
                    </h3>
                    {look.note && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {look.note}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {formatKz(look.totalPrice)}
                    </p>
                    <div className="mt-auto space-y-2 pt-3">
                      <Button
                        className={`min-h-12 w-full text-sm font-semibold ${whatsappClasses}`}
                        onClick={() => void copyCaption(aiLookCaption(look, store))}
                      >
                        Copiar legenda + preço para WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-10 w-full text-sm"
                        onClick={() => setPiecesLook(look)}
                      >
                        Ver peças desse look
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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
                <LookImage pieces={look.pieces} totalPrice={look.totalPrice} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <h2 className="font-display text-base font-semibold leading-snug text-foreground">
                    Look {index + 1}: {look.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {formatKz(look.totalPrice)}
                  </p>
                  <div className="mt-auto space-y-2 pt-3">
                    <Button
                      className={`min-h-12 w-full text-sm font-semibold ${whatsappClasses}`}
                      onClick={() => void copyCaption(look.caption)}
                    >
                      Copiar legenda + preço para WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-10 w-full text-sm"
                      onClick={() => setPiecesLook(look)}
                    >
                      Ver peças desse look
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Drawer open={piecesLook !== null} onOpenChange={(open) => !open && setPiecesLook(null)}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DrawerTitle className="font-display text-base text-foreground">
              Peças desse look
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Preços das peças que compõem o look.
            </DrawerDescription>
          </DrawerHeader>
          <ul className="space-y-2 px-4">
            {piecesLook?.pieces.map((piece) => (
              <li
                key={piece.id}
                className="flex items-center justify-between gap-4 rounded-xl border bg-card px-3 py-2.5 text-sm"
              >
                <span className="text-foreground">
                  {piece.category}{" "}
                  <span className="text-muted-foreground">· {piece.size}</span>
                </span>
                <span className="font-semibold text-foreground">{formatKz(piece.price)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between px-4 pb-6 pt-3 text-sm font-semibold">
            <span className="text-muted-foreground">TOTAL LOOK</span>
            <span className="text-foreground">{formatKz(piecesLook?.totalPrice ?? 0)}</span>
          </div>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}

/** Foto do look com a tarja do total no canto inferior direito. */
function LookImage({
  pieces,
  totalPrice,
}: {
  pieces: GeneratedLook["pieces"];
  totalPrice: number;
}) {
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
        <span className="absolute bottom-5 right-1 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
          +{extraCount}
        </span>
      ) : null}
      <span
        className="absolute inset-x-0 bottom-0 bg-background/90 px-1.5 py-0.5 text-right text-[10px] font-bold text-foreground"
        aria-label={`Total do look: ${formatKz(totalPrice)}`}
      >
        TOTAL LOOK: {formatKz(totalPrice)}
      </span>
    </div>
  );
}
