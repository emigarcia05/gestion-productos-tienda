"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import AgregarProveedorUrlCompetenciaModal from "@/components/precios-competencia/AgregarProveedorUrlCompetenciaModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { INPUT_FILTER_CLASS } from "@/components/FilterBar";
import { toast } from "sonner";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import {
  guardarUrlVinculoCompetenciaAction,
  relevarUrlVinculoCompetenciaAction,
} from "@/actions/competenciaPrecios";
import RelevamientoUltimoMensaje from "@/components/precios-competencia/RelevamientoUltimoMensaje";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

/** Ancho del modal Asociar URLs: ~50 % más que `size="lg"` (`max-w-xl` = 36rem). */
const ASOCIAR_URLS_MODAL_MAX_WIDTH = "max-w-[54rem]";

/** Botón compacto #0072BB en grilla del modal (7×7 rem). */
const MODAL_ROW_ACTION_BTN_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "!h-7 !w-7 min-h-7 min-w-7 shrink-0 !p-0"
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codTienda: string;
  descripcion: string | null;
  competencias: CompetenciaParaCliente[];
  vinculosPorCompetencia: Record<string, DatoVinculoCompetenciaCliente>;
  puedeEditar: boolean;
  onGuardado: () => void;
  /** Refresca datos de la grilla sin cerrar el modal (p. ej. tras relevar una URL). */
  onVinculosActualizados?: () => void;
}

type FilaUrl = {
  competenciaId: string;
  nombre: string;
  url: string;
  tipoPagina: string;
  reglaDefault: string;
  reglas: { id: string; nombre: string }[];
  urlBloqueadaPorPxSugerido: boolean;
};

function buildFilaUrl(
  c: CompetenciaParaCliente,
  v: DatoVinculoCompetenciaCliente | undefined
): FilaUrl {
  const reglas = (c.configExtraccion?.reglas ?? []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
  }));
  const reglaDefault =
    c.configExtraccion?.reglaDefaultId?.trim() || reglas[0]?.id || "";
  return {
    competenciaId: c.id,
    nombre: c.nombre,
    url: v?.urlProducto ?? "",
    tipoPagina: v?.tipoPagina ?? reglaDefault,
    reglaDefault,
    reglas,
    urlBloqueadaPorPxSugerido: v?.urlBloqueadaPorPxSugerido ?? false,
  };
}

function filaTieneUrlAsociada(f: FilaUrl): boolean {
  if (f.urlBloqueadaPorPxSugerido) return true;
  return f.url.trim() !== "";
}

function normalizarBusqueda(texto: string): string {
  return texto.trim().toLowerCase();
}

export default function AsociarUrlsCompetenciaModal({
  open,
  onOpenChange,
  codTienda,
  descripcion,
  competencias,
  vinculosPorCompetencia,
  puedeEditar,
  onGuardado,
  onVinculosActualizados,
}: Props) {
  const [filas, setFilas] = useState<FilaUrl[]>([]);
  const [vinculosLocal, setVinculosLocal] = useState<
    Record<string, DatoVinculoCompetenciaCliente>
  >({});
  const [idsUrlAEliminar, setIdsUrlAEliminar] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [relevandoCompetenciaId, setRelevandoCompetenciaId] = useState<string | null>(
    null
  );
  const [busquedaFiltro, setBusquedaFiltro] = useState("");
  const [agregarProveedorOpen, setAgregarProveedorOpen] = useState(false);

  const filasIniciales = useMemo((): FilaUrl[] => {
    return competencias.map((c) =>
      buildFilaUrl(c, vinculosPorCompetencia[c.id])
    );
  }, [competencias, vinculosPorCompetencia]);

  const filasInicialesPorId = useMemo(() => {
    const m = new Map<string, FilaUrl>();
    for (const f of filasIniciales) m.set(f.competenciaId, f);
    return m;
  }, [filasIniciales]);

  const idsEnLista = useMemo(
    () => new Set(filas.map((f) => f.competenciaId)),
    [filas]
  );

  const filasFiltradas = useMemo(() => {
    const q = normalizarBusqueda(busquedaFiltro);
    if (!q) return filas;
    return filas.filter((f) => f.nombre.toLowerCase().includes(q));
  }, [filas, busquedaFiltro]);

  function filaTieneCambios(f: FilaUrl): boolean {
    if (f.urlBloqueadaPorPxSugerido) return false;
    const ini = filasInicialesPorId.get(f.competenciaId);
    if (!ini) return f.url.trim() !== "";
    const urlIni = ini.url.trim();
    const urlActual = f.url.trim();
    if (urlIni !== urlActual) return true;
    if (f.reglas.length > 0 && f.tipoPagina !== ini.tipoPagina) return true;
    return false;
  }

  function filaPuedeRelevar(f: FilaUrl): boolean {
    if (f.urlBloqueadaPorPxSugerido) return true;
    return !!vinculosLocal[f.competenciaId]?.urlProducto?.trim();
  }

  useEffect(() => {
    if (!open) return;
    setFilas(filasIniciales.filter(filaTieneUrlAsociada));
    setVinculosLocal(vinculosPorCompetencia);
    setIdsUrlAEliminar(new Set());
    setBusquedaFiltro("");
    setAgregarProveedorOpen(false);
    setRelevandoCompetenciaId(null);
  }, [open, filasIniciales, vinculosPorCompetencia]);

  const agregarCompetidor = (competenciaId: string) => {
    const c = competencias.find((x) => x.id === competenciaId);
    if (!c) return;
    const f = buildFilaUrl(c, vinculosPorCompetencia[c.id]);
    setFilas((prev) => [...prev, f]);
  };

  const limpiarUrl = (index: number) => {
    setFilas((prev) =>
      prev.map((row, i) => (i === index ? { ...row, url: "" } : row))
    );
  };

  const eliminarFila = (competenciaId: string) => {
    const ini = filasInicialesPorId.get(competenciaId);
    if (ini?.url.trim()) {
      setIdsUrlAEliminar((prev) => new Set(prev).add(competenciaId));
    }
    setFilas((prev) => prev.filter((f) => f.competenciaId !== competenciaId));
  };

  const handleRelevar = async (f: FilaUrl) => {
    if (!puedeEditar || filaTieneCambios(f)) return;
    setRelevandoCompetenciaId(f.competenciaId);
    try {
      const result = await relevarUrlVinculoCompetenciaAction({
        codTienda,
        competenciaId: f.competenciaId,
      });
      if (!result.ok) {
        toast.error(`${f.nombre}: ${result.error}`);
        return;
      }
      setVinculosLocal((prev) => ({
        ...prev,
        [f.competenciaId]: result.data,
      }));
      if (result.data.estado === ESTADO_RELEVAMIENTO_COMPETENCIA.OK) {
        toast.success(`${f.nombre}: precio relevado.`);
      } else if (result.data.estado === ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR) {
        toast.error(
          `${f.nombre}: ${result.data.errorMensaje?.trim() || "Error al relevar."}`
        );
      } else {
        toast.message(`${f.nombre}: la página no devolvió un precio detectable.`);
      }
      onVinculosActualizados?.();
    } finally {
      setRelevandoCompetenciaId(null);
    }
  };

  const handleGuardar = async () => {
    if (!puedeEditar) return;
    const filasConUrl = filas.filter(
      (f) => filaTieneCambios(f) && f.url.trim() !== ""
    );
    const idsBorrarPorUrlVaciada = filas
      .filter((f) => {
        if (f.urlBloqueadaPorPxSugerido || f.url.trim() !== "") return false;
        if (!filaTieneCambios(f)) return false;
        const ini = filasInicialesPorId.get(f.competenciaId);
        return !!ini?.url.trim();
      })
      .map((f) => f.competenciaId);
    const idsBorrar = [
      ...new Set([...idsUrlAEliminar, ...idsBorrarPorUrlVaciada]),
    ].filter((id) => !filasConUrl.some((f) => f.competenciaId === id));

    if (filasConUrl.length === 0 && idsBorrar.length === 0) {
      toast.message("No hay cambios para guardar.");
      return;
    }
    setSaving(true);
    try {
      for (const competenciaId of idsBorrar) {
        const f = filasInicialesPorId.get(competenciaId);
        const nombre = f?.nombre ?? competenciaId;
        const result = await guardarUrlVinculoCompetenciaAction({
          codTienda,
          competenciaId,
          urlProducto: undefined,
          tipoPagina: undefined,
        });
        if (!result.ok) {
          toast.error(`${nombre}: ${result.error}`);
          return;
        }
      }
      for (const f of filasConUrl) {
        const result = await guardarUrlVinculoCompetenciaAction({
          codTienda,
          competenciaId: f.competenciaId,
          urlProducto: f.url.trim() || undefined,
          tipoPagina:
            f.reglas.length > 0 ? f.tipoPagina || f.reglaDefault : undefined,
        });
        if (!result.ok) {
          toast.error(`${f.nombre}: ${result.error}`);
          return;
        }
      }
      toast.success("URLs guardadas. Ejecutá Comparar Precios para relevar precios.");
      onOpenChange(false);
      onGuardado();
    } finally {
      setSaving(false);
    }
  };

  const gridCols =
    "grid-cols-[5.5rem_minmax(0,9rem)_minmax(0,11rem)_1fr]";
  const gridRowClass = cn("grid gap-3 items-center", gridCols);
  const accionesDeshabilitadas =
    saving || relevandoCompetenciaId !== null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AppModal
          size="lg"
          className={ASOCIAR_URLS_MODAL_MAX_WIDTH}
          title="Asociar URLs"
          actions={
            puedeEditar ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving || relevandoCompetenciaId !== null}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="default"
                  disabled={saving || relevandoCompetenciaId !== null}
                  onClick={() => void handleGuardar()}
                >
                  Guardar
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            )
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{codTienda}</span>
              {descripcion ? ` — ${descripcion}` : null}
            </p>

            {competencias.length > 0 && (puedeEditar || filas.length > 0) ? (
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                    aria-hidden
                  />
                  <Input
                    value={busquedaFiltro}
                    onChange={(e) => setBusquedaFiltro(e.target.value)}
                    placeholder="Buscar proveedor..."
                    disabled={saving || filas.length === 0}
                    className={cn("w-full pl-9", INPUT_FILTER_CLASS)}
                    aria-label="Filtrar proveedores con URL cargada"
                  />
                </div>
                {puedeEditar ? (
                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    className="btn-primario-gestion shrink-0"
                    disabled={saving || relevandoCompetenciaId !== null}
                    aria-label="Agregar proveedor sin URL"
                    title="Agregar proveedor"
                    onClick={() => setAgregarProveedorOpen(true)}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
            ) : null}

            {competencias.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay competidores registrados.</p>
            ) : filas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay URLs asociadas para este producto. Usá el botón + para agregar un
                proveedor.
              </p>
            ) : filasFiltradas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ningún proveedor coincide con la búsqueda.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className={gridRowClass}>
                  <span className="sr-only">Relevar y quitar</span>
                  <ModalMicroLabel align="center">Proveedor</ModalMicroLabel>
                  <ModalMicroLabel align="left">Ficha de Producto</ModalMicroLabel>
                  <ModalMicroLabel align="left">URL</ModalMicroLabel>
                </div>
                <ul className="flex flex-col gap-3">
                  {filasFiltradas.map((f) => {
                    const index = filas.findIndex(
                      (row) => row.competenciaId === f.competenciaId
                    );
                    const urlBloqueada = f.urlBloqueadaPorPxSugerido;
                    return (
                      <li
                        key={f.competenciaId}
                        className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
                      >
                        <div className={gridRowClass}>
                          {puedeEditar ? (
                            <div className="flex items-center gap-1">
                              {filaPuedeRelevar(f) ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={
                                    accionesDeshabilitadas || filaTieneCambios(f)
                                  }
                                  className={MODAL_ROW_ACTION_BTN_CLASS}
                                  aria-label={`Relevar URL — ${f.nombre}`}
                                  title={
                                    filaTieneCambios(f)
                                      ? "Guardá los cambios antes de relevar"
                                      : "Relevar URL"
                                  }
                                  onClick={() => void handleRelevar(f)}
                                >
                                  <RefreshCw
                                    className={cn(
                                      TABLE_ROW_ACTION_ICON_CLASS,
                                      relevandoCompetenciaId === f.competenciaId &&
                                        "animate-spin"
                                    )}
                                    aria-hidden
                                  />
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={accionesDeshabilitadas}
                                className={MODAL_ROW_ACTION_BTN_CLASS}
                                aria-label={`Quitar ${f.nombre} de la lista`}
                                title="Quitar proveedor"
                                onClick={() => eliminarFila(f.competenciaId)}
                              >
                                <Trash2
                                  className={TABLE_ROW_ACTION_ICON_CLASS}
                                  aria-hidden
                                />
                              </Button>
                            </div>
                          ) : (
                            <span />
                          )}
                          <span className="text-center text-sm font-semibold text-foreground">
                            {f.nombre}
                          </span>
                          {urlBloqueada ? (
                            <p className="text-sm font-medium text-foreground text-center col-span-2">
                              Px Sugerido
                            </p>
                          ) : (
                            <>
                              {f.reglas.length > 0 ? (
                                <select
                                  className="input-filtro-unificado w-full min-w-0"
                                  value={f.tipoPagina}
                                  disabled={!puedeEditar || accionesDeshabilitadas}
                                  aria-label={`Ficha de producto — ${f.nombre}`}
                                  onChange={(e) =>
                                    setFilas((prev) =>
                                      prev.map((row, i) =>
                                        i === index
                                          ? { ...row, tipoPagina: e.target.value }
                                          : row
                                      )
                                    )
                                  }
                                >
                                  {f.reglas.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.nombre}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Sin reglas configuradas
                                </span>
                              )}
                              <div className="relative min-w-0">
                                <Input
                                  value={f.url}
                                  disabled={!puedeEditar || accionesDeshabilitadas}
                                  aria-label={`URL del producto — ${f.nombre}`}
                                  onChange={(e) =>
                                    setFilas((prev) =>
                                      prev.map((row, i) =>
                                        i === index ? { ...row, url: e.target.value } : row
                                      )
                                    )
                                  }
                                  placeholder="https://..."
                                  className={cn(
                                    "min-w-0",
                                    puedeEditar && f.url.trim() !== "" && "pr-10"
                                  )}
                                />
                                {puedeEditar && f.url.trim() !== "" ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={saving || relevandoCompetenciaId !== null}
                                    className={cn(
                                      MODAL_ROW_ACTION_BTN_CLASS,
                                      "absolute right-1 top-1/2 -translate-y-1/2"
                                    )}
                                    aria-label={`Borrar URL — ${f.nombre}`}
                                    title="Borrar URL"
                                    onClick={() => limpiarUrl(index)}
                                  >
                                    <Trash2
                                      className={TABLE_ROW_ACTION_ICON_CLASS}
                                      aria-hidden
                                    />
                                  </Button>
                                ) : null}
                              </div>
                            </>
                          )}
                        </div>
                        {!urlBloqueada ? (
                          <div className={cn("grid gap-3", gridCols)}>
                            <span />
                            <div className="col-span-3">
                              <RelevamientoUltimoMensaje
                                vinculo={vinculosLocal[f.competenciaId]}
                                tieneUrlEnEdicion={!!f.url.trim()}
                              />
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </AppModal>
      </Dialog>

      {puedeEditar ? (
        <AgregarProveedorUrlCompetenciaModal
          open={agregarProveedorOpen}
          onOpenChange={setAgregarProveedorOpen}
          competencias={competencias}
          idsEnLista={idsEnLista}
          vinculosPorCompetencia={vinculosPorCompetencia}
          onSeleccionar={agregarCompetidor}
        />
      ) : null}
    </>
  );
}
