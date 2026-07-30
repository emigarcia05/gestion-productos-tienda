"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  Palette,
  Paintbrush,
  ScanSearch,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import AsistenteIaDisenarColoresVista, {
  type AsistenteIaDisenarColoresCatalogos,
} from "@/components/asistente-ia/AsistenteIaDisenarColoresVista";
import AsistenteIaFuncionTile from "@/components/asistente-ia/AsistenteIaFuncionTile";
import AsistenteIaProcesoPaso from "@/components/asistente-ia/AsistenteIaProcesoPaso";
import CuentagotasImagenMuestra, {
  type MuestraPuntoImagen,
} from "@/components/asistente-ia/CuentagotasImagenMuestra";
import GestionarProdIaDisenoHubModal from "@/components/asistente-ia/GestionarProdIaDisenoHubModal";
import GestionarProdIaDisenoPrompModal from "@/components/asistente-ia/GestionarProdIaDisenoPrompModal";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { Button } from "@/components/ui/button";
import { resolverConfigAsistenteIaAction } from "@/actions/prodIaDisenoPromp";
import {
  ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN,
  ASISTENTE_IA_SUBMODULO_DISENAR_COLORES,
  aplicarRgbAlPromptBuscarColor,
  getDefaultConfigDisenarColores,
} from "@/lib/asistenteIa";
import type {
  AsistenteIaConfigSubmodulo,
  ProdIaDisenoPrompItem,
} from "@/lib/asistenteIa";
import type { RgbColor } from "@/lib/colorMuestraImagen";
import { descargarPdfAproximacionCodigoImagen } from "@/lib/exportAproximacionCodigoPdfClient";
import { parseRespuestaIaCoincidencias } from "@/lib/parseRespuestaIaCoincidencias";
import { cn } from "@/lib/utils";

type VistaActiva = "hub" | "buscar-codigo" | "disenar-colores";

interface Props {
  configBuscarCodigo: AsistenteIaConfigSubmodulo;
  configDisenarColores: AsistenteIaConfigSubmodulo;
  catalogoInicial: ProdIaDisenoPrompItem[];
  catalogosDiseno: AsistenteIaDisenarColoresCatalogos;
  esEditor: boolean;
}

export default function AsistenteIaBuscarColorImagenPageClient({
  configBuscarCodigo: _configBuscarCodigo,
  configDisenarColores,
  catalogoInicial,
  catalogosDiseno,
  esEditor,
}: Props) {
  const router = useRouter();
  const [vista, setVista] = useState<VistaActiva>("hub");
  const [gestionarOpen, setGestionarOpen] = useState(false);
  const [gestionDisenoOpen, setGestionDisenoOpen] = useState(false);
  const [configDisenar, setConfigDisenar] =
    useState<AsistenteIaConfigSubmodulo>(configDisenarColores);
  const [colorMuestra, setColorMuestra] = useState<RgbColor | null>(null);
  const [metaMuestra, setMetaMuestra] = useState<MuestraPuntoImagen | null>(
    null,
  );
  const [paso1Completo, setPaso1Completo] = useState(false);
  const [respuestaIa, setRespuestaIa] = useState("");
  const [resetCuentagotas, setResetCuentagotas] = useState(0);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    setConfigDisenar(configDisenarColores);
  }, [configDisenarColores]);

  const tituloModulo =
    vista === "disenar-colores"
      ? ASISTENTE_IA_SUBMODULO_DISENAR_COLORES
      : vista === "buscar-codigo"
        ? ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN
        : "Módulos";

  function aplicarPromptGuardado(item: ProdIaDisenoPrompItem) {
    if (item.submodulo !== ASISTENTE_IA_SUBMODULO_DISENAR_COLORES) return;
    setConfigDisenar((prev) => ({
      ...prev,
      submodulo: item.submodulo,
      promp: item.promp,
      urlRedireccion: item.urlRedireccion,
    }));
  }

  function aplicarPromptEliminado(submodulo: string) {
    if (submodulo === ASISTENTE_IA_SUBMODULO_DISENAR_COLORES) {
      setConfigDisenar(getDefaultConfigDisenarColores());
    }
  }

  async function handleColorPicked(color: RgbColor, meta: MuestraPuntoImagen) {
    setMetaMuestra(meta);

    const configRes = await resolverConfigAsistenteIaAction({
      slot: "buscar_codigo",
    });
    if (!configRes.ok) {
      toast.error(configRes.error ?? "No se pudo cargar el prompt.");
      return;
    }
    const cfg = configRes.data;

    if (!cfg.promp.trim()) {
      toast.error("Falta Prompt", {
        description: "Configuralo en GESTION PROMP & URL.",
      });
      return;
    }
    if (!cfg.urlRedireccion.trim()) {
      toast.error("Falta Url", {
        description: "Configurala en GESTION PROMP & URL.",
      });
      return;
    }

    const prompt = aplicarRgbAlPromptBuscarColor(
      cfg.promp,
      color,
      cfg.variablesAlias ?? [],
    );

    try {
      await navigator.clipboard.writeText(prompt);
      window.open(cfg.urlRedireccion, "_blank", "noopener,noreferrer");
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
      setMetaMuestra(null);
      setPaso1Completo(false);
    }
  }

  async function handleGenerarPdf() {
    if (!metaMuestra || !respuestaIa.trim() || generandoPdf) return;
    setGenerandoPdf(true);
    try {
      const filas = parseRespuestaIaCoincidencias(respuestaIa);
      if (filas.length === 0) {
        toast.error("No Se Pudieron Leer Coincidencias", {
          description: "Revisá el formato de la respuesta pegada.",
        });
        return;
      }
      await descargarPdfAproximacionCodigoImagen({
        muestra: metaMuestra,
        filas,
      });
      toast.success("Pdf Generado");
    } catch (e) {
      toast.error("No Se Pudo Generar El Pdf", {
        description: e instanceof Error ? e.message : "Error desconocido.",
      });
    } finally {
      setGenerandoPdf(false);
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

  return (
    <>
      <ClassicFilteredTableLayout
        title="Asistente IA"
        subtitle={tituloModulo}
        contentWidth="default"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {esEditor ? (
              <>
                <Button
                  type="button"
                  className="h-10 px-4 gap-2"
                  onClick={() => setGestionarOpen(true)}
                >
                  <Settings2 className="h-4 w-4 shrink-0" aria-hidden />
                  GESTION PROMP & URL
                </Button>
                <Button
                  type="button"
                  className="h-10 px-4 gap-2"
                  onClick={() => setGestionDisenoOpen(true)}
                >
                  <Palette className="h-4 w-4 shrink-0" aria-hidden />
                  GESTION DISEÑO
                </Button>
              </>
            ) : null}
            {vista !== "hub" ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4"
                onClick={volverAlHub}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Volver
              </Button>
            ) : null}
          </div>
        }
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-4 pt-2",
            vista === "disenar-colores"
              ? "overflow-hidden pb-2"
              : "overflow-y-auto pb-6",
          )}
        >
          {vista === "hub" ? (
            <div className="flex flex-wrap items-start gap-4">
              <AsistenteIaFuncionTile
                label="Buscar Código Desde Imagen"
                icon={<ScanSearch aria-hidden />}
                onClick={() => setVista("buscar-codigo")}
              />
              <AsistenteIaFuncionTile
                label="Diseñar Colores"
                icon={<Paintbrush aria-hidden />}
                onClick={() => setVista("disenar-colores")}
              />
            </div>
          ) : vista === "disenar-colores" ? (
            <AsistenteIaDisenarColoresVista
              config={configDisenar}
              catalogos={catalogosDiseno}
            />
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
                  rows={5}
                  disabled={!paso1Completo || generandoPdf}
                  placeholder={
                    paso1Completo
                      ? "Pegá aquí la respuesta de ChatGPT..."
                      : "Completá el paso 1 para habilitar este campo."
                  }
                  className={cn(
                    "border-input min-h-[5.5rem] w-full rounded-md border bg-transparent px-3 py-2 text-sm",
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
        <>
          <GestionarProdIaDisenoPrompModal
            open={gestionarOpen}
            onOpenChange={setGestionarOpen}
            itemsIniciales={catalogoInicial}
            esEditor={esEditor}
            onPromptGuardado={aplicarPromptGuardado}
            onPromptEliminado={aplicarPromptEliminado}
            onCatalogoChanged={() => router.refresh()}
          />
          <GestionarProdIaDisenoHubModal
            open={gestionDisenoOpen}
            onOpenChange={setGestionDisenoOpen}
            esEditor={esEditor}
            onCatalogoChanged={() => router.refresh()}
          />
        </>
      ) : null}
    </>
  );
}
