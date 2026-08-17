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
import { cn } from "@/lib/utils";
import { fmtCelda } from "@/lib/format";
import type { ReposicionFormaPedidoFabrica } from "@/lib/validations/reposicion";
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
  formaPedir: ReposicionFormaPedidoFabrica;
}

const TD_NUM = "celda-datos celda-numero tabular-nums text-center";

interface FilaSucursalDetalle {
  id: string;
  nombre: string;
  promVtaPorDia: number | null;
}

function fmtPromVtaUnDecimal(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Detalle por sucursal de un ítem Pedido A Fáb.:
 * Muestra **SUCURSALES** y **PROM. VTA POR DÍA** + fila **TOTAL**.
 */
export default function DetalleSucursalesPedidoAFabricaModal({
  open,
  onOpenChange,
  producto,
  sucursales,
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
      const promVtaPorDia = datos?.promVta ?? null;
      return {
        id: s.id,
        nombre: s.nombre.toLocaleUpperCase("es"),
        promVtaPorDia,
      };
    });

    const promsValidos = filasCalc
      .map((f) => f.promVtaPorDia)
      .filter((v): v is number => v != null && !Number.isNaN(v));
    const totalPromVtaPorDia =
      promsValidos.length > 0
        ? promsValidos.reduce((acc, n) => acc + n, 0)
        : null;

    return {
      filas: filasCalc,
      total: {
        promVtaPorDia: totalPromVtaPorDia,
      },
    };
  }, [producto, sucursales]);

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
                <col style={{ width: "70%" }} />
                <col style={{ width: "30%" }} />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-0 align-middle">
                    SUCURSALES
                  </TableHead>
                  <TableHead className="text-center tabla-bloque-secundario-head-divider">
                    PROM. VTA POR DÍA
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
                      {fmtPromVtaUnDecimal(f.promVtaPorDia)}
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
                      {fmtCelda(fmtPromVtaUnDecimal(total.promVtaPorDia))}
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
