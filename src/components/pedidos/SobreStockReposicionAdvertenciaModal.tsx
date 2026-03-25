"use client";

import { AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import AppModal from "@/components/shared/AppModal";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TEXT_WARNING_CLASS } from "@/lib/ui-classes";
import type { SobreStockReposicionItem } from "@/services/sobreStock.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SobreStockReposicionItem[];
  pending?: boolean;
  onPedirAlProveedorIgual: () => void | Promise<void>;
  onPreferirTransferencia: () => void | Promise<void>;
}

function fmtNumero(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("es-AR");
}

export default function SobreStockReposicionAdvertenciaModal({
  open,
  onOpenChange,
  items,
  pending,
  onPedirAlProveedorIgual,
  onPreferirTransferencia,
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
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className={cn("mt-0.5 h-5 w-5 shrink-0", TEXT_WARNING_CLASS)} aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                Se detecto sobrestock en algunos items de Reposicion.
              </p>
              <p className="text-sm text-muted-foreground">
                Si continuas, el pedido se generara con esas cantidades.
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background">
            <div className="min-h-0 h-full overflow-y-auto no-scrollbar">
              <Table variant="compact" scrollX={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[45%]">DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[15%]">STOCK SUCURSAL</TableHead>
                    <TableHead className="w-[15%]">TOPE REPOSICION</TableHead>
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
                          {it.descripcionTienda ?? it.descripcionProveedor ?? it.codExt}
                        </TableCell>
                        <TableCell className="w-[15%] tabular-nums">
                          {fmtNumero(it.stockSucursal)}
                        </TableCell>
                        <TableCell className="w-[15%] tabular-nums">
                          {fmtNumero(it.topeReposicion)}
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

