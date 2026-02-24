"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, X, Download } from "lucide-react";
import type { ControlAumentosData, ItemAumento } from "@/actions/tienda";

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

function fmtPct(n: number): string {
  const abs = Math.abs(n).toFixed(1);
  if (n > 0.5)  return `+${abs}%`;
  if (n < -0.5) return `-${abs}%`;
  return "≈0%";
}

function ColorPct({ pct, size = "sm" }: { pct: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "text-lg font-bold tabular-nums" : "text-xs font-semibold tabular-nums";
  if (pct > 0.5)  return <span className={`${cls} text-red-500`}>{fmtPct(pct)}</span>;
  if (pct < -0.5) return <span className={`${cls} text-emerald-500`}>{fmtPct(pct)}</span>;
  return <span className={`${cls} text-white/50`}>≈0%</span>;
}

function IconTendencia({ pct }: { pct: number }) {
  if (pct > 0.5)  return <TrendingUp  className="h-3.5 w-3.5 text-red-500 shrink-0" />;
  if (pct < -0.5) return <TrendingDown className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  return <Minus className="h-3.5 w-3.5 text-white/40 shrink-0" />;
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
    <div className="flex flex-col min-h-0 rounded-lg overflow-hidden border" style={{ borderColor: "rgba(0,114,187,0.25)" }}>
      {/* Cabecera estilo tabla */}
      <div className="shrink-0 bg-brand px-3 py-2">
        <h3 className="text-xs font-semibold text-brand-fg uppercase tracking-wider text-center">
          {titulo}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {grupos.length === 0 && (
          <p className="text-xs text-white/50 text-center py-6">Sin datos</p>
        )}
        {grupos.map((g) => {
          const pct    = promedio(g.items);
          const activo = seleccionado === g.nombre;
          return (
            <button
              key={g.nombre}
              onClick={() => onSeleccionar(g.nombre)}
              className={`tabla-row w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                activo ? "!bg-[rgba(0,114,187,0.18)] text-foreground" : "text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex items-center gap-0.5 shrink-0">
                  {pct > 0.5
                    ? <TrendingUp className="h-3 w-3 text-red-500" />
                    : pct < -0.5
                      ? <TrendingDown className="h-3 w-3 text-emerald-500" />
                      : null
                  }
                  <span className="text-[10px] text-white tabular-nums">{g.items.length}</span>
                </div>
                <span className="text-xs text-white truncate">{g.nombre}</span>
              </div>
              <ColorPct pct={pct} />
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
    ? conAumento.filter((i) =>
        i.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.codigoExterno.toLowerCase().includes(busqueda.toLowerCase())
      )
    : conAumento;

  return (
    <div className="flex-1 overflow-y-auto rounded-lg overflow-hidden border" style={{ borderColor: "rgba(0,114,187,0.25)" }}>
      {filtrados.length === 0 && (
        <p className="text-xs text-white/50 text-center py-6">Sin resultados</p>
      )}
      {filtrados.map((item) => (
        <div
          key={item.itemId}
          className="tabla-row flex items-center justify-between gap-3 px-3 py-2 transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <IconTendencia pct={item.pctAumento} />
            <span className="text-xs text-white truncate">{item.descripcion}</span>
          </div>
          <ColorPct pct={item.pctAumento} />
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function TablaAumentos({ data }: { data: ControlAumentosData }) {
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

  function agrupar(clave: "marca" | "rubro" | "subRubro"): GrupoFila[] {
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
  }

  const gruposMarca    = useMemo(() => agrupar("marca"),    [itemsFiltrados]);
  const gruposRubro    = useMemo(() => agrupar("rubro"),    [itemsFiltrados]);
  const gruposSubRubro = useMemo(() => agrupar("subRubro"), [itemsFiltrados]);

  const conAumento   = itemsFiltrados.filter((i) => Math.abs(i.pctAumento) > 0.5);
  const subiendo     = itemsFiltrados.filter((i) => i.pctAumento > 0.5).length;
  const bajando      = itemsFiltrados.filter((i) => i.pctAumento < -0.5).length;
  const pctGlobal    = promedio(itemsFiltrados);
  const hayFiltros   = filtroMarca || filtroRubro || filtroSubRubro;

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
        <div className="relative">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-52 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring pr-7"
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

        {/* Contador de productos con aumento */}
        <span className="text-xs text-white shrink-0">
          {conAumento.length.toLocaleString()} con variación
        </span>

        {/* Chips de filtros activos */}
        {hayFiltros && (
          <div className="flex items-center gap-2 flex-wrap">
            {filtroMarca && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                {filtroMarca}
                <button onClick={() => setFiltroMarca(null)}><X className="h-3 w-3" /></button>
              </span>
            )}
            {filtroRubro && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                {filtroRubro}
                <button onClick={() => setFiltroRubro(null)}><X className="h-3 w-3" /></button>
              </span>
            )}
            {filtroSubRubro && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                {filtroSubRubro}
                <button onClick={() => setFiltroSubRubro(null)}><X className="h-3 w-3" /></button>
              </span>
            )}
            <button
              onClick={limpiarFiltros}
              className="text-xs text-white/70 hover:text-white border border-white/20 rounded-full px-2.5 py-1 transition-colors"
            >
              Borrar filtros
            </button>
          </div>
        )}

        {/* Exportar + Stats — empujados a la derecha */}
        <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => exportarXLS(itemsFiltrados.filter((i) => Math.abs(i.pctAumento) > 0.5))}
          className="flex items-center gap-1.5 text-xs border border-white/20 rounded-md px-3 py-1.5 text-white/70 hover:text-white hover:border-white/40 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar .xls
        </button>
        <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-card/50 px-4 py-2">
          <div className="text-center">
            <p className="text-[10px] text-white/60 uppercase tracking-wide">Promedio</p>
            <ColorPct pct={pctGlobal} size="lg" />
          </div>
          <div className="w-px h-7 bg-border/50" />
          <div className="text-center">
            <p className="text-[10px] text-white/60 uppercase tracking-wide">Subiendo</p>
            <p className="text-lg font-bold text-accent2 tabular-nums">{subiendo}</p>
          </div>
          <div className="w-px h-7 bg-border/50" />
          <div className="text-center">
            <p className="text-[10px] text-white/60 uppercase tracking-wide">Bajando</p>
            <p className="text-lg font-bold text-emerald-500 tabular-nums">{bajando}</p>
          </div>
          <div className="w-px h-7 bg-border/50" />
          <div className="text-center">
            <p className="text-[10px] text-white/60 uppercase tracking-wide">Total</p>
            <p className="text-lg font-bold text-brand tabular-nums">{itemsFiltrados.length}</p>
          </div>
        </div>
        </div>
      </div>

      {/* ── Layout: mitad superior (3 columnas) + mitad inferior (productos) ── */}
      <div className="flex flex-col gap-3 flex-1 min-h-0">

        {/* Marca | Rubro | Sub-Rubro */}
        <div className="grid grid-cols-3 gap-3" style={{ height: "36vh" }}>
          <ColumnaGrupo titulo="Marca"     grupos={gruposMarca}    seleccionado={filtroMarca}    onSeleccionar={handleMarca}    />
          <ColumnaGrupo titulo="Rubro"     grupos={gruposRubro}    seleccionado={filtroRubro}    onSeleccionar={handleRubro}    />
          <ColumnaGrupo titulo="Sub-Rubro" grupos={gruposSubRubro} seleccionado={filtroSubRubro} onSeleccionar={handleSubRubro} />
        </div>

        {/* Productos individuales */}
        <div className="flex flex-col min-h-0 rounded-lg overflow-hidden border" style={{ height: "36vh", borderColor: "rgba(0,114,187,0.25)" }}>
          <div className="shrink-0 bg-brand px-3 py-2">
            <h3 className="text-xs font-semibold text-brand-fg uppercase tracking-wider text-center">
              Productos con variación
            </h3>
          </div>
          <ListaProductos items={itemsFiltrados} busqueda={busqueda} />
        </div>

      </div>
    </div>
  );
}
