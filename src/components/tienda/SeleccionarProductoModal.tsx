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
}

export default function SeleccionarProductoModal({
  open,
  onClose,
  onSeleccionar,
  excluirItemTiendaId: _excluirItemTiendaId,
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

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    const run = async () => {
      const result = await listarProductosParaVincular(
        proveedorId || undefined,
        q.trim() || undefined
      );
      setLoading(false);
      if (result.success) setRows(result.data);
      else {
        toast.error(result.error);
        setRows([]);
      }
    };
    debounceRef.current = setTimeout(run, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, proveedorId, q]);

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

  const hayFiltros = !!proveedorId || !!q.trim();

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

        {/* Div 1: filtros siempre visibles, sin títulos */}
        <div className="shrink-0 px-6 py-3 border-b border-border flex flex-wrap items-center gap-3 bg-card">
          <Select
            value={proveedorId || "none"}
            onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}
          >
            <SelectTrigger className="input-filtro-unificado w-[200px]">
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
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Descripción"
            className="input-filtro-unificado flex-1 min-w-[180px] max-w-[320px]"
          />
          {hayFiltros && (
            <Button type="button" variant="ghost" size="sm" onClick={limpiar}>
              Limpiar
            </Button>
          )}
        </div>

        {/* Div 2: tabla con encabezado fijo y scroll en el cuerpo */}
        <div className="flex-1 min-h-0 overflow-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" /> Cargando...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No hay productos o no coinciden los filtros.
            </div>
          ) : (
            <Table variant="compact">
              <TableHeader className="modal-tabla-thead-sticky">
                <TableRow className="hover:bg-transparent border-b-0">
                  <TableHead className="py-2.5 px-3 text-xs w-28 shrink-0 text-center">
                    Proveedor
                  </TableHead>
                  <TableHead className="py-2.5 px-3 text-xs min-w-0">
                    Descripción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onDoubleClick={() => handleRowDoubleClick(row)}
                    className="cursor-pointer select-none hover:bg-primary/5"
                    title="Doble clic para vincular"
                  >
                    <TableCell className="py-2.5 px-3 text-xs w-28 shrink-0 text-center">
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
          )}
        </div>

        <div className="modal-tabla-footer shrink-0">
          <p className="modal-tabla-footer__count">
            {rows.length > 0 && (
              <>
                <strong>{rows.length.toLocaleString()}</strong>
                {" resultado(s)"}
              </>
            )}
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
