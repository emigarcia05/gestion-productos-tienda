"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
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
import { fmtNumero } from "@/lib/format";
import { montoArSignedCentsToDisplayWithCurrency } from "@/lib/montoArMask";
import { DUX_NUEVA_NOTA_CREDITO_DEBITO_VENTA_URL } from "@/lib/notaCreditoDux";
import {
  obtenerSiguienteNumeroNotaCreditoAction,
  reservarSiguienteNumeroNotaCreditoAction,
} from "@/actions/pedidosHistoria";
import {
  TablaControlItemCelda,
  TablaControlItemHead,
} from "@/components/shared/TablaControlItem";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export type NotaCreditoDuxItem = {
  id: string;
  codTienda: string;
  descripcionTienda: string;
  cant: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NotaCreditoDuxItem[];
  /** TOTAL PEDIDO de la NC (normalizado, admite negativo). */
  totalNc: number;
  onNotaGenerada?: () => void;
}

/**
 * Checklist para cargar la NC en DUX: mismo cascarón que **Generar Transf.**
 * (Control de ítem / COD. TIENDA / DESCRIPCIÓN / CANT. / ACCIONES).
 * **OK** copia `cod_tienda`; **Nota Generada** exige todos TRUE.
 * Pie: **PRECIO UNITARIO A COLOCAR EN TODOS LOS ITEM** = TOTAL / suma CANT. (2 decimales).
 * **NRO. COMPROBANTE** `c-00000-########`: preview al abrir; **Nota Generada** persiste +1 en `prod_ped_ult_comp`.
 */
export default function GenerarNotaCreditoDuxModal({
  open,
  onOpenChange,
  items,
  totalNc,
  onNotaGenerada,
}: Props) {
  const [okPorItemId, setOkPorItemId] = useState<Record<string, boolean>>({});
  const [numeroNc, setNumeroNc] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      setOkPorItemId({});
      setNumeroNc("");
    });
    void (async () => {
      const res = await obtenerSiguienteNumeroNotaCreditoAction();
      if (cancelled) return;
      if (!res.ok) {
        toast.error(res.error ?? "Error al leer el correlativo de nota de crédito.");
        return;
      }
      setNumeroNc(res.data.numero);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, items]);

  async function handleOkItem(item: NotaCreditoDuxItem) {
    if (okPorItemId[item.id] === true) {
      setOkPorItemId((prev) => ({ ...prev, [item.id]: false }));
      return;
    }
    try {
      await navigator.clipboard.writeText(item.codTienda);
    } catch {
      toast.error("No se pudo copiar el código de tienda.");
      return;
    }
    setOkPorItemId((prev) => ({ ...prev, [item.id]: true }));
    toast.success("Cod. Tienda Copiado", { description: item.codTienda });
  }

  const todosOk =
    items.length > 0 && items.every((item) => okPorItemId[item.id] === true);

  const precioUnitarioDisplay = useMemo(() => {
    const sumaCant = items.reduce((acc, it) => acc + it.cant, 0);
    if (
      sumaCant === 0 ||
      !Number.isFinite(sumaCant) ||
      !Number.isFinite(totalNc)
    ) {
      return "";
    }
    const unitario = totalNc / sumaCant;
    if (!Number.isFinite(unitario)) return "";
    return montoArSignedCentsToDisplayWithCurrency(Math.round(unitario * 100));
  }, [items, totalNc]);

  function handleNotaGenerada() {
    if (!todosOk || isPending) return;
    startTransition(async () => {
      const res = await reservarSiguienteNumeroNotaCreditoAction();
      if (!res.ok) {
        toast.error(res.error ?? "Error al asignar el correlativo de nota de crédito.");
        return;
      }
      const numero = res.data.numero;
      setNumeroNc(numero);
      try {
        await navigator.clipboard.writeText(numero);
        toast.success("Nota Generada", { description: numero });
      } catch {
        toast.success("Nota Generada", {
          description: `${numero} (no se pudo copiar)`,
        });
      }
      onNotaGenerada?.();
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isPending) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        size="xl"
        className="h-[85vh] max-h-[85vh] max-w-[54rem]"
        title="Generar Nota Crédito"
        scrollBody={false}
        bodyClassName="flex min-h-0 flex-1 flex-col gap-4"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={handleNotaGenerada}
              disabled={!todosOk || isPending}
              className="disabled:cursor-not-allowed"
              title={
                todosOk
                  ? "Cerrar el asistente de nota de crédito"
                  : "Marcá todos los ítems con OK"
              }
            >
              Nota Generada
            </Button>
          </>
        }
      >
        <div className="flex shrink-0 flex-col gap-4">
          <Button asChild className="w-full">
            <a
              href={DUX_NUEVA_NOTA_CREDITO_DEBITO_VENTA_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Generar Nota Crédito
            </a>
          </Button>
        </div>

        <div
          className="contenedor-tabla-gestion no-scroll-x min-h-0 flex-1"
          style={{ height: "auto" }}
        >
          <Table
            variant="compact"
            className="tabla-recepcion-pedido"
            scrollX={false}
          >
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TablaControlItemHead className="w-[8%] min-w-12" />
                <TableHead className="w-[16%]">COD. TIENDA</TableHead>
                <TableHead className="w-[50%]">DESCRIPCIÓN</TableHead>
                <TableHead className="w-[16%] text-center">CANT.</TableHead>
                <TableHead className="w-[10%] text-center">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <EmptyTableRow colSpan={5} message="SIN ÍTEMS." />
              ) : (
                items.map((item) => {
                  const ok = okPorItemId[item.id] === true;
                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "transition-colors duration-100",
                        ok
                          ? "recepcion-fila-verificada"
                          : "recepcion-fila-pendiente"
                      )}
                    >
                      <TablaControlItemCelda
                        verificado={ok}
                        placeholderTitle="Verificá con OK: copia el Cod. Tienda y marca el ítem."
                        className="w-[8%] min-w-12"
                      />
                      <TableCell className="celda-datos w-[16%]">
                        {item.codTienda}
                      </TableCell>
                      <TableCell
                        className="celda-datos min-w-0 w-[50%] truncate"
                        title={item.descripcionTienda}
                      >
                        {item.descripcionTienda}
                      </TableCell>
                      <TableCell className="celda-datos w-[16%] text-center tabular-nums">
                        {fmtNumero(item.cant)}
                      </TableCell>
                      <TableCell className="celda-datos w-[10%] celda-datos--accion-relleno-fila">
                        <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleOkItem(item)}
                            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                            aria-label={
                              ok
                                ? "Desmarcar ítem"
                                : "OK, copiar código de tienda"
                            }
                            title={
                              ok ? "Desmarcar ítem" : "OK — copiar Cod. Tienda"
                            }
                          >
                            <Check
                              className={TABLE_ROW_ACTION_ICON_CLASS}
                              aria-hidden
                            />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <section
          aria-label="Precio unitario y número de comprobante"
          className="shrink-0 border-t border-border bg-background py-2"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <ModalMicroLabel>
                PRECIO UNITARIO A COLOCAR EN TODOS LOS ITEM
              </ModalMicroLabel>
              <p className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                {precioUnitarioDisplay}
              </p>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3">
              <ModalMicroLabel>NRO. COMPROBANTE</ModalMicroLabel>
              <p className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                {numeroNc}
              </p>
            </div>
          </div>
        </section>
      </AppModal>
    </Dialog>
  );
}
