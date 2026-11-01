import { useRef, useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, Camera, ImageOff, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getMyStore } from "@/lib/stores.functions";
import { getStockItems, saveStockItems } from "@/lib/stock.functions";
import {
  cropToSquareJpeg,
  parsePriceKz,
  planPhotoBatch,
  STOCK_CATEGORIES,
  STOCK_SIZES,
  sumStockValue,
  type StockCategory,
  type StockSize,
} from "@/lib/stock-client";
import { formatKz } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/stock")({
  loader: async () => {
    const overview = await getMyStore();
    if (!overview.store) {
      throw redirect({ to: "/criar-loja" });
    }
    const { items } = await getStockItems();
    return { items };
  },
  component: StockPage,
  head: () => ({
    meta: [
      { title: "Meu Stock · SUCAR Boutique" },
      {
        name: "description",
        content: "Fotografia o stock da tua boutique e guarda peça por peça.",
      },
    ],
  }),
});

interface StockDraft {
  id: string;
  dataUrl: string;
  category: StockCategory | "";
  size: StockSize;
  price: string;
}

const ctaClasses = "bg-cta text-cta-foreground hover:bg-cta/90";

function StockPage() {
  const router = useRouter();
  const { items } = Route.useLoaderData();
  const saveStock = useServerFn(saveStockItems);

  const [pending, setPending] = useState<StockDraft[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProcessing(true);
    try {
      const crops: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        try {
          crops.push(await cropToSquareJpeg(file));
        } catch {
          // Ficheiro ilegível: ignora e segue com as restantes.
        }
      }
      if (crops.length === 0) {
        toast.error("Não conseguimos ler essas fotos. Tenta outra vez.");
        return;
      }
      const { accepted, rejected } = planPhotoBatch(pending.length, crops.length);
      if (rejected > 0) {
        toast.error(
          accepted === 0
            ? "Podes escolher até 10 fotos de cada vez."
            : `Máximo de 10 fotos por vez: ${accepted} prontas, ${rejected} ficaram de fora.`,
        );
      }
      const drafts: StockDraft[] = crops.slice(0, accepted).map((dataUrl) => ({
        id: crypto.randomUUID(),
        dataUrl,
        category: "",
        size: "M",
        price: "",
      }));
      setPending((current) => [...current, ...drafts]);
      if (accepted > 0) {
        toast.success(
          `${accepted} ${accepted === 1 ? "foto pronta" : "fotos prontas"}. Confirma o tipo e o preço.`,
        );
      }
    } finally {
      setProcessing(false);
    }
  }

  function updateDraft(id: string, patch: Partial<Omit<StockDraft, "id" | "dataUrl">>) {
    setPending((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  }

  async function handleSave() {
    if (pending.length === 0 || saving) return;
    if (pending.some((draft) => draft.category === "")) {
      toast.error("Escolhe o tipo de cada peça antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      const { saved } = await saveStock({
        data: {
          items: pending.map((draft) => ({
            photoDataUrl: draft.dataUrl,
            category: draft.category as StockCategory,
            size: draft.size,
            price: parsePriceKz(draft.price),
          })),
        },
      });
      toast.success(`Stock salvo: ${saved} ${saved === 1 ? "peça" : "peças"}.`);
      setPending([]);
      await router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o stock. Tenta outra vez.",
      );
    } finally {
      setSaving(false);
    }
  }

  const itemCount = items.length;

  return (
    <AppShell>
      {/* Hidden inputs: galeria (até 10 de uma vez) e câmara */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {/* Escolha: câmara agora ou galeria */}
      <Drawer open={pickerOpen} onOpenChange={setPickerOpen}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DrawerTitle className="font-display text-base text-foreground">
              Como queres adicionar as fotos?
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Podes escolher até 10 fotos de cada vez.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-2 px-4 pb-6">
            <Button
              className={`min-h-12 w-full text-base font-semibold ${ctaClasses}`}
              onClick={() => {
                setPickerOpen(false);
                cameraInputRef.current?.click();
              }}
            >
              📷 Tirar foto agora
            </Button>
            <Button
              variant="outline"
              className="min-h-12 w-full text-base"
              onClick={() => {
                setPickerOpen(false);
                galleryInputRef.current?.click();
              }}
            >
              🖼️ Escolher da galeria
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <PageHeader
        title="Meu Stock"
        subtitle="🔒 Seguro: só você vê"
        action={
          <Badge
            className="bg-secondary text-secondary-foreground hover:bg-secondary"
            aria-label={`${itemCount} peças no stock`}
          >
            {itemCount} {itemCount === 1 ? "peça" : "peças"}
          </Badge>
        }
      />

      {processing ? (
        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          A preparar as fotos…
        </p>
      ) : null}

      {/* Fotos escolhidas, à espera dos 3 campos rápidos */}
      {pending.length > 0 ? (
        <section aria-label="Fotos selecionadas" className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {pending.length} {pending.length === 1 ? "foto pronta" : "fotos prontas"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 px-3 text-muted-foreground"
              onClick={() => setPending([])}
              disabled={saving}
            >
              Limpar
            </Button>
          </div>
          <ul className="space-y-3">
            {pending.map((draft) => (
              <li key={draft.id} className="flex gap-3 rounded-2xl border bg-card p-3">
                <img
                  src={draft.dataUrl}
                  alt={`Foto da peça ${draft.category || "sem tipo"}`}
                  className="size-24 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      {...(draft.category ? { value: draft.category } : {})}
                      onValueChange={(value) =>
                        updateDraft(draft.id, { category: value as StockCategory })
                      }
                    >
                      <SelectTrigger className="min-h-10 w-full" aria-label="Tipo da peça">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {STOCK_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={draft.size}
                      onValueChange={(value) => updateDraft(draft.id, { size: value as StockSize })}
                    >
                      <SelectTrigger className="min-h-10 w-full" aria-label="Tamanho da peça">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STOCK_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    value={draft.price}
                    onChange={(event) =>
                      updateDraft(draft.id, {
                        price: event.target.value.replace(/[^\d.,\s]/g, ""),
                      })
                    }
                    placeholder="Preço Kz"
                    inputMode="decimal"
                    aria-label="Preço em Kwanza"
                    className="min-h-10"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPending((current) => current.filter((d) => d.id !== draft.id))}
                  className="flex size-9 shrink-0 items-center justify-center self-start rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Remover esta foto"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <Button
            className={`mt-5 min-h-14 w-full text-base font-semibold ${ctaClasses}`}
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                A guardar…
              </>
            ) : (
              "Salvar stock"
            )}
          </Button>
        </section>
      ) : null}

      {/* Estado vazio: ainda não há peças nem fotos escolhidas */}
      {pending.length === 0 && itemCount === 0 ? (
        <>
          <section className="rounded-3xl border-2 border-dashed bg-card/60 px-6 py-10 text-center">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-secondary">
              <Camera className="size-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Ainda não tens peças
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Tira foto das tuas roupas como estão, mesmo amontoadas. Nós separamos peça por peça.
            </p>
            <Button
              className={`mt-6 min-h-14 w-full rounded-xl text-base font-semibold ${ctaClasses}`}
              onClick={() => setPickerOpen(true)}
            >
              📸 Tirar foto do meu stock
            </Button>
          </section>
          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Pode ser foto do cabide cheio, da cama ou do chão. Não precisa arrumar.
          </p>
        </>
      ) : null}

      {/* Peças já salvas */}
      {itemCount > 0 ? (
        <section aria-label="Peças salvas">
          <ul className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-2xl border bg-card">
                <div className="aspect-square bg-muted">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={`${item.category} tamanho ${item.size}`}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <ImageOff className="size-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-foreground">{item.category}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <Badge variant="secondary">{item.size}</Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatKz(item.price)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {pending.length === 0 ? (
            <Button
              variant="outline"
              className="mt-4 min-h-12 w-full"
              onClick={() => galleryInputRef.current?.click()}
            >
              <Plus className="size-4" aria-hidden="true" />
              Adicionar mais fotos
            </Button>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}
