"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Trash2 } from "lucide-react";

const FILAS_EJEMPLO = [
  {
    id: "ej-1",
    proveedor: "GAR",
    regDux: true,
    descripcion: "3D PAÑO DE MICROFIBRA SUPER SUAVE",
    cantPedidaInicial: 12,
  },
  {
    id: "ej-2",
    proveedor: "MER",
    regDux: false,
    descripcion: "ADHESIVO SINTEPLAST CONSTRUCCION P/BLOQUE 25 KG",
    cantPedidaInicial: 0,
  },
];

export default function TablaPedidoUrgente() {
  const [cantPorId, setCantPorId] = useState<Record<string, string>>(() =>
    Object.fromEntries(FILAS_EJEMPLO.map((f) => [f.id, String(f.cantPedidaInicial)]))
  );

  function handleCantChange(id: string, value: string) {
    const soloDigitos = value.replace(/\D/g, "");
    setCantPorId((prev) => ({ ...prev, [id]: soloDigitos }));
  }

  function borrarCant(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCantPorId((prev) => ({ ...prev, [id]: "" }));
  }

  return (
    <div className="w-full">
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
              <TableCell className="celda-datos">
                <div className="flex items-center justify-center min-h-0">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="w-20 text-center text-sm tabular-nums"
                    value={cantPorId[fila.id] ?? ""}
                    onChange={(e) => handleCantChange(fila.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </TableCell>
              <TableCell className="celda-datos text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => borrarCant(fila.id, e)}
                  aria-label="Borrar cantidad pedida"
                >
                  <Trash2 />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
