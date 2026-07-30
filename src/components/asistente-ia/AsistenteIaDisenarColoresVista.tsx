"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASISTENTE_IA_CANTIDADES_COLORES,
  aplicarRespuestasAlPromptDisenarColores,
  type AsistenteIaCantidadColores,
  type AsistenteIaConfigSubmodulo,
} from "@/lib/asistenteIa";
import type { ProdIaDisenoCatalogoNombreItem } from "@/lib/prodIaDisenoCatalogos";
import { cn } from "@/lib/utils";

export interface AsistenteIaDisenarColoresCatalogos {
  superficies: ProdIaDisenoCatalogoNombreItem[];
  estilos: ProdIaDisenoCatalogoNombreItem[];
  combinar: ProdIaDisenoCatalogoNombreItem[];
  objetivos: ProdIaDisenoCatalogoNombreItem[];
}

interface Props {
  config: AsistenteIaConfigSubmodulo;
  catalogos: AsistenteIaDisenarColoresCatalogos;
}

type SuperficieSeleccion = {
  id: string;
  colorIndex: number;
};

function PreguntaBlock({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
        {numero}. {titulo}
      </h3>
      {children}
    </section>
  );
}

function OpcionCheck({
  checked,
  label,
  onToggle,
  trailing,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
          checked && "bg-muted",
        )}
      >
        <input
          type="checkbox"
          className="size-4 shrink-0 accent-primary"
          checked={checked}
          onChange={onToggle}
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </label>
      {checked && trailing ? (
        <div className="shrink-0">{trailing}</div>
      ) : null}
    </div>
  );
}

export default function AsistenteIaDisenarColoresVista({
  config,
  catalogos,
}: Props) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState<AsistenteIaCantidadColores>(1);
  const [superficies, setSuperficies] = useState<SuperficieSeleccion[]>([]);
  const [objetivoIds, setObjetivoIds] = useState<string[]>([]);
  const [estiloId, setEstiloId] = useState<string>("");
  const [combinarIds, setCombinarIds] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const clearImagen = useCallback(() => {
    revokeObjectUrl();
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [revokeObjectUrl]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  useEffect(() => {
    setSuperficies((prev) =>
      prev.map((s) =>
        s.colorIndex > cantidad ? { ...s, colorIndex: cantidad } : s,
      ),
    );
  }, [cantidad]);

  function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Archivo Inválido", {
        description: "Seleccioná una imagen (JPG, PNG, WEBP, etc.).",
      });
      return;
    }
    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
  }

  function toggleSuperficie(id: string) {
    setSuperficies((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) return prev.filter((s) => s.id !== id);
      return [...prev, { id, colorIndex: 1 }];
    });
  }

  function setColorSuperficie(id: string, colorIndex: number) {
    setSuperficies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, colorIndex } : s)),
    );
  }

  function toggleId(
    ids: string[],
    setIds: (next: string[]) => void,
    id: string,
  ) {
    if (ids.includes(id)) {
      setIds(ids.filter((x) => x !== id));
      return;
    }
    setIds([...ids, id]);
  }

  function validar(): string | null {
    if (superficies.length === 0) {
      return "Seleccioná al menos una superficie a pintar.";
    }
    if (objetivoIds.length === 0) {
      return "Seleccioná al menos un objetivo.";
    }
    if (!estiloId) {
      return "Seleccioná un estilo.";
    }
    return null;
  }

  async function handleGenerarPrompt() {
    const error = validar();
    if (error) {
      toast.error("Faltan Datos", { description: error });
      return;
    }
    if (!config.promp.trim()) {
      toast.error("Falta Prompt", {
        description: "Configuralo en GESTION PROMP & URL (Diseñar Colores).",
      });
      return;
    }
    if (!config.urlRedireccion.trim()) {
      toast.error("Falta Url", {
        description: "Configurala en GESTION PROMP & URL (Diseñar Colores).",
      });
      return;
    }

    const superficiesResolved = superficies
      .map((s) => {
        const item = catalogos.superficies.find((x) => x.id === s.id);
        if (!item) return null;
        return {
          superficieId: item.id,
          superficieNombre: item.nombre,
          colorIndex: s.colorIndex,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    const objetivos = objetivoIds
      .map((id) => catalogos.objetivos.find((x) => x.id === id)?.nombre)
      .filter((x): x is string => Boolean(x));

    const estilo =
      catalogos.estilos.find((x) => x.id === estiloId)?.nombre ?? "";

    const combinar = combinarIds
      .map((id) => catalogos.combinar.find((x) => x.id === id)?.nombre)
      .filter((x): x is string => Boolean(x));

    const prompt = aplicarRespuestasAlPromptDisenarColores(config.promp, {
      cantidadColores: cantidad,
      superficies: superficiesResolved,
      objetivos,
      estilo,
      combinar,
    });

    setEnviando(true);
    try {
      await navigator.clipboard.writeText(prompt);
      window.open(config.urlRedireccion, "_blank", "noopener,noreferrer");
      toast.success("Prompt Copiado", {
        description: "Pegalo en ChatGPT (Ctrl+V).",
      });
    } catch {
      toast.error("No Se Pudo Copiar El Prompt", {
        description: "Abrí la URL y pegá el prompt manualmente si hace falta.",
      });
    } finally {
      setEnviando(false);
    }
  }

  const colorOptions = ASISTENTE_IA_CANTIDADES_COLORES.filter(
    (n) => n <= cantidad,
  );

  return (
    <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
      <aside className="flex min-h-0 flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          Foto De Referencia
        </h3>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        {previewUrl ? (
          <div className="relative flex min-h-[16rem] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-muted/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Referencia visual del ambiente o superficie"
              className="max-h-[70vh] w-full flex-1 object-contain"
            />
            <div className="absolute right-2 top-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 px-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Cambiar
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 w-8 px-0"
                aria-label="Quitar imagen"
                onClick={clearImagen}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex min-h-[16rem] flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8",
              "text-sm text-muted-foreground transition-colors hover:bg-muted/50",
            )}
          >
            <ImagePlus className="size-10 opacity-70" aria-hidden />
            <span className="font-medium text-foreground">Cargar Foto</span>
            <span className="max-w-xs text-center text-xs">
              Queda a la izquierda como referencia visual (no se guarda en el
              servidor).
            </span>
          </button>
        )}
      </aside>

      <div className="flex min-h-0 flex-col gap-4">
        <PreguntaBlock numero={1} titulo="¿Cuántos Colores Se Van A Buscar?">
          <div className="flex flex-wrap gap-2">
            {ASISTENTE_IA_CANTIDADES_COLORES.map((n) => (
              <Button
                key={n}
                type="button"
                variant={cantidad === n ? "default" : "outline"}
                className="h-10 w-12"
                aria-pressed={cantidad === n}
                onClick={() => setCantidad(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </PreguntaBlock>

        <PreguntaBlock numero={2} titulo="¿Qué Desea Pintar?">
          {catalogos.superficies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay superficies. Cargalas en GESTION DISEÑO.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {catalogos.superficies.map((item) => {
                const selected = superficies.find((s) => s.id === item.id);
                return (
                  <OpcionCheck
                    key={item.id}
                    checked={Boolean(selected)}
                    label={item.nombre}
                    onToggle={() => toggleSuperficie(item.id)}
                    trailing={
                      <Select
                        value={String(selected?.colorIndex ?? 1)}
                        onValueChange={(v) =>
                          setColorSuperficie(item.id, Number(v))
                        }
                      >
                        <SelectTrigger
                          className="h-9 w-[7.5rem]"
                          aria-label={`Color para ${item.nombre}`}
                        >
                          <SelectValue placeholder="Color" />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              Color {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                );
              })}
            </div>
          )}
        </PreguntaBlock>

        <PreguntaBlock numero={3} titulo="¿Qué Objetivo Desea Lograr?">
          {catalogos.objetivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay objetivos. Cargalos en GESTION DISEÑO.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {catalogos.objetivos.map((item) => (
                <OpcionCheck
                  key={item.id}
                  checked={objetivoIds.includes(item.id)}
                  label={item.nombre}
                  onToggle={() =>
                    toggleId(objetivoIds, setObjetivoIds, item.id)
                  }
                />
              ))}
            </div>
          )}
        </PreguntaBlock>

        <PreguntaBlock numero={4} titulo="¿Qué Estilo Desea Lograr?">
          {catalogos.estilos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay estilos. Cargalos en GESTION DISEÑO.
            </p>
          ) : (
            <div className="flex flex-col gap-1" role="radiogroup">
              {catalogos.estilos.map((item) => {
                const checked = estiloId === item.id;
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                      checked && "bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name="estilo-diseno"
                      className="size-4 accent-primary"
                      checked={checked}
                      onChange={() => setEstiloId(item.id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
                  </label>
                );
              })}
            </div>
          )}
        </PreguntaBlock>

        <PreguntaBlock
          numero={5}
          titulo="¿Desea Combinar Con Algún Elemento Existente?"
        >
          {catalogos.combinar.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay elementos. Cargalos en GESTION DISEÑO (opcional).
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {catalogos.combinar.map((item) => (
                <OpcionCheck
                  key={item.id}
                  checked={combinarIds.includes(item.id)}
                  label={item.nombre}
                  onToggle={() =>
                    toggleId(combinarIds, setCombinarIds, item.id)
                  }
                />
              ))}
            </div>
          )}
        </PreguntaBlock>

        <div className="pt-2">
          <Button
            type="button"
            className="h-10 px-4 gap-2"
            disabled={enviando}
            onClick={() => void handleGenerarPrompt()}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {enviando ? "Generando..." : "Copiar Prompt Y Abrir Chatgpt"}
          </Button>
        </div>
      </div>
    </div>
  );
}
