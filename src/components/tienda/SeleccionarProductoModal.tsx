"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import FilterBar, {
  FilterRowSelection,
  FilterRowSearch,
  FILTER_SELECT_WRAPPER_CLASS,
  INPUT_FILTER_CLASS,
  SELECT_TRIGGER_FILTER_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import ModalTablaConFiltros from "@/components/shared/ModalTablaConFiltros";
import { getProveedores, listarProductosParaVincular } from "@/actions/vinculos";
import type { ProductoProveedorParaVincular } from "@/services/listaPrecios.service";

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

  const filterContent = (
    <FilterBar>
      <FilterRowSelection>
        <div className={FILTER_SELECT_WRAPPER_CLASS}>
          <Select
            value={proveedorId || "none"}
            onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}
          >
            <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
              <SelectValue placeholder="PROVEEDOR" />
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
        </div>
      </FilterRowSelection>
      <div className="flex items-center gap-2 flex-wrap">
        <FilterRowSearch className="flex-1 min-w-[200px]">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por descripción o código..."
            className={INPUT_FILTER_CLASS}
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiar} />
      </div>
    </FilterBar>
  );

  const columns = [
    {
      key: "prefijo",
      label: "PREFIJO",
      className: "py-2.5 px-3 text-xs w-28 shrink-0 text-center",
      render: (row: ProductoProveedorParaVincular) => (
        <Badge variant="secondary" className="font-mono text-xs">
          {row.proveedor.prefijo}
        </Badge>
      ),
    },
    {
      key: "descripcion",
      label: "DESCRIPCIÓN",
      className: "py-2.5 px-3 text-xs min-w-0 w-full",
      render: (row: ProductoProveedorParaVincular) => (
        <span className="text-xs block truncate" title={row.descripcionProveedor}>{row.descripcionProveedor}</span>
      ),
    },
  ];

  return (
    <ModalTablaConFiltros<ProductoProveedorParaVincular>
      open={open}
      onClose={onClose}
      contentClassName="max-w-[84rem]"
      title="Vincular nuevo producto"
      subtitle="Filtrá por proveedor y descripción. Doble clic en una fila para vincular."
      filterContent={filterContent}
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      onRowDoubleClick={handleRowDoubleClick}
      loading={loading}
      emptyMessage="No hay productos o no coinciden los filtros."
      count={rows.length}
      footerRight={
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancelar
        </Button>
      }
    />
  );
}
