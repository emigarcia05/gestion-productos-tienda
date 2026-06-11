"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { FiltroIndividualContainer } from "@/components/FilterBar";
import ModalTablaConFiltros, { type ColumnaModalTabla } from "@/components/shared/ModalTablaConFiltros";
import {
  asignarReferenciaCompetenciaAction,
  buscarReferenciaCompetenciaAction,
} from "@/actions/comparacionCategorias";
import type { OpcionReferenciaCompetencia } from "@/services/categoriasComparacion.service";
import { fmtPrecio } from "@/lib/format";
import { MODAL_ASIGNAR_PRODUCTOS_MAX_WIDTH_CLASS } from "@/lib/comparacionCategoriasLayout";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentacionId: string;
  labelCompleto: string;
  onSuccess: () => void;
}

/** TILDE + COMPETIDOR + DESCRIPCIÓN + PRECIO */
const COLUMN_WIDTHS_PCT = [5, 15, 65, 15] as const;

export default function ElegirReferenciaCompetenciaModal({
  open,
  onOpenChange,
  presentacionId,
  labelCompleto,
  onSuccess,
}: Props) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<OpcionReferenciaCompetencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setQ(""));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    const run = async () => {
      const result = await buscarReferenciaCompetenciaAction({
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
  }, [open, q]);

  async function handleConfirm(ids: string[]) {
    const selectedId = ids[0];
    if (!selectedId) return;
    const row = rows.find((r) => `${r.codTienda}:${r.competenciaId}` === selectedId);
    if (!row || row.pxMostrar == null) {
      toast.error("Elegí una fila con precio disponible.");
      throw new Error("Sin precio");
    }

    setConfirmPending(true);
    try {
      const res = await asignarReferenciaCompetenciaAction(
        presentacionId,
        row.codTienda,
        row.competenciaId
      );
      if (!res.ok) {
        toast.error(res.error ?? "Error al asignar referencia.");
        throw new Error(res.error);
      }
      toast.success("Referencia de competencia asignada.");
      onSuccess();
    } finally {
      setConfirmPending(false);
    }
  }

  const filterContent = (
    <FiltroIndividualContainer className="w-full" activo={!!q.trim()} onLimpiar={() => setQ("")}>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="BUSCAR POR COMPETIDOR, DESCRIPCIÓN O CÓDIGO TIENDA..."
        className="input-filtro-unificado w-full min-w-0"
      />
    </FiltroIndividualContainer>
  );

  const columns: ColumnaModalTabla<OpcionReferenciaCompetencia>[] = [
    {
      key: "competidor",
      label: "COMPETIDOR",
      className: "py-2.5 px-3 text-xs",
      render: (row) => row.competenciaNombre,
    },
    {
      key: "descripcion",
      label: "DESCRIPCIÓN",
      className: "py-2.5 px-3 text-xs",
      render: (row) => (
        <span className="block truncate" title={row.descripcionTienda ?? row.codTienda}>
          {row.descripcionTienda ?? row.codTienda}
        </span>
      ),
    },
    {
      key: "precio",
      label: "PRECIO",
      className: "py-2.5 px-3 text-xs text-right tabular-nums",
      render: (row) =>
        row.pxMostrar != null ? `$${fmtPrecio(row.pxMostrar)}` : "—",
    },
  ];

  return (
    <ModalTablaConFiltros<OpcionReferenciaCompetencia>
      open={open}
      onClose={() => onOpenChange(false)}
      selectionMode="multi"
      title="Elegir Referencia De Competencia"
      subtitle={`${labelCompleto.toUpperCase()} · PRECIO IGUAL A PX COMPETENCIA (SUGERIDO O SCRAPEADO)`}
      filterContent={filterContent}
      columns={columns}
      rows={rows.filter((r) => r.pxMostrar != null)}
      getRowId={(row) => `${row.codTienda}:${row.competenciaId}`}
      onConfirm={handleConfirm}
      confirmLabel={() => "USAR COMO REFERENCIA"}
      confirmPending={confirmPending}
      loading={loading}
      emptyMessage="NO HAY PRODUCTOS EN PX COMPETENCIA CON PRECIO DISPONIBLE."
      count={rows.filter((r) => r.pxMostrar != null).length}
      contentClassName={MODAL_ASIGNAR_PRODUCTOS_MAX_WIDTH_CLASS}
      tableColumnWidthsPct={COLUMN_WIDTHS_PCT}
    />
  );
}
