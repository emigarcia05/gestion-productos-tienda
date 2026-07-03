"use client";

import { useEffect, useRef, useState } from "react";
import ModalTablaConFiltros, { type ColumnaModalTabla } from "@/components/shared/ModalTablaConFiltros";
import { FiltroIndividualContainer } from "@/components/FilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getListaPreciosConOpcionesAction } from "@/actions/listaPrecios";
import { listarCatalogosReglasDescuentosAction } from "@/actions/descuentosListaPrecioReglas";
import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codigosSeleccionados: string[];
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
  onConfirm,
}: Props) {
  const [proveedorId, setProveedorId] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [proveedores, setProveedores] = useState<
    { id: string; nombre: string; prefijo: string | null }[]
  >([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setProveedorId("");
      setQ("");
      setRows([]);
    });
    void listarCatalogosReglasDescuentosAction().then((res) => {
      if (res.ok) setProveedores(res.data.proveedores);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const busqueda = q.trim();
    const puedeBuscar = Boolean(proveedorId) || busqueda.length >= 3;
    if (!puedeBuscar) {
      queueMicrotask(() => {
        setRows([]);
        setLoading(false);
      });
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    queueMicrotask(() => setLoading(true));
    debounceRef.current = setTimeout(async () => {
      const res = await getListaPreciosConOpcionesAction({
        proveedorId: proveedorId || undefined,
        busqueda: busqueda || undefined,
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
  }, [open, proveedorId, q, codigosSeleccionados]);

  return (
    <ModalTablaConFiltros<Row>
      open={open}
      onClose={() => onOpenChange(false)}
      title="Agregar Productos A La Regla"
      selectionMode="multi"
      rows={rows}
      loading={loading}
      getRowId={(row) => row.codExt}
      columns={COLUMNAS}
      tableColumnWidthsPct={[5, 18, 12, 65]}
      emptyMessage="Seleccioná proveedor o escribí al menos 3 caracteres en la búsqueda."
      confirmLabel={(count) => `Agregar ${count} Producto${count !== 1 ? "s" : ""}`}
      onConfirm={(ids) => onConfirm(ids)}
      filterContent={
        <div className="flex flex-wrap items-end gap-3">
          <FiltroIndividualContainer
            className="min-w-[12rem]"
            activo={!!proveedorId}
            onLimpiar={() => setProveedorId("")}
          >
            <Select value={proveedorId || "none"} onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}>
              <SelectTrigger className="input-filtro-unificado w-full">
                <SelectValue placeholder="PROVEEDOR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">TODOS</SelectItem>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.prefijo ? `[${p.prefijo}] ` : ""}
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className="min-w-[18rem]"
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
        </div>
      }
    />
  );
}
