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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ControlStockData, ItemStock, Sucursal } from "@/actions/stock";
import { registrarExportacionExcelStock } from "@/actions/stock";
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
  if (!d) return "";
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
  const [exportaciones, setExportaciones] = useState<Record<string, Date>>(() => {
    const m: Record<string, Date> = {};
    for (const i of data.items)
      if (i.ultimaExportacionExcel) m[i.id] = new Date(i.ultimaExportacionExcel);
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

  function ajustarStockUnidad(id: string, stockBase: number, delta: -1 | 1) {
    setStocksEditados((prev) => {
      const raw = prev[id];
      const parsed =
        raw !== undefined && raw !== "" ? Number(raw) : stockBase;
      const base = Number.isFinite(parsed) ? parsed : stockBase;
      const next = base + delta;
      return { ...prev, [id]: Number.isInteger(next) ? next.toFixed(0) : String(next) };
    });
  }

  const items = data.items;

  useEffect(() => {
    if (onFiltradosCountChange) onFiltradosCountChange(items.length);
  }, [items.length, onFiltradosCountChange]);

  async function handleImprimir() {
    setImprimiendo(true);
    // Imprimir no registra fecha en DB (solo abre la vista de impresión).
  }

  const handleImprimirRef = useRef(handleImprimir);
  useEffect(() => {
    handleImprimirRef.current = handleImprimir;
  }, [handleImprimir]);

  const stocksEditadosRef = useRef(stocksEditados);
  stocksEditadosRef.current = stocksEditados;

  useImperativeHandle(ref, () => ({
    openPrint: () => handleImprimirRef.current(),
    triggerExport: () => {
      exportarStockExcel(items, stocksEditadosRef.current);
      const ids = items.map((i) => i.id);
      const ahora = new Date();
      registrarExportacionExcelStock(ids).then((res) => {
        if (res.ok) {
          setExportaciones((prev) => {
            const next = { ...prev };
            for (const id of ids) next[id] = ahora;
            return next;
          });
        } else {
          toast.error(res.error ?? "Error al registrar exportación.");
        }
      });
    },
  }));

  const sucursalSeleccionada = sucursalActual !== null;
  const sucursalLabel = sucursalActual
    ? SUCURSALES.find((s) => s.value === sucursalActual)?.label ??
      sucursalActual
    : "";

  return (
    <>
      <div className="contenedor-tabla-gestion no-scroll-x">
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
                  ÚLT. EXPORT. EXCEL
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
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        aria-label="Disminuir stock"
                        onClick={() => ajustarStockUnidad(item.id, item.stock, -1)}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={stocksEditados[item.id] ?? ""}
                        onChange={(e) =>
                          handleCambioStock(item.id, e.target.value)
                        }
                        className="h-6 w-16 text-center text-sm font-normal"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        aria-label="Aumentar stock"
                        onClick={() => ajustarStockUnidad(item.id, item.stock, 1)}
                      >
                        +
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums">
                    {fmtFecha(exportaciones[item.id] ?? item.ultimaExportacionExcel)}
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

