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
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import CantidadPedidoModal from "@/components/pedidos/CantidadPedidoModal";

export interface ProductoListaPrecios {
  id: string;
  codExt: string;
  prefijo: string;
  regDux: boolean;
  descripcion: string;
}

const MENSAJE_SIN_RESULTADOS = "No se encontraron productos.";

export type PedidoFilterValor = "si" | "no" | "";

interface Props {
  productos: ProductoListaPrecios[];
  onAgregarAlPedido?: (producto: ProductoListaPrecios, cantidad: number) => void;
  sinFiltros?: boolean;
  mensajeSinSucursal?: string;
  pedidoFilter?: PedidoFilterValor;
}

export default function TablaPedidoUrgente({
  productos,
  onAgregarAlPedido,
  sinFiltros = false,
  mensajeSinSucursal = "Seleccioná una sucursal para ver los productos.",
  pedidoFilter = "",
}: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoListaPrecios | null>(null);
  const [cantidadPorId, setCantidadPorId] = useState<Record<string, string>>({});

  function handleDobleClick(prod: ProductoListaPrecios) {
    if (!onAgregarAlPedido) return;
    setProductoSeleccionado(prod);
    setModalAbierto(true);
  }

  function handleConfirmar(cantidad: number) {
    if (productoSeleccionado && onAgregarAlPedido) {
      onAgregarAlPedido(productoSeleccionado, cantidad);
      setCantidadPorId((prev) => ({ ...prev, [productoSeleccionado.id]: String(cantidad) }));
    }
    setProductoSeleccionado(null);
  }

  const puedeAgregar = !!onAgregarAlPedido;
  const mensajeVacio = sinFiltros ? mensajeSinSucursal : MENSAJE_SIN_RESULTADOS;

  const visibleProductos =
    pedidoFilter === "si"
      ? productos.filter((p) => Number(cantidadPorId[p.id] || 0) > 0)
      : pedidoFilter === "no"
        ? productos.filter((p) => Number(cantidadPorId[p.id] || 0) === 0)
        : productos;

  function borrarCantidad(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCantidadPorId((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  return (
    <>
      <div className="w-full">
        <Table variant="compact">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28">PROVEEDOR</TableHead>
              <TableHead className="w-20 text-center">REG. DUX</TableHead>
              <TableHead>DESCRIPCIÓN</TableHead>
              <TableHead className="w-36 text-primary">CANT. PEDIR</TableHead>
              <TableHead className="w-14 text-center" aria-label="Borrar cantidad" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProductos.length === 0 ? (
              <EmptyTableRow colSpan={5} message={mensajeVacio} />
            ) : (
              visibleProductos.map((prod) => {
                const valor = cantidadPorId[prod.id] ?? "";
                return (
                  <TableRow
                    key={prod.id}
                    className={cn(puedeAgregar && "cursor-pointer")}
                    onDoubleClick={() => handleDobleClick(prod)}
                  >
                    <TableCell className="celda-datos celda-mono font-mono text-sm">{prod.prefijo}</TableCell>
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
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        className="h-6 w-20 text-center text-sm tabular-nums"
                        value={valor}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                          setCantidadPorId((prev) => ({ ...prev, [prod.id]: v }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="celda-datos p-1 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive [&_svg]:size-3.5"
                        onClick={(e) => borrarCantidad(prod.id, e)}
                        aria-label="Borrar cantidad pedida"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CantidadPedidoModal
        open={modalAbierto}
        onOpenChange={setModalAbierto}
        producto={
          productoSeleccionado
            ? {
                id: productoSeleccionado.id,
                descripcion: productoSeleccionado.descripcion,
                codigoExterno: productoSeleccionado.codExt,
                proveedor: { nombre: "", prefijo: productoSeleccionado.prefijo },
              }
            : null
        }
        onConfirmar={handleConfirmar}
      />
    </>
  );
}
