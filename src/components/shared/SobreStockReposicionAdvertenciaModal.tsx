"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AppModal from "@/components/shared/AppModal";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TEXT_WARNING_CLASS } from "@/lib/ui-classes";
import type { SobreStockReposicionItem } from "@/services/sobreStock.service";

/** Exportado para extensiones / documentación (mismo patrón que `TableEmptyState`). */
export const sobreStockAdvertenciaLayoutVariants = cva("flex min-h-0 flex-col", {
  variants: {
    gap: {
      default: "gap-3",
      tight: "gap-2",
    },
  },
  defaultVariants: {
    gap: "default",
  },
});

export const sobreStockAdvertenciaTableShellVariants = cva(
  "min-h-0 overflow-hidden rounded-lg border border-border bg-background",
  {
    variants: {
      flex: {
        grow: "flex-1",
        auto: "",
      },
    },
    defaultVariants: {
      flex: "grow",
    },
  }
);

export type SobreStockReposicionAdvertenciaModalLayoutProps = VariantProps<
  typeof sobreStockAdvertenciaLayoutVariants
>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SobreStockReposicionItem[];
  pending?: boolean;
  onPedirAlProveedorIgual: () => void | Promise<void>;
  onPreferirTransferencia: () => void | Promise<void>;
  layoutGap?: SobreStockReposicionAdvertenciaModalLayoutProps["gap"];
}

function fmtNumero(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("es-AR");
}

/**
 * Modal de advertencia antes de generar/enviar un pedido que incluye ítems de reposición con sobrestock.
 * Usar junto a `GenerarPedidoToolbarButton` y `getSobreStockReposicionParaModalAction` / validación en `generarPdfEnviarPedidoAction`.
 */
export default function SobreStockReposicionAdvertenciaModal({
  open,
  onOpenChange,
  items,
  pending,
  onPedirAlProveedorIgual,
  onPreferirTransferencia,
  layoutGap = "default",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Advertencia De Sobrestock"
        size="md"
        padding="sm"
        scrollBody={false}
        headerClassName="pt-4 pb-3"
        footerClassName="py-3"
        actions={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="default"
              disabled={pending}
              onClick={onPedirAlProveedorIgual}
              className="gap-2"
              aria-label="Pedir al proveedor igual"
            >
              Pedir Al Proveedor Igual
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onPreferirTransferencia}
              aria-label="Prefiero transferencia"
            >
              Prefiero Transferencia
            </Button>
          </div>
        }
      >
        <div className={cn(sobreStockAdvertenciaLayoutVariants({ gap: layoutGap }))}>
          <div className="flex items-start gap-2">
            <AlertCircle
              className={cn("mt-0.5 h-5 w-5 shrink-0", TEXT_WARNING_CLASS)}
              aria-hidden
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                Se detectó sobrestock en algunos ítems de reposición.
              </p>
              <p className="text-sm text-muted-foreground">
                Si continuás, el pedido se generará con esas cantidades.
              </p>
            </div>
          </div>

          <div className={sobreStockAdvertenciaTableShellVariants({ flex: "grow" })}>
            <div className="h-full min-h-0 overflow-y-auto no-scrollbar">
              <Table variant="compact" scrollX={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%]">DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[15%]">STOCK SUCURSAL</TableHead>
                    <TableHead className="w-[15%]">TOPE REPOSICIÓN</TableHead>
                    <TableHead className="w-[15%]">SOBRESTOCK</TableHead>
                    <TableHead className="w-[10%]">CANT. PEDIR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} />
                    </TableRow>
                  ) : (
                    items.map((it) => (
                      <TableRow key={it.idItemPedidoEnvio}>
                        <TableCell className="w-[45%] text-left">
                          {it.descripcionTienda ??
                            it.descripcionProveedor ??
                            it.codExt}
                        </TableCell>
                        <TableCell className="w-[15%] tabular-nums">
                          {fmtNumero(it.stockSucursal)}
                        </TableCell>
                        <TableCell className="w-[15%] tabular-nums">
                          {it.topeReposicion === null
                            ? ""
                            : fmtNumero(it.topeReposicion)}
                        </TableCell>
                        <TableCell className="w-[15%] tabular-nums">
                          {fmtNumero(it.sobreStock)}
                        </TableCell>
                        <TableCell className="w-[10%] tabular-nums">
                          {fmtNumero(it.cantPedir)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
