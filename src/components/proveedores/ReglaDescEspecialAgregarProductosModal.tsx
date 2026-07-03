"use client";

import { useEffect, useRef, useState } from "react";
import ModalTablaConFiltros, { type ColumnaModalTabla } from "@/components/shared/ModalTablaConFiltros";
import { FiltroIndividualContainer } from "@/components/FilterBar";
import { Input } from "@/components/ui/input";
import { getListaPreciosConOpcionesAction } from "@/actions/listaPrecios";
import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

export interface FiltrosReglaDescEspecialProductos {
  proveedorId?: string;
  marcaNombre?: string;
  rubroNombre?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codigosSeleccionados: string[];
  filtros: FiltrosReglaDescEspecialProductos;
  onConfirm: (codigosExt: string[]) => void;
}

type Row = Pick<FilaListaPrecioParaCliente, "codExt" | "descripcion" | "proveedor">;

const COLUMNAS: ColumnaModalTabla<Row>[] = [
  {
    key: "codExt",
    label: "COD. EXT.",
    className: "w-[18%] tabular-nums",
    render: (row) => row.codExt,
  },
  {
    key: "proveedor",
    label: "PROVEEDOR",
    className: "w-[12%]",
    render: (row) => row.proveedor?.prefijo ?? "—",
  },
  {
    key: "descripcion",
    label: "DESCRIPCIÓN",
    className: "min-w-0",
    render: (row) => row.descripcion,
  },
];

export default function ReglaDescEspecialAgregarProductosModal({
  open,
  onOpenChange,
  codigosSeleccionados,
  filtros,
  onConfirm,
}: Props) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtrosKey = `${filtros.proveedorId ?? ""}|${filtros.marcaNombre ?? ""}|${filtros.rubroNombre ?? ""}`;

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setQ("");
      setRows([]);
    });
  }, [open, filtrosKey]);

  useEffect(() => {
    if (!open) return;
    const busqueda = q.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    queueMicrotask(() => setLoading(true));
    debounceRef.current = setTimeout(async () => {
      const res = await getListaPreciosConOpcionesAction({
        proveedorId: filtros.proveedorId,
        marcaNombre: filtros.marcaNombre,
        rubroNombre: filtros.rubroNombre,
        busqueda: busqueda.length >= 3 ? busqueda : undefined,
        pagina: 1,
      });
      setLoading(false);
      if (!res.filas) {
        setRows([]);
        return;
      }
      const yaSeleccionados = new Set(codigosSeleccionados);
      setRows(
        res.filas
          .filter((f) => !yaSeleccionados.has(f.codExt))
          .map((f) => ({
            codExt: f.codExt,
            descripcion: f.descripcion,
            proveedor: f.proveedor,
          }))
      );
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, q, codigosSeleccionados, filtros, filtrosKey]);

  return (
    <ModalTablaConFiltros<Row>
      open={open}
      onClose={() => onOpenChange(false)}
      title="Agregar Productos A La Regla"
      subtitle="Solo se listan ítems que coinciden con proveedor, marca y rubro definidos en la regla."
      selectionMode="multi"
      rows={rows}
      loading={loading}
      getRowId={(row) => row.codExt}
      columns={COLUMNAS}
      tableColumnWidthsPct={[5, 18, 12, 65]}
      emptyMessage="No hay productos que coincidan con los filtros de la regla."
      confirmLabel={(count) => `Agregar ${count} Producto${count !== 1 ? "s" : ""}`}
      onConfirm={(ids) => onConfirm(ids)}
      filterContent={
        <FiltroIndividualContainer
          className="min-w-[20rem] w-full"
          activo={!!q.trim()}
          onLimpiar={() => setQ("")}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
            className="input-filtro-unificado w-full uppercase"
          />
        </FiltroIndividualContainer>
      }
    />
  );
}
