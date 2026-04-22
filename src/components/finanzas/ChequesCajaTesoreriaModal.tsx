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
import { Plus } from "lucide-react";
import { listarChequesPorCajaAction } from "@/actions/finTesoreriaCheques";
import type { TesoreriaCajaFila } from "@/components/finanzas/TablaTesoreriaCajas";
import type { FinTesoreriaChequeItem } from "@/services/finTesoreriaCheques.service";
import { fmtPrecio } from "@/lib/format";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import { cn } from "@/lib/utils";
import AltaChequeTesoreriaModal from "@/components/finanzas/AltaChequeTesoreriaModal";

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const CELL_MIN = "min-w-0";

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
    if (!open) setOpenAlta(false);
  }, [open]);

  function handleCerrar() {
    setOpenAlta(false);
    onOpenChange(false);
    setFilas([]);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && handleCerrar()}>
        <AppModal
          title={
            caja ? (
              <span className="flex flex-col items-center gap-1 text-center">
                <span>Cheques de la caja</span>
                <span className="text-sm font-normal text-primary-foreground/95">
                  {caja.nombreCaja} · {caja.titular}
                </span>
              </span>
            ) : (
              "Cheques de la caja"
            )
          }
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
                  <col style={{ width: "42%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "30%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={CELL_MIN}>EMISOR</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>FECHA ACREDITACIÓN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="celda-datos text-center text-muted-foreground">
                        Cargando…
                      </TableCell>
                    </TableRow>
                  ) : filas.length === 0 ? (
                    <EmptyTableRow colSpan={3} message="No hay cheques registrados para esta caja." />
                  ) : (
                    filas.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className={cn("celda-datos", CELL_MIN)} title={row.emisor}>
                          <span className="celda-destacado block truncate">{row.emisor}</span>
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "celda-destacado", CELL_MIN)}>
                          ${fmtPrecio(row.monto)}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, CELL_MIN)}>
                          {formatIsoYmdDdMmYyyyArgentina(row.fechaAcreditacionIso)}
                        </TableCell>
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
        onCreated={() => {
          void cargar();
          onChequesChanged?.();
        }}
      />
    </>
  );
}
