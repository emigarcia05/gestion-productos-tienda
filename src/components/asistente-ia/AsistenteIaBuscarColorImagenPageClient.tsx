"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileDown, ScanSearch, Settings2 } from "lucide-react";
import { toast } from "sonner";
import AsistenteIaFuncionTile from "@/components/asistente-ia/AsistenteIaFuncionTile";
import AsistenteIaProcesoPaso from "@/components/asistente-ia/AsistenteIaProcesoPaso";
import CuentagotasImagenMuestra, {
  type MuestraPuntoImagen,
} from "@/components/asistente-ia/CuentagotasImagenMuestra";
import GestionarProdIaDisenoPrompModal from "@/components/asistente-ia/GestionarProdIaDisenoPrompModal";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { Button } from "@/components/ui/button";
import {
  ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN,
  aplicarRgbAlPromptBuscarColor,
} from "@/lib/asistenteIa";
import type {
  AsistenteIaConfigSubmodulo,
  ProdIaDisenoPrompItem,
} from "@/lib/asistenteIa";
import type { RgbColor } from "@/lib/colorMuestraImagen";
import { descargarPdfAproximacionCodigoImagen } from "@/lib/exportAproximacionCodigoPdfClient";
import { parseRespuestaIaCoincidencias } from "@/lib/parseRespuestaIaCoincidencias";
import { cn } from "@/lib/utils";

type VistaActiva = "hub" | "buscar-codigo";

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
  const [vista, setVista] = useState<VistaActiva>("hub");
  const [gestionarOpen, setGestionarOpen] = useState(false);
  const [colorMuestra, setColorMuestra] = useState<RgbColor | null>(null);
  const [metaMuestra, setMetaMuestra] = useState<MuestraPuntoImagen | null>(
    null,
  );
  const [paso1Completo, setPaso1Completo] = useState(false);
  const [respuestaIa, setRespuestaIa] = useState("");
  const [resetCuentagotas, setResetCuentagotas] = useState(0);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const url = config.urlRedireccion;
  const plantilla = config.promp;
  const tituloModulo = ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN;

  async function handleColorPicked(color: RgbColor, meta: MuestraPuntoImagen) {
    setMetaMuestra(meta);

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

    try {
      await navigator.clipboard.writeText(prompt);
      window.open(url, "_blank", "noopener,noreferrer");
      setPaso1Completo(true);
      toast.success("Prompt Copiado", {
        description: "Pegalo en ChatGPT (Ctrl+V). Luego pegá la respuesta abajo.",
      });
    } catch {
      setPaso1Completo(true);
      toast.error("No Se Pudo Copiar El Prompt", {
        description:
          "Abrí la URL configurada y pegá la respuesta de la IA en el paso 2.",
      });
    }
  }

  function handleColorChange(color: RgbColor | null) {
    setColorMuestra(color);
    if (color == null) {
      setPaso1Completo(false);
      setRespuestaIa("");
      setMetaMuestra(null);
    }
  }

  function volverAlHub() {
    setVista("hub");
    setColorMuestra(null);
    setMetaMuestra(null);
    setPaso1Completo(false);
    setRespuestaIa("");
    setResetCuentagotas((n) => n + 1);
  }

  async function handleGenerarPdf() {
    const texto = respuestaIa.trim();
    if (!texto) {
      toast.error("Falta Respuesta", {
        description: "Pegá la respuesta de la IA en el campo.",
      });
      return;
    }
    if (!colorMuestra || !metaMuestra) {
      toast.error("Falta Muestra", {
        description: "Completá el paso 1 (imagen y color) antes de generar el PDF.",
      });
      return;
    }

    const coincidencias = parseRespuestaIaCoincidencias(texto);
    if (coincidencias.length === 0) {
      toast.error("No Se Pudieron Leer Coincidencias", {
        description:
          "La respuesta debe incluir la tabla con Nombre, Código, Similitud, URL y RGB.",
      });
      return;
    }

    setGenerandoPdf(true);
    try {
      await descargarPdfAproximacionCodigoImagen({
        imagenDataUrl: metaMuestra.imagenDataUrl,
        imagenNaturalW: metaMuestra.imagenNaturalW,
        imagenNaturalH: metaMuestra.imagenNaturalH,
        muestra: {
          color: colorMuestra,
          x: metaMuestra.x,
          y: metaMuestra.y,
        },
        coincidencias,
      });
      toast.success("Pdf Generado", {
        description: "Se descargó el informe de aproximación.",
      });
    } catch (err) {
      toast.error("No Se Pudo Generar El Pdf", {
        description: err instanceof Error ? err.message : "Error desconocido.",
      });
    } finally {
      setGenerandoPdf(false);
    }
  }

  return (
    <>
      <ClassicFilteredTableLayout
        title="Asistente IA"
        subtitle={tituloModulo}
        contentWidth="default"
        actions={
          vista !== "hub" ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4"
              onClick={volverAlHub}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver
            </Button>
          ) : null
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6 pt-2">
          {vista === "hub" ? (
            <div className="flex flex-wrap items-start gap-4">
              <AsistenteIaFuncionTile
                label="Buscar Código Desde Imagen"
                icon={<ScanSearch aria-hidden />}
                onClick={() => setVista("buscar-codigo")}
              />
              {esEditor ? (
                <AsistenteIaFuncionTile
                  label="Gestion Promp & Url"
                  icon={<Settings2 aria-hidden />}
                  onClick={() => setGestionarOpen(true)}
                />
              ) : null}
            </div>
          ) : (
            <>
              <AsistenteIaProcesoPaso
                numero={1}
                titulo="Cargar La Imagen Y Seleccionar"
                activo
              >
                <CuentagotasImagenMuestra
                  key={resetCuentagotas}
                  color={colorMuestra}
                  onColorChange={handleColorChange}
                  onColorPicked={(c, meta) => void handleColorPicked(c, meta)}
                />
              </AsistenteIaProcesoPaso>

              <AsistenteIaProcesoPaso
                numero={2}
                titulo="Pegar La Respuesta De Ia"
                activo={paso1Completo}
              >
                <textarea
                  value={respuestaIa}
                  onChange={(e) => setRespuestaIa(e.target.value)}
                  rows={8}
                  disabled={!paso1Completo || generandoPdf}
                  placeholder={
                    paso1Completo
                      ? "Pegá aquí la respuesta de ChatGPT..."
                      : "Completá el paso 1 para habilitar este campo."
                  }
                  className={cn(
                    "border-input min-h-[8rem] w-full rounded-md border bg-transparent px-3 py-2 text-sm",
                    "text-foreground shadow-xs outline-none",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                  aria-label="Respuesta de IA"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="h-10 px-4"
                    disabled={
                      !paso1Completo ||
                      !respuestaIa.trim() ||
                      !metaMuestra ||
                      generandoPdf
                    }
                    onClick={() => void handleGenerarPdf()}
                  >
                    <FileDown className="h-4 w-4" aria-hidden />
                    {generandoPdf ? "Generando Pdf..." : "Generar Pdf"}
                  </Button>
                </div>
              </AsistenteIaProcesoPaso>
            </>
          )}
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
