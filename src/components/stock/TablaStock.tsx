"use client";

import { useState, useImperativeHandle, forwardRef, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
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
import {
  TableEmptyState,
  tableEmptyStateContainerVariants,
  tableEmptyStateMessageVariants,
} from "@/components/shared/TableEmptyState";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import {
  formatDdMmHhMmArgentina,
  formatDdMmYyHhMmNombreArchivoArgentina,
} from "@/lib/fechaArgentina";

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
    const nombre = `Ajuste Stock ${formatDdMmYyHhMmNombreArchivoArgentina(new Date())}.xls`;
    XLSX.writeFile(libro, nombre, { bookType: "xls" });
  });
}

function fmtFecha(d: Date | null): string {
  if (!d) return "";
  return formatDdMmHhMmArgentina(new Date(d));
}

function getVariacionStock(
  stockOriginal: number,
  stockEditadoRaw: string | undefined
): { deltaAbs: string; sube: boolean } | null {
  if (stockEditadoRaw === undefined || stockEditadoRaw === "") return null;
  const stockEditado = Number(stockEditadoRaw);
  if (!Number.isFinite(stockEditado)) return null;
  const delta = stockEditado - stockOriginal;
  if (delta === 0) return null;
  return {
    deltaAbs: Math.abs(delta).toLocaleString("es-AR", {
      minimumFractionDigits: Number.isInteger(delta) ? 0 : 2,
      maximumFractionDigits: 2,
    }),
    sube: delta > 0,
  };
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
    qActual: _qActual,
    marcaActual: _marcaActual,
    rubroActual: _rubroActual,
    soloNegativoActual: _soloNegativoActual,
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

  const idsKey = data.items.map((i) => i.id).join("|");

  useEffect(() => {
    if (data.items.length === 0) return;
    queueMicrotask(() => {
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `idsKey` acota cambios al conjunto de filas
  }, [idsKey]);

  useEffect(() => {
    if (data.items.length === 0) return;
    queueMicrotask(() => {
      setExportaciones((prev) => {
        let hasNew = false;
        const next = { ...prev };
        for (const i of data.items) {
          if (i.ultimaExportacionExcel && next[i.id] === undefined) {
            hasNew = true;
            next[i.id] = new Date(i.ultimaExportacionExcel);
          }
        }
        return hasNew ? next : prev;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `idsKey` acota cambios al conjunto de filas
  }, [idsKey]);

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

  const handleImprimir = useCallback(async () => {
    setImprimiendo(true);
    // Imprimir no registra fecha en DB (solo abre la vista de impresión).
  }, []);

  const handleImprimirRef = useRef(handleImprimir);
  useEffect(() => {
    handleImprimirRef.current = handleImprimir;
  }, [handleImprimir]);

  const stocksEditadosRef = useRef(stocksEditados);
  useEffect(() => {
    stocksEditadosRef.current = stocksEditados;
  }, [stocksEditados]);

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
          <TableEmptyState
            placement="blockedPanel"
            textSize="sm"
            maxWidth="full"
            message="Seleccioná una sucursal para ver el stock."
          />
        ) : (
          <Table variant="compact">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3 py-2 text-xs w-[50%]">
                  DESCRIPCIÓN
                </TableHead>
                <TableHead className="px-3 py-2 text-xs w-[20%]">
                  STOCK
                </TableHead>
                <TableHead className="px-3 py-2 text-xs w-[10%]">
                  VARIACIÓN
                </TableHead>
                <TableHead className="px-3 py-2 text-xs w-[20%]">
                  ÚLT. EXPORT. EXCEL
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className={cn(
                      tableEmptyStateContainerVariants({
                        placement: "tableCellTall",
                        textSize: "xs",
                      })
                    )}
                  >
                    <span
                      className={tableEmptyStateMessageVariants({
                        maxWidth: "full",
                      })}
                    >
                      Sin resultados
                    </span>
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-3 py-2 text-xs w-[50%] min-w-0 overflow-hidden">
                    {item.descripcion}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums w-[20%]">
                    <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
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
                        className="h-6 w-16 self-center text-center text-sm font-normal"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                        aria-label="Aumentar stock"
                        onClick={() => ajustarStockUnidad(item.id, item.stock, 1)}
                      >
                        +
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums w-[10%]">
                    {(() => {
                      const variacion = getVariacionStock(item.stock, stocksEditados[item.id]);
                      if (!variacion) return "";
                      return (
                        <div className="flex items-center justify-center gap-1">
                          {variacion.sube ? (
                            <ArrowUp className="h-3.5 w-3.5 text-primary" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-destructive" aria-hidden />
                          )}
                          <span className="text-foreground">{variacion.deltaAbs}</span>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums w-[20%]">
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

