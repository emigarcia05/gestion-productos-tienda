"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TABLE_ROW_ACTION_ICON_CLASS } from "@/lib/ui-classes";
import type { ReposicionProveedorPrioritarioItem } from "@/services/pedidosEnvio.service";

export type ReposicionProveedorPrioritarioSeleccion = {
  idItemPedidoEnvio: string;
  proveedorPrioritarioId: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ReposicionProveedorPrioritarioItem[];
  pending?: boolean;
  onConfirmar: (seleccionados: ReposicionProveedorPrioritarioSeleccion[]) => void | Promise<void>;
}

function etiquetaProveedor(prefijo: string, nombre: string): string {
  const p = prefijo.trim();
  const n = nombre.trim();
  if (p && n) return `[${p}] ${n}`;
  return n || p || "—";
}

/**
 * Modal previo a generar pedido de reposición: ofrece incluir ítems cuyo proveedor
 * prioritario (menor costo comparable) es distinto al proveedor elegido en el modal.
 */
export default function ReposicionProveedorPrioritarioModal({
  open,
  onOpenChange,
  items,
  pending,
  onConfirmar,
}: Props) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setSeleccionados(new Set()));
  }, [items, open]);

  const gruposPorProveedor = useMemo(() => {
    const map = new Map<
      string,
      { etiqueta: string; items: ReposicionProveedorPrioritarioItem[] }
    >();
    for (const item of items) {
      const key = item.proveedorPrioritarioId;
      const etiqueta = etiquetaProveedor(
        item.proveedorPrioritarioPrefijo,
        item.proveedorPrioritarioNombre
      );
      const grupo = map.get(key) ?? { etiqueta, items: [] };
      grupo.items.push(item);
      map.set(key, grupo);
    }
    return [...map.values()];
  }, [items]);

  function toggleItem(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildSeleccion(): ReposicionProveedorPrioritarioSeleccion[] {
    return items
      .filter((it) => seleccionados.has(it.idItemPedidoEnvio))
      .map((it) => ({
        idItemPedidoEnvio: it.idItemPedidoEnvio,
        proveedorPrioritarioId: it.proveedorPrioritarioId,
      }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Productos Asignados a Otro Proveedor"
        size="lg"
        className="max-w-[72rem]"
        padding="sm"
        scrollBody={false}
        headerClassName="pt-4 pb-3"
        footerClassName="py-3"
        actions={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={pending}
              onClick={() => void onConfirmar(buildSeleccion())}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar Pedido"}
            </Button>
          </div>
        }
      >
        <div className="flex min-h-0 flex-col gap-4">
          {gruposPorProveedor.map((grupo) => (
            <div key={grupo.etiqueta} className="flex flex-col gap-2">
              <p className="text-sm leading-snug text-foreground">
                Estos productos están asignados a{" "}
                <strong className="font-semibold text-primary">{grupo.etiqueta}</strong>, pero por
                temas de stock y logística podés decidir incluirlos en el pedido de ese proveedor.
              </p>
            </div>
          ))}

          <div className="min-h-0 overflow-hidden rounded-lg border border-border bg-background">
            <div className="max-h-[min(50vh,24rem)] overflow-y-auto">
              <Table variant="compact" className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[3.5rem] text-center">
                      <Check
                        className="mx-auto h-4 w-4 shrink-0 text-primary-foreground"
                        aria-hidden
                      />
                      <span className="sr-only">Incluir</span>
                    </TableHead>
                    <TableHead>DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[4.5rem] text-center">CANT.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const seleccionado = seleccionados.has(item.idItemPedidoEnvio);
                    return (
                      <TableRow
                        key={item.idItemPedidoEnvio}
                        data-state={seleccionado ? "selected" : undefined}
                        className={cn(
                          seleccionado &&
                            "bg-primary/15 odd:bg-primary/15 even:bg-primary/15 hover:!bg-primary/20"
                        )}
                      >
                        <TableCell className="celda-datos celda-datos--accion-relleno-fila w-[3.5rem]">
                          <div className="flex h-full w-full items-center justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleItem(item.idItemPedidoEnvio)}
                              disabled={pending}
                              className={cn(
                                "tabla-check-toggle tabla-check-toggle--alto-fila shrink-0",
                                seleccionado &&
                                  "border-primary !bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground [&_svg]:!text-primary-foreground"
                              )}
                              aria-pressed={seleccionado}
                              aria-label={
                                seleccionado
                                  ? `Quitar ${item.descripcion} del pedido del proveedor asignado`
                                  : `Incluir ${item.descripcion} en el pedido del proveedor asignado`
                              }
                              title={seleccionado ? "Quitar" : "Incluir"}
                            >
                              {seleccionado ? (
                                <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                              ) : null}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell
                          className="celda-datos min-w-0 text-left"
                          title={item.descripcion}
                        >
                          <span className="block truncate">{item.descripcion}</span>
                        </TableCell>
                        <TableCell className="celda-datos tabular-nums text-center">
                          {item.cantPedir}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
