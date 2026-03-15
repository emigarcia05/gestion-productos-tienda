"use client";

import { useState, useImperativeHandle, forwardRef, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { ControlStockData, ItemStock, Sucursal } from "@/actions/stock";
import { registrarImpresion } from "@/actions/stock";
import PrintStock from "./PrintStock";

function exportarStockExcel(
  items: ItemStock[],
  stocksEditados: Record<string, string>
) {
  import("xlsx").then((XLSX) => {
    const filas = items.map((i) => {
      const raw = stocksEditados[i.id];
      const cantidad =
        raw !== undefined && raw !== "" ? Number(raw) : i.stock;
      const valor = Number.isFinite(cantidad) ? cantidad : i.stock;
      return {
        "CODIGO": i.codItem,
        "TIPO MOVIMIENTO": "AJUSTE",
        "CANTIDAD DISPONIBLE": valor,
      };
    });
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Ajuste stock");
    hoja["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 22 }];
    const ahora = new Date();
    const dd = String(ahora.getDate()).padStart(2, "0");
    const mm = String(ahora.getMonth() + 1).padStart(2, "0");
    const aa = String(ahora.getFullYear()).slice(-2);
    const hh = String(ahora.getHours()).padStart(2, "0");
    const min = String(ahora.getMinutes()).padStart(2, "0");
    const nombre = `Ajuste Stock ${dd}-${mm}-${aa} ${hh}:${min}.xls`;
    XLSX.writeFile(libro, nombre, { bookType: "xls" });
  });
}

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
  triggerExport: () => void;
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
  { value: "guaymallen", label: "GUAYMALLÉN" },
  { value: "maipu", label: "MAIPÚ" },
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

  const items = data.items;

  useEffect(() => {
    if (onFiltradosCountChange) onFiltradosCountChange(items.length);
  }, [items.length, onFiltradosCountChange]);

  async function handleImprimir() {
    setImprimiendo(true);
    const ids = items.map((i) => i.id);
    const ahora = new Date();
    registrarImpresion(ids).then((res) => {
      if (res.ok) {
        setImpresiones((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = ahora;
          return next;
        });
      } else {
        toast.error(res.error ?? "Error al registrar impresión.");
      }
    });
  }

  const handleImprimirRef = useRef(handleImprimir);
  useEffect(() => {
    handleImprimirRef.current = handleImprimir;
  }, [handleImprimir]);

  const stocksEditadosRef = useRef(stocksEditados);
  stocksEditadosRef.current = stocksEditados;

  useImperativeHandle(ref, () => ({
    openPrint: () => handleImprimirRef.current(),
    triggerExport: () => exportarStockExcel(items, stocksEditadosRef.current),
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
                <TableHead className="px-3 py-2 text-xs w-28">CÓD.</TableHead>
                <TableHead className="px-3 py-2 text-xs">
                  DESCRIPCIÓN
                </TableHead>
                <TableHead className="px-3 py-2 text-xs w-28">
                  STOCK
                </TableHead>
                <TableHead className="px-3 py-2 text-xs w-28">
                  ÚLT. IMPRESIÓN
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-xs text-muted-foreground py-10"
                  >
                    Sin resultados
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
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
          items={items}
          sucursal={sucursalLabel}
          onClose={() => setImprimiendo(false)}
        />
      )}
    </>
  );
});

export default TablaStock;

