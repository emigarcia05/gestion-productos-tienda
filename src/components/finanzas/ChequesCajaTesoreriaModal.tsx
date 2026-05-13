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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BadgeCheck, Plus, Trash2 } from "lucide-react";
import { listarChequesPorCajaAction } from "@/actions/finTesoreriaCheques";
import type { TesoreriaCajaFila } from "@/components/finanzas/TablaTesoreriaCajas";
import type { FinTesoreriaChequeItem } from "@/services/finTesoreriaCheques.service";
import type { FinTesoreriaChequesVista } from "@/lib/validations/finTesoreriaCheques";
import { fmtPrecio } from "@/lib/format";
import {
  chequePuedeAcreditarsePorFechaArgentina,
  formatFechaHoraCompletaArgentina,
  formatIsoYmdDdMmYyyyArgentina,
  textoDiasFaltantesAcreditacionCheque,
} from "@/lib/fechaArgentina";
import { cn } from "@/lib/utils";
import AltaChequeTesoreriaModal from "@/components/finanzas/AltaChequeTesoreriaModal";
import EliminarChequeTesoreriaModal from "@/components/finanzas/EliminarChequeTesoreriaModal";
import AcreditarChequeTesoreriaModal from "@/components/finanzas/AcreditarChequeTesoreriaModal";
import DestinoChequeTesoreriaModal from "@/components/finanzas/DestinoChequeTesoreriaModal";
import PagoProveedorChequeTesoreriaModal from "@/components/finanzas/PagoProveedorChequeTesoreriaModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const CELL_MIN = "min-w-0";

/** TIPO, TENEDOR, EMISOR, MONTO, ACREDITACION, PROV. MERC., DÍAS, [ACCIONES] */
const COL_ANCHOS_CON_ACCIONES = [11, 12, 12, 11, 10, 13, 6, 8, 17] as const;
/** Sin ACCIONES (8 columnas). */
const COL_ANCHOS_SIN_ACCIONES = [12, 13, 13, 12, 11, 14, 10, 15] as const;
/** ENTREGADOS: TIPO, TENEDOR, EMISOR, MONTO, ACREDITACION, PROV. MERC., ENTREGA., DESTINO. */
const COL_ANCHOS_ENTREGADOS = [10, 11, 11, 10, 10, 13, 13, 22] as const;

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
  const [vistaCheques, setVistaCheques] = useState<FinTesoreriaChequesVista>("actuales");
  const [filas, setFilas] = useState<FinTesoreriaChequeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAlta, setOpenAlta] = useState(false);
  const [chequeEliminando, setChequeEliminando] = useState<FinTesoreriaChequeItem | null>(null);
  const [chequeParaDestino, setChequeParaDestino] = useState<FinTesoreriaChequeItem | null>(null);
  const [chequeParaAcreditar, setChequeParaAcreditar] = useState<FinTesoreriaChequeItem | null>(null);
  const [chequeParaPagoProveedor, setChequeParaPagoProveedor] =
    useState<FinTesoreriaChequeItem | null>(null);

  const esVistaActuales = vistaCheques === "actuales";

  const cargar = useCallback(async () => {
    if (!caja) return;
    setLoading(true);
    try {
      const res = await listarChequesPorCajaAction({ cajaId: caja.id, vista: vistaCheques });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo cargar los cheques.");
        setFilas([]);
        return;
      }
      setFilas(res.data);
    } finally {
      setLoading(false);
    }
  }, [caja, vistaCheques]);

  useEffect(() => {
    if (!open || !caja) return;
    void cargar();
  }, [open, caja, cargar]);

  useEffect(() => {
    if (!open) {
      setOpenAlta(false);
      setChequeEliminando(null);
      setChequeParaDestino(null);
      setChequeParaAcreditar(null);
      setChequeParaPagoProveedor(null);
    }
  }, [open]);

  function handleCerrar() {
    setOpenAlta(false);
    setChequeEliminando(null);
    setChequeParaDestino(null);
    setChequeParaAcreditar(null);
    setChequeParaPagoProveedor(null);
    setVistaCheques("actuales");
    onOpenChange(false);
    setFilas([]);
  }

  const colCount = !esVistaActuales ? 8 : esEditor ? 9 : 8;
  const anchos = !esVistaActuales
    ? COL_ANCHOS_ENTREGADOS
    : esEditor
      ? COL_ANCHOS_CON_ACCIONES
      : COL_ANCHOS_SIN_ACCIONES;

  const mensajeVacio = esVistaActuales
    ? "No hay cheques actuales para esta caja."
    : "No hay cheques entregados en el historial de esta caja.";

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && handleCerrar()}>
        <AppModal
          title="Detalles De Cheques"
          size="xl"
          padding="sm"
          scrollBody={false}
          bodyClassName="min-h-0 overflow-hidden flex flex-col"
          className="max-w-[calc(48rem*1.15)]"
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
            <div className="flex shrink-0 flex-wrap items-end gap-3 border-b border-border bg-muted/40 px-3 py-2">
              <label className="flex min-w-[12rem] flex-col gap-1">
                <ModalMicroLabel>Vista</ModalMicroLabel>
                <Select
                  value={vistaCheques}
                  onValueChange={(valor) => {
                    setVistaCheques(valor as FinTesoreriaChequesVista);
                    setChequeEliminando(null);
                    setChequeParaDestino(null);
                    setChequeParaAcreditar(null);
                    setChequeParaPagoProveedor(null);
                  }}
                >
                  <SelectTrigger className="input-filtro-unificado h-9 min-h-9" aria-label="Vista de cheques">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    <SelectItem value="actuales">ACTUALES</SelectItem>
                    <SelectItem value="entregados">ENTREGADOS</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="contenedor-tabla-gestion--pie-fijo-scroll max-h-[min(28rem,55vh)] min-h-[12rem] flex-1">
              <Table variant="compact" scrollX={false} className="table-fixed w-full">
                <colgroup>
                  {anchos.map((pct, i) => (
                    <col key={i} style={{ width: `${pct}%` }} />
                  ))}
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={CELL_MIN}>TIPO</TableHead>
                    <TableHead className={CELL_MIN}>TENEDOR</TableHead>
                    <TableHead className={CELL_MIN}>EMISOR</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>ACREDITACION</TableHead>
                    <TableHead className={cn(CELL_MIN)}>PROV. MERC.</TableHead>
                    {esVistaActuales ? (
                      <TableHead className={cn(TH_NUM, CELL_MIN)}>DÍAS</TableHead>
                    ) : (
                      <>
                        <TableHead className={cn(TH_NUM, CELL_MIN)}>ENTREGA.</TableHead>
                        <TableHead className={cn(CELL_MIN)}>DESTINO.</TableHead>
                      </>
                    )}
                    {esVistaActuales && esEditor ? (
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
                    <EmptyTableRow colSpan={colCount} message={mensajeVacio} />
                  ) : (
                    filas.map((row) => {
                      const puedeAcreditar = chequePuedeAcreditarsePorFechaArgentina(
                        row.fechaAcreditacionIso
                      );
                      return (
                        <TableRow key={row.id} className="h-10 min-h-10 max-h-10">
                          <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
                            {row.tipo}
                          </TableCell>
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
                          <TableCell
                            className={cn("celda-datos", CELL_MIN)}
                            title={row.entregaProveedorNombre ?? undefined}
                          >
                            <span className="block truncate">{row.entregaProveedorNombre ?? "—"}</span>
                          </TableCell>
                          {esVistaActuales ? (
                            <TableCell className={cn(TD_NUM, CELL_MIN)}>
                              {textoDiasFaltantesAcreditacionCheque(row.fechaAcreditacionIso)}
                            </TableCell>
                          ) : (
                            <>
                              <TableCell className={cn(TD_NUM, CELL_MIN)}>
                                {row.fechaTransferenciaIso
                                  ? formatFechaHoraCompletaArgentina(
                                      new Date(row.fechaTransferenciaIso)
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell className={cn("celda-datos", CELL_MIN)} title={row.cajaDestinoEtiqueta ?? undefined}>
                                <span className="block truncate">
                                  {row.cajaDestinoEtiqueta ?? "—"}
                                </span>
                              </TableCell>
                            </>
                          )}
                          {esVistaActuales && esEditor ? (
                            <TableCell
                              className={cn(
                                "celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider",
                                CELL_MIN
                              )}
                            >
                              <div className={cn(TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS, "h-full")}>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                  disabled={!puedeAcreditar}
                                  onClick={() => setChequeParaDestino(row)}
                                  aria-label={
                                    puedeAcreditar
                                      ? "Acreditar cheque"
                                      : "Acreditar cheque (disponible desde la fecha de acreditación)"
                                  }
                                  title={
                                    puedeAcreditar
                                      ? "Acreditar cheque"
                                      : "Solo se puede acreditar desde la fecha de acreditación (calendario Argentina)."
                                  }
                                >
                                  <BadgeCheck className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                  onClick={() => setChequeEliminando(row)}
                                  aria-label="Eliminar cheque"
                                  title="Eliminar cheque"
                                >
                                  <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                </Button>
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })
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

      <DestinoChequeTesoreriaModal
        open={chequeParaDestino != null}
        onOpenChange={(next) => {
          if (!next) setChequeParaDestino(null);
        }}
        cheque={chequeParaDestino}
        onAcreditarCuentaPropia={() => {
          if (chequeParaDestino) setChequeParaAcreditar(chequeParaDestino);
        }}
        onPagoProveedor={() => {
          if (chequeParaDestino) setChequeParaPagoProveedor(chequeParaDestino);
        }}
      />

      <AcreditarChequeTesoreriaModal
        open={chequeParaAcreditar != null}
        onOpenChange={(next) => {
          if (!next) setChequeParaAcreditar(null);
        }}
        cheque={chequeParaAcreditar}
        onAcreditado={() => {
          void cargar();
          onChequesChanged?.();
          setChequeParaAcreditar(null);
        }}
      />

      <PagoProveedorChequeTesoreriaModal
        open={chequeParaPagoProveedor != null}
        onOpenChange={(next) => {
          if (!next) setChequeParaPagoProveedor(null);
        }}
        cheque={chequeParaPagoProveedor}
        onGuardado={() => {
          void cargar();
          onChequesChanged?.();
          setChequeParaPagoProveedor(null);
        }}
      />
    </>
  );
}
