"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import {
  listarReglasDescEspecialAction,
  obtenerReglaDescEspecialDetalleAction,
  type ReglaDescEspecialDetalle,
  type ReglaDescEspecialListaPrecio,
} from "@/actions/descEspecialReglas";
import CrearEditarReglaDescEspecialModal from "@/components/proveedores/CrearEditarReglaDescEspecialModal";
import EliminarReglaDescEspecialModal from "@/components/proveedores/EliminarReglaDescEspecialModal";
import { fmtPorcentajeTabla } from "@/lib/format";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const COL_WIDTHS_PCT = [45, 15, 20, 20] as const;
const COL_COUNT = COL_WIDTHS_PCT.length;

interface Props {
  onSuccess?: () => void;
}

export default function ReglasDescEspecificasListaPreciosPanel({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [reglas, setReglas] = useState<ReglaDescEspecialListaPrecio[]>([]);

  const [crearEditarOpen, setCrearEditarOpen] = useState(false);
  const [modoModal, setModoModal] = useState<"crear" | "editar">("crear");
  const [reglaEdit, setReglaEdit] = useState<ReglaDescEspecialDetalle | null>(null);

  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [reglaEliminar, setReglaEliminar] = useState<ReglaDescEspecialListaPrecio | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listarReglasDescEspecialAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron cargar las reglas.");
        setReglas([]);
        return;
      }
      setReglas(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const reglasOrdenadas = useMemo(
    () => [...reglas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
    [reglas]
  );

  function handleSuccess() {
    void cargarDatos();
    onSuccess?.();
  }

  function abrirCrear() {
    setModoModal("crear");
    setReglaEdit(null);
    setCrearEditarOpen(true);
  }

  async function abrirEditar(regla: ReglaDescEspecialListaPrecio) {
    const res = await obtenerReglaDescEspecialDetalleAction({ id: regla.id });
    if (!res.ok) {
      toast.error("error" in res ? res.error : "No se pudo cargar la regla.");
      return;
    }
    if (!res.data) {
      toast.error("No se pudo cargar la regla.");
      return;
    }
    setModoModal("editar");
    setReglaEdit(res.data);
    setCrearEditarOpen(true);
  }

  function abrirEliminar(regla: ReglaDescEspecialListaPrecio) {
    setReglaEliminar(regla);
    setEliminarOpen(true);
  }

  return (
    <>
      <div className="flex flex-col gap-3 min-h-0 flex-1">
        <div className="flex justify-end">
          <Button type="button" variant="default" size="sm" className="gap-2" onClick={abrirCrear}>
            <Plus className="h-4 w-4" />
            Nueva Regla Desc. Específico
          </Button>
        </div>

        <div className="contenedor-tabla-gestion min-h-0 max-h-[min(46.4vh,25.6rem)] flex-1">
          <Table variant="compact" className="tabla-vinculos-modal w-full min-w-0">
            <colgroup>
              {COL_WIDTHS_PCT.map((pct, i) => (
                <col key={i} style={{ width: `${pct}%` }} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>NOMBRE</TableHead>
                <TableHead className="text-right">VALOR</TableHead>
                <TableHead className="text-center">PRODUCTOS</TableHead>
                <TableHead className="text-center">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={COL_COUNT} className="celda-datos text-center text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Cargando reglas…
                    </span>
                  </TableCell>
                </TableRow>
              ) : reglasOrdenadas.length === 0 ? (
                <EmptyTableRow colSpan={COL_COUNT} message="No hay reglas de desc. específico." />
              ) : (
                reglasOrdenadas.map((regla) => (
                  <TableRow key={regla.id}>
                    <TableCell className="celda-datos whitespace-normal break-words">{regla.nombre}</TableCell>
                    <TableCell className="celda-datos text-right tabular-nums">
                      {fmtPorcentajeTabla(regla.valor)}
                    </TableCell>
                    <TableCell className="celda-datos text-center tabular-nums">
                      {regla.cantidadProductos}
                    </TableCell>
                    <TableCell className="celda-datos celda-datos--accion-relleno-fila p-0">
                      <div className={cn(TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS, "justify-center gap-0.5")}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          aria-label="Editar regla"
                          onClick={() => void abrirEditar(regla)}
                        >
                          <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          aria-label="Eliminar regla"
                          onClick={() => abrirEliminar(regla)}
                        >
                          <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CrearEditarReglaDescEspecialModal
        open={crearEditarOpen}
        onOpenChange={setCrearEditarOpen}
        modo={modoModal}
        regla={reglaEdit}
        onSuccess={handleSuccess}
      />

      <EliminarReglaDescEspecialModal
        open={eliminarOpen}
        onOpenChange={setEliminarOpen}
        regla={reglaEliminar}
        onSuccess={handleSuccess}
      />
    </>
  );
}
