"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
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
import { guardarUrlVinculoCompetenciaAction } from "@/actions/competenciaPrecios";
import RelevamientoUltimoMensaje from "@/components/precios-competencia/RelevamientoUltimoMensaje";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codTienda: string;
  descripcion: string | null;
  competencias: CompetenciaParaCliente[];
  vinculosPorCompetencia: Record<string, DatoVinculoCompetenciaCliente>;
  puedeEditar: boolean;
  onGuardado: () => void;
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
}: Props) {
  const [filas, setFilas] = useState<FilaUrl[]>([]);
  const [idsUrlAEliminar, setIdsUrlAEliminar] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [listaAgregarAbierta, setListaAgregarAbierta] = useState(false);
  const bloqueAgregarRef = useRef<HTMLDivElement>(null);

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

  const competidoresSinUrl = useMemo(() => {
    const q = normalizarBusqueda(busquedaProveedor);
    return competencias.filter((c) => {
      if (idsEnLista.has(c.id)) return false;
      const v = vinculosPorCompetencia[c.id];
      if (v?.urlBloqueadaPorPxSugerido) return false;
      if ((v?.urlProducto ?? "").trim() !== "") return false;
      if (!q) return true;
      return c.nombre.toLowerCase().includes(q);
    });
  }, [competencias, idsEnLista, vinculosPorCompetencia, busquedaProveedor]);

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

  useEffect(() => {
    if (!open) return;
    setFilas(filasIniciales.filter(filaTieneUrlAsociada));
    setIdsUrlAEliminar(new Set());
    setBusquedaProveedor("");
    setListaAgregarAbierta(false);
  }, [open, filasIniciales]);

  useEffect(() => {
    if (!listaAgregarAbierta) return;
    function onPointerDown(e: MouseEvent) {
      if (
        bloqueAgregarRef.current &&
        !bloqueAgregarRef.current.contains(e.target as Node)
      ) {
        setListaAgregarAbierta(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [listaAgregarAbierta]);

  const agregarCompetidor = (competenciaId: string) => {
    const c = competencias.find((x) => x.id === competenciaId);
    if (!c) return;
    const f = buildFilaUrl(c, vinculosPorCompetencia[c.id]);
    setFilas((prev) => [...prev, f]);
    setListaAgregarAbierta(false);
    setBusquedaProveedor("");
  };

  const quitarUrl = (competenciaId: string) => {
    const ini = filasInicialesPorId.get(competenciaId);
    if (ini?.url.trim()) {
      setIdsUrlAEliminar((prev) => new Set(prev).add(competenciaId));
    }
    setFilas((prev) => prev.filter((f) => f.competenciaId !== competenciaId));
  };

  const handleGuardar = async () => {
    if (!puedeEditar) return;
    const filasAGuardar = filas.filter(filaTieneCambios);
    const idsBorrar = [...idsUrlAEliminar].filter(
      (id) => !filasAGuardar.some((f) => f.competenciaId === id)
    );

    if (filasAGuardar.length === 0 && idsBorrar.length === 0) {
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
      for (const f of filasAGuardar) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="lg"
        title="Asociar URLs"
        actions={
          puedeEditar ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                disabled={saving}
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

          {puedeEditar ? (
            <div ref={bloqueAgregarRef} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                    aria-hidden
                  />
                  <Input
                    value={busquedaProveedor}
                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                    placeholder="Buscar proveedor..."
                    disabled={saving}
                    className={cn("w-full pl-9", INPUT_FILTER_CLASS)}
                    aria-label="Buscar proveedor para agregar URL"
                    onFocus={() => setListaAgregarAbierta(true)}
                  />
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  className="btn-primario-gestion shrink-0"
                  disabled={saving}
                  aria-expanded={listaAgregarAbierta}
                  aria-label="Agregar proveedor sin URL"
                  title="Agregar proveedor"
                  onClick={() => setListaAgregarAbierta((v) => !v)}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              {listaAgregarAbierta ? (
                <ul
                  className="max-h-40 overflow-y-auto rounded-md border border-border bg-card py-1 shadow-sm"
                  role="listbox"
                  aria-label="Proveedores sin URL para este producto"
                >
                  {competidoresSinUrl.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">
                      {busquedaProveedor.trim()
                        ? "No hay proveedores que coincidan."
                        : "Todos los proveedores con URL ya están en la lista."}
                    </li>
                  ) : (
                    competidoresSinUrl.map((c) => (
                      <li key={c.id} role="option">
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                          onClick={() => agregarCompetidor(c.id)}
                        >
                          {c.nombre}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          ) : null}

          {competencias.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay competidores registrados.</p>
          ) : filas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay URLs asociadas para este producto. Usá el buscador y el botón + para
              agregar un proveedor.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,11rem)_1fr] gap-3 px-0.5">
                <ModalMicroLabel className="text-center">Proveedor</ModalMicroLabel>
                <ModalMicroLabel>Ficha de Producto</ModalMicroLabel>
                <ModalMicroLabel>URL</ModalMicroLabel>
              </div>
              <ul className="flex flex-col gap-3">
                {filas.map((f) => {
                  const index = filas.findIndex(
                    (row) => row.competenciaId === f.competenciaId
                  );
                  const urlBloqueada = f.urlBloqueadaPorPxSugerido;
                  return (
                    <li
                      key={f.competenciaId}
                      className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
                    >
                      <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,11rem)_1fr] gap-3 items-center">
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
                                disabled={!puedeEditar || saving}
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
                                disabled={!puedeEditar || saving}
                                aria-label={`URL del producto — ${f.nombre}`}
                                onChange={(e) =>
                                  setFilas((prev) =>
                                    prev.map((row, i) =>
                                      i === index ? { ...row, url: e.target.value } : row
                                    )
                                  )
                                }
                                placeholder="https://..."
                                className={cn(puedeEditar && "pr-10")}
                              />
                              {puedeEditar ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={saving || !f.url.trim()}
                                  className={cn(
                                    TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
                                    "absolute right-0 top-0 !h-9 !w-9 shrink-0 !p-0"
                                  )}
                                  aria-label={`Borrar URL de ${f.nombre}`}
                                  title="Borrar URL"
                                  onClick={() => quitarUrl(f.competenciaId)}
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
                        <RelevamientoUltimoMensaje
                          vinculo={vinculosPorCompetencia[f.competenciaId]}
                          tieneUrlEnEdicion={!!f.url.trim()}
                        />
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
  );
}
