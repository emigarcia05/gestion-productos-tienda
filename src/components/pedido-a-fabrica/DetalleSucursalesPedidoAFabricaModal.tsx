"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AppModal from "@/components/shared/AppModal";
import { cn } from "@/lib/utils";
import { fmtNumero } from "@/lib/format";
import {
  calcularCantSugeridaPedidoAFabrica,
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

/**
 * Detalle por sucursal de un ítem Pedido A Fáb.:
 * Stock Actual (unidades / días) + Compra sugerida (unidades).
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
                <col style={{ width: "28%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "36%" }} />
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
                {sucursales.map((s) => {
                  const datos = producto.porSucursal[s.id];
                  const stockUnidades = datos?.stockActual ?? null;
                  const promVta = datos?.promVta ?? null;
                  const stockDias = calcularStockEnDiasPedidoAFabrica(
                    stockUnidades,
                    promVta
                  );
                  const calc = calcularCantSugeridaPedidoAFabrica({
                    stockActual: stockUnidades ?? 0,
                    promVtaTotal: promVta ?? 0,
                    tiempoEntregaEnDias,
                    tiempoStockeo,
                  });
                  const sugerida = calc?.cantSugerida ?? null;

                  return (
                    <TableRow key={s.id}>
                      <TableCell className="celda-datos min-w-0">
                        <span className="block truncate" title={s.nombre}>
                          {s.nombre.toLocaleUpperCase("es")}
                        </span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          TD_NUM,
                          "tabla-bloque-secundario-cell-divider"
                        )}
                      >
                        {fmtNumero(stockUnidades)}
                      </TableCell>
                      <TableCell
                        className={cn(TD_NUM, "tabla-bloque-secundario-cell")}
                      >
                        {fmtNumero(stockDias)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          TD_NUM,
                          "tabla-bloque-secundario-cell-divider"
                        )}
                      >
                        {sugerida != null ? fmtNumero(sugerida) : ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </AppModal>
    </Dialog>
  );
}
