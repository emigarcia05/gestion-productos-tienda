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
import { FiltroIndividualContainer } from "@/components/FilterBar";
import ModalTablaConFiltros, { type ColumnaModalTabla } from "@/components/shared/ModalTablaConFiltros";
import { getProveedores } from "@/actions/vinculos";
import { buscarProductosParaAsignarAction, asignarProductosAPresentacionAction } from "@/actions/comparacionCategorias";
import type { ProductoProveedorParaVincular } from "@/services/listaPrecios.service";
import { fmtPrecio } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentacionId: string;
  onSuccess: () => void;
}

type ProveedorOption = { id: string; nombre: string; prefijo: string };

/** TILDE + PROVEEDOR + DESCRIPCIÓN + PX COMPRA FINAL SIN IVA */
const COLUMN_WIDTHS_PCT = [5, 10, 75, 10] as const;

/** `ModalTablaConFiltros` base `max-w-[84rem]` × 1,5 */
const MODAL_ASIGNAR_PRODUCTOS_MAX_WIDTH = "max-w-[126rem]";

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
      const result = await buscarProductosParaAsignarAction({
        proveedorId: proveedorId || undefined,
        q: q.trim() || undefined,
      });
      setLoading(false);
      if (result.ok && result.data) setRows(result.data);
      else setRows([]);
    };
    debounceRef.current = setTimeout(run, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, proveedorId, q]);

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

  const filterContent = (
    <div className="flex flex-col gap-2">
      <FiltroIndividualContainer
        className="w-full"
        activo={!!proveedorId}
        onLimpiar={() => setProveedorId("")}
      >
        <Select
          value={proveedorId || "none"}
          onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}
        >
          <SelectTrigger className="input-filtro-unificado w-full">
            <SelectValue placeholder="PROVEEDOR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">TODOS LOS PROVEEDORES</SelectItem>
            {proveedores.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                [{p.prefijo}] {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FiltroIndividualContainer>

      <FiltroIndividualContainer
        className="w-full"
        activo={!!q.trim()}
        onLimpiar={() => setQ("")}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
          className="input-filtro-unificado w-full min-w-0"
        />
      </FiltroIndividualContainer>
    </div>
  );

  const columns: ColumnaModalTabla<ProductoProveedorParaVincular>[] = [
    {
      key: "prefijo",
      label: "PROVEEDOR",
      className: "py-2.5 px-3 text-xs text-center",
      render: (row) => (
        <Badge variant="secondary" className="font-mono text-xs">
          {row.proveedor.prefijo}
        </Badge>
      ),
    },
    {
      key: "descripcion",
      label: "DESCRIPCIÓN",
      className: "py-2.5 px-3 text-xs",
      render: (row) => (
        <span className="block truncate" title={row.descripcionProveedor}>
          {row.descripcionProveedor}
        </span>
      ),
    },
    {
      key: "px",
      label: "PX COMPRA FINAL SIN IVA",
      className: "py-2.5 px-3 text-xs text-right tabular-nums",
      render: (row) => (
        <span>
          {row.pxCompraFinalSinIva != null ? `$${fmtPrecio(row.pxCompraFinalSinIva)}` : "—"}
        </span>
      ),
    },
  ];

  return (
    <ModalTablaConFiltros<ProductoProveedorParaVincular>
      open={open}
      onClose={() => onOpenChange(false)}
      selectionMode="multi"
      title="Asignar Productos A Esta Categoría"
      subtitle="FILTRÁ POR PROVEEDOR Y DESCRIPCIÓN. MARCÁ LOS PRODUCTOS Y PRESIONÁ ASIGNAR."
      filterContent={filterContent}
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      onConfirm={handleConfirm}
      confirmLabel={(n) => `ASIGNAR ${n} PRODUCTO(S)`}
      confirmPending={asignando}
      loading={loading}
      emptyMessage="NO HAY PRODUCTOS O NO COINCIDEN LOS FILTROS."
      count={rows.length}
      contentClassName={MODAL_ASIGNAR_PRODUCTOS_MAX_WIDTH}
      tableColumnWidthsPct={COLUMN_WIDTHS_PCT}
    />
  );
}
