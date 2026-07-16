"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import ExportarMktSeccionesGoogleSheetsButton from "@/components/shared/ExportarMktSeccionesGoogleSheetsButton";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
  objetivosIniciales: MktPublicacionObjItem[];
  redes: MktCatalogoNombreItem[];
  contenidos: MktCatalogoNombreItem[];
  secciones: MktCatalogoNombreItem[];
  esEditor: boolean;
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

function catalogoPorEje(
  eje: MktPubliObjEje,
  redes: MktCatalogoNombreItem[],
  contenidos: MktCatalogoNombreItem[],
  secciones: MktCatalogoNombreItem[]
): MktCatalogoNombreItem[] {
  if (eje === "RED") return redes;
  if (eje === "CONTENIDO") return contenidos;
  return secciones;
}

export default function MarketingObjetivosPageClient({
  objetivosIniciales,
  redes,
  contenidos,
  secciones,
  esEditor,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<MktPublicacionObjItem[]>(objetivosIniciales);
  const [ejeAlta, setEjeAlta] = useState<MktPubliObjEje | null>(null);
  const [periodo, setPeriodo] = useState<MktPubliObjPeriodo>("SEMANAL");
  const [destinoId, setDestinoId] = useState("");
  const [cantidadNorm, setCantidadNorm] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPeriodo, setEditPeriodo] = useState<MktPubliObjPeriodo>("SEMANAL");
  const [editCantidadNorm, setEditCantidadNorm] = useState("1");
  const [pending, setPending] = useState(false);
  const [borrarTarget, setBorrarTarget] = useState<MktPublicacionObjItem | null>(null);
  const [borrando, setBorrando] = useState(false);

  const itemsPorEje = useMemo(() => {
    const map: Record<MktPubliObjEje, MktPublicacionObjItem[]> = {
      RED: [],
      CONTENIDO: [],
      SECCION: [],
    };
    for (const item of items) {
      map[item.eje].push(item);
    }
    for (const eje of MKT_PUBLI_OBJ_EJES) {
      map[eje].sort((a, b) =>
        a.destinoNombre.localeCompare(b.destinoNombre, "es", { sensitivity: "base" })
      );
    }
    return map;
  }, [items]);

  const opcionesDestino = useMemo(() => {
    if (!ejeAlta) return [];
    return catalogoPorEje(ejeAlta, redes, contenidos, secciones);
  }, [ejeAlta, redes, contenidos, secciones]);

  const destinosConObjetivo = useMemo(() => {
    if (!ejeAlta) return new Set<string>();
    return new Set(items.filter((i) => i.eje === ejeAlta).map((i) => i.destinoId));
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
    setItems(objetivosIniciales);
  }, [objetivosIniciales]);

  useEffect(() => {
    setDestinoId("");
  }, [ejeAlta]);

  function resetFormAlta(eje: MktPubliObjEje, periodoAlta: MktPubliObjPeriodo) {
    setPeriodo(periodoAlta);
    setEjeAlta(eje);
    setDestinoId("");
    setCantidadNorm("1");
  }

  function abrirCrear(eje: MktPubliObjEje, periodoAlta: MktPubliObjPeriodo) {
    if (!esEditor || pending || borrando) return;
    setEditingId(null);
    resetFormAlta(eje, periodoAlta);
  }

  function cerrarCrear() {
    setEjeAlta(null);
    setPeriodo("SEMANAL");
    setDestinoId("");
    setCantidadNorm("1");
  }

  function refresh() {
    router.refresh();
  }

  async function handleCrear() {
    if (!esEditor || pending || !ejeAlta) return;
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
      cerrarCrear();
      await cargar();
      refresh();
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
      refresh();
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
      refresh();
    } finally {
      setBorrando(false);
    }
  }

  const bloqueado = pending || borrando;
  const openCrear = ejeAlta !== null;

  function renderFila(obj: MktPublicacionObjItem) {
    if (editingId === obj.id && esEditor) {
      return (
        <li
          key={obj.id}
          className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
        >
          <Target className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {obj.destinoNombre}
          </p>
          <Input
            value={editCantidadNorm}
            onChange={(e) =>
              setEditCantidadNorm(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            inputMode="numeric"
            className="h-8 w-16 text-xs"
            disabled={bloqueado}
            aria-label="Cantidad de publicaciones"
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
        </li>
      );
    }

    return (
      <li
        key={obj.id}
        className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
      >
        <Target className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{obj.destinoNombre}</p>
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
      </li>
    );
  }

  return (
    <>
      <ClassicFilteredTableLayout
        title="Marketing"
        subtitle="Objetivos"
        contentWidth="full"
        actions={
          esEditor ? (
            <div className="flex flex-wrap items-center gap-2">
              <ExportarMktSeccionesGoogleSheetsButton />
            </div>
          ) : undefined
        }
      >
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-3 overflow-hidden">
          {MKT_PUBLI_OBJ_EJES.map((eje) => {
            const filas = itemsPorEje[eje];
            const titulo = etiquetaMktPubliObjEje(eje);
            return (
              <section
                key={eje}
                className="flex min-h-0 min-w-0 flex-col rounded-lg border border-border bg-card"
                aria-label={titulo}
              >
                <header className="flex shrink-0 items-center justify-center border-b border-border bg-primary px-3 py-2 text-center">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-primary-foreground">
                    {titulo}
                  </h3>
                </header>
                <div className="grid min-h-0 flex-1 grid-rows-2 divide-y divide-border">
                  {MKT_PUBLI_OBJ_PERIODOS.map((periodoObjetivo) => {
                    const filasPeriodo = filas.filter(
                      (obj) => obj.periodo === periodoObjetivo
                    );
                    const etiquetaPeriodo =
                      periodoObjetivo === "SEMANAL" ? "SEMANALES" : "MENSUALES";
                    return (
                      <section
                        key={periodoObjetivo}
                        className="flex min-h-0 flex-col"
                        aria-label={`${titulo} ${etiquetaPeriodo}`}
                      >
                        <div className="relative flex shrink-0 items-center justify-center border-b border-primary/30 bg-primary/15 px-10 py-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-primary">
                            {etiquetaPeriodo}
                          </h4>
                          {esEditor ? (
                            <Button
                              type="button"
                              variant="default"
                              size="icon"
                              className="absolute right-2 top-1/2 !size-5 -translate-y-1/2 rounded-sm border border-primary-foreground/40 bg-primary p-0 text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground hover:brightness-100"
                              aria-label={`Agregar objetivo ${titulo} ${etiquetaPeriodo}`}
                              disabled={bloqueado}
                              onClick={() => abrirCrear(eje, periodoObjetivo)}
                            >
                              <Plus className="size-3.5" aria-hidden />
                            </Button>
                          ) : null}
                        </div>
                        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                          {filasPeriodo.length === 0 ? (
                            <li className="px-3 py-5 text-center text-xs text-muted-foreground">
                              Sin objetivos
                            </li>
                          ) : (
                            filasPeriodo.map((obj) => renderFila(obj))
                          )}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </ClassicFilteredTableLayout>

      <Dialog
        open={openCrear}
        onOpenChange={(next) => {
          if (pending) return;
          if (!next) cerrarCrear();
        }}
      >
        <AppModal
          title={
            ejeAlta
              ? `Nuevo Objetivo · ${etiquetaMktPubliObjEje(ejeAlta)} · ${etiquetaMktPubliObjPeriodo(periodo)}`
              : "Nuevo Objetivo"
          }
          size="md"
          scrollBody
          hideBodyScrollbars
          actions={
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={cerrarCrear}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={pending || !destinoId || !cantidadNorm.trim()}
                onClick={() => void handleCrear()}
              >
                Crear
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <ModalMicroLabel>Nuevo Objetivo</ModalMicroLabel>
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
            <div className="flex w-full items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={pending || (parseCantidad(cantidadNorm) ?? 1) <= 1}
                aria-label="Disminuir cantidad"
                onClick={() =>
                  setCantidadNorm(String(Math.max(1, (parseCantidad(cantidadNorm) ?? 1) - 1)))
                }
              >
                <Minus className="size-4" aria-hidden />
              </Button>
              <Input
                value={cantidadNorm}
                onChange={(e) => setCantidadNorm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="CANTIDAD"
                disabled={pending}
                className="min-w-0 flex-1 text-center tabular-nums"
                aria-label="Cantidad de publicaciones"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={pending || (parseCantidad(cantidadNorm) ?? 1) >= 9999}
                aria-label="Aumentar cantidad"
                onClick={() =>
                  setCantidadNorm(
                    String(Math.min(9999, (parseCantidad(cantidadNorm) ?? 1) + 1))
                  )
                }
              >
                <Plus className="size-4" aria-hidden />
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
