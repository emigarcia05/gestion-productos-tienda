"use client";

import { useState, useImperativeHandle, forwardRef, useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { ControlStockData, Sucursal } from "@/actions/stock";
import { registrarImpresion } from "@/actions/stock";
import { matchByMultiTerm } from "@/lib/busqueda";
import PrintStock from "./PrintStock";

function fmtFecha(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export interface TablaStockHandle {
  openPrint: () => void;
}

interface Props {
  data: ControlStockData;
  sucursalActual: Sucursal | null;
  qActual: string;
  marcaActual: string;
  rubroActual: string;
  subRubroActual: string;
  soloNegativoActual: boolean;
  onFiltradosCountChange?: (count: number) => void;
}

const SUCURSALES: { value: Sucursal; label: string }[] = [
  { value: "guaymallen", label: "Guaymallén" },
  { value: "maipu", label: "Maipú" },
];

const TablaStock = forwardRef<TablaStockHandle, Props>(function TablaStock(
  {
    data,
    sucursalActual,
    qActual,
    marcaActual,
    rubroActual,
    subRubroActual,
    soloNegativoActual,
    onFiltradosCountChange,
  },
  ref
) {
  const [imprimiendo, setImprimiendo] = useState(false);
  const [impresiones, setImpresiones] = useState<Record<string, Date>>(() => {
    const m: Record<string, Date> = {};
    for (const i of data.items)
      if (i.ultimaImpresion) m[i.id] = new Date(i.ultimaImpresion);
    return m;
  });
  const [stocksEditados, setStocksEditados] = useState<Record<string, string>>(
    () => {
      const m: Record<string, string> = {};
      for (const i of data.items) {
        const valor = Number.isInteger(i.stock)
          ? i.stock.toFixed(0)
          : i.stock.toFixed(2);
        m[i.id] = valor;
      }
      return m;
    }
  );

  useEffect(() => {
    if (data.items.length === 0) return;
    setStocksEditados((prev) => {
      let hasNew = false;
      const next = { ...prev };
      for (const i of data.items) {
        if (next[i.id] === undefined) {
          hasNew = true;
          next[i.id] = Number.isInteger(i.stock)
            ? i.stock.toFixed(0)
            : i.stock.toFixed(2);
        }
      }
      return hasNew ? next : prev;
    });
  }, [data.items.length]);

  function handleCambioStock(id: string, value: string) {
    setStocksEditados((prev) => ({ ...prev, [id]: value }));
  }

  const filtrados = data.items.filter((i) => {
    if (
      qActual.trim() &&
      !matchByMultiTerm([i.descripcion, i.codItem], qActual)
    )
      return false;
    if (marcaActual && i.marca !== marcaActual) return false;
    if (rubroActual && i.rubro !== rubroActual) return false;
    if (subRubroActual && i.subRubro !== subRubroActual) return false;
    if (soloNegativoActual && i.stock >= 0) return false;
    return true;
  });

  useEffect(() => {
    if (onFiltradosCountChange) onFiltradosCountChange(filtrados.length);
  }, [filtrados.length, onFiltradosCountChange]);

  async function handleImprimir() {
    setImprimiendo(true);
    const ids = filtrados.map((i) => i.id);
    const ahora = new Date();
    registrarImpresion(ids).then(() => {
      setImpresiones((prev) => {
        const next = { ...prev };
        for (const id of ids) next[id] = ahora;
        return next;
      });
    });
  }

  const handleImprimirRef = useRef(handleImprimir);
  useEffect(() => {
    handleImprimirRef.current = handleImprimir;
  }, [handleImprimir]);
  useImperativeHandle(ref, () => ({
    openPrint: () => handleImprimirRef.current(),
  }));

  const sucursalSeleccionada = sucursalActual !== null;
  const sucursalLabel = sucursalActual
    ? SUCURSALES.find((s) => s.value === sucursalActual)?.label ??
      sucursalActual
    : "";

  return (
    <>
      <div className="flex-1 overflow-auto rounded-lg border border-card-border bg-card">
        {!sucursalSeleccionada ? (
          <div className="flex h-full min-h-[200px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Seleccioná una sucursal para ver el stock.
          </div>
        ) : (
          <Table variant="compact">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3 py-2 text-xs w-28">Código</TableHead>
                <TableHead className="px-3 py-2 text-xs">
                  Descripción
                </TableHead>
                <TableHead className="px-3 py-2 text-xs w-28">
                  Stock {sucursalLabel}
                </TableHead>
                <TableHead className="px-3 py-2 text-xs w-28">
                  Últ. impresión
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-xs text-muted-foreground py-10"
                  >
                    Sin resultados
                  </TableCell>
                </TableRow>
              )}
              {filtrados.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-3 py-2 text-xs font-mono">
                    {item.codItem}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    {item.descripcion}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums">
                    <Input
                      type="number"
                      value={stocksEditados[item.id] ?? ""}
                      onChange={(e) =>
                        handleCambioStock(item.id, e.target.value)
                      }
                      className="h-8 text-center text-sm font-semibold"
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums">
                    {fmtFecha(impresiones[item.id] ?? item.ultimaImpresion)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {imprimiendo && (
        <PrintStock
          items={filtrados}
          sucursal={sucursalLabel}
          onClose={() => setImprimiendo(false)}
        />
      )}
    </>
  );
});

export default TablaStock;

