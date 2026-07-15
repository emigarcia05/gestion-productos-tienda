"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
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
  const [periodo, setPeriodo] = useState<MktPubliObjPeriodo>("SEMANAL");
  const [eje, setEje] = useState<MktPubliObjEje>("RED");
  const [destinoId, setDestinoId] = useState("");
  const [cantidadNorm, setCantidadNorm] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPeriodo, setEditPeriodo] = useState<MktPubliObjPeriodo>("SEMANAL");
  const [editCantidadNorm, setEditCantidadNorm] = useState("1");
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<MktPublicacionObjItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const opcionesDestino = useMemo(() => {
    if (eje === "RED") return redes;
    if (eje === "CONTENIDO") return contenidos;
    return secciones;
  }, [eje, redes, contenidos, secciones]);

  const destinosConObjetivo = useMemo(() => {
    const set = new Set(items.filter((i) => i.eje === eje).map((i) => i.destinoId));
    return set;
  }, [items, eje]);

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
    setPeriodo("SEMANAL");
    setEje("RED");
    setDestinoId("");
    setCantidadNorm("1");
    setEditingId(null);
    setBorrarTarget(null);
  }, [open, cargar, objetivosIniciales]);

  useEffect(() => {
    setDestinoId("");
  }, [eje]);

  function parseCantidad(raw: string): number | null {
    const n = Number(raw.trim());
    if (!Number.isInteger(n) || n < 1 || n > 9999) return null;
    return n;
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
        eje,
        destinoId,
        cantidad,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear el objetivo.");
        return;
      }
      toast.success("Objetivo creado.");
      setDestinoId("");
      setCantidadNorm("1");
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
      <Dialog open={open} onOpenChange={(next) => !bloqueado && onOpenChange(next)}>
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
              disabled={bloqueado}
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          }
        >
          <div className="flex min-h-0 flex-col gap-4">
            {esEditor ? (
              <div className="flex flex-col gap-3">
                <ModalMicroLabel>Nuevo Objetivo</ModalMicroLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={periodo}
                    onValueChange={(v) => setPeriodo(v as MktPubliObjPeriodo)}
                    disabled={bloqueado}
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
                    value={eje}
                    onValueChange={(v) => setEje(v as MktPubliObjEje)}
                    disabled={bloqueado}
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
                  disabled={bloqueado || opcionesDestinoDisponibles.length === 0}
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
                    disabled={bloqueado}
                    className="flex-1"
                    aria-label="Cantidad de publicaciones"
                  />
                  <Button
                    type="button"
                    disabled={bloqueado || !destinoId || !cantidadNorm.trim()}
                    onClick={() => void handleCrear()}
                    className="gap-2"
                  >
                    <Plus className="size-4 shrink-0" aria-hidden />
                    Crear
                  </Button>
                </div>
              </div>
            ) : null}

            <div className={cn("flex min-h-0 flex-1 flex-col gap-1", esEditor && "border-t pt-3")}>
              <ModalMicroLabel>Objetivos Existentes</ModalMicroLabel>
              <ul className="max-h-[min(22rem,55vh)] space-y-2 overflow-y-auto pr-1">
                {items.map((obj) => (
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
                            {etiquetaMktPubliObjPeriodo(obj.periodo)} ·{" "}
                            {etiquetaMktPubliObjEje(obj.eje)} · {obj.cantidad} PUB.
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
                {items.length === 0 ? (
                  <li className="py-6 text-center text-sm text-muted-foreground">
                    No hay objetivos configurados.
                  </li>
                ) : null}
              </ul>
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
