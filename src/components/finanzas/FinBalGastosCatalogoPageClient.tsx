"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CrearEditarFinBalCatalogoItemModal, {
  type NivelCatalogo,
} from "./CrearEditarFinBalCatalogoItemModal";
import EliminarFinBalCatalogoItemModal from "./EliminarFinBalCatalogoItemModal";
import type {
  FinBalGastoJerarquiaRubro,
  FinBalGastoJerarquiaTipo,
} from "@/services/finBalGastosCatalogo.service";

export interface ProveedorOption {
  id: string;
  nombre: string;
}

/**
 * Página del catálogo jerárquico Finanzas → Balance → Gastos.
 *
 * Layout tipo Finder de 3 columnas:
 *   [TIPOS]  →  [RUBROS]  →  [GASTOS]
 *
 * Interacción:
 *   - Click en un ítem de una columna lo selecciona y revela la columna siguiente.
 *   - Cada columna tiene su propio header con `+ Nuevo` (solo para editor).
 *   - Cada fila expone acciones "Editar" y "Eliminar" al pasar el mouse.
 *
 * Vistas de rol:
 *   - `editor`: botonera completa (crear / editar / eliminar) en las 3 columnas.
 *   - `simple`: solo lectura. No se muestran botones de mutación.
 */

interface Props {
  jerarquia: FinBalGastoJerarquiaTipo[];
  /**
   * Lista de proveedores disponibles para asignar a un gasto (se pasa al modal
   * de alta/edición de gasto). Server Component la carga en un solo roundtrip.
   */
  proveedores: ProveedorOption[];
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
      /** Solo aplica a `nivel === "gasto"`. `null` = sin proveedor. */
      proveedorIdInicial?: string | null;
    };

type ModalEliminarState =
  | { open: false }
  | {
      open: true;
      nivel: NivelCatalogo;
      id: string;
      nombre: string;
    };

export default function FinBalGastosCatalogoPageClient({
  jerarquia,
  proveedores,
  esEditor,
}: Props) {
  const router = useRouter();
  const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);
  const [selectedRubroId, setSelectedRubroId] = useState<string | null>(null);

  const [crearEditar, setCrearEditar] = useState<ModalCrearEditarState>({ open: false });
  const [eliminar, setEliminar] = useState<ModalEliminarState>({ open: false });

  const tipoSeleccionado = useMemo(
    () => jerarquia.find((t) => t.id === selectedTipoId) ?? null,
    [jerarquia, selectedTipoId]
  );

  const rubroSeleccionado = useMemo<FinBalGastoJerarquiaRubro | null>(
    () => tipoSeleccionado?.rubros.find((r) => r.id === selectedRubroId) ?? null,
    [tipoSeleccionado, selectedRubroId]
  );

  function handleSelectTipo(id: string) {
    setSelectedTipoId(id);
    setSelectedRubroId(null);
  }

  function handleSelectRubro(id: string) {
    setSelectedRubroId(id);
  }

  function onSuccessRefresh() {
    router.refresh();
  }

  return (
    <ClassicFilteredTableLayout
      title="FINANZAS"
      subtitle="Balance · Catálogo Gastos"
      contentWidth="full"
    >
      <div className="flex-1 min-h-0 w-full overflow-hidden py-4">
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 md:grid-cols-3">
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
                  meta={gasto.proveedor ? gasto.proveedor.nombre : "Sin proveedor"}
                  selected={false}
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
                      proveedorIdInicial: gasto.proveedorId,
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
          proveedores={proveedores}
          proveedorIdInicial={crearEditar.proveedorIdInicial ?? null}
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
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Editar"
            aria-label={`Editar ${nombre}`}
            onClick={(e) => {
              e.stopPropagation();
              onEditar();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Eliminar"
            aria-label={`Eliminar ${nombre}`}
            onClick={(e) => {
              e.stopPropagation();
              onEliminar();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
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
