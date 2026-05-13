"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { BadgeCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { listarChequesPorCajaAction, marcarEntregaProveedorFinTesoreriaChequeAction } from "@/actions/finTesoreriaCheques";
import type { TesoreriaCajaFila } from "@/components/finanzas/TablaTesoreriaCajas";
import type { TenenciaChequeTesoreria, TipoChequeTesoreria } from "@prisma/client";
import type { FinTesoreriaChequeItem } from "@/services/finTesoreriaCheques.service";
import type { FinTesoreriaChequesTenenciaFiltro } from "@/lib/validations/finTesoreriaCheques";
import { fmtPrecio } from "@/lib/format";
import {
  chequePuedeAcreditarsePorFechaArgentina,
  dateToIsoYmdArgentina,
  diasNumericosAcreditacionMenosHoyArgentina,
  diasTextoAcreditacionMenosHoyArgentina,
  formatIsoYmdDdMmYyyyArgentina,
} from "@/lib/fechaArgentina";
import { cn } from "@/lib/utils";
import AltaChequeTesoreriaModal from "@/components/finanzas/AltaChequeTesoreriaModal";
import EditarChequeTesoreriaModal from "@/components/finanzas/EditarChequeTesoreriaModal";
import EliminarChequeTesoreriaModal from "@/components/finanzas/EliminarChequeTesoreriaModal";
import AcreditarChequeTesoreriaModal from "@/components/finanzas/AcreditarChequeTesoreriaModal";
import DestinoChequeTesoreriaModal from "@/components/finanzas/DestinoChequeTesoreriaModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const CELL_MIN = "min-w-0";

/** Detalle cheques + editor (8 col), filtro ACTUALES. */
const COL_ANCHOS_EDITOR = [10, 8, 16, 18, 10, 11, 7, 20] as const;
/** Detalle cheques sin editor (7 col), filtro ACTUALES. */
const COL_ANCHOS_LECTURA = [11, 9, 18, 22, 11, 12, 17] as const;
/** Filtro TRANSFERIDOS + editor (6 col). */
const COL_ANCHOS_TRANSFERIDOS_EDITOR = [12, 22, 18, 14, 14, 20] as const;
/** Filtro TRANSFERIDOS sin editor (5 col). */
const COL_ANCHOS_TRANSFERIDOS_LECTURA = [14, 28, 20, 16, 22] as const;

function etiquetaTipoCheque(t: TipoChequeTesoreria): string {
  return t === "ECHEQUE" ? "E-CHEQUE" : "FÍSICO";
}

function etiquetaTenenciaCheque(t: TenenciaChequeTesoreria): string {
  switch (t) {
    case "TIENDA":
      return "TIENDA";
    case "DEPOSITADO":
      return "DEPOSITADO";
    case "PROVEEDOR":
      return "PROVEEDOR";
    default:
      return t;
  }
}

function etiquetaFechaTransferenciaDdMmYyyy(isoUtc: string | null): string {
  if (!isoUtc) return "—";
  return formatIsoYmdDdMmYyyyArgentina(dateToIsoYmdArgentina(new Date(isoUtc)));
}

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
  const [tenenciaFiltro, setTenenciaFiltro] = useState<FinTesoreriaChequesTenenciaFiltro>("actuales");
  const [filas, setFilas] = useState<FinTesoreriaChequeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAlta, setOpenAlta] = useState(false);
  const [chequeEliminando, setChequeEliminando] = useState<FinTesoreriaChequeItem | null>(null);
  const [chequeParaDestino, setChequeParaDestino] = useState<FinTesoreriaChequeItem | null>(null);
  const [chequeParaAcreditar, setChequeParaAcreditar] = useState<FinTesoreriaChequeItem | null>(null);
  const [chequeParaEditar, setChequeParaEditar] = useState<FinTesoreriaChequeItem | null>(null);

  const cargar = useCallback(async () => {
    if (!caja) return;
    setLoading(true);
    try {
      const res = await listarChequesPorCajaAction({
        cajaId: caja.id,
        tenenciaFiltro,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo cargar los cheques.");
        setFilas([]);
        return;
      }
      setFilas(res.data);
    } finally {
      setLoading(false);
    }
  }, [caja, tenenciaFiltro]);

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
      setChequeParaEditar(null);
      setTenenciaFiltro("actuales");
    }
  }, [open]);

  function handleCerrar() {
    setOpenAlta(false);
    setChequeEliminando(null);
    setChequeParaDestino(null);
    setChequeParaAcreditar(null);
    setChequeParaEditar(null);
    setTenenciaFiltro("actuales");
    onOpenChange(false);
    setFilas([]);
  }

  const esVistaTransferidos = tenenciaFiltro === "transferidos";
  const colCount =
    esVistaTransferidos ? (esEditor ? 6 : 5) : esEditor ? 8 : 7;
  const anchos = esVistaTransferidos
    ? esEditor
      ? COL_ANCHOS_TRANSFERIDOS_EDITOR
      : COL_ANCHOS_TRANSFERIDOS_LECTURA
    : esEditor
      ? COL_ANCHOS_EDITOR
      : COL_ANCHOS_LECTURA;

  const mensajeVacio =
    tenenciaFiltro === "actuales"
      ? "No hay cheques en custodia de tienda para esta caja."
      : "No hay cheques transferidos a cuenta o entregados a proveedor para esta caja.";

  const filasParaTabla = useMemo(() => {
    const copia = [...filas];
    if (tenenciaFiltro === "transferidos") {
      return copia.sort((a, b) => {
        const ta = a.fechaTransferenciaIso;
        const tb = b.fechaTransferenciaIso;
        if (ta && tb) {
          if (tb !== ta) return tb.localeCompare(ta);
          return a.id.localeCompare(b.id);
        }
        if (ta && !tb) return -1;
        if (!ta && tb) return 1;
        return a.id.localeCompare(b.id);
      });
    }
    return copia.sort((a, b) => {
      const da = diasNumericosAcreditacionMenosHoyArgentina(a.fechaAcreditacionIso);
      const db = diasNumericosAcreditacionMenosHoyArgentina(b.fechaAcreditacionIso);
      const aOk = Number.isFinite(da);
      const bOk = Number.isFinite(db);
      if (aOk && bOk && da !== db) return da - db;
      if (aOk && !bOk) return -1;
      if (!aOk && bOk) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [filas, tenenciaFiltro]);

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && handleCerrar()}>
        <AppModal
          title="Detalles De Cheques"
          size="xl"
          className="max-w-[calc(48rem*1.3)]"
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
                  disabled={!caja || esVistaTransferidos}
                  title={
                    esVistaTransferidos
                      ? "Cambiá a ACTUALES para registrar un cheque nuevo."
                      : undefined
                  }
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Registrar Cheque
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
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="flex shrink-0 flex-wrap items-end gap-3 border-b border-border bg-muted/40 px-3 py-2">
              <label className="flex min-w-[12rem] flex-col gap-1">
                <ModalMicroLabel>Tenencia</ModalMicroLabel>
                <Select
                  value={tenenciaFiltro}
                  onValueChange={(valor) => {
                    setTenenciaFiltro(valor as FinTesoreriaChequesTenenciaFiltro);
                    setChequeEliminando(null);
                    setChequeParaDestino(null);
                    setChequeParaAcreditar(null);
                    setChequeParaEditar(null);
                  }}
                >
                  <SelectTrigger
                    className="input-filtro-unificado h-9 min-h-9"
                    aria-label="Filtro de tenencia del cheque"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    <SelectItem value="actuales">ACTUALES</SelectItem>
                    <SelectItem value="transferidos">TRANSFERIDOS</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="contenedor-tabla-gestion--pie-fijo-scroll max-h-[min(28rem,55vh)] min-h-[12rem] w-full min-w-0 flex-1">
              <Table variant="compact" scrollX={false} className="table-fixed w-full">
                <colgroup>
                  {anchos.map((pct, i) => (
                    <col key={`${tenenciaFiltro}-${i}`} style={{ width: `${pct}%` }} />
                  ))}
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {esVistaTransferidos ? (
                      <>
                        <TableHead className={cn(TH_NUM, CELL_MIN)}>RECIBIDO</TableHead>
                        <TableHead className={CELL_MIN}>EMISOR</TableHead>
                        <TableHead className={cn(TH_NUM, CELL_MIN)}>TRANSFERENCIA</TableHead>
                        <TableHead className={CELL_MIN}>TENEDOR</TableHead>
                        <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
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
                      </>
                    ) : (
                      <>
                        <TableHead className={cn(TH_NUM, CELL_MIN)}>RECIBIDO</TableHead>
                        <TableHead className={CELL_MIN}>TIPO</TableHead>
                        <TableHead className={CELL_MIN}>TENEDOR</TableHead>
                        <TableHead className={CELL_MIN}>EMISOR</TableHead>
                        <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                        <TableHead className={cn(TH_NUM, CELL_MIN)}>ACREDITACION</TableHead>
                        <TableHead className={cn(TH_NUM, CELL_MIN)}>DÍAS</TableHead>
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
                      </>
                    )}
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
                    filasParaTabla.map((row) => {
                      const transferido = row.fechaTransferenciaIso != null;
                      if (esVistaTransferidos) {
                        return (
                          <TableRow key={row.id} className="h-10 min-h-10 max-h-10">
                            <TableCell className={cn(TD_NUM, CELL_MIN)}>
                              {formatIsoYmdDdMmYyyyArgentina(row.fechaRecibidoIso)}
                            </TableCell>
                            <TableCell className={cn("celda-datos", CELL_MIN)} title={row.emisor}>
                              <span className="block truncate">{row.emisor}</span>
                            </TableCell>
                            <TableCell className={cn(TD_NUM, CELL_MIN)}>
                              {etiquetaFechaTransferenciaDdMmYyyy(row.fechaTransferenciaIso)}
                            </TableCell>
                            <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
                              {etiquetaTenenciaCheque(row.tenencia)}
                            </TableCell>
                            <TableCell className={cn(TD_NUM, "celda-destacado", CELL_MIN)}>
                              ${fmtPrecio(row.monto)}
                            </TableCell>
                            {esEditor ? (
                              <TableCell
                                className={cn(
                                  "celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider",
                                  CELL_MIN
                                )}
                              >
                                <div
                                  className={cn(TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS, "h-full")}
                                >
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                    disabled={transferido}
                                    onClick={() => setChequeParaEditar(row)}
                                    aria-label="Editar cheque"
                                    title={
                                      transferido
                                        ? "No se puede editar un cheque ya transferido."
                                        : "Editar cheque"
                                    }
                                  >
                                    <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                    disabled={transferido}
                                    onClick={() => setChequeEliminando(row)}
                                    aria-label="Eliminar cheque"
                                    title={
                                      transferido
                                        ? "No se puede eliminar un cheque ya transferido."
                                        : "Eliminar cheque"
                                    }
                                  >
                                    <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                  </Button>
                                </div>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      }
                      const puedeAcreditar = chequePuedeAcreditarsePorFechaArgentina(
                        row.fechaAcreditacionIso
                      );
                      const ofreceAcreditar = row.tenencia === "TIENDA" && !transferido;
                      return (
                        <TableRow key={row.id} className="h-10 min-h-10 max-h-10">
                          <TableCell className={cn(TD_NUM, CELL_MIN)}>
                            {formatIsoYmdDdMmYyyyArgentina(row.fechaRecibidoIso)}
                          </TableCell>
                          <TableCell className={cn("celda-datos whitespace-nowrap", CELL_MIN)}>
                            {etiquetaTipoCheque(row.tipo)}
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
                          <TableCell className={cn(TD_NUM, CELL_MIN)}>
                            {diasTextoAcreditacionMenosHoyArgentina(row.fechaAcreditacionIso)}
                          </TableCell>
                          {esEditor ? (
                            <TableCell
                              className={cn(
                                "celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider",
                                CELL_MIN
                              )}
                            >
                              <div
                                  className={cn(TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS, "h-full")}
                                >
                                  {ofreceAcreditar ? (
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                      onClick={() => setChequeParaDestino(row)}
                                      aria-label="Transferir cheque"
                                      title={
                                        puedeAcreditar
                                          ? "Elegir destino: transferir a cuenta propia o pago a proveedor."
                                          : "Cheque diferido: en destino solo podés registrar pago a proveedor hasta la fecha de acreditación."
                                      }
                                    >
                                      <BadgeCheck className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                    </Button>
                                  ) : (
                                    <span className="inline-flex w-9 shrink-0" aria-hidden />
                                  )}
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                    disabled={transferido}
                                    onClick={() => setChequeParaEditar(row)}
                                    aria-label="Editar cheque"
                                    title={
                                      transferido
                                        ? "No se puede editar un cheque ya transferido."
                                        : "Editar cheque"
                                    }
                                  >
                                    <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                    disabled={transferido}
                                    onClick={() => setChequeEliminando(row)}
                                    aria-label="Eliminar cheque"
                                    title={
                                      transferido
                                        ? "No se puede eliminar un cheque ya transferido."
                                        : "Eliminar cheque"
                                    }
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

      <EditarChequeTesoreriaModal
        open={chequeParaEditar != null}
        onOpenChange={(next) => {
          if (!next) setChequeParaEditar(null);
        }}
        cheque={chequeParaEditar}
        onUpdated={() => {
          void cargar();
          onChequesChanged?.();
          setChequeParaEditar(null);
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
          const c = chequeParaDestino;
          if (!c) return;
          void (async () => {
            const res = await marcarEntregaProveedorFinTesoreriaChequeAction({ chequeId: c.id });
            if (!res.ok) {
              toast.error(res.error ?? "No se pudo registrar el pago a proveedor.");
              return;
            }
            toast.success("Custodia actualizada a proveedor.");
            void cargar();
            onChequesChanged?.();
          })();
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

    </>
  );
}
