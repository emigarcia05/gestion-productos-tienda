"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCopy, ImageSearch, Settings2 } from "lucide-react";
import { toast } from "sonner";
import GestionarProdIaDisenoPrompModal from "@/components/asistente-ia/GestionarProdIaDisenoPrompModal";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { Button } from "@/components/ui/button";
import type {
  AsistenteIaConfigSubmodulo,
  ProdIaDisenoPrompItem,
} from "@/lib/asistenteIa";
import { CALLOUT_WARNING_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  config: AsistenteIaConfigSubmodulo;
  catalogoInicial: ProdIaDisenoPrompItem[];
  esEditor: boolean;
}

export default function AsistenteIaBuscarColorImagenPageClient({
  config,
  catalogoInicial,
  esEditor,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [gestionarOpen, setGestionarOpen] = useState(false);

  const prompt = config.promp;
  const url = config.urlRedireccion;

  async function handleBuscarColorDesdeImagen() {
    if (!prompt.trim() || !url.trim()) {
      toast.error("Falta Prompt O Url", {
        description: "Configuralos en Gestionar Promo Y Url.",
      });
      return;
    }
    setBusy(true);
    try {
      await navigator.clipboard.writeText(prompt);
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Prompt Copiado", {
        description: "Pegalo en ChatGPT junto con la imagen del color.",
      });
    } catch {
      toast.error("No Se Pudo Copiar El Prompt", {
        description: "Copiá el texto de la pantalla y abrí ChatGPT manualmente.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ClassicFilteredTableLayout
        title="Asistente IA"
        subtitle="Buscar Color Desde Imagen"
        contentWidth="default"
        actions={
          esEditor ? (
            <Button
              type="button"
              className="h-10 px-4"
              onClick={() => setGestionarOpen(true)}
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              Gestionar Promo Y Url
            </Button>
          ) : null
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6 pt-2">
          <p className={cn(CALLOUT_WARNING_CLASS, "shrink-0")}>
            Se copia el prompt configurado en{" "}
            <span className="font-semibold">prod_ia_diseno_promp</span> y se abre
            la URL de redirección. Adjuntá la imagen en ChatGPT y pegá el prompt
            (Ctrl+V).
          </p>

          <div className="flex shrink-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">Prompt Actual</p>
            <pre
              className={cn(
                "whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3",
                "text-sm text-foreground",
              )}
            >
              {prompt || "Sin prompt configurado."}
            </pre>
            <p className="text-xs text-muted-foreground">
              URL: {url || "Sin URL configurada."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="h-10 px-4"
                disabled={busy || !prompt.trim() || !url.trim()}
                onClick={() => void handleBuscarColorDesdeImagen()}
              >
                <ImageSearch className="h-4 w-4" aria-hidden />
                Buscar Color Desde Imagen
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4"
                disabled={busy || !prompt.trim()}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(prompt);
                    toast.success("Prompt Copiado");
                  } catch {
                    toast.error("No Se Pudo Copiar El Prompt");
                  }
                }}
              >
                <ClipboardCopy className="h-4 w-4" aria-hidden />
                Solo Copiar Prompt
              </Button>
            </div>
          </div>
        </div>
      </ClassicFilteredTableLayout>

      {esEditor ? (
        <GestionarProdIaDisenoPrompModal
          open={gestionarOpen}
          onOpenChange={setGestionarOpen}
          itemsIniciales={catalogoInicial}
          esEditor={esEditor}
          onCatalogoChanged={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
