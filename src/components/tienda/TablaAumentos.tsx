"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import type { ControlAumentosData, ItemAumento } from "@/actions/tienda";

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
  return <span className={`${cls} text-muted-foreground`}>≈0%</span>;
}

function IconTendencia({ pct }: { pct: number }) {
  if (pct > 0.5)  return <TrendingUp  className="h-3.5 w-3.5 text-red-500 shrink-0" />;
  if (pct < -0.5) return <TrendingDown className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
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
  seleccionado,
  onSeleccionar,
}: {
  titulo: string;
  grupos: GrupoFila[];
  seleccionado: string | null;
  onSeleccionar: (nombre: string) => void;
}) {
  return (
    <div className="flex flex-col min-h-0">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {titulo}
      </h3>
      <div className="flex-1 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30">
        {grupos.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Sin datos</p>
        )}
        {grupos.map((g) => {
          const pct      = promedio(g.items);
          const activo   = seleccionado === g.nombre;
          return (
            <button
              key={g.nombre}
              onClick={() => onSeleccionar(g.nombre)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                activo
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted/30 text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <IconTendencia pct={pct} />
                <span className="text-xs truncate">{g.nombre}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground tabular-nums">{g.items.length}</span>
                <ColorPct pct={pct} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lista de productos individuales ──────────────────────────────────────

function ListaProductos({ items, busqueda, onBusqueda }: {
  items: ItemAumento[];
  busqueda: string;
  onBusqueda: (v: string) => void;
}) {
  const filtrados = busqueda.trim()
    ? items.filter((i) =>
        i.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.codigoExterno.toLowerCase().includes(busqueda.toLowerCase())
      )
    : items;

  return (
    <div className="flex flex-col min-h-0 gap-2">
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Productos
        </h3>
        <div className="relative flex-1 max-w-xs">
          <input
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {busqueda && (
            <button
              onClick={() => onBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {filtrados.length.toLocaleString()} producto{filtrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30">
        {filtrados.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Sin resultados</p>
        )}
        {filtrados.map((item) => (
          <div
            key={item.itemId}
            className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <IconTendencia pct={item.pctAumento} />
              <span className="text-xs truncate">{item.descripcion}</span>
            </div>
            <ColorPct pct={item.pctAumento} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function TablaAumentos({ data }: { data: ControlAumentosData }) {
  const [filtroMarca,    setFiltroMarca]    = useState<string | null>(null);
  const [filtroRubro,    setFiltroRubro]    = useState<string | null>(null);
  const [filtroSubRubro, setFiltroSubRubro] = useState<string | null>(null);
  const [busqueda,       setBusqueda]       = useState("");

  // Aplicar filtros activos sobre la lista completa
  const itemsFiltrados = useMemo(() => {
    return data.individual.filter((i) => {
      if (filtroMarca    && (i.marca    ?? "Sin definir") !== filtroMarca)    return false;
      if (filtroRubro    && (i.rubro    ?? "Sin definir") !== filtroRubro)    return false;
      if (filtroSubRubro && (i.subRubro ?? "Sin definir") !== filtroSubRubro) return false;
      return true;
    });
  }, [data.individual, filtroMarca, filtroRubro, filtroSubRubro]);

  // Recalcular grupos según los items filtrados
  function agrupar(clave: "marca" | "rubro" | "subRubro"): GrupoFila[] {
    const mapa = new Map<string, ItemAumento[]>();
    for (const item of itemsFiltrados) {
      const k = item[clave] ?? "Sin definir";
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k)!.push(item);
    }
    return Array.from(mapa.entries())
      .map(([nombre, items]) => ({ nombre, items }))
      .sort((a, b) => promedio(b.items) - promedio(a.items));
  }

  const gruposMarca    = useMemo(() => agrupar("marca"),    [itemsFiltrados]);
  const gruposRubro    = useMemo(() => agrupar("rubro"),    [itemsFiltrados]);
  const gruposSubRubro = useMemo(() => agrupar("subRubro"), [itemsFiltrados]);

  // Stats del conjunto filtrado
  const subiendo = itemsFiltrados.filter((i) => i.pctAumento > 0.5).length;
  const bajando  = itemsFiltrados.filter((i) => i.pctAumento < -0.5).length;
  const pctGlobal = promedio(itemsFiltrados);

  const hayFiltros = filtroMarca || filtroRubro || filtroSubRubro;

  function handleMarca(nombre: string) {
    setFiltroMarca((prev) => prev === nombre ? null : nombre);
    setFiltroRubro(null);
    setFiltroSubRubro(null);
  }
  function handleRubro(nombre: string) {
    setFiltroRubro((prev) => prev === nombre ? null : nombre);
    setFiltroSubRubro(null);
  }
  function handleSubRubro(nombre: string) {
    setFiltroSubRubro((prev) => prev === nombre ? null : nombre);
  }
  function limpiarFiltros() {
    setFiltroMarca(null);
    setFiltroRubro(null);
    setFiltroSubRubro(null);
    setBusqueda("");
  }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Barra de stats + filtros activos */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-6 rounded-lg border border-border/50 bg-card/50 px-4 py-2.5">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Promedio</p>
            <ColorPct pct={pctGlobal} size="lg" />
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Subiendo</p>
            <p className="text-lg font-bold text-red-500 tabular-nums">{subiendo}</p>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Bajando</p>
            <p className="text-lg font-bold text-emerald-500 tabular-nums">{bajando}</p>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-lg font-bold tabular-nums">{itemsFiltrados.length}</p>
          </div>
        </div>

        {/* Filtros activos como chips */}
        {hayFiltros && (
          <div className="flex items-center gap-2 flex-wrap">
            {filtroMarca && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                Marca: {filtroMarca}
                <button onClick={() => setFiltroMarca(null)}><X className="h-3 w-3" /></button>
              </span>
            )}
            {filtroRubro && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                Rubro: {filtroRubro}
                <button onClick={() => setFiltroRubro(null)}><X className="h-3 w-3" /></button>
              </span>
            )}
            {filtroSubRubro && (
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                Sub-Rubro: {filtroSubRubro}
                <button onClick={() => setFiltroSubRubro(null)}><X className="h-3 w-3" /></button>
              </span>
            )}
            <button
              onClick={limpiarFiltros}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Layout principal: mitad superior (3 columnas) + mitad inferior (productos) */}
      <div className="flex flex-col gap-4 flex-1 min-h-0">

        {/* Mitad superior: Marca | Rubro | Sub-Rubro */}
        <div className="grid grid-cols-3 gap-4" style={{ height: "38vh" }}>
          <ColumnaGrupo
            titulo="Marca"
            grupos={gruposMarca}
            seleccionado={filtroMarca}
            onSeleccionar={handleMarca}
          />
          <ColumnaGrupo
            titulo="Rubro"
            grupos={gruposRubro}
            seleccionado={filtroRubro}
            onSeleccionar={handleRubro}
          />
          <ColumnaGrupo
            titulo="Sub-Rubro"
            grupos={gruposSubRubro}
            seleccionado={filtroSubRubro}
            onSeleccionar={handleSubRubro}
          />
        </div>

        {/* Mitad inferior: productos individuales */}
        <div className="flex flex-col min-h-0" style={{ height: "38vh" }}>
          <ListaProductos
            items={itemsFiltrados}
            busqueda={busqueda}
            onBusqueda={setBusqueda}
          />
        </div>

      </div>
    </div>
  );
}
