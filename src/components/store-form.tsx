import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeWhatsapp } from "@/lib/format";
import { uploadStoreLogo } from "@/hooks/use-theme";

export interface StoreFormValues {
  name: string;
  logoUrl: string | null;
  instagram: string | null;
  whatsapp: string;
  city: string;
  currency: string;
}

export interface StoreFormInitial {
  name: string;
  logoUrl: string | null;
  logoSignedUrl?: string | null;
  instagram: string | null;
  /** WhatsApp normalizado (+244…). */
  whatsapp: string;
  city: string;
  currency: string;
}

interface StoreFormProps {
  initial?: StoreFormInitial;
  submitLabel: string;
  pendingMessage: string;
  onSave: (values: StoreFormValues) => Promise<void>;
}

/** Formulário da loja, partilhado pelo onboarding e pela edição. */
export function StoreForm({
  initial,
  submitLabel,
  pendingMessage,
  onSave,
}: StoreFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [instagram, setInstagram] = useState(initial?.instagram ?? "");
  const [whatsappLocal, setWhatsappLocal] = useState(
    initial?.whatsapp ? initial.whatsapp.replace(/^\+244/, "") : "",
  );
  const [city, setCity] = useState(initial?.city ?? "Luanda");
  const [currency, setCurrency] = useState(initial?.currency ?? "Kz");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initial?.logoSignedUrl ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(file: File | null) {
    setLogoFile(file);
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("O nome da loja é obrigatório.");
      return;
    }
    const whatsapp = normalizeWhatsapp(whatsappLocal);
    if (!whatsapp) {
      setError("Número de WhatsApp inválido. Exemplo: 923 456 789.");
      return;
    }

    setSaving(true);
    try {
      let logoUrl = initial?.logoUrl ?? null;
      if (logoFile) {
        setUploadingLogo(true);
        logoUrl = await uploadStoreLogo(logoFile);
        setUploadingLogo(false);
      }
      const trimmedInstagram = instagram.trim().replace(/^@+/, "");
      await onSave({
        name: name.trim(),
        logoUrl,
        instagram: trimmedInstagram.length > 0 ? trimmedInstagram : null,
        whatsapp,
        city: city.trim() || "Luanda",
        currency: currency.trim() || "Kz",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo falhou. Tenta outra vez.");
    } finally {
      setUploadingLogo(false);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border bg-secondary text-muted-foreground transition-colors hover:bg-accent"
          aria-label="Escolher logótipo da loja"
        >
          {logoPreview ? (
            <img src={logoPreview} alt="Pré-visualização do logótipo" className="size-full object-cover" />
          ) : (
            <Camera className="size-6" aria-hidden="true" />
          )}
        </button>
        <span className="text-xs text-muted-foreground">Logótipo (opcional)</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
        />
        {uploadingLogo ? (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> A enviar o logótipo…
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="store-name">Nome da loja *</Label>
        <Input
          id="store-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Boutique Kianda"
          required
          className="min-h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="store-instagram">Instagram (opcional)</Label>
        <Input
          id="store-instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@sualoja"
          inputMode="text"
          autoCapitalize="none"
          className="min-h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="store-whatsapp">WhatsApp *</Label>
        <div className="flex items-center gap-2">
          <span className="flex min-h-11 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
            +244
          </span>
          <Input
            id="store-whatsapp"
            value={whatsappLocal}
            onChange={(e) => setWhatsappLocal(e.target.value.replace(/[^\d\s-]/g, ""))}
            placeholder="923 456 789"
            inputMode="tel"
            autoComplete="tel"
            required
            className="min-h-11 flex-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="store-city">Cidade</Label>
          <Input
            id="store-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="min-h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="store-currency">Moeda</Label>
          <Input
            id="store-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="min-h-11"
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="min-h-12 w-full text-base" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {pendingMessage}
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
