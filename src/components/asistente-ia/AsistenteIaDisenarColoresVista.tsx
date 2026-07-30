"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, ImagePlus, Sparkles, X } from "lucide-react";
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

type PreguntaId = 1 | 2 | 3 | 4;

function cantidadColoresDesdeSuperficies(
  superficies: SuperficieSeleccion[],
): AsistenteIaCantidadColores {
  const distinct = new Set(superficies.map((s) => s.colorIndex));
  const n = Math.min(4, Math.max(1, distinct.size)) as AsistenteIaCantidadColores;
  return n;
}

function PreguntaAcordeon({
  numero,
  titulo,
  resumen,
  abierta,
  onToggle,
  children,
}: {
  numero: PreguntaId;
  titulo: string;
  resumen?: string;
  abierta: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-background",
        abierta ? "flex-1" : "shrink-0",
      )}
    >
      <button
        type="button"
        aria-expanded={abierta}
        onClick={onToggle}
        className={cn(
          "flex w-full shrink-0 items-start gap-2 px-3 py-2.5 text-left transition-colors",
          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          abierta && "border-b border-border bg-muted/40",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold uppercase tracking-wide text-foreground">
            {numero}. {titulo}
          </span>
          {!abierta && resumen ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {resumen}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
            abierta && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {abierta ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {children}
        </div>
      ) : null}
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

function joinNombres(
  ids: string[],
  items: ProdIaDisenoCatalogoNombreItem[],
): string {
  return ids
    .map((id) => items.find((x) => x.id === id)?.nombre)
    .filter((x): x is string => Boolean(x))
    .join(", ");
}

export default function AsistenteIaDisenarColoresVista({
  config,
  catalogos,
}: Props) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [superficies, setSuperficies] = useState<SuperficieSeleccion[]>([]);
  const [objetivoIds, setObjetivoIds] = useState<string[]>([]);
  const [estiloId, setEstiloId] = useState<string>("");
  const [combinarIds, setCombinarIds] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [preguntaAbierta, setPreguntaAbierta] = useState<PreguntaId>(1);

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

  function togglePregunta(id: PreguntaId) {
    setPreguntaAbierta((prev) => (prev === id ? prev : id));
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
      cantidadColores: cantidadColoresDesdeSuperficies(superficies),
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

  const resumenSuperficies =
    superficies.length === 0
      ? undefined
      : superficies
          .map((s) => {
            const nombre =
              catalogos.superficies.find((x) => x.id === s.id)?.nombre ?? "?";
            return `${nombre}, Color${s.colorIndex}`;
          })
          .join("; ");

  const resumenObjetivos =
    objetivoIds.length === 0
      ? undefined
      : joinNombres(objetivoIds, catalogos.objetivos);

  const resumenEstilo = estiloId
    ? catalogos.estilos.find((x) => x.id === estiloId)?.nombre
    : undefined;

  const resumenCombinar =
    combinarIds.length === 0
      ? undefined
      : joinNombres(combinarIds, catalogos.combinar);

  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-2 lg:gap-6">
      <aside className="flex min-h-0 flex-col gap-2 overflow-hidden">
        <h3 className="shrink-0 text-sm font-semibold uppercase tracking-wide">
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
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-muted/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Referencia visual del ambiente o superficie"
              className="h-full w-full object-contain"
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
              "flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8",
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

      <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
          <PreguntaAcordeon
            numero={1}
            titulo="¿Qué Desea Pintar?"
            resumen={resumenSuperficies}
            abierta={preguntaAbierta === 1}
            onToggle={() => togglePregunta(1)}
          >
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
                            {ASISTENTE_IA_CANTIDADES_COLORES.map((n) => (
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
          </PreguntaAcordeon>

          <PreguntaAcordeon
            numero={2}
            titulo="¿Qué Objetivo Desea Lograr?"
            resumen={resumenObjetivos}
            abierta={preguntaAbierta === 2}
            onToggle={() => togglePregunta(2)}
          >
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
          </PreguntaAcordeon>

          <PreguntaAcordeon
            numero={3}
            titulo="¿Qué Estilo Desea Lograr?"
            resumen={resumenEstilo}
            abierta={preguntaAbierta === 3}
            onToggle={() => togglePregunta(3)}
          >
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
                      <span className="min-w-0 flex-1 truncate">
                        {item.nombre}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </PreguntaAcordeon>

          <PreguntaAcordeon
            numero={4}
            titulo="¿Desea Combinar Con Algún Elemento Existente?"
            resumen={resumenCombinar}
            abierta={preguntaAbierta === 4}
            onToggle={() => togglePregunta(4)}
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
          </PreguntaAcordeon>
        </div>

        <div className="shrink-0">
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
