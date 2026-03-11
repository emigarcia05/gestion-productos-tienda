"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { LimpiarFiltrosButton } from "@/components/FilterBar";
import { getProveedores, listarProductosParaVincular } from "@/actions/vinculos";
import type { ProductoProveedorParaVincular } from "@/services/listaPrecios.service";
import { cn } from "@/lib/utils";

/** Forma que espera VincularModal al seleccionar (id + datos para lista y toast). */
export type ProductoConProveedor = {
  id: string;
  codigoExterno: string;
  codProdProv: string;
  descripcion: string;
  precioLista: number;
  proveedor: { nombre: string; prefijo: string };
};

type ProveedorOption = { id: string; nombre: string; prefijo: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onSeleccionar: (producto: ProductoConProveedor) => void;
  excluirItemTiendaId: string;
  /** Prefijos de proveedores ya vinculados al ítem; se ocultan de la lista para evitar duplicados. */
  prefijosYaVinculados?: string[];
}

export default function SeleccionarProductoModal({
  open,
  onClose,
  onSeleccionar,
  excluirItemTiendaId: _excluirItemTiendaId,
  prefijosYaVinculados = [],
}: Props) {
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ProductoProveedorParaVincular[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    getProveedores().then(setProveedores);
  }, [open]);

  const hayFiltros = !!proveedorId || !!q.trim();

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!hayFiltros) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    const run = async () => {
      const result = await listarProductosParaVincular(
        proveedorId || undefined,
        q.trim() || undefined
      );
      setLoading(false);
      if (result.success) {
        const filtrados = prefijosYaVinculados.length
          ? result.data.filter((r) => !prefijosYaVinculados.includes(r.proveedor.prefijo))
          : result.data;
        setRows(filtrados);
      } else {
        toast.error(result.error);
        setRows([]);
      }
    };
    debounceRef.current = setTimeout(run, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, proveedorId, q, hayFiltros]);

  function limpiar() {
    setProveedorId("");
    setQ("");
  }

  function handleRowDoubleClick(row: ProductoProveedorParaVincular) {
    const producto: ProductoConProveedor = {
      id: row.id,
      codigoExterno: row.codExt,
      codProdProv: row.codProdProv,
      descripcion: row.descripcionProveedor,
      precioLista: 0,
      proveedor: { nombre: row.proveedor.nombre, prefijo: row.proveedor.prefijo },
    };
    onSeleccionar(producto);
  }

  const MENSAJE_SIN_FILTRO =
    "Aplicá al menos un filtro (Proveedor o Descripción) para ver los productos.";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "modal-app max-w-[84rem] w-[calc(100%-2rem)] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
        )}
      >
        <DialogHeader className="modal-app__header shrink-0">
          <DialogTitle className="modal-app__title">Vincular nuevo producto</DialogTitle>
        </DialogHeader>

        {/* Plantilla modal-app: content (cuerpo + footer) según globals.css */}
        <div className="modal-app__content flex-1 min-h-0">
          {/* Cuerpo: Filtro Proveedor (fijo) + Filtro Descripción (fijo) + Encabezado (fijo) + Tabla (scroll) */}
          <div className="modal-app__body flex flex-col flex-1 min-h-0 overflow-hidden px-6 pt-4 pb-0">
            {/* Mismo ancho que la tabla: contenedor y filtros a ancho completo */}
            <div className="shrink-0 w-full flex flex-col gap-2 pb-3 border-b border-border">
              {/* Filtro Proveedor (fijo) */}
              <Select
                value={proveedorId || "none"}
                onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="input-filtro-unificado w-full">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todos los proveedores</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      [{p.prefijo}] {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por descripción (fijo): input se estira; junto con el botón ocupan el mismo ancho que el desplegable */}
              <div className="w-full flex items-center gap-2">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Descripción"
                  className="input-filtro-unificado flex-1 min-w-0"
                />
                <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiar} />
              </div>
            </div>

            {/* Encabezado (fijo, fuera del scroll) + Tabla (solo cuerpo con scroll). Mismo ancho de columnas con table-fixed. */}
            <div className="flex-1 min-h-0 flex flex-col pt-3 pb-3">
              {!hayFiltros ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {MENSAJE_SIN_FILTRO}
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" /> Cargando...
                </div>
              ) : rows.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No hay productos o no coinciden los filtros.
                </div>
              ) : (
                <>
                  {/* Encabezado fijo: fuera del contenedor con scroll */}
                  <div className="shrink-0">
                    <Table variant="compact" scrollX={false} className="table-fixed w-full">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-0">
                          <TableHead className="py-2.5 px-3 text-xs w-28 text-center bg-primary text-primary-foreground font-bold">
                            Proveedor
                          </TableHead>
                          <TableHead className="py-2.5 px-3 text-xs min-w-0 bg-primary text-primary-foreground font-bold">
                            Descripción
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                    </Table>
                  </div>
                  {/* Cuerpo con scroll: solo tbody */}
                  <div className="flex-1 min-h-0 overflow-y-auto border-b border-border">
                    <Table variant="compact" scrollX={false} className="table-fixed w-full">
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow
                            key={row.id}
                            onDoubleClick={() => handleRowDoubleClick(row)}
                            className="cursor-pointer select-none hover:bg-primary/5"
                            title="Doble clic para vincular"
                          >
                            <TableCell className="py-2.5 px-3 text-xs w-28 text-center">
                              <Badge variant="secondary" className="font-mono text-xs">
                                {row.proveedor.prefijo}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-xs min-w-0">
                              <span className="block truncate" title={row.descripcionProveedor}>
                                {row.descripcionProveedor}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="modal-app__footer shrink-0 justify-between">
            <p className="text-sm text-muted-foreground tabular-nums">
              {rows.length > 0 && (
                <>
                  <strong className="text-primary font-semibold">{rows.length.toLocaleString()}</strong>
                  {" resultado(s)"}
                </>
              )}
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
