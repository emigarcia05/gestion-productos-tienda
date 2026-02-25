"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import CantidadPedidoModal, {
  type ProductoParaPedido,
} from "@/components/pedidos/CantidadPedidoModal";

export interface ProductoListaPrecios {
  id: string;
  descripcion: string;
  codExt?: string;
  precioVentaSugerido: number;
  proveedor: { nombre: string; sufijo: string };
}

interface Props {
  productos: ProductoListaPrecios[];
  onAgregarAlPedido?: (producto: ProductoListaPrecios, cantidad: number) => void;
}

export default function TablaPedidoUrgente({ productos, onAgregarAlPedido }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoListaPrecios | null>(null);
  const [cantidadUrgente, setCantidadUrgente] = useState<Record<string, string>>({});

  function handleDobleClick(prod: ProductoListaPrecios) {
    if (!onAgregarAlPedido) return;
    setProductoSeleccionado(prod);
    setModalAbierto(true);
  }

  function handleConfirmar(cantidad: number) {
    if (productoSeleccionado && onAgregarAlPedido) {
      onAgregarAlPedido(productoSeleccionado, cantidad);
      setCantidadUrgente((prev) => ({ ...prev, [productoSeleccionado.id]: String(cantidad) }));
    }
    setProductoSeleccionado(null);
  }

  const puedeAgregar = !!onAgregarAlPedido;

  if (productos.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-sm text-slate-500">No se encontraron productos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-xl shadow-sm border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-16rem)]">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-28 text-slate-600 font-medium">Proveedor</TableHead>
                  <TableHead className="text-slate-600 font-medium">Descripción</TableHead>
                  <TableHead className="w-36 text-slate-600 font-medium">Cantidad Urgente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map((prod) => {
                  const valor = cantidadUrgente[prod.id] ?? "";
                  return (
                    <TableRow
                      key={prod.id}
                      className={cn(
                        "border-border",
                        puedeAgregar && "cursor-pointer hover:bg-slate-50"
                      )}
                      onDoubleClick={() => handleDobleClick(prod)}
                    >
                      <TableCell className="py-4 font-mono text-sm text-slate-600">
                        {prod.proveedor.sufijo}
                      </TableCell>
                      <TableCell className="py-4 text-sm font-medium text-slate-900">
                        {prod.descripcion}
                      </TableCell>
                      <TableCell className="py-4">
                        {valor ? (
                          <Badge variant="secondary" className="font-mono text-slate-700">
                            {valor}
                          </Badge>
                        ) : (
                          <Input
                            type="number"
                            placeholder="—"
                            className="h-8 w-20 text-center text-sm tabular-nums"
                            value={valor}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                              setCantidadUrgente((prev) => ({ ...prev, [prod.id]: v }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CantidadPedidoModal
        open={modalAbierto}
        onOpenChange={setModalAbierto}
        producto={productoSeleccionado as ProductoParaPedido | null}
        onConfirmar={handleConfirmar}
      />
    </>
  );
}
