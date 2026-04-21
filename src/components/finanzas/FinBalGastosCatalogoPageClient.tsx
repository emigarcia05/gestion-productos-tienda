"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_CLASS,
  TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS,
} from "@/lib/ui-classes";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CrearEditarFinBalCatalogoItemModal, {
  type NivelCatalogo,
} from "./CrearEditarFinBalCatalogoItemModal";
import CrearEditarFinBalGastoFinalModal from "./CrearEditarFinBalGastoFinalModal";
import EliminarFinBalCatalogoItemModal from "./EliminarFinBalCatalogoItemModal";
import EliminarFinBalGastoFinalModal from "./EliminarFinBalGastoFinalModal";
import ProveedorModal, {
  type ProveedorParaModal,
} from "@/components/proveedores/ProveedorModal";
import type {
  FinBalGastoJerarquiaRubro,
  FinBalGastoJerarquiaTipo,
} from "@/services/finBalGastosCatalogo.service";
import type { ProveedorListItem } from "@/services/proveedor.service";

/**
 * Página del catálogo jerárquico Finanzas → Balance → Gastos.
 *
 * Layout tipo Finder de 5 columnas:
 *   [TIPOS]  →  [RUBROS]  →  [GASTOS]  →  [GASTO FINAL]  [PROVEEDORES]
 *
 * Las 4 primeras columnas son cascada: tipo → rubro → gasto (`fin_bal_cat_gasto`,
 * sin proveedor) → filas de `fin_bal_gasto_final` (gasto + proveedor + sucursal + flag mensual).
 * La columna **PROVEEDORES** es autónoma (no depende de la selección) y
 * permite gestionar el catálogo maestro de proveedores "no-mercadería"
 * (alta/edición/baja) sin salir del módulo — reutiliza el mismo
 * `ProveedorModal` usado en `/gestion-productos/proveedores/lista`. La
 * lista proviene de `getProveedoresNoMercaderia()` (filtro
 * `proveedor_mercaderia = false`).
 *
 * Interacción:
 *   - Click en un ítem de las 3 primeras columnas lo selecciona y revela la siguiente.
 *   - Click en un proveedor abre el modal en modo EDITAR.
 *   - Cada columna tiene su propio header con `+ Nuevo` (solo para editor).
 *   - Cada fila expone acciones "Editar" y "Eliminar" al pasar el mouse
 *     (salvo PROVEEDORES, donde el modal ya tiene botón Eliminar interno).
 *
 * Vistas de rol:
 *   - `editor`: botonera completa en las columnas mutables.
 *   - `simple`: solo lectura. No se muestran botones de mutación.
 */

interface Props {
  jerarquia: FinBalGastoJerarquiaTipo[];
  /**
   * Lista de proveedores "no-mercadería" (payload del servicio
   * `getProveedoresNoMercaderia`). Se usa para la columna **PROVEEDORES**
   * (lectura + apertura del modal en edición).
   */
  proveedores: ProveedorListItem[];
  sucursales: { id: string; nombre: string }[];
  esEditor: boolean;
}

type ModalCrearEditarState =
  | { open: false }
  | {
      open: true;
      nivel: NivelCatalogo;
      modo: "crear" | "editar";
      id?: string;
      nombreInicial?: string;
      parentId?: string;
      parentNombre?: string;
    };

type ModalEliminarState =
  | { open: false }
  | {
      open: true;
      nivel: NivelCatalogo;
      id: string;
      nombre: string;
    };

/**
 * Estado del `ProveedorModal` reutilizado.
 * - `proveedor === null` → modo **alta**.
 * - `proveedor !== null` → modo **edición** con datos precargados.
 */
type ProveedorModalState =
  | { open: false }
  | { open: true; proveedor: ProveedorParaModal | null };

type ModalGastoFinalState =
  | { open: false }
  | {
      open: true;
      modo: "crear" | "editar";
      id?: string;
      proveedorIdInicial?: string;
      sucursalIdInicial?: string;
      gastoMensualInicial?: boolean;
      diaDevengadoInicial?: number;
    };

type ModalEliminarGastoFinalState =
  | { open: false }
  | { open: true; id: string; proveedorNombre: string; sucursalNombre: string };

export default function FinBalGastosCatalogoPageClient({
  jerarquia,
  proveedores,
  sucursales,
  esEditor,
}: Props) {
  const router = useRouter();
  const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);
  const [selectedRubroId, setSelectedRubroId] = useState<string | null>(null);
  const [selectedGastoId, setSelectedGastoId] = useState<string | null>(null);

  const [crearEditar, setCrearEditar] = useState<ModalCrearEditarState>({ open: false });
  const [eliminar, setEliminar] = useState<ModalEliminarState>({ open: false });
  const [proveedorModal, setProveedorModal] = useState<ProveedorModalState>({ open: false });
  const [gastoFinalModal, setGastoFinalModal] = useState<ModalGastoFinalState>({ open: false });
  const [eliminarGastoFinal, setEliminarGastoFinal] = useState<ModalEliminarGastoFinalState>({
    open: false,
  });

  const tipoSeleccionado = useMemo(
    () => jerarquia.find((t) => t.id === selectedTipoId) ?? null,
    [jerarquia, selectedTipoId]
  );

  const rubroSeleccionado = useMemo<FinBalGastoJerarquiaRubro | null>(
    () => tipoSeleccionado?.rubros.find((r) => r.id === selectedRubroId) ?? null,
    [tipoSeleccionado, selectedRubroId]
  );

  const gastoSeleccionado = useMemo(
    () => rubroSeleccionado?.gastos.find((g) => g.id === selectedGastoId) ?? null,
    [rubroSeleccionado, selectedGastoId]
  );

  const proveedoresOpcionesModal = useMemo(
    () =>
      proveedores
        .map((p) => ({ id: p.id, nombre: p.nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [proveedores]
  );

  function handleSelectTipo(id: string) {
    setSelectedTipoId(id);
    setSelectedRubroId(null);
    setSelectedGastoId(null);
  }

  function handleSelectRubro(id: string) {
    setSelectedRubroId(id);
    setSelectedGastoId(null);
  }

  function handleSelectGasto(id: string) {
    setSelectedGastoId(id);
  }

  function onSuccessRefresh() {
    router.refresh();
  }

  function openProveedorNuevo() {
    setProveedorModal({ open: true, proveedor: null });
  }

  function openProveedorEdit(p: ProveedorListItem) {
    setProveedorModal({
      open: true,
      proveedor: {
        id: p.id,
        nombre: p.nombre,
        prefijo: p.prefijo,
        idProveedorDux: p.idProveedorDux ?? undefined,
        whatsapp: p.whatsapp ?? undefined,
        coeficienteTintometrico: p.coeficienteTintometrico,
        plazosPagos: p.plazosPagos ?? undefined,
        proveedorMercaderia: p.proveedorMercaderia,
      },
    });
  }

  return (
    <ClassicFilteredTableLayout
      title="FINANZAS"
      subtitle="Balance · Catálogo Gastos"
      contentWidth="full"
    >
      <div className="flex-1 min-h-0 w-full overflow-hidden py-4">
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <CatalogoColumna
            titulo="TIPOS"
            subtitulo={`${jerarquia.length} registro${jerarquia.length === 1 ? "" : "s"}`}
            mostrarNuevo={esEditor}
            onNuevo={() =>
              setCrearEditar({ open: true, nivel: "tipo", modo: "crear" })
            }
          >
            {jerarquia.length === 0 ? (
              <EmptyState mensaje="No hay tipos cargados." />
            ) : (
              jerarquia.map((tipo) => (
                <FilaCatalogo
                  key={tipo.id}
                  nombre={tipo.nombre}
                  meta={`${tipo.rubros.length} rubro${tipo.rubros.length === 1 ? "" : "s"}`}
                  selected={tipo.id === selectedTipoId}
                  onClick={() => handleSelectTipo(tipo.id)}
                  mostrarAcciones={esEditor}
                  onEditar={() =>
                    setCrearEditar({
                      open: true,
                      nivel: "tipo",
                      modo: "editar",
                      id: tipo.id,
                      nombreInicial: tipo.nombre,
                    })
                  }
                  onEliminar={() =>
                    setEliminar({
                      open: true,
                      nivel: "tipo",
                      id: tipo.id,
                      nombre: tipo.nombre,
                    })
                  }
                />
              ))
            )}
          </CatalogoColumna>

          <CatalogoColumna
            titulo="RUBROS"
            subtitulo={
              tipoSeleccionado
                ? `${tipoSeleccionado.rubros.length} en ${tipoSeleccionado.nombre}`
                : "Seleccioná un tipo"
            }
            mostrarNuevo={esEditor && tipoSeleccionado !== null}
            onNuevo={() =>
              tipoSeleccionado &&
              setCrearEditar({
                open: true,
                nivel: "rubro",
                modo: "crear",
                parentId: tipoSeleccionado.id,
                parentNombre: tipoSeleccionado.nombre,
              })
            }
            deshabilitada={tipoSeleccionado === null}
          >
            {!tipoSeleccionado ? (
              <EmptyState mensaje="Seleccioná un tipo para ver sus rubros." />
            ) : tipoSeleccionado.rubros.length === 0 ? (
              <EmptyState mensaje="Este tipo aún no tiene rubros." />
            ) : (
              tipoSeleccionado.rubros.map((rubro) => (
                <FilaCatalogo
                  key={rubro.id}
                  nombre={rubro.nombre}
                  meta={`${rubro.gastos.length} gasto${rubro.gastos.length === 1 ? "" : "s"}`}
                  selected={rubro.id === selectedRubroId}
                  onClick={() => handleSelectRubro(rubro.id)}
                  mostrarAcciones={esEditor}
                  onEditar={() =>
                    setCrearEditar({
                      open: true,
                      nivel: "rubro",
                      modo: "editar",
                      id: rubro.id,
                      nombreInicial: rubro.nombre,
                      parentId: rubro.tipoId,
                      parentNombre: tipoSeleccionado.nombre,
                    })
                  }
                  onEliminar={() =>
                    setEliminar({
                      open: true,
                      nivel: "rubro",
                      id: rubro.id,
                      nombre: rubro.nombre,
                    })
                  }
                />
              ))
            )}
          </CatalogoColumna>

          <CatalogoColumna
            titulo="GASTOS"
            subtitulo={
              rubroSeleccionado
                ? `${rubroSeleccionado.gastos.length} en ${rubroSeleccionado.nombre}`
                : "Seleccioná un rubro"
            }
            mostrarNuevo={esEditor && rubroSeleccionado !== null}
            onNuevo={() =>
              rubroSeleccionado &&
              setCrearEditar({
                open: true,
                nivel: "gasto",
                modo: "crear",
                parentId: rubroSeleccionado.id,
                parentNombre: rubroSeleccionado.nombre,
              })
            }
            deshabilitada={rubroSeleccionado === null}
          >
            {!rubroSeleccionado ? (
              <EmptyState mensaje="Seleccioná un rubro para ver sus gastos." />
            ) : rubroSeleccionado.gastos.length === 0 ? (
              <EmptyState mensaje="Este rubro aún no tiene gastos." />
            ) : (
              rubroSeleccionado.gastos.map((gasto) => (
                <FilaCatalogo
                  key={gasto.id}
                  nombre={gasto.nombre}
                  meta={`${gasto.asignacionesFinales.length} final${
                    gasto.asignacionesFinales.length === 1 ? "" : "es"
                  }`}
                  selected={gasto.id === selectedGastoId}
                  onClick={() => handleSelectGasto(gasto.id)}
                  mostrarAcciones={esEditor}
                  onEditar={() =>
                    setCrearEditar({
                      open: true,
                      nivel: "gasto",
                      modo: "editar",
                      id: gasto.id,
                      nombreInicial: gasto.nombre,
                      parentId: gasto.rubroId,
                      parentNombre: rubroSeleccionado.nombre,
                    })
                  }
                  onEliminar={() =>
                    setEliminar({
                      open: true,
                      nivel: "gasto",
                      id: gasto.id,
                      nombre: gasto.nombre,
                    })
                  }
                />
              ))
            )}
          </CatalogoColumna>

          <CatalogoColumna
            titulo="GASTO FINAL"
            subtitulo={
              gastoSeleccionado
                ? `${gastoSeleccionado.asignacionesFinales.length} en ${gastoSeleccionado.nombre}`
                : "Seleccioná un gasto"
            }
            mostrarNuevo={esEditor && gastoSeleccionado !== null}
            onNuevo={() =>
              gastoSeleccionado &&
              setGastoFinalModal({
                open: true,
                modo: "crear",
              })
            }
            deshabilitada={gastoSeleccionado === null}
          >
            {!gastoSeleccionado ? (
              <EmptyState mensaje="Seleccioná un gasto para ver sus gastos finales." />
            ) : gastoSeleccionado.asignacionesFinales.length === 0 ? (
              <EmptyState mensaje="Este gasto aún no tiene gastos finales." />
            ) : (
              gastoSeleccionado.asignacionesFinales.map((a) => (
                <FilaCatalogo
                  key={a.id}
                  nombre={a.proveedor.nombre}
                  meta={
                    [
                      a.sucursal.nombre,
                      a.proveedor.prefijo,
                      `Día ${a.diaDevengado}`,
                      a.gastoMensual ? "Mensual" : null,
                    ]
                      .filter((v): v is string => Boolean(v))
                      .join(" · ")
                  }
                  selected={false}
                  mostrarAcciones={esEditor}
                  onEditar={() =>
                    setGastoFinalModal({
                      open: true,
                      modo: "editar",
                      id: a.id,
                      proveedorIdInicial: a.proveedorId,
                      sucursalIdInicial: a.sucursalId,
                      gastoMensualInicial: a.gastoMensual,
                      diaDevengadoInicial: a.diaDevengado,
                    })
                  }
                  onEliminar={() =>
                    setEliminarGastoFinal({
                      open: true,
                      id: a.id,
                      proveedorNombre: a.proveedor.nombre,
                      sucursalNombre: a.sucursal.nombre,
                    })
                  }
                />
              ))
            )}
          </CatalogoColumna>

          {/* Columna autónoma: CRUD del catálogo maestro de proveedores "no-mercadería".
              Reutiliza `ProveedorModal` (el mismo de /gestion-productos/proveedores/lista). */}
          <CatalogoColumna
            titulo="PROVEEDORES"
            subtitulo={`${proveedores.length} registro${proveedores.length === 1 ? "" : "s"}`}
            mostrarNuevo={esEditor}
            onNuevo={openProveedorNuevo}
          >
            {proveedores.length === 0 ? (
              <EmptyState mensaje="No hay proveedores cargados." />
            ) : (
              proveedores.map((p) => (
                <FilaCatalogo
                  key={p.id}
                  nombre={p.nombre}
                  meta={p.prefijo}
                  selected={false}
                  onClick={esEditor ? () => openProveedorEdit(p) : undefined}
                  mostrarAcciones={false}
                  onEditar={() => openProveedorEdit(p)}
                  onEliminar={() => openProveedorEdit(p)}
                />
              ))
            )}
          </CatalogoColumna>
        </div>
      </div>

      {/* Modal único de alta/edición para los 3 niveles */}
      {crearEditar.open && (
        <CrearEditarFinBalCatalogoItemModal
          open={crearEditar.open}
          onOpenChange={(next) => !next && setCrearEditar({ open: false })}
          nivel={crearEditar.nivel}
          modo={crearEditar.modo}
          id={crearEditar.id}
          nombreInicial={crearEditar.nombreInicial}
          parentId={crearEditar.parentId}
          parentNombre={crearEditar.parentNombre}
          onSuccess={onSuccessRefresh}
        />
      )}

      {gastoFinalModal.open && gastoSeleccionado && (
        <CrearEditarFinBalGastoFinalModal
          open={gastoFinalModal.open}
          onOpenChange={(next) => !next && setGastoFinalModal({ open: false })}
          modo={gastoFinalModal.modo}
          id={gastoFinalModal.id}
          gastoId={gastoSeleccionado.id}
          gastoNombre={gastoSeleccionado.nombre}
          proveedoresOpciones={proveedoresOpcionesModal}
          sucursales={sucursales}
          asignacionesExistentes={gastoSeleccionado.asignacionesFinales.map((a) => ({
            id: a.id,
            proveedorId: a.proveedorId,
            sucursalId: a.sucursalId,
          }))}
          proveedorIdInicial={gastoFinalModal.proveedorIdInicial}
          sucursalIdInicial={gastoFinalModal.sucursalIdInicial}
          gastoMensualInicial={gastoFinalModal.gastoMensualInicial}
          diaDevengadoInicial={gastoFinalModal.diaDevengadoInicial}
          onSuccess={onSuccessRefresh}
        />
      )}

      {eliminarGastoFinal.open && (
        <EliminarFinBalGastoFinalModal
          open={eliminarGastoFinal.open}
          onOpenChange={(next) => !next && setEliminarGastoFinal({ open: false })}
          id={eliminarGastoFinal.open ? eliminarGastoFinal.id : null}
          proveedorNombre={eliminarGastoFinal.open ? eliminarGastoFinal.proveedorNombre : null}
          sucursalNombre={eliminarGastoFinal.open ? eliminarGastoFinal.sucursalNombre : null}
          gastoNombre={gastoSeleccionado?.nombre ?? null}
          onSuccess={onSuccessRefresh}
        />
      )}

      {/* Modal único de eliminación para los 3 niveles */}
      {eliminar.open && (
        <EliminarFinBalCatalogoItemModal
          open={eliminar.open}
          onOpenChange={(next) => !next && setEliminar({ open: false })}
          nivel={eliminar.nivel}
          id={eliminar.id}
          nombre={eliminar.nombre}
          onSuccess={onSuccessRefresh}
        />
      )}

      {/* ProveedorModal reutilizado (alta + edición + eliminación interna).
          `proveedor === null` → alta; si no → edición con datos precargados. */}
      <Dialog
        open={proveedorModal.open}
        onOpenChange={(next) => !next && setProveedorModal({ open: false })}
      >
        {proveedorModal.open && (
          <ProveedorModal
            open={proveedorModal.open}
            onOpenChange={(next) => !next && setProveedorModal({ open: false })}
            proveedor={proveedorModal.proveedor}
            onSuccess={() => {
              setProveedorModal({ open: false });
              onSuccessRefresh();
            }}
          />
        )}
      </Dialog>
    </ClassicFilteredTableLayout>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────

function CatalogoColumna({
  titulo,
  subtitulo,
  mostrarNuevo,
  onNuevo,
  deshabilitada = false,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  mostrarNuevo: boolean;
  onNuevo?: () => void;
  deshabilitada?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm",
        deshabilitada && "opacity-95"
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-foreground">
            {titulo}
          </h2>
          {subtitulo && (
            <p className="truncate text-[11px] text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        {mostrarNuevo && (
          <Button size="sm" type="button" onClick={onNuevo} className="shrink-0 h-8 gap-1">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        )}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </section>
  );
}

function FilaCatalogo({
  nombre,
  meta,
  selected,
  onClick,
  mostrarAcciones,
  onEditar,
  onEliminar,
}: {
  nombre: string;
  meta?: string;
  selected: boolean;
  onClick?: () => void;
  mostrarAcciones: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const isClickable = typeof onClick === "function";
  return (
    <div
      className={cn(
        "group flex items-center gap-2 border-b px-3 py-2 text-sm transition-colors",
        isClickable ? "cursor-pointer hover:bg-accent/50" : "cursor-default",
        selected && "bg-primary/10 hover:bg-primary/15"
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!isClickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{nombre}</div>
        {meta && <div className="truncate text-[11px] text-muted-foreground">{meta}</div>}
      </div>

      {mostrarAcciones && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            className={TABLE_ROW_ICON_BUTTON_CLASS}
            title="Editar"
            aria-label={`Editar ${nombre}`}
            onClick={(e) => {
              e.stopPropagation();
              onEditar();
            }}
          >
            <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            className={cn(
              TABLE_ROW_ICON_BUTTON_CLASS,
              TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS
            )}
            title="Eliminar"
            aria-label={`Eliminar ${nombre}`}
            onClick={(e) => {
              e.stopPropagation();
              onEliminar();
            }}
          >
            <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} />
          </Button>
        </div>
      )}

      {isClickable && (
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            selected && "text-primary"
          )}
        />
      )}
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground">
      {mensaje}
    </div>
  );
}
