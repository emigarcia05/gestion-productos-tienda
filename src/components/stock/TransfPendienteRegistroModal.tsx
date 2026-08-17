"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiltroIndividualContainer } from "@/components/FilterBar";
import {
  encolarTransferenciasPendientesAction,
  exportarPendientesTransfDepositosAction,
  listarPendientesExportTransfDepositosAction,
  type PendienteExportTransfDepositosDto,
  type Sucursal,
} from "@/actions/stock";
import { descargarExcelTransfDepositos } from "@/lib/exportTransfDepositosExcelClient";
import { formatDdMmHhMmArgentina } from "@/lib/fechaArgentina";
import { SUCURSAL_LABEL_TRANSF } from "@/lib/transfDepositosControl";
import { avisarIndicadorSlidenav } from "@/lib/indicadorSlidenav";
import { leerSucursalPreferida } from "@/lib/sucursalPreferida";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";

const SUCURSALES_MODAL: { value: Sucursal; label: string }[] = [
  { value: "guaymallen", label: SUCURSAL_LABEL_TRANSF.guaymallen },
  { value: "maipu", label: SUCURSAL_LABEL_TRANSF.maipu },
];

export type ItemCantidadTransf = { codTienda: string; cantidad: number };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origen: Sucursal | null;
  destino: Sucursal | null;
  /** Cantidades cargadas en la grilla al abrir el modal. */
  itemsGrilla: ItemCantidadTransf[];
  /** Limpia inputs de la grilla tras encolar. */
  onEncolado?: () => void;
}

/**
 * Modal **Transf. Pendiente Registro**: desplegable **SUCURSAL** primero;
 * encola la grilla (si hay) y lista Transferir/Recibir de esa sucursal.
 */
export default function TransfPendienteRegistroModal({
  open,
  onOpenChange,
  origen,
  destino,
  itemsGrilla,
  onEncolado,
}: Props) {
  const [pendientes, setPendientes] = useState<
    PendienteExportTransfDepositosDto[]
  >([]);
  const [sucursalFiltro, setSucursalFiltro] = useState<Sucursal | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cargarPendientes = useCallback(async () => {
    const res = await listarPendientesExportTransfDepositosAction();
    if (!res.ok) {
      setError(res.error);
      setPendientes([]);
      return;
    }
    setError(null);
    setPendientes(res.data);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      setSucursalFiltro(
        origen ?? leerSucursalPreferida() ?? ""
      );
    });

    (async () => {
      if (origen && destino && itemsGrilla.length > 0) {
        const encolado = await encolarTransferenciasPendientesAction({
          origen,
          destino,
          items: itemsGrilla,
        });
        if (cancelled) return;
        if (!encolado.ok) {
          setLoading(false);
          setError(encolado.error);
          return;
        }
        toast.success(
          `${encolado.data.creados} transferencia${encolado.data.creados !== 1 ? "s" : ""} en cola.`
        );
        avisarIndicadorSlidenav();
        onEncolado?.();
      }
      if (cancelled) return;
      await cargarPendientes();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // Solo al abrir: captura items/origen/destino del momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open gate
  }, [open]);

  function handleDescargar(p: PendienteExportTransfDepositosDto) {
    startTransition(async () => {
      const res = await exportarPendientesTransfDepositosAction({
        tipo: p.tipo,
        origen: p.origenCodigo,
        destino: p.destinoCodigo,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      descargarExcelTransfDepositos(
        res.data.filas,
        `${p.tipoLabel} ${res.data.sucursalExcelLabel}`
      );
      toast.success(
        `Excel ${p.tipoLabel.toLowerCase()} · ${res.data.sucursalExcelLabel} descargado.`
      );
      avisarIndicadorSlidenav();
      await cargarPendientes();
    });
  }

  const pendientesFiltrados = useMemo(
    () =>
      sucursalFiltro
        ? pendientes.filter((p) => p.sucursalExcel === sucursalFiltro)
        : [],
    [pendientes, sucursalFiltro]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="lg"
        title="Transf. Pendiente Registro"
        bodyClassName="space-y-4"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cerrar
          </Button>
        }
      >
        <FiltroIndividualContainer
          className="w-full"
          activo={sucursalFiltro !== ""}
          onLimpiar={() => setSucursalFiltro("")}
        >
          <Select
            value={sucursalFiltro ?? ""}
            onValueChange={(v) => setSucursalFiltro(v as Sucursal)}
          >
            <SelectTrigger
              id="filtro-transf-pendiente-sucursal"
              className="input-filtro-unificado w-full"
              aria-label="Sucursal"
            >
              <SelectValue placeholder="SUCURSAL" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              side="bottom"
              align="start"
              className="select-content-filtro"
            >
              {SUCURSALES_MODAL.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FiltroIndividualContainer>

        {loading ? (
          <p className="text-sm text-foreground py-6 text-center">Cargando…</p>
        ) : null}

        {!loading && error ? (
          <p className="text-sm text-destructive py-6 text-center">{error}</p>
        ) : null}

        {!loading && !error && sucursalFiltro === "" ? (
          <p className="text-sm text-foreground py-6 text-center">
            Seleccioná una sucursal para ver las transferencias pendientes.
          </p>
        ) : null}

        {!loading &&
        !error &&
        sucursalFiltro !== "" &&
        pendientesFiltrados.length === 0 ? (
          <p className="text-sm text-foreground py-6 text-center">
            No hay transferencias pendientes de registro para esta sucursal.
          </p>
        ) : null}

        {!loading && !error && pendientesFiltrados.length > 0 ? (
          <Table variant="compact">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[18%] text-center">TIPO</TableHead>
                <TableHead className="w-[24%] text-center">SUC. ORIGEN</TableHead>
                <TableHead className="w-[24%] text-center">SUC. DESTINO</TableHead>
                <TableHead className="w-[20%] text-center">FECHA</TableHead>
                <TableHead className="w-[14%] text-center">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendientesFiltrados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="celda-datos text-center font-medium">
                    {p.tipoLabel}
                  </TableCell>
                  <TableCell className="celda-datos text-center">
                    {p.origenLabel}
                  </TableCell>
                  <TableCell className="celda-datos text-center">
                    {p.destinoLabel}
                  </TableCell>
                  <TableCell className="celda-datos text-center">
                    {formatDdMmHhMmArgentina(new Date(p.fechaIso))}
                  </TableCell>
                  <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                    <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                        aria-label={`Descargar Excel ${p.tipoLabel} ${p.origenLabel} → ${p.destinoLabel}`}
                        title="Descargar Excel"
                        disabled={isPending}
                        onClick={() => handleDescargar(p)}
                      >
                        <Download
                          className={TABLE_ROW_ACTION_ICON_CLASS}
                          aria-hidden
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </AppModal>
    </Dialog>
  );
}
