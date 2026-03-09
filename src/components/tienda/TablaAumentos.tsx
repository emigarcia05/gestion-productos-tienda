"use client";

import { useState, useMemo, useImperativeHandle, forwardRef, useRef, useEffect, useCallback } from "react";
import { ArrowUp, ArrowDown, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
  FilterRowSelection,
  FilterRowSearch,
  FILTER_SELECT_WRAPPER_CLASS,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import { Separator } from "@/components/ui/separator";
import type { ControlAumentosData, ItemAumento } from "@/actions/tienda";
import { fmtPct } from "@/lib/format";
import { matchByMultiTerm } from "@/lib/busqueda";

function exportarXLS(items: ItemAumento[]) {
  import("xlsx").then((XLSX) => {
    const filas = items.map((i) => ({
      "CODIGO":           i.codItem,
      "CODIGO EXTERNO":   i.codigoExterno,
      "PROVEEDOR":        i.proveedorDux ?? "",
      "COSTO":            parseFloat(i.costoTienda.toFixed(2)),
    }));

    const hoja   = XLSX.utils.json_to_sheet(filas);
    const libro  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Control de Aumentos");

    // Ancho de columnas
    hoja["!cols"] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 30 },
      { wch: 12 },
    ];

    const ahora   = new Date();
    const dd      = String(ahora.getDate()).padStart(2, "0");
    const mm      = String(ahora.getMonth() + 1).padStart(2, "0");
    const aa      = String(ahora.getFullYear()).slice(-2);
    const hh      = String(ahora.getHours()).padStart(2, "0");
    const min     = String(ahora.getMinutes()).padStart(2, "0");
    const nombre  = `Act Px Compra ${dd}-${mm}-${aa} ${hh}:${min}.xls`;

    XLSX.writeFile(libro, nombre, { bookType: "xls" });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function ColorPct({ pct, size = "sm" }: { pct: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "text-lg font-bold tabular-nums" : "text-xs font-semibold tabular-nums";
  if (pct > 0.5)  return <span className={`${cls} text-red-600`}>{fmtPct(pct)}</span>;
  if (pct < -0.5) return <span className={`${cls} text-emerald-600`}>{fmtPct(pct)}</span>;
  return <span className={`${cls} text-slate-500`}>≈0%</span>;
}

function IconTendencia({ pct }: { pct: number }) {
  if (pct > 0.5)  return <ArrowUp   className="h-3.5 w-3.5 text-red-500 shrink-0" />;
  if (pct < -0.5) return <ArrowDown className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  return null;
}

function promedio(items: ItemAumento[]) {
  if (!items.length) return 0;
  return items.reduce((s, i) => s + i.pctAumento, 0) / items.length;
}

// ─── Columna de grupo (Marca / Rubro / Sub-Rubro) ─────────────────────────

interface GrupoFila {
  nombre: string;
  items:  ItemAumento[];
}

function ColumnaGrupo({
  titulo,
  grupos,
}: {
  titulo: string;
  grupos: GrupoFila[];
}) {
  return (
    <div className="flex flex-col min-h-0 rounded-lg overflow-hidden border border-slate-200 bg-white">
      {/* Cabecera estilo tabla global (color primario, texto blanco) */}
      <div className="shrink-0 bg-primary px-3 py-2">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider text-center">
          {titulo}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {grupos.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Sin datos</p>
        )}
        {grupos.map((g, idx) => {
          const pct = promedio(g.items);
          const conVariacion = g.items.filter((i) => Math.abs(i.pctAumento) > 0.5).length;
          const zebra = idx % 2 === 1 ? "bg-blue-50/50" : "bg-white";
          return (
            <div
              key={g.nombre}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left border-b border-slate-100 ${zebra}`}
            >
              <span className="text-xs text-slate-900 truncate">
                {g.nombre}
                <span className="text-slate-500 ml-1">({conVariacion})</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <ColorPct pct={pct} />
                {pct > 0.5
                  ? <ArrowUp   className="h-3 w-3 text-red-500" />
                  : pct < -0.5
                    ? <ArrowDown className="h-3 w-3 text-emerald-500" />
                    : null
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lista de productos individuales ──────────────────────────────────────

function ListaProductos({ items, busqueda }: { items: ItemAumento[]; busqueda: string }) {
  // Solo productos con aumento significativo (> ±0.5%)
  const conAumento = items.filter((i) => Math.abs(i.pctAumento) > 0.5);

  const filtrados = busqueda.trim()
    ? conAumento.filter((i) => matchByMultiTerm([i.descripcion, i.codigoExterno], busqueda))
    : conAumento;

  return (
    <div className="flex-1 overflow-y-auto rounded-b-lg border border-t-0 border-slate-200 bg-white">
      {filtrados.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-6">Sin resultados</p>
      )}
      {filtrados.map((item, idx) => (
        <div
          key={item.itemId}
          className={`flex items-center justify-between gap-3 px-3 py-2 transition-colors border-b border-slate-100 hover:bg-blue-100/40 ${idx % 2 === 1 ? "bg-blue-50/50" : "bg-white"}`}
        >
          <span className="text-xs text-slate-900 truncate">{item.descripcion}</span>
          <div className="flex items-center gap-1 shrink-0">
            <ColorPct pct={item.pctAumento} />
            <IconTendencia pct={item.pctAumento} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export interface TablaAumentosHandle {
  triggerExport: () => void;
}

const TablaAumentos = forwardRef<TablaAumentosHandle, { data: ControlAumentosData }>(function TablaAumentos({ data }, ref) {
  const [filtroMarca,    setFiltroMarca]    = useState<string | null>(null);
  const [filtroRubro,    setFiltroRubro]    = useState<string | null>(null);
  const [filtroSubRubro, setFiltroSubRubro] = useState<string | null>(null);
  const [busqueda,       setBusqueda]       = useState("");

  const itemsFiltrados = useMemo(() => {
    return data.individual.filter((i) => {
      if (filtroMarca    && (i.marca    ?? "Sin definir") !== filtroMarca)    return false;
      if (filtroRubro    && (i.rubro    ?? "Sin definir") !== filtroRubro)    return false;
      if (filtroSubRubro && (i.subRubro ?? "Sin definir") !== filtroSubRubro) return false;
      return true;
    });
  }, [data.individual, filtroMarca, filtroRubro, filtroSubRubro]);

  // Opciones de cada desplegable según lo seleccionado en los demás (intersección)
  const marcasOptions = useMemo(() => {
    const base = data.individual.filter((i) => {
      if (filtroRubro    && (i.rubro    ?? "Sin definir") !== filtroRubro)    return false;
      if (filtroSubRubro && (i.subRubro ?? "Sin definir") !== filtroSubRubro) return false;
      return true;
    });
    return Array.from(new Set(base.map((i) => i.marca ?? "Sin definir"))).sort();
  }, [data.individual, filtroRubro, filtroSubRubro]);

  const rubrosOptions = useMemo(() => {
    const base = data.individual.filter((i) => {
      if (filtroMarca    && (i.marca    ?? "Sin definir") !== filtroMarca)    return false;
      if (filtroSubRubro && (i.subRubro ?? "Sin definir") !== filtroSubRubro) return false;
      return true;
    });
    return Array.from(new Set(base.map((i) => i.rubro ?? "Sin definir"))).sort();
  }, [data.individual, filtroMarca, filtroSubRubro]);

  const subRubrosOptions = useMemo(() => {
    const base = data.individual.filter((i) => {
      if (filtroMarca && (i.marca ?? "Sin definir") !== filtroMarca) return false;
      if (filtroRubro && (i.rubro ?? "Sin definir") !== filtroRubro) return false;
      return true;
    });
    return Array.from(new Set(base.map((i) => i.subRubro ?? "Sin definir"))).sort();
  }, [data.individual, filtroMarca, filtroRubro]);

  const agrupar = useCallback((clave: "marca" | "rubro" | "subRubro"): GrupoFila[] => {
    const mapa = new Map<string, ItemAumento[]>();
    for (const item of itemsFiltrados) {
      const k = item[clave] ?? "Sin definir";
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k)!.push(item);
    }
    return Array.from(mapa.entries())
      .map(([nombre, items]) => ({ nombre, items }))
      // Solo mostrar grupos que tengan al menos un producto con variación real
      .filter(({ items }) => items.some((i) => Math.abs(i.pctAumento) > 0.5))
      .sort((a, b) => promedio(b.items) - promedio(a.items));
  }, [itemsFiltrados]);

  const gruposMarca    = useMemo(() => agrupar("marca"),    [agrupar]);
  const gruposRubro    = useMemo(() => agrupar("rubro"),    [agrupar]);
  const gruposSubRubro = useMemo(() => agrupar("subRubro"), [agrupar]);

  const conAumento   = itemsFiltrados.filter((i) => Math.abs(i.pctAumento) > 0.5);
  const hayFiltros   = filtroMarca || filtroRubro || filtroSubRubro;

  const conAumentoRef = useRef(conAumento);
  useEffect(() => {
    conAumentoRef.current = conAumento;
  }, [conAumento]);
  useImperativeHandle(ref, () => ({
    triggerExport() {
      exportarXLS(conAumentoRef.current);
    },
  }), []);

  function limpiarFiltros() {
    setFiltroMarca(null);
    setFiltroRubro(null);
    setFiltroSubRubro(null);
    setBusqueda("");
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <FilterBar className="filtros-contenedor-tienda bg-card">
        <FilterRowSelection>
          <div className="fila-filtros-5 grid grid-cols-5 gap-3 w-full">
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={filtroMarca ?? "none"}
                onValueChange={(v) => {
                  setFiltroMarca(v === "none" ? null : v);
                  setFiltroRubro(null);
                  setFiltroSubRubro(null);
                }}
              >
                <SelectTrigger id="filtro-aumentos-marca" className="input-filtro-unificado">
                  <SelectValue placeholder="MARCA" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                  <SelectItem value="none">MARCA</SelectItem>
                  {marcasOptions.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={filtroRubro ?? "none"}
                onValueChange={(v) => {
                  setFiltroRubro(v === "none" ? null : v);
                  setFiltroSubRubro(null);
                }}
              >
                <SelectTrigger id="filtro-aumentos-rubro" className="input-filtro-unificado">
                  <SelectValue placeholder="RUBRO" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                  <SelectItem value="none">RUBRO</SelectItem>
                  {rubrosOptions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={filtroSubRubro ?? "none"}
                onValueChange={(v) => setFiltroSubRubro(v === "none" ? null : v)}
              >
                <SelectTrigger id="filtro-aumentos-subrubro" className="input-filtro-unificado">
                  <SelectValue placeholder="SUB-RUBRO" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                  <SelectItem value="none">SUB-RUBRO</SelectItem>
                  {subRubrosOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FilterRowSelection>
        <div className="flex items-center gap-3">
          <FilterRowSearch className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary pointer-events-none" />
              <Input
                id="filtro-aumentos-busqueda"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por descripción o código..."
                className="input-filtro-unificado pl-9 pr-8"
              />
              {busqueda && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </FilterRowSearch>
          <LimpiarFiltrosButton visible={!!hayFiltros || !!busqueda} onClick={limpiarFiltros} />
          <span className={`${FILTER_COUNT_CLASS} ml-auto`}>
            {conAumento.length.toLocaleString()} con variación
          </span>
        </div>
      </FilterBar>

      <Separator className="bg-slate-200/60" />

      {/* ── Layout: mitad superior (3 columnas) + mitad inferior (productos) ── */}
      <div className="flex flex-col gap-3 flex-1 min-h-0">

        {/* Marca | Rubro | Sub-Rubro */}
        <div className="grid grid-cols-3 gap-3" style={{ height: "36vh" }}>
          <ColumnaGrupo titulo="Marca"     grupos={gruposMarca}    />
          <ColumnaGrupo titulo="Rubro"     grupos={gruposRubro}    />
          <ColumnaGrupo titulo="Sub-Rubro" grupos={gruposSubRubro} />
        </div>

        {/* Productos individuales (cabecera estándar, color primario) */}
        <div className="flex flex-col min-h-0 rounded-lg overflow-hidden border border-slate-200 bg-white" style={{ height: "36vh" }}>
          <div className="shrink-0 bg-primary px-3 py-2">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider text-center">
              Productos con variación
            </h3>
          </div>
          <ListaProductos items={itemsFiltrados} busqueda={busqueda} />
        </div>

      </div>
    </div>
  );
});

export default TablaAumentos;
