"use client";

import { useState, useMemo, useImperativeHandle, forwardRef, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { matchByMultiTerm } from "@/lib/busqueda";
import PrintStock from "./PrintStock";

function distinctStrings(items: ItemStock[], getVal: (i: ItemStock) => string | null): string[] {
  const set = new Set<string>();
  for (const i of items) {
    const v = getVal(i);
    if (v != null && v.trim() !== "") set.add(v);
  }
  return Array.from(set).sort();
}

function fmtFecha(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    day:   "2-digit",
    month: "2-digit",
    year:  "2-digit",
  });
}

export interface TablaStockHandle {
  openPrint: () => void;
}

interface Props {
  data:           ControlStockData;
  sucursalActual: Sucursal | null;
  qActual:        string;
  marcaActual:    string;
  rubroActual:    string;
  subRubroActual: string;
}

const SUCURSALES: { value: Sucursal; label: string }[] = [
  { value: "guaymallen", label: "Guaymallén" },
  { value: "maipu",      label: "Maipú" },
];

const TablaStock = forwardRef<TablaStockHandle, Props>(function TablaStock({
  data, sucursalActual, qActual, marcaActual, rubroActual, subRubroActual,
}, ref) {
  const pathname = usePathname();
  const router   = useRouter();

  const [q,            setQ]            = useState(qActual);
  const [marca,        setMarca]        = useState(marcaActual);
  const [rubro,        setRubro]        = useState(rubroActual);
  const [subRubro,     setSubRubro]     = useState(subRubroActual);
  const [soloNegativo,     setSoloNegativo]     = useState(false);
  const [imprimiendo,      setImprimiendo]      = useState(false);
  // Mapa local id → ultimaImpresion para reflejar el registro sin recargar
  const [impresiones, setImpresiones] = useState<Record<string, Date>>(() => {
    const m: Record<string, Date> = {};
    for (const i of data.items) if (i.ultimaImpresion) m[i.id] = new Date(i.ultimaImpresion);
    return m;
  });
  const [stocksEditados, setStocksEditados] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const i of data.items) {
      const valor = Number.isInteger(i.stock) ? i.stock.toFixed(0) : i.stock.toFixed(2);
      m[i.id] = valor;
    }
    return m;
  });

  useEffect(() => {
    setMarca(marcaActual);
    setRubro(rubroActual);
    setSubRubro(subRubroActual);
  }, [marcaActual, rubroActual, subRubroActual]);

  // Cuando pasamos de sin sucursal a con sucursal, rellenar stocksEditados desde data
  useEffect(() => {
    if (data.items.length === 0) return;
    setStocksEditados((prev) => {
      let hasNew = false;
      const next = { ...prev };
      for (const i of data.items) {
        if (next[i.id] === undefined) {
          hasNew = true;
          next[i.id] = Number.isInteger(i.stock) ? i.stock.toFixed(0) : i.stock.toFixed(2);
        }
      }
      return hasNew ? next : prev;
    });
  }, [data.items.length]);

  function navigate(params: Record<string, string>) {
    const p = new URLSearchParams();
    if (sucursalActual) p.set("sucursal", sucursalActual);
    const qVal = params.q !== undefined ? params.q : q;
    const marcaVal = params.marca !== undefined ? params.marca : marca;
    const rubroVal = params.rubro !== undefined ? params.rubro : rubro;
    const subRubroVal = params.subRubro !== undefined ? params.subRubro : subRubro;
    if (qVal) p.set("q", qVal);
    if (marcaVal) p.set("marca", marcaVal);
    if (rubroVal) p.set("rubro", rubroVal);
    if (subRubroVal) p.set("subRubro", subRubroVal);
    router.push(`${pathname}?${p.toString()}`);
  }

  function cambiarSucursal(s: Sucursal) {
    const p = new URLSearchParams();
    p.set("sucursal", s);
    if (q)        p.set("q",        q);
    if (marca)    p.set("marca",    marca);
    if (rubro)    p.set("rubro",    rubro);
    if (subRubro) p.set("subRubro", subRubro);
    router.push(`${pathname}?${p.toString()}`);
  }

  function limpiar() {
    setQ(""); setMarca(""); setRubro(""); setSubRubro(""); setSoloNegativo(false);
    if (sucursalActual) {
      router.push(`${pathname}?sucursal=${sucursalActual}`);
    } else {
      router.push(pathname);
    }
  }

  function handleCambioStock(id: string, value: string) {
    setStocksEditados((prev) => ({ ...prev, [id]: value }));
  }

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

  const itemsPorMarca = useMemo(() => {
    if (!marca) return data.items;
    return data.items.filter((i) => i.marca === marca);
  }, [data.items, marca]);

  const itemsPorMarcaRubro = useMemo(() => {
    if (!rubro) return itemsPorMarca;
    return itemsPorMarca.filter((i) => i.rubro === rubro);
  }, [itemsPorMarca, rubro]);

  const opcionesRubros = useMemo(() => distinctStrings(itemsPorMarca, (i) => i.rubro), [itemsPorMarca]);
  const opcionesSubRubros = useMemo(() => distinctStrings(itemsPorMarcaRubro, (i) => i.subRubro), [itemsPorMarcaRubro]);

  const filtrados = data.items.filter((i) => {
    if (q.trim() && !matchByMultiTerm([i.descripcion, i.codItem], q)) return false;
    if (marca    && i.marca    !== marca)    return false;
    if (rubro    && i.rubro    !== rubro)    return false;
    if (subRubro && i.subRubro !== subRubro) return false;
    if (soloNegativo && i.stock >= 0)        return false;
    return true;
  });

  const handleImprimirRef = useRef(handleImprimir);
  useEffect(() => {
    handleImprimirRef.current = handleImprimir;
  }, [handleImprimir]);
  useImperativeHandle(ref, () => ({ openPrint: () => handleImprimirRef.current() }), []);

  const hayFiltros = !!(q || marca || rubro || subRubro || soloNegativo);
  const sucursalSeleccionada = sucursalActual !== null;
  const sucursalLabel = sucursalActual
    ? (SUCURSALES.find((s) => s.value === sucursalActual)?.label ?? sucursalActual)
    : "";

  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── Barra de filtros ── */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">

        {/* Selector de sucursal (obligatorio para ver datos) */}
        <div className="relative shrink-0">
          <select
            value={sucursalActual ?? ""}
            onChange={(e) => {
              const value = e.target.value as Sucursal | "";
              if (!value) {
                router.push(pathname);
              } else {
                cambiarSucursal(value);
              }
            }}
            className="appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm font-semibold text-accent2 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Seleccionar sucursal</option>
            {SUCURSALES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Buscador */}
        <div className="relative flex-1 min-w-[180px]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por descripción o código..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring pr-7 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!sucursalSeleccionada}
          />
          {q && (
            <Button variant="ghost" size="icon" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Marca */}
        <div className="relative shrink-0">
          <select
            value={marca}
            onChange={(e) => navigate({ marca: e.target.value, rubro: "", subRubro: "" })}
            className="appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!sucursalSeleccionada}
          >
            <option value="">Todas las marcas</option>
            {data.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Rubro (solo opciones de la marca seleccionada) */}
        <div className="relative shrink-0">
          <select
            value={rubro}
            onChange={(e) => navigate({ rubro: e.target.value, subRubro: "" })}
            className="appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!sucursalSeleccionada}
          >
            <option value="">Todos los rubros</option>
            {opcionesRubros.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Sub-Rubro (solo opciones de marca + rubro seleccionados) */}
        <div className="relative shrink-0">
          <select
            value={subRubro}
            onChange={(e) => navigate({ subRubro: e.target.value })}
            className="appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!sucursalSeleccionada}
          >
            <option value="">Todos los sub-rubros</option>
            {opcionesSubRubros.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Stock */}
        <div className="relative shrink-0">
          <select
            value={soloNegativo ? "negativo" : "todos"}
            onChange={(e) => setSoloNegativo(e.target.value === "negativo")}
            className="appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!sucursalSeleccionada}
          >
            <option value="todos">Todos</option>
            <option value="negativo">Stock negativo</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Limpiar */}
        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiar} className="gap-1.5 text-muted-foreground shrink-0">
            <X className="h-3.5 w-3.5" /> Limpiar
          </Button>
        )}

        {/* Contador (Imprimir se muestra en el header de la página) */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="text-xs text-accent2 whitespace-nowrap">
            {filtrados.length.toLocaleString()} ítem{filtrados.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Tabla ── */}
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
                <TableHead className="px-3 py-2 text-xs">Descripción</TableHead>
                <TableHead className="px-3 py-2 text-xs w-28">Stock {sucursalLabel}</TableHead>
                <TableHead className="px-3 py-2 text-xs w-28">Últ. impresión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-10">Sin resultados</TableCell>
                </TableRow>
              )}
              {filtrados.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-3 py-2 text-xs font-mono">{item.codItem}</TableCell>
                  <TableCell className="px-3 py-2 text-xs">{item.descripcion}</TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums">
                    <Input
                      type="number"
                      value={stocksEditados[item.id] ?? ""}
                      onChange={(e) => handleCambioStock(item.id, e.target.value)}
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

      {/* ── Modal de impresión ── */}
      {imprimiendo && (
        <PrintStock
          items={filtrados}
          sucursal={sucursalLabel}
          onClose={() => setImprimiendo(false)}
        />
      )}
    </div>
  );
});

export default TablaStock;
