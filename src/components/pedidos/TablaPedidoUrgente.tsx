"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check } from "lucide-react";

const FILAS_EJEMPLO = [
  {
    id: "ej-1",
    proveedor: "GAR",
    regDux: true,
    descripcion: "3D PAÑO DE MICROFIBRA SUPER SUAVE",
    cantPedida: 12,
  },
  {
    id: "ej-2",
    proveedor: "MER",
    regDux: false,
    descripcion: "ADHESIVO SINTEPLAST CONSTRUCCION P/BLOQUE 25 KG",
    cantPedida: 0,
  },
];

export default function TablaPedidoUrgente() {
  return (
    <div className="w-full">
      <Table variant="compact" scrollX={false}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-28">PROVEEDOR</TableHead>
            <TableHead className="w-20 text-center">REG. DUX</TableHead>
            <TableHead>DESCRIPCIÓN</TableHead>
            <TableHead className="w-36">CANT. PEDIDA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {FILAS_EJEMPLO.map((fila) => (
            <TableRow key={fila.id}>
              <TableCell className="celda-datos celda-mono font-mono text-sm">
                {fila.proveedor}
              </TableCell>
              <TableCell className="celda-datos text-center">
                {fila.regDux ? (
                  <Check
                    className="h-4 w-4 text-primary mx-auto"
                    aria-label="Registrado en Dux"
                  />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="celda-datos min-w-0 truncate" title={fila.descripcion}>
                {fila.descripcion}
              </TableCell>
              <TableCell className="celda-datos celda-numero">
                {fila.cantPedida}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
