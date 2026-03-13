"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LimpiarFiltrosButton } from "@/components/FilterBar";
import ModalTablaConFiltros from "@/components/shared/ModalTablaConFiltros";
import { getProveedores } from "@/actions/vinculos";
import { buscarProductosParaAsignarAction, asignarProductosAPresentacionAction } from "@/actions/comparacionCategorias";
import type { ProductoProveedorParaVincular } from "@/services/listaPrecios.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentacionId: string;
  onSuccess: () => void;
}

type ProveedorOption = { id: string; nombre: string; prefijo: string };

export default function AsignarProductosModal({
  open,
  onOpenChange,
  presentacionId,
  onSuccess,
}: Props) {
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ProductoProveedorParaVincular[]>([]);
  const [loading, setLoading] = useState(false);
  const [asignando, setAsignando] = useState(false);
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
      const result = await buscarProductosParaAsignarAction(
        proveedorId || undefined,
        q.trim() || undefined
      );
      setLoading(false);
      if (result.ok && result.data) setRows(result.data);
      else setRows([]);
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

  async function handleConfirm(ids: string[]) {
    setAsignando(true);
    try {
      const res = await asignarProductosAPresentacionAction(presentacionId, ids);
      if (!res.ok) {
        toast.error(res.error ?? "Error al asignar.");
        throw new Error(res.error);
      }
      toast.success(`Se asignaron ${res.data?.count ?? 0} productos.`);
      onSuccess();
    } finally {
      setAsignando(false);
    }
  }

  const hayFiltros = !!proveedorId || !!q.trim();

  const filterContent = (
    <div className="flex flex-col gap-2">
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

      <div className="w-full flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por descripción o código..."
          className="input-filtro-unificado flex-1 min-w-0"
        />
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiar} />
      </div>
    </div>
  );

  const columns = [
    {
      key: "prefijo",
      label: "PROVEEDOR",
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
        <span className="text-xs block truncate" title={row.descripcionProveedor}>
          {row.descripcionProveedor}
        </span>
      ),
    },
  ];

  return (
    <ModalTablaConFiltros<ProductoProveedorParaVincular>
      open={open}
      onClose={() => onOpenChange(false)}
      selectionMode="multi"
      title="Asignar productos a esta categoría"
      subtitle="Filtrá por proveedor y descripción. Marcá los productos y presioná Asignar."
      filterContent={filterContent}
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      onConfirm={handleConfirm}
      confirmLabel={(n) => `Asignar ${n} producto(s)`}
      confirmPending={asignando}
      loading={loading}
      emptyMessage="No hay productos o no coinciden los filtros."
      count={rows.length}
      contentClassName="max-w-[84rem]"
    />
  );
}
