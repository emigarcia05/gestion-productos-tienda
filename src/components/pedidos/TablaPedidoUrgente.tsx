"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { syncPedidoUrgenteEnvioAction } from "@/actions/pedidos";

export interface ProductoPedidoUrgente {
  id: string;
  codExt: string;
  prefijo: string;
  regDux: boolean;
  descripcion: string;
}

export type PedidoFilterValor = "si" | "no" | "";

const COLUMNS = 5;
const MENSAJE_SIN_RESULTADOS = "No se encontraron productos.";

interface Props {
  productos: ProductoPedidoUrgente[];
  sucursal?: "" | "guaymallen" | "maipu";
  sinFiltros?: boolean;
  mensajeSinSucursal?: string;
  pedidoFilter?: PedidoFilterValor;
}

export default function TablaPedidoUrgente({
  productos,
  sucursal = "",
  sinFiltros = false,
  mensajeSinSucursal = "Seleccioná una sucursal para ver los productos.",
  pedidoFilter = "",
}: Props) {
  const [cantPorId, setCantPorId] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    if (!sucursal) {
      toast.error("Seleccioná una sucursal para guardar el pedido.");
      return;
    }
    const items = Object.entries(cantPorId)
      .filter(([, c]) => Number(c) > 0)
      .map(([id, c]) => ({ id, cant: Number(c) }));
    setGuardando(true);
    try {
      const result = await syncPedidoUrgenteEnvioAction(sucursal, items);
      if (result.ok) {
        toast.success(
          result.data.creados === 0
            ? "Pedido actualizado (sin ítems con cantidad)."
            : `Se guardaron ${result.data.creados} ítem(s) en el pedido de envío.`
        );
      } else {
        toast.error(result.error);
      }
    } finally {
      setGuardando(false);
    }
  }

  const visibleProductos =
    pedidoFilter === "si"
      ? productos.filter((p) => Number(cantPorId[p.id] || 0) > 0)
      : pedidoFilter === "no"
        ? productos.filter((p) => Number(cantPorId[p.id] || 0) === 0)
        : productos;

  const mensajeVacio = sinFiltros ? mensajeSinSucursal : MENSAJE_SIN_RESULTADOS;

  function handleCantChange(id: string, value: string) {
    const soloDigitos = value.replace(/\D/g, "");
    setCantPorId((prev) => ({ ...prev, [id]: soloDigitos }));
  }

  function borrarCant(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCantPorId((prev) => ({ ...prev, [id]: "" }));
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {sucursal && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-2"
            onClick={handleGuardar}
            disabled={guardando}
          >
            <Save className="h-4 w-4" />
            {guardando ? "Guardando…" : "Guardar pedido"}
          </Button>
        </div>
      )}
      <Table variant="compact" scrollX={false}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-28">PROVEEDOR</TableHead>
            <TableHead className="w-20 text-center">REG. DUX</TableHead>
            <TableHead>DESCRIPCIÓN</TableHead>
            <TableHead className="w-36 text-center">CANT. PEDIDA</TableHead>
            <TableHead className="w-14 text-center" aria-label="Borrar cantidad" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleProductos.length === 0 ? (
            <EmptyTableRow colSpan={COLUMNS} message={mensajeVacio} />
          ) : (
            visibleProductos.map((prod) => (
              <TableRow key={prod.id}>
                <TableCell className="celda-datos celda-mono font-mono text-sm">
                  {prod.prefijo}
                </TableCell>
                <TableCell className="celda-datos text-center">
                  {prod.regDux ? (
                    <Check
                      className="h-4 w-4 text-primary mx-auto"
                      aria-label="Registrado en Dux"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="celda-datos min-w-0 truncate" title={prod.descripcion}>
                  {prod.descripcion}
                </TableCell>
                <TableCell className="celda-datos">
                  <div className="flex items-center justify-center min-h-0">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      className="w-20 h-6 py-0 text-center text-sm tabular-nums"
                      value={cantPorId[prod.id] ?? ""}
                      onChange={(e) => handleCantChange(prod.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </TableCell>
                <TableCell className="celda-datos text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => borrarCant(prod.id, e)}
                    aria-label="Borrar cantidad pedida"
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
