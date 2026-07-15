"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import FilterBar, {
  FiltroIndividualContainer,
  FilaFiltrosDesplegables,
  FILTER_SELECT_WRAPPER_CLASS,
} from "@/components/FilterBar";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  crearMktPublicacionObjAction,
  editarMktPublicacionObjAction,
  eliminarMktPublicacionObjAction,
  listarMktPublicacionObjsAction,
} from "@/actions/mktPublicacionesObj";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import {
  etiquetaMktPubliObjEje,
  etiquetaMktPubliObjPeriodo,
  MKT_PUBLI_OBJ_EJES,
  MKT_PUBLI_OBJ_PERIODOS,
  type MktPubliObjEje,
  type MktPubliObjPeriodo,
  type MktPublicacionObjItem,
} from "@/lib/mktPublicacionesObj";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objetivosIniciales: MktPublicacionObjItem[];
  redes: MktCatalogoNombreItem[];
  contenidos: MktCatalogoNombreItem[];
  secciones: MktCatalogoNombreItem[];
  esEditor: boolean;
  onCatalogoChanged?: () => void;
}

const BOTON_ACCION_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "!size-8 max-h-8 min-h-8 min-w-8 shrink-0 !p-0"
);

function parseCantidad(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 1 || n > 9999) return null;
  return n;
}

export default function GestionarMktPublicacionObjModal({
  open,
  onOpenChange,
  objetivosIniciales,
  redes,
  contenidos,
  secciones,
  esEditor,
  onCatalogoChanged,
}: Props) {
  const [items, setItems] = useState<MktPublicacionObjItem[]>(objetivosIniciales);
  const [filtroEje, setFiltroEje] = useState<MktPubliObjEje | "">("");
  const [filtroPeriodo, setFiltroPeriodo] = useState<MktPubliObjPeriodo | "">("");
  const [openCrear, setOpenCrear] = useState(false);
  const [periodo, setPeriodo] = useState<MktPubliObjPeriodo>("SEMANAL");
  const [ejeAlta, setEjeAlta] = useState<MktPubliObjEje>("RED");
  const [destinoId, setDestinoId] = useState("");
  const [cantidadNorm, setCantidadNorm] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPeriodo, setEditPeriodo] = useState<MktPubliObjPeriodo>("SEMANAL");
  const [editCantidadNorm, setEditCantidadNorm] = useState("1");
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<MktPublicacionObjItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const itemsFiltrados = useMemo(
    () =>
      items.filter((i) => {
        if (filtroEje && i.eje !== filtroEje) return false;
        if (filtroPeriodo && i.periodo !== filtroPeriodo) return false;
        return true;
      }),
    [items, filtroEje, filtroPeriodo]
  );

  const opcionesDestino = useMemo(() => {
    if (ejeAlta === "RED") return redes;
    if (ejeAlta === "CONTENIDO") return contenidos;
    return secciones;
  }, [ejeAlta, redes, contenidos, secciones]);

  const destinosConObjetivo = useMemo(() => {
    const set = new Set(items.filter((i) => i.eje === ejeAlta).map((i) => i.destinoId));
    return set;
  }, [items, ejeAlta]);

  const opcionesDestinoDisponibles = useMemo(
    () => opcionesDestino.filter((o) => !destinosConObjetivo.has(o.id)),
    [opcionesDestino, destinosConObjetivo]
  );

  const cargar = useCallback(async () => {
    const res = await listarMktPublicacionObjsAction();
    if (!res.ok) {
      toast.error(res.error ?? "No se pudieron cargar los objetivos.");
      setItems([]);
      return;
    }
    setItems(res.data);
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems(objetivosIniciales);
    void cargar();
    setFiltroEje("");
    setFiltroPeriodo("");
    setOpenCrear(false);
    setEditingId(null);
    setBorrarTarget(null);
  }, [open, cargar, objetivosIniciales]);

  useEffect(() => {
    setDestinoId("");
  }, [ejeAlta]);

  function resetFormAlta(ejeInicial: MktPubliObjEje = "RED") {
    setPeriodo(filtroPeriodo || "SEMANAL");
    setEjeAlta(ejeInicial);
    setDestinoId("");
    setCantidadNorm("1");
  }

  function abrirCrear() {
    if (!esEditor || pending || borrando) return;
    setEditingId(null);
    resetFormAlta(filtroEje || "RED");
    setOpenCrear(true);
  }

  async function handleCrear() {
    if (!esEditor || pending) return;
    const cantidad = parseCantidad(cantidadNorm);
    if (cantidad == null) {
      toast.error("Ingresá una cantidad válida (1–9999).");
      return;
    }
    if (!destinoId) {
      toast.error("Seleccioná un destino.");
      return;
    }
    setPending(true);
    try {
      const res = await crearMktPublicacionObjAction({
        periodo,
        eje: ejeAlta,
        destinoId,
        cantidad,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear el objetivo.");
        return;
      }
      toast.success("Objetivo creado.");
      setFiltroEje(ejeAlta);
      setOpenCrear(false);
      resetFormAlta(ejeAlta);
      await cargar();
      onCatalogoChanged?.();
    } finally {
      setPending(false);
    }
  }

  async function handleGuardarEdicion() {
    if (!esEditor || !editingId || pending) return;
    const cantidad = parseCantidad(editCantidadNorm);
    if (cantidad == null) {
      toast.error("Ingresá una cantidad válida (1–9999).");
      return;
    }
    setPending(true);
    try {
      const res = await editarMktPublicacionObjAction({
        id: editingId,
        periodo: editPeriodo,
        cantidad,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Objetivo actualizado.");
      setEditingId(null);
      await cargar();
      onCatalogoChanged?.();
    } finally {
      setPending(false);
    }
  }

  async function confirmarBorrar() {
    if (!borrarTarget || borrando) return;
    setBorrando(true);
    try {
      const res = await eliminarMktPublicacionObjAction({ id: borrarTarget.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success("Objetivo eliminado.");
      setBorrarTarget(null);
      await cargar();
      onCatalogoChanged?.();
    } finally {
      setBorrando(false);
    }
  }

  const bloqueado = pending || borrando;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (bloqueado || openCrear) return;
          onOpenChange(next);
        }}
      >
        <AppModal
          title="Gestionar Objetivos"
          size="lg"
          className="max-w-xl"
          scrollBody
          hideBodyScrollbars
          actions={
            <Button
              type="button"
              variant="outline"
              disabled={bloqueado || openCrear}
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          }
        >
          <div className="flex min-h-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              {esEditor ? (
                <Button
                  type="button"
                  variant="default"
                  className="h-10 w-full gap-2"
                  aria-label="Agregar objetivo"
                  disabled={bloqueado}
                  onClick={abrirCrear}
                >
                  <Plus className="h-5 w-5 shrink-0" aria-hidden />
                </Button>
              ) : null}
              <FilterBar className="filtros-contenedor-tienda w-full shrink-0 bg-card">
                <FilaFiltrosDesplegables columnas={2}>
                  <FiltroIndividualContainer
                    className={FILTER_SELECT_WRAPPER_CLASS}
                    activo={Boolean(filtroEje)}
                    onLimpiar={() => {
                      setFiltroEje("");
                      setEditingId(null);
                    }}
                  >
                    <Select
                      value={filtroEje || undefined}
                      onValueChange={(v) => {
                        setFiltroEje(v as MktPubliObjEje);
                        setEditingId(null);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger
                        className="input-filtro-unificado"
                        aria-label="Filtrar por eje"
                      >
                        <SelectValue placeholder="EJE" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="select-content-filtro"
                      >
                        {MKT_PUBLI_OBJ_EJES.map((e) => (
                          <SelectItem key={e} value={e}>
                            {etiquetaMktPubliObjEje(e)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FiltroIndividualContainer>
                  <FiltroIndividualContainer
                    className={FILTER_SELECT_WRAPPER_CLASS}
                    activo={Boolean(filtroPeriodo)}
                    onLimpiar={() => {
                      setFiltroPeriodo("");
                      setEditingId(null);
                    }}
                  >
                    <Select
                      value={filtroPeriodo || undefined}
                      onValueChange={(v) => {
                        setFiltroPeriodo(v as MktPubliObjPeriodo);
                        setEditingId(null);
                      }}
                      disabled={bloqueado}
                    >
                      <SelectTrigger
                        className="input-filtro-unificado"
                        aria-label="Filtrar por periodo"
                      >
                        <SelectValue placeholder="PERIODO" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="select-content-filtro"
                      >
                        {MKT_PUBLI_OBJ_PERIODOS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {etiquetaMktPubliObjPeriodo(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FiltroIndividualContainer>
                </FilaFiltrosDesplegables>
              </FilterBar>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1">
              <ModalMicroLabel>Objetivos</ModalMicroLabel>
              <ul className="max-h-[min(22rem,55vh)] space-y-2 overflow-y-auto pr-1">
                {itemsFiltrados.map((obj) => (
                  <li
                    key={obj.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5"
                  >
                    {editingId === obj.id && esEditor ? (
                      <>
                        <Select
                          value={editPeriodo}
                          onValueChange={(v) => setEditPeriodo(v as MktPubliObjPeriodo)}
                          disabled={bloqueado}
                        >
                          <SelectTrigger className="h-8 w-[8.5rem] text-xs" aria-label="Periodo">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MKT_PUBLI_OBJ_PERIODOS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {etiquetaMktPubliObjPeriodo(p)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={editCantidadNorm}
                          onChange={(e) =>
                            setEditCantidadNorm(e.target.value.replace(/\D/g, "").slice(0, 4))
                          }
                          inputMode="numeric"
                          className="h-8 w-16 text-xs"
                          disabled={bloqueado}
                          aria-label="Cantidad"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 shrink-0"
                          disabled={bloqueado}
                          onClick={() => void handleGuardarEdicion()}
                        >
                          Guardar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 shrink-0"
                          disabled={bloqueado}
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Target
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {obj.destinoNombre}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {etiquetaMktPubliObjPeriodo(obj.periodo)} · {obj.cantidad} PUB.
                          </p>
                        </div>
                        {esEditor ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={BOTON_ACCION_CLASS}
                              aria-label={`Editar ${obj.destinoNombre}`}
                              disabled={bloqueado}
                              onClick={() => {
                                setEditingId(obj.id);
                                setEditPeriodo(obj.periodo);
                                setEditCantidadNorm(String(obj.cantidad));
                              }}
                            >
                              <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={BOTON_ACCION_CLASS}
                              aria-label={`Eliminar ${obj.destinoNombre}`}
                              disabled={bloqueado}
                              onClick={() => setBorrarTarget(obj)}
                            >
                              <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                            </Button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </li>
                ))}
                {itemsFiltrados.length === 0 ? (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    {items.length === 0
                      ? "No hay objetivos configurados."
                      : "Ningún objetivo coincide con los filtros."}
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </AppModal>
      </Dialog>

      <Dialog
        open={openCrear}
        onOpenChange={(next) => {
          if (pending) return;
          setOpenCrear(next);
          if (!next) resetFormAlta(filtroEje || "RED");
        }}
      >
        <AppModal
          title="Nuevo Objetivo"
          size="md"
          scrollBody
          hideBodyScrollbars
          actions={
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setOpenCrear(false);
                  resetFormAlta(filtroEje || "RED");
              }}
            >
              Cancelar
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <ModalMicroLabel>Nuevo Objetivo</ModalMicroLabel>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={periodo}
                onValueChange={(v) => setPeriodo(v as MktPubliObjPeriodo)}
                disabled={pending}
              >
                <SelectTrigger className="w-full" aria-label="Periodo">
                  <SelectValue placeholder="PERIODO" />
                </SelectTrigger>
                <SelectContent>
                  {MKT_PUBLI_OBJ_PERIODOS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {etiquetaMktPubliObjPeriodo(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={ejeAlta}
                onValueChange={(v) => setEjeAlta(v as MktPubliObjEje)}
                disabled={pending}
              >
                <SelectTrigger className="w-full" aria-label="Eje">
                  <SelectValue placeholder="EJE" />
                </SelectTrigger>
                <SelectContent>
                  {MKT_PUBLI_OBJ_EJES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {etiquetaMktPubliObjEje(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select
              value={destinoId || undefined}
              onValueChange={setDestinoId}
              disabled={pending || opcionesDestinoDisponibles.length === 0}
            >
              <SelectTrigger className="w-full" aria-label="Destino">
                <SelectValue
                  placeholder={
                    opcionesDestino.length === 0
                      ? "SIN OPCIONES"
                      : opcionesDestinoDisponibles.length === 0
                        ? "TODOS CON OBJETIVO"
                        : "DESTINO"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {opcionesDestinoDisponibles.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={cantidadNorm}
                onChange={(e) => setCantidadNorm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="CANTIDAD"
                disabled={pending}
                className="flex-1"
                aria-label="Cantidad de publicaciones"
              />
              <Button
                type="button"
                disabled={pending || !destinoId || !cantidadNorm.trim()}
                onClick={() => void handleCrear()}
                className="gap-2"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                Crear
              </Button>
            </div>
          </div>
        </AppModal>
      </Dialog>

      <Dialog
        open={Boolean(borrarTarget)}
        onOpenChange={(o) => !o && !borrando && setBorrarTarget(null)}
      >
        <AppModal
          title="Eliminar Objetivo"
          size="sm"
          actions={
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={borrando}
                onClick={() => setBorrarTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={borrando}
                onClick={() => void confirmarBorrar()}
              >
                Eliminar
              </Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            ¿Eliminar el objetivo de{" "}
            <span className="font-semibold text-foreground">{borrarTarget?.destinoNombre}</span>?
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
