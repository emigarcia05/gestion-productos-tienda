"use client";

import { useState, useMemo, useImperativeHandle, forwardRef, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ControlStockData, Sucursal } from "@/actions/stock";
import { registrarImpresion } from "@/actions/stock";
import PrintStock from "./PrintStock";

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
  sucursalActual: Sucursal;
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

  function navigate(params: Record<string, string>) {
    const p = new URLSearchParams();
    p.set("sucursal", sucursalActual);
    if (params.q        ?? q)        p.set("q",        params.q        ?? q);
    if (params.marca    ?? marca)    p.set("marca",    params.marca    ?? marca);
    if (params.rubro    ?? rubro)    p.set("rubro",    params.rubro    ?? rubro);
    if (params.subRubro ?? subRubro) p.set("subRubro", params.subRubro ?? subRubro);
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
    router.push(`${pathname}?sucursal=${sucursalActual}`);
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

  const filtrados = useMemo(() => {
    return data.items.filter((i) => {
      if (q        && !i.descripcion.toLowerCase().includes(q.toLowerCase()) &&
                      !i.codItem.toLowerCase().includes(q.toLowerCase())) return false;
      if (marca    && i.marca    !== marca)    return false;
      if (rubro    && i.rubro    !== rubro)    return false;
      if (subRubro && i.subRubro !== subRubro) return false;
      if (soloNegativo && i.stock >= 0)        return false;
      return true;
    });
  }, [data.items, q, marca, rubro, subRubro, soloNegativo]);

  const handleImprimirRef = useRef(handleImprimir);
  handleImprimirRef.current = handleImprimir;
  useImperativeHandle(ref, () => ({ openPrint: () => handleImprimirRef.current() }), []);

  const hayFiltros = !!(q || marca || rubro || subRubro || soloNegativo);
  const sucursalLabel = SUCURSALES.find((s) => s.value === sucursalActual)?.label ?? sucursalActual;

  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── Barra de filtros ── */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">

        {/* Selector de sucursal */}
        <div className="relative shrink-0">
          <select
            value={sucursalActual}
            onChange={(e) => cambiarSucursal(e.target.value as Sucursal)}
            className="appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm font-semibold text-accent2 focus:outline-none focus:ring-1 focus:ring-ring"
          >
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
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring pr-7"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Marca */}
        <div className="relative shrink-0">
          <select
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            className="appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Todas las marcas</option>
            {data.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Rubro */}
        <div className="relative shrink-0">
          <select
            value={rubro}
            onChange={(e) => setRubro(e.target.value)}
            className="appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Todos los rubros</option>
            {data.rubros.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Sub-Rubro */}
        <div className="relative shrink-0">
          <select
            value={subRubro}
            onChange={(e) => setSubRubro(e.target.value)}
            className="appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Todos los sub-rubros</option>
            {data.subRubros.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Stock */}
        <div className="relative shrink-0">
          <select
            value={soloNegativo ? "negativo" : "todos"}
            onChange={(e) => setSoloNegativo(e.target.value === "negativo")}
            className="appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
      <div className="flex-1 overflow-auto rounded-lg border" style={{ borderColor: "rgba(0,114,187,0.25)" }}>
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-brand text-brand-fg">
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider w-28">Código</th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider">Descripción</th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider w-28">
                Stock {sucursalLabel}
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider w-28">Últ. impresión</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-xs text-white/50 py-10">Sin resultados</td>
              </tr>
            )}
            {filtrados.map((item, idx) => (
              <tr
                key={item.id}
                className={`tabla-row transition-colors ${idx % 2 === 0 ? "" : "bg-white/[0.02]"}`}
              >
                <td className="px-3 py-2 text-xs text-white/70 font-mono">{item.codItem}</td>
                <td className="px-3 py-2 text-xs text-white">{item.descripcion}</td>
                <td className="px-3 py-2 text-sm text-right font-semibold tabular-nums text-white">
                  {item.stock % 1 === 0 ? item.stock.toFixed(0) : item.stock.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-xs text-center text-white/50 tabular-nums">
                  {fmtFecha(impresiones[item.id] ?? item.ultimaImpresion)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
