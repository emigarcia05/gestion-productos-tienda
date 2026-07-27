"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import CuentagotasImagenMuestra from "@/components/asistente-ia/CuentagotasImagenMuestra";
import GestionarProdIaDisenoPrompModal from "@/components/asistente-ia/GestionarProdIaDisenoPrompModal";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { Button } from "@/components/ui/button";
import { aplicarRgbAlPromptBuscarColor } from "@/lib/asistenteIa";
import type {
  AsistenteIaConfigSubmodulo,
  ProdIaDisenoPrompItem,
} from "@/lib/asistenteIa";
import type { RgbColor } from "@/lib/colorMuestraImagen";
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
  const [gestionarOpen, setGestionarOpen] = useState(false);
  const [colorMuestra, setColorMuestra] = useState<RgbColor | null>(null);
  const [ultimoPrompt, setUltimoPrompt] = useState("");

  const url = config.urlRedireccion;
  const plantilla = config.promp;

  async function handleColorPicked(color: RgbColor) {
    if (!plantilla.trim()) {
      toast.error("Falta Prompt", {
        description: "Configuralo en GESTION PROMP & URL.",
      });
      return;
    }
    if (!url.trim()) {
      toast.error("Falta Url", {
        description: "Configurala en GESTION PROMP & URL.",
      });
      return;
    }

    const prompt = aplicarRgbAlPromptBuscarColor(plantilla, color);
    setUltimoPrompt(prompt);

    try {
      await navigator.clipboard.writeText(prompt);
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Prompt Copiado", {
        description: "Pegalo en ChatGPT (Ctrl+V).",
      });
    } catch {
      toast.error("No Se Pudo Copiar El Prompt", {
        description:
          "El prompt está abajo: copialo manualmente y abrí la URL configurada.",
      });
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
              GESTION PROMP & URL
            </Button>
          ) : null
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6 pt-2">
          <p className={cn(CALLOUT_WARNING_CLASS, "shrink-0")}>
            Abrí una imagen muestra y hacé clic en el color. Se reemplaza{" "}
            <span className="font-semibold font-mono">{"{{RGB}}"}</span> en el
            prompt del módulo, se copia al portapapeles y se abre la URL
            configurada. La imagen no se guarda en el servidor.
          </p>

          <CuentagotasImagenMuestra
            color={colorMuestra}
            onColorChange={setColorMuestra}
            onColorPicked={(c) => void handleColorPicked(c)}
          />

          {ultimoPrompt ? (
            <div className="flex shrink-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">
                Último Prompt Copiado
              </p>
              <pre
                className={cn(
                  "whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3",
                  "text-sm text-foreground",
                )}
              >
                {ultimoPrompt}
              </pre>
              <p className="text-xs text-muted-foreground">
                URL: {url || "Sin URL configurada."}
              </p>
            </div>
          ) : null}
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
