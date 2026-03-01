"use client";

import { useState, useMemo, useImperativeHandle, forwardRef, useRef, useEffect, useCallback } from "react";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  titulo, grupos, seleccionado, onSeleccionar,
}: {
  titulo: string;
  grupos: GrupoFila[];
  seleccionado: string | null;
  onSeleccionar: (nombre: string) => void;
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
          const pct    = promedio(g.items);
          const activo = seleccionado === g.nombre;
          const conVariacion = g.items.filter((i) => Math.abs(i.pctAumento) > 0.5).length;
          const zebra = idx % 2 === 1 ? "bg-blue-50/50" : "bg-white";
          return (
            <button
              key={g.nombre}
              onClick={() => onSeleccionar(g.nombre)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors border-b border-slate-100 hover:bg-blue-100/40 ${zebra} ${
                activo ? "!bg-blue-100/60" : ""
              }`}
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
            </button>
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

  function handleMarca(nombre: string) {
    setFiltroMarca((p) => p === nombre ? null : nombre);
    setFiltroRubro(null);
    setFiltroSubRubro(null);
  }
  function handleRubro(nombre: string) {
    setFiltroRubro((p) => p === nombre ? null : nombre);
    setFiltroSubRubro(null);
  }
  function handleSubRubro(nombre: string) {
    setFiltroSubRubro((p) => p === nombre ? null : nombre);
  }
  function limpiarFiltros() {
    setFiltroMarca(null);
    setFiltroRubro(null);
    setFiltroSubRubro(null);
    setBusqueda("");
  }

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Barra superior: busqueda | chips de filtros | stats ── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Buscador de productos */}
        <div className="relative flex-1 min-w-0">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring pr-7"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Contador de productos con aumento (acento del tema) */}
        <span className="text-xs text-accent2 font-medium shrink-0">
          {conAumento.length.toLocaleString()} con variación
        </span>

        {/* Chips de filtros activos */}
        {hayFiltros && (
          <div className="flex items-center gap-2 flex-wrap">
            {filtroMarca && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                {filtroMarca}
                <Button variant="ghost" size="icon-xs" onClick={() => setFiltroMarca(null)} className="h-5 w-5 shrink-0 rounded-full"><X className="h-3 w-3" /></Button>
              </span>
            )}
            {filtroRubro && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                {filtroRubro}
                <Button variant="ghost" size="icon-xs" onClick={() => setFiltroRubro(null)} className="h-5 w-5 shrink-0 rounded-full"><X className="h-3 w-3" /></Button>
              </span>
            )}
            {filtroSubRubro && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                {filtroSubRubro}
                <Button variant="ghost" size="icon-xs" onClick={() => setFiltroSubRubro(null)} className="h-5 w-5 shrink-0 rounded-full"><X className="h-3 w-3" /></Button>
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={limpiarFiltros}
              className="text-xs rounded-full border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Borrar filtros
            </Button>
          </div>
        )}

        {/* Stats (Exportar se muestra en el header de la página) */}
        <div className="ml-auto flex items-center gap-3" />
      </div>

      {/* ── Layout: mitad superior (3 columnas) + mitad inferior (productos) ── */}
      <div className="flex flex-col gap-3 flex-1 min-h-0">

        {/* Marca | Rubro | Sub-Rubro */}
        <div className="grid grid-cols-3 gap-3" style={{ height: "36vh" }}>
          <ColumnaGrupo titulo="Marca"     grupos={gruposMarca}    seleccionado={filtroMarca}    onSeleccionar={handleMarca}    />
          <ColumnaGrupo titulo="Rubro"     grupos={gruposRubro}    seleccionado={filtroRubro}    onSeleccionar={handleRubro}    />
          <ColumnaGrupo titulo="Sub-Rubro" grupos={gruposSubRubro} seleccionado={filtroSubRubro} onSeleccionar={handleSubRubro} />
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
