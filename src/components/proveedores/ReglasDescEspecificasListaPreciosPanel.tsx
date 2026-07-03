"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
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
import { celdaCondicionReglaDescuento } from "@/lib/descuentosListaPrecioReglasUi";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const COL_WIDTHS_PCT = [22, 8, 10, 10, 10, 10, 30] as const;
const COL_COUNT = COL_WIDTHS_PCT.length;

interface Props {
  onSuccess?: () => void;
  filtroProveedorId: string;
  filtroMarcaId: string;
  filtroRubroId: string;
  /** Incremento desde el padre para abrir el modal de alta. */
  solicitudCrear?: number;
  tablaClassName: string;
}

export default function ReglasDescEspecificasListaPreciosPanel({
  onSuccess,
  filtroProveedorId,
  filtroMarcaId,
  filtroRubroId,
  solicitudCrear = 0,
  tablaClassName,
}: Props) {
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

  const abrirCrear = useCallback(() => {
    setModoModal("crear");
    setReglaEdit(null);
    setCrearEditarOpen(true);
  }, []);

  const solicitudCrearPrev = useRef(solicitudCrear);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (solicitudCrear === solicitudCrearPrev.current) return;
    solicitudCrearPrev.current = solicitudCrear;
    abrirCrear();
  }, [solicitudCrear, abrirCrear]);

  const reglasFiltradas = useMemo(() => {
    return reglas.filter((regla) => {
      if (filtroProveedorId && regla.idProveedor !== filtroProveedorId) return false;
      if (filtroMarcaId && regla.idMarca !== filtroMarcaId) return false;
      if (filtroRubroId && regla.idRubro !== filtroRubroId) return false;
      return true;
    });
  }, [reglas, filtroProveedorId, filtroMarcaId, filtroRubroId]);

  const reglasOrdenadas = useMemo(
    () =>
      [...reglasFiltradas].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
      ),
    [reglasFiltradas]
  );

  function handleSuccess() {
    void cargarDatos();
    onSuccess?.();
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
      <div className={tablaClassName}>
          <Table variant="compact" className="tabla-vinculos-modal w-full min-w-0">
            <colgroup>
              {COL_WIDTHS_PCT.map((pct, i) => (
                <col key={i} style={{ width: `${pct}%` }} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>NOMBRE</TableHead>
                <TableHead>PROV.</TableHead>
                <TableHead>MARCA</TableHead>
                <TableHead>RUBRO</TableHead>
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
                <EmptyTableRow
                  colSpan={COL_COUNT}
                  message={
                    reglas.length === 0
                      ? "No hay reglas de desc. específico."
                      : "Ninguna regla coincide con los filtros."
                  }
                />
              ) : (
                reglasOrdenadas.map((regla) => (
                  <TableRow key={regla.id}>
                    <TableCell className="celda-datos whitespace-normal break-words">{regla.nombre}</TableCell>
                    <TableCell className="celda-datos tabular-nums">
                      {celdaCondicionReglaDescuento(
                        {
                          idProveedor: regla.idProveedor,
                          proveedorPrefijo: regla.proveedorPrefijo,
                        },
                        "proveedor"
                      ) || "—"}
                    </TableCell>
                    <TableCell className="celda-datos">
                      {celdaCondicionReglaDescuento(
                        { idMarca: regla.idMarca, marcaNombre: regla.marcaNombre },
                        "marca"
                      ) || "—"}
                    </TableCell>
                    <TableCell className="celda-datos">
                      {celdaCondicionReglaDescuento(
                        { idRubro: regla.idRubro, rubroNombre: regla.rubroNombre },
                        "rubro"
                      ) || "—"}
                    </TableCell>
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
