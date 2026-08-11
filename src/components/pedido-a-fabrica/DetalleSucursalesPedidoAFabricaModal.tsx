"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AppModal from "@/components/shared/AppModal";
import { totalPorSucursalesPedidoAFabrica } from "@/components/pedido-a-fabrica/TablaPedidoAFabrica";
import { cn } from "@/lib/utils";
import { fmtNumero } from "@/lib/format";
import {
  calcularCantSugeridaPedidoAFabrica,
  calcularStockAFechaLlegadaPedidoAFabrica,
  calcularStockEnDiasPedidoAFabrica,
} from "@/lib/pedidoAFabricaPromVta";
import type {
  ProductoPedidoAFabricaItem,
  SucursalPedidoAFabrica,
} from "@/services/pedidoAFabrica.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: ProductoPedidoAFabricaItem | null;
  sucursales: SucursalPedidoAFabrica[];
  tiempoEntregaEnDias: number | null;
  tiempoStockeo: number | null;
}

const TD_NUM = "celda-datos celda-numero tabular-nums text-center";

interface FilaSucursalDetalle {
  id: string;
  nombre: string;
  stockUnidades: number | null;
  stockDias: number | null;
  stockHastaLlegada: number | null;
  sugerida: number | null;
}

/**
 * Detalle por sucursal de un ítem Pedido A Fáb.:
 * Stock Actual · Stock hasta llegada · Compra sugerida + fila **TOTAL**.
 * (PROM. VTA. alimenta los cálculos pero no se muestra como columna.)
 */
export default function DetalleSucursalesPedidoAFabricaModal({
  open,
  onOpenChange,
  producto,
  sucursales,
  tiempoEntregaEnDias,
  tiempoStockeo,
}: Props) {
  const titulo = producto?.descripcion?.trim()
    ? producto.descripcion
    : "Detalle por sucursal";

  const { filas, total } = useMemo(() => {
    if (!producto || sucursales.length === 0) {
      return { filas: [] as FilaSucursalDetalle[], total: null };
    }

    const filasCalc: FilaSucursalDetalle[] = sucursales.map((s) => {
      const datos = producto.porSucursal[s.id];
      const stockUnidades = datos?.stockActual ?? null;
      const promVta = datos?.promVta ?? null;
      const stockDias = calcularStockEnDiasPedidoAFabrica(
        stockUnidades,
        promVta
      );
      const stockHastaLlegada = calcularStockAFechaLlegadaPedidoAFabrica(
        stockUnidades,
        promVta,
        tiempoEntregaEnDias
      );
      const calc = calcularCantSugeridaPedidoAFabrica({
        stockActual: stockUnidades ?? 0,
        promVtaTotal: promVta ?? 0,
        tiempoEntregaEnDias,
        tiempoStockeo,
      });
      return {
        id: s.id,
        nombre: s.nombre.toLocaleUpperCase("es"),
        stockUnidades,
        stockDias,
        stockHastaLlegada,
        sugerida: calc?.cantSugerida ?? null,
      };
    });

    /** Totales = misma lógica que la grilla (suma stock/prom → métricas derivadas). */
    const agg = totalPorSucursalesPedidoAFabrica(producto, sucursales);
    const stockUnidades = agg.stockActual;
    const stockDias = calcularStockEnDiasPedidoAFabrica(
      stockUnidades,
      agg.promVta
    );
    const stockHastaLlegada = calcularStockAFechaLlegadaPedidoAFabrica(
      stockUnidades,
      agg.promVta,
      tiempoEntregaEnDias
    );
    const calcTotal = calcularCantSugeridaPedidoAFabrica({
      stockActual: stockUnidades ?? 0,
      promVtaTotal: agg.promVta ?? 0,
      tiempoEntregaEnDias,
      tiempoStockeo,
    });

    return {
      filas: filasCalc,
      total: {
        stockUnidades,
        stockDias,
        stockHastaLlegada,
        sugerida: calcTotal?.cantSugerida ?? null,
      },
    };
  }, [producto, sucursales, tiempoEntregaEnDias, tiempoStockeo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="lg"
        padding="sm"
        title={titulo}
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        {!producto || sucursales.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay sucursales de pedido para mostrar.
          </p>
        ) : (
          <div className="contenedor-tabla-gestion no-scroll-x min-h-0">
            <Table variant="compact" scrollX={false}>
              <colgroup>
                <col style={{ width: "22%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "22%" }} />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead rowSpan={2} className="min-w-0 align-middle">
                    SUCURSAL
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="text-center align-middle tabla-bloque-secundario-head-divider"
                  >
                    STOCK ACTUAL
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-center align-middle leading-tight tabla-bloque-secundario-head-divider"
                  >
                    STOCK HASTA LLEGADA DE PEDIDO
                  </TableHead>
                  <TableHead className="text-center align-middle tabla-bloque-secundario-head-divider">
                    COMPRA
                  </TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-center tabla-bloque-secundario-head-divider">
                    EN UNIDADES
                  </TableHead>
                  <TableHead className="text-center tabla-bloque-secundario-head">
                    EN DÍAS
                  </TableHead>
                  <TableHead className="text-center tabla-bloque-secundario-head-divider">
                    SUGERIDA
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="celda-datos min-w-0">
                      <span className="block truncate" title={f.nombre}>
                        {f.nombre}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "tabla-bloque-secundario-cell-divider"
                      )}
                    >
                      {fmtNumero(f.stockUnidades)}
                    </TableCell>
                    <TableCell
                      className={cn(TD_NUM, "tabla-bloque-secundario-cell")}
                    >
                      {fmtNumero(f.stockDias)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "tabla-bloque-secundario-cell-divider"
                      )}
                    >
                      {fmtNumero(f.stockHastaLlegada)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "tabla-bloque-secundario-cell-divider"
                      )}
                    >
                      {f.sugerida != null ? fmtNumero(f.sugerida) : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {total ? (
                <TableFooter>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-t-2 border-border">
                    <TableCell className="celda-datos min-w-0 font-bold uppercase">
                      TOTAL
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "font-bold tabla-bloque-secundario-cell-divider"
                      )}
                    >
                      {fmtNumero(total.stockUnidades)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "font-bold tabla-bloque-secundario-cell"
                      )}
                    >
                      {fmtNumero(total.stockDias)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "font-bold tabla-bloque-secundario-cell-divider"
                      )}
                    >
                      {fmtNumero(total.stockHastaLlegada)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "font-bold tabla-bloque-secundario-cell-divider"
                      )}
                    >
                      {total.sugerida != null ? fmtNumero(total.sugerida) : ""}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          </div>
        )}
      </AppModal>
    </Dialog>
  );
}
