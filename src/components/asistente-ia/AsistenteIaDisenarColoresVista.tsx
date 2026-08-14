"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
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
  ASISTENTE_IA_INDICES_COLOR,
  aplicarRespuestasAlPromptDisenarColores,
  etiquetaColorDesdeIndice,
  type AsistenteIaConfigSubmodulo,
} from "@/lib/asistenteIa";
import { resolverConfigAsistenteIaAction } from "@/actions/prodIaDisenoPromp";
import type { ProdIaDisenoCatalogoNombreItem } from "@/lib/prodIaDisenoCatalogos";
import { textoCatalogoParaPrompt } from "@/lib/prodIaDisenoCatalogos";
import { cn } from "@/lib/utils";

export interface AsistenteIaDisenarColoresCatalogos {
  modosDiseno: ProdIaDisenoCatalogoNombreItem[];
  superficies: ProdIaDisenoCatalogoNombreItem[];
  estilos: ProdIaDisenoCatalogoNombreItem[];
  combinar: ProdIaDisenoCatalogoNombreItem[];
  objetivos: ProdIaDisenoCatalogoNombreItem[];
  luzNatural: ProdIaDisenoCatalogoNombreItem[];
  luzArtificial: ProdIaDisenoCatalogoNombreItem[];
}

interface Props {
  config: AsistenteIaConfigSubmodulo;
  catalogos: AsistenteIaDisenarColoresCatalogos;
}

type SuperficieSeleccion = {
  id: string;
  colorIndex: number;
};

type PreguntaId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Máximo de superficies seleccionables (pregunta 7, obligatorio). */
const MAX_SUPERFICIES = 4;

const PREGUNTAS: { id: PreguntaId; titulo: string }[] = [
  { id: 1, titulo: "Modo De Diseño" },
  { id: 2, titulo: "Objetivo De Diseño" },
  { id: 3, titulo: "Estilo De Diseño" },
  { id: 4, titulo: "Luz Natural" },
  { id: 5, titulo: "Luz Artificial" },
  { id: 6, titulo: "Combinar" },
  { id: 7, titulo: "Superficie A Pintar" },
];

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

function PreguntaNavItem({
  numero,
  titulo,
  resumen,
  respondida,
  seleccionada,
  onSelect,
}: {
  numero: PreguntaId;
  titulo: string;
  resumen?: string;
  respondida: boolean;
  seleccionada: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={seleccionada}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2 rounded-md border px-3 py-2.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        seleccionada
          ? "border-primary bg-primary text-primary-foreground"
          : respondida
            ? "border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10"
            : "border-border bg-background text-muted-foreground hover:bg-muted/50",
      )}
    >
      {respondida ? (
        <CheckCircle2
          className={cn(
            "mt-0.5 size-4 shrink-0",
            seleccionada ? "text-primary-foreground" : "text-primary",
          )}
          aria-hidden
        />
      ) : (
        <Circle
          className={cn(
            "mt-0.5 size-4 shrink-0",
            seleccionada ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-semibold uppercase tracking-wide",
            seleccionada ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {numero}. {titulo}
        </span>
        {resumen ? (
          <span
            className={cn(
              "mt-0.5 block truncate text-xs",
              seleccionada
                ? "text-primary-foreground/80"
                : respondida
                  ? "text-foreground/70"
                  : "text-muted-foreground",
            )}
          >
            {resumen}
          </span>
        ) : (
          <span
            className={cn(
              "mt-0.5 block text-xs",
              seleccionada
                ? "text-primary-foreground/70"
                : "text-muted-foreground",
            )}
          >
            Sin respuesta
          </span>
        )}
      </span>
    </button>
  );
}

export default function AsistenteIaDisenarColoresVista({
  config: _config,
  catalogos,
}: Props) {
  const [modoDisenoId, setModoDisenoId] = useState<string>("");
  const [superficies, setSuperficies] = useState<SuperficieSeleccion[]>([]);
  const [objetivoId, setObjetivoId] = useState<string>("");
  const [estiloId, setEstiloId] = useState<string>("");
  const [luzNaturalId, setLuzNaturalId] = useState<string>("");
  const [luzArtificialId, setLuzArtificialId] = useState<string>("");
  /** Opcional: una sola respuesta o vacío. */
  const [combinarId, setCombinarId] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const [preguntaActiva, setPreguntaActiva] = useState<PreguntaId>(1);

  function toggleSuperficie(id: string) {
    const exists = superficies.find((s) => s.id === id);
    if (exists) {
      setSuperficies(superficies.filter((s) => s.id !== id));
      return;
    }
    if (superficies.length >= MAX_SUPERFICIES) {
      toast.error("Máximo Alcanzado", {
        description: `Podés seleccionar hasta ${MAX_SUPERFICIES} superficies.`,
      });
      return;
    }
    setSuperficies([...superficies, { id, colorIndex: 1 }]);
  }

  function setColorSuperficie(id: string, colorIndex: number) {
    setSuperficies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, colorIndex } : s)),
    );
  }

  /** Selección única opcional: re-clic desmarca. */
  function toggleCombinar(id: string) {
    setCombinarId((prev) => (prev === id ? "" : id));
  }

  function validar(): string | null {
    if (!modoDisenoId) {
      return "Seleccioná un modo de diseño.";
    }
    if (!objetivoId) {
      return "Seleccioná un objetivo de diseño.";
    }
    if (!estiloId) {
      return "Seleccioná un estilo de diseño.";
    }
    if (!luzNaturalId) {
      return "Seleccioná la luz natural.";
    }
    if (!luzArtificialId) {
      return "Seleccioná la luz artificial.";
    }
    if (superficies.length === 0) {
      return "Seleccioná al menos una superficie a pintar.";
    }
    if (superficies.length > MAX_SUPERFICIES) {
      return `Máximo ${MAX_SUPERFICIES} superficies.`;
    }
    return null;
  }

  async function handleGenerarPrompt() {
    const error = validar();
    if (error) {
      toast.error("Faltan Datos", { description: error });
      return;
    }

    setEnviando(true);
    try {
      const configRes = await resolverConfigAsistenteIaAction({
        slot: "disenar_colores",
      });
      if (!configRes.ok) {
        toast.error(configRes.error ?? "No se pudo cargar el prompt.");
        return;
      }
      const cfg = configRes.data;

      if (!cfg.promp.trim()) {
        toast.error("Falta Prompt", {
          description: "Configuralo en GESTION PROMP & URL (Diseñar Colores).",
        });
        return;
      }
      if (!cfg.urlRedireccion.trim()) {
        toast.error("Falta Url", {
          description: "Configurala en GESTION PROMP & URL (Diseñar Colores).",
        });
        return;
      }

      const modoItem = catalogos.modosDiseno.find((x) => x.id === modoDisenoId);
      const modoDiseno = modoItem ? textoCatalogoParaPrompt(modoItem) : "";

      const superficiesResolved = superficies
        .map((s) => {
          const item = catalogos.superficies.find((x) => x.id === s.id);
          if (!item) return null;
          return {
            superficieId: item.id,
            superficieNombre: textoCatalogoParaPrompt(item),
            colorIndex: s.colorIndex,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);

      const objetivos = (() => {
        const item = catalogos.objetivos.find((x) => x.id === objetivoId);
        return item ? [textoCatalogoParaPrompt(item)] : [];
      })();

      const estiloItem = catalogos.estilos.find((x) => x.id === estiloId);
      const estilo = estiloItem ? textoCatalogoParaPrompt(estiloItem) : "";

      const combinar = (() => {
        const item = catalogos.combinar.find((x) => x.id === combinarId);
        return item ? [textoCatalogoParaPrompt(item)] : [];
      })();

      const luzNatItem = catalogos.luzNatural.find((x) => x.id === luzNaturalId);
      const iluminacionNatural = luzNatItem
        ? textoCatalogoParaPrompt(luzNatItem)
        : "";
      const luzArtItem = catalogos.luzArtificial.find(
        (x) => x.id === luzArtificialId,
      );
      const iluminacionArtificial = luzArtItem
        ? textoCatalogoParaPrompt(luzArtItem)
        : "";

      const prompt = aplicarRespuestasAlPromptDisenarColores(
        cfg.promp,
        {
          modoDiseno,
          superficies: superficiesResolved,
          objetivos,
          estilo,
          combinar,
          iluminacionNatural,
          iluminacionArtificial,
        },
        cfg.variablesAlias ?? [],
        cfg.plantillaSuperficies,
      );

      await navigator.clipboard.writeText(prompt);
      window.open(cfg.urlRedireccion, "_blank", "noopener,noreferrer");
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

  const resumenModoDiseno = modoDisenoId
    ? catalogos.modosDiseno.find((x) => x.id === modoDisenoId)?.nombre
    : undefined;

  const resumenObjetivos = objetivoId
    ? catalogos.objetivos.find((x) => x.id === objetivoId)?.nombre
    : undefined;

  const resumenEstilo = estiloId
    ? catalogos.estilos.find((x) => x.id === estiloId)?.nombre
    : undefined;

  const resumenIluminacionNatural = luzNaturalId
    ? catalogos.luzNatural.find((x) => x.id === luzNaturalId)?.nombre
    : undefined;
  const resumenIluminacionArtificial = luzArtificialId
    ? catalogos.luzArtificial.find((x) => x.id === luzArtificialId)?.nombre
    : undefined;

  const resumenCombinar = combinarId
    ? catalogos.combinar.find((x) => x.id === combinarId)?.nombre
    : undefined;

  const resumenSuperficies =
    superficies.length === 0
      ? undefined
      : superficies
          .map((s) => {
            const nombre =
              catalogos.superficies.find((x) => x.id === s.id)?.nombre ?? "?";
            return `${nombre}, ${etiquetaColorDesdeIndice(s.colorIndex)}`;
          })
          .join("; ");

  const resumenPorPregunta: Record<PreguntaId, string | undefined> = {
    1: resumenModoDiseno,
    2: resumenObjetivos,
    3: resumenEstilo,
    4: resumenIluminacionNatural,
    5: resumenIluminacionArtificial,
    6: resumenCombinar,
    7: resumenSuperficies,
  };

  /** Combinar es opcional: no marca “respondida” si está vacío. */
  const respondidaPorPregunta: Record<PreguntaId, boolean> = {
    1: Boolean(modoDisenoId),
    2: Boolean(objetivoId),
    3: Boolean(estiloId),
    4: Boolean(luzNaturalId),
    5: Boolean(luzArtificialId),
    6: Boolean(combinarId),
    7: superficies.length > 0,
  };

  const preguntaActivaMeta =
    PREGUNTAS.find((p) => p.id === preguntaActiva) ?? PREGUNTAS[0]!;

  function renderOpciones(): ReactNode {
    switch (preguntaActiva) {
      case 1:
        if (catalogos.modosDiseno.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              No hay modos. Cargalos en GESTION DISEÑO.
            </p>
          );
        }
        return (
          <div className="flex flex-col gap-1" role="radiogroup">
            {catalogos.modosDiseno.map((item) => {
              const checked = modoDisenoId === item.id;
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
                    name="modo-diseno"
                    className="size-4 accent-primary"
                    checked={checked}
                    onChange={() => setModoDisenoId(item.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
                </label>
              );
            })}
          </div>
        );
      case 2:
        if (catalogos.objetivos.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              No hay objetivos. Cargalos en GESTION DISEÑO.
            </p>
          );
        }
        return (
          <div className="flex flex-col gap-1" role="radiogroup">
            {catalogos.objetivos.map((item) => {
              const checked = objetivoId === item.id;
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
                    name="objetivo-diseno"
                    className="size-4 accent-primary"
                    checked={checked}
                    onChange={() => setObjetivoId(item.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
                </label>
              );
            })}
          </div>
        );
      case 3:
        if (catalogos.estilos.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              No hay estilos. Cargalos en GESTION DISEÑO.
            </p>
          );
        }
        return (
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
        );
      case 4:
        if (catalogos.luzNatural.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              No hay opciones. Cargalas en GESTION DISEÑO (Luz Natural).
            </p>
          );
        }
        return (
          <div className="flex flex-col gap-1" role="radiogroup">
            {catalogos.luzNatural.map((item) => {
              const checked = luzNaturalId === item.id;
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
                    name="iluminacion-natural"
                    className="size-4 accent-primary"
                    checked={checked}
                    onChange={() => setLuzNaturalId(item.id)}
                  />
                  <span className="min-w-0 flex-1">{item.nombre}</span>
                </label>
              );
            })}
          </div>
        );
      case 5:
        if (catalogos.luzArtificial.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              No hay opciones. Cargalas en GESTION DISEÑO (Luz Artificial).
            </p>
          );
        }
        return (
          <div className="flex flex-col gap-1" role="radiogroup">
            {catalogos.luzArtificial.map((item) => {
              const checked = luzArtificialId === item.id;
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
                    name="iluminacion-artificial"
                    className="size-4 accent-primary"
                    checked={checked}
                    onChange={() => setLuzArtificialId(item.id)}
                  />
                  <span className="min-w-0 flex-1">{item.nombre}</span>
                </label>
              );
            })}
          </div>
        );
      case 6:
        if (catalogos.combinar.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              No hay elementos. Cargalos en GESTION DISEÑO (opcional).
            </p>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            {catalogos.combinar.map((item) => (
              <OpcionCheck
                key={item.id}
                checked={combinarId === item.id}
                label={item.nombre}
                onToggle={() => toggleCombinar(item.id)}
              />
            ))}
          </div>
        );
      case 7:
        if (catalogos.superficies.length === 0) {
          return (
            <p className="text-sm text-muted-foreground">
              No hay superficies. Cargalas en GESTION DISEÑO.
            </p>
          );
        }
        return (
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
                        <SelectValue placeholder="COLOR" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASISTENTE_IA_INDICES_COLOR.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {etiquetaColorDesdeIndice(n)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                />
              );
            })}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-hidden">
        <nav
          aria-label="Preguntas del cuestionario"
          className="flex min-h-0 flex-col gap-1.5 overflow-y-auto"
        >
          {PREGUNTAS.map((p) => (
            <PreguntaNavItem
              key={p.id}
              numero={p.id}
              titulo={p.titulo}
              resumen={resumenPorPregunta[p.id]}
              respondida={respondidaPorPregunta[p.id]}
              seleccionada={preguntaActiva === p.id}
              onSelect={() => setPreguntaActiva(p.id)}
            />
          ))}
        </nav>

        <section
          className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-background",
          )}
        >
          <header className="shrink-0 border-b border-border bg-muted/40 px-3 py-2.5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              {preguntaActivaMeta.id}. {preguntaActivaMeta.titulo}
            </h2>
            {preguntaActiva === 6 ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Opcional · re-clic desmarca
              </p>
            ) : null}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {renderOpciones()}
          </div>
        </section>
      </div>

      <div className="shrink-0">
        <Button
          type="button"
          className="h-10 gap-2 px-4"
          disabled={enviando}
          onClick={() => void handleGenerarPrompt()}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {enviando ? "Generando..." : "Copiar Prompt Y Abrir Chatgpt"}
        </Button>
      </div>
    </div>
  );
}
