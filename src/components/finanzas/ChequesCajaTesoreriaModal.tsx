"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
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
import { BadgeCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { listarChequesPorCajaAction } from "@/actions/finTesoreriaCheques";
import type { TesoreriaCajaFila } from "@/components/finanzas/TablaTesoreriaCajas";
import type { FinTesoreriaChequeItem } from "@/services/finTesoreriaCheques.service";
import { fmtPrecio } from "@/lib/format";
import { formatIsoYmdDdMmYyyyArgentina, textoDiasFaltantesAcreditacionCheque } from "@/lib/fechaArgentina";
import { cn } from "@/lib/utils";
import AltaChequeTesoreriaModal from "@/components/finanzas/AltaChequeTesoreriaModal";
import EditarChequeTesoreriaModal from "@/components/finanzas/EditarChequeTesoreriaModal";
import EliminarChequeTesoreriaModal from "@/components/finanzas/EliminarChequeTesoreriaModal";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_CLASS,
  TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS,
} from "@/lib/ui-classes";

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const CELL_MIN = "min-w-0";

const COL_ANCHOS_CON_ACCIONES = [15, 22, 12, 13, 12, 26] as const;
const COL_ANCHOS_SIN_ACCIONES = [18, 26, 14, 14, 28] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caja: TesoreriaCajaFila | null;
  esEditor: boolean;
  onChequesChanged?: () => void;
}

export default function ChequesCajaTesoreriaModal({
  open,
  onOpenChange,
  caja,
  esEditor,
  onChequesChanged,
}: Props) {
  const [filas, setFilas] = useState<FinTesoreriaChequeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAlta, setOpenAlta] = useState(false);
  const [chequeEditando, setChequeEditando] = useState<FinTesoreriaChequeItem | null>(null);
  const [chequeEliminando, setChequeEliminando] = useState<FinTesoreriaChequeItem | null>(null);

  const cargar = useCallback(async () => {
    if (!caja) return;
    setLoading(true);
    try {
      const res = await listarChequesPorCajaAction({ cajaId: caja.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo cargar los cheques.");
        setFilas([]);
        return;
      }
      setFilas(res.data);
    } finally {
      setLoading(false);
    }
  }, [caja]);

  useEffect(() => {
    if (!open || !caja) return;
    void cargar();
  }, [open, caja, cargar]);

  useEffect(() => {
    if (!open) {
      setOpenAlta(false);
      setChequeEditando(null);
      setChequeEliminando(null);
    }
  }, [open]);

  function handleCerrar() {
    setOpenAlta(false);
    setChequeEditando(null);
    setChequeEliminando(null);
    onOpenChange(false);
    setFilas([]);
  }

  function handleAcreditarPendiente() {
    toast.message("Acreditar", {
      description: "Esta acción se definirá próximamente.",
    });
  }

  const colCount = esEditor ? 6 : 5;
  const anchos = esEditor ? COL_ANCHOS_CON_ACCIONES : COL_ANCHOS_SIN_ACCIONES;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && handleCerrar()}>
        <AppModal
          title="Cheques de la caja"
          size="xl"
          padding="sm"
          scrollBody={false}
          bodyClassName="min-h-0 overflow-hidden flex flex-col"
          actions={
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              {esEditor ? (
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => setOpenAlta(true)}
                  disabled={!caja}
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Registrar cheque
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" variant="outline" onClick={handleCerrar}>
                Cerrar
              </Button>
            </div>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="contenedor-tabla-gestion--pie-fijo-scroll max-h-[min(28rem,55vh)] min-h-[12rem] flex-1">
              <Table variant="compact" scrollX={false} className="table-fixed w-full">
                <colgroup>
                  {anchos.map((pct, i) => (
                    <col key={i} style={{ width: `${pct}%` }} />
                  ))}
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={CELL_MIN}>TENEDOR</TableHead>
                    <TableHead className={CELL_MIN}>EMISOR</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>FECHA ACREDITACIÓN</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>DÍAS FALTANTES</TableHead>
                    {esEditor ? (
                      <TableHead
                        className={cn(
                          "text-center tabla-bloque-secundario-head-divider",
                          CELL_MIN
                        )}
                      >
                        ACCIONES
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={colCount}
                        className="celda-datos text-center text-muted-foreground"
                      >
                        Cargando…
                      </TableCell>
                    </TableRow>
                  ) : filas.length === 0 ? (
                    <EmptyTableRow
                      colSpan={colCount}
                      message="No hay cheques registrados para esta caja."
                    />
                  ) : (
                    filas.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={row.tenedor}>
                          <span className="celda-destacado block truncate">{row.tenedor}</span>
                        </TableCell>
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={row.emisor}>
                          <span className="block truncate">{row.emisor}</span>
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "celda-destacado", CELL_MIN)}>
                          ${fmtPrecio(row.monto)}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, CELL_MIN)}>
                          {formatIsoYmdDdMmYyyyArgentina(row.fechaAcreditacionIso)}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, CELL_MIN)}>
                          {textoDiasFaltantesAcreditacionCheque(row.fechaAcreditacionIso)}
                        </TableCell>
                        {esEditor ? (
                          <TableCell
                            className={cn(
                              "celda-datos tabla-bloque-secundario-cell-divider",
                              CELL_MIN,
                              "p-1"
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="outline"
                                className={TABLE_ROW_ICON_BUTTON_CLASS}
                                onClick={handleAcreditarPendiente}
                                aria-label="Acreditar cheque"
                                title="Acreditar cheque"
                              >
                                <BadgeCheck className={TABLE_ROW_ACTION_ICON_CLASS} />
                              </Button>
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="outline"
                                className={TABLE_ROW_ICON_BUTTON_CLASS}
                                onClick={() => setChequeEditando(row)}
                                aria-label="Editar cheque"
                                title="Editar cheque"
                              >
                                <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} />
                              </Button>
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="outline"
                                className={cn(
                                  TABLE_ROW_ICON_BUTTON_CLASS,
                                  TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS
                                )}
                                onClick={() => setChequeEliminando(row)}
                                aria-label="Eliminar cheque"
                                title="Eliminar cheque"
                              >
                                <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} />
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </AppModal>
      </Dialog>

      <AltaChequeTesoreriaModal
        open={openAlta && !!caja}
        onOpenChange={setOpenAlta}
        cajaId={caja?.id ?? null}
        titularCaja={caja?.titular ?? null}
        onCreated={() => {
          void cargar();
          onChequesChanged?.();
        }}
      />

      <EditarChequeTesoreriaModal
        open={chequeEditando != null}
        onOpenChange={(next) => {
          if (!next) setChequeEditando(null);
        }}
        cheque={chequeEditando}
        onUpdated={() => {
          void cargar();
          onChequesChanged?.();
          setChequeEditando(null);
        }}
      />

      <EliminarChequeTesoreriaModal
        open={chequeEliminando != null}
        onOpenChange={(next) => {
          if (!next) setChequeEliminando(null);
        }}
        chequeId={chequeEliminando?.id ?? null}
        etiquetaEmisor={chequeEliminando?.emisor}
        onDeleted={() => {
          void cargar();
          onChequesChanged?.();
          setChequeEliminando(null);
        }}
      />
    </>
  );
}
