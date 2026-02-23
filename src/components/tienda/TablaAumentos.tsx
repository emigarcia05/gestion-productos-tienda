"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ControlAumentosData, GrupoAumento, ItemAumento } from "@/actions/tienda";

type Vista = "marca" | "rubro" | "subRubro" | "individual";

const TABS: { id: Vista; label: string }[] = [
  { id: "marca",      label: "Por Marca"     },
  { id: "rubro",      label: "Por Rubro"     },
  { id: "subRubro",   label: "Por Sub-Rubro" },
  { id: "individual", label: "Individual"    },
];

function fmtPct(n: number): string {
  const abs = Math.abs(n).toFixed(1);
  if (n > 0.5)  return `+${abs}%`;
  if (n < -0.5) return `-${abs}%`;
  return "≈0%";
}

function ColorPct({ pct }: { pct: number }) {
  if (pct > 0.5)  return <span className="font-semibold tabular-nums text-red-500">{fmtPct(pct)}</span>;
  if (pct < -0.5) return <span className="font-semibold tabular-nums text-emerald-500">{fmtPct(pct)}</span>;
  return <span className="font-semibold tabular-nums text-muted-foreground">≈0%</span>;
}

function IconTendencia({ pct }: { pct: number }) {
  if (pct > 0.5)  return <TrendingUp  className="h-4 w-4 text-red-500 shrink-0" />;
  if (pct < -0.5) return <TrendingDown className="h-4 w-4 text-emerald-500 shrink-0" />;
  return <Minus className="h-4 w-4 text-muted-foreground shrink-0" />;
}

// ─── Tabla de grupos (Marca / Rubro / Sub-Rubro) ──────────────────────────

function TablaGrupos({ grupos }: { grupos: GrupoAumento[] }) {
  if (grupos.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sin datos.</p>;
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/80">
          <tr className="border-b border-border/50">
            <th className="text-left py-2.5 px-4 text-muted-foreground font-medium text-xs">Nombre</th>
            <th className="text-center py-2.5 px-3 text-muted-foreground font-medium text-xs w-24">Productos</th>
            <th className="text-center py-2.5 px-3 text-muted-foreground font-medium text-xs w-32">Aumento Promedio</th>
            <th className="text-center py-2.5 px-3 text-muted-foreground font-medium text-xs w-24">Subiendo</th>
            <th className="text-center py-2.5 px-3 text-muted-foreground font-medium text-xs w-24">Bajando</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <tr key={g.nombre} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
              <td className="py-2.5 px-4 flex items-center gap-2">
                <IconTendencia pct={g.pctPromedio} />
                <span>{g.nombre}</span>
              </td>
              <td className="py-2.5 px-3 text-center text-xs text-muted-foreground tabular-nums">
                {g.cantidad}
              </td>
              <td className="py-2.5 px-3 text-center">
                <ColorPct pct={g.pctPromedio} />
              </td>
              <td className="py-2.5 px-3 text-center">
                {g.subiendo > 0
                  ? <span className="text-xs font-medium text-red-500 tabular-nums">{g.subiendo}</span>
                  : <span className="text-xs text-muted-foreground">—</span>
                }
              </td>
              <td className="py-2.5 px-3 text-center">
                {g.bajando > 0
                  ? <span className="text-xs font-medium text-emerald-500 tabular-nums">{g.bajando}</span>
                  : <span className="text-xs text-muted-foreground">—</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabla individual ─────────────────────────────────────────────────────

function TablaIndividual({ items }: { items: ItemAumento[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = busqueda.trim()
    ? items.filter((i) =>
        i.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.codigoExterno.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.codItem.toLowerCase().includes(busqueda.toLowerCase())
      )
    : items;

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sin datos.</p>;
  }

  return (
    <div className="space-y-3">
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por descripción o código..."
        className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <p className="text-xs text-muted-foreground">
        {filtrados.length.toLocaleString()} producto{filtrados.length !== 1 ? "s" : ""}
      </p>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/80">
            <tr className="border-b border-border/50">
              <th className="text-left py-2.5 px-4 text-muted-foreground font-medium text-xs">Descripción</th>
              <th className="text-center py-2.5 px-3 text-muted-foreground font-medium text-xs w-28">% Aumento</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((item) => (
              <tr key={item.itemId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <IconTendencia pct={item.pctAumento} />
                    <span className="text-xs">{item.descripcion}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <ColorPct pct={item.pctAumento} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────

export default function TablaAumentos({ data }: { data: ControlAumentosData }) {
  const [vista, setVista] = useState<Vista>("marca");

  const totalSubiendo = data.individual.filter((i) => i.pctAumento > 0.5).length;
  const totalBajando  = data.individual.filter((i) => i.pctAumento < -0.5).length;
  const totalEstable  = data.individual.length - totalSubiendo - totalBajando;
  const promedioGlobal = data.individual.length > 0
    ? data.individual.reduce((s, i) => s + i.pctAumento, 0) / data.individual.length
    : 0;

  return (
    <div className="space-y-6">

      {/* Resumen global */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Aumento promedio</p>
          <p className="text-xl font-bold"><ColorPct pct={promedioGlobal} /></p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Subiendo</p>
          <p className="text-xl font-bold text-red-500 tabular-nums">{totalSubiendo}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Bajando</p>
          <p className="text-xl font-bold text-emerald-500 tabular-nums">{totalBajando}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Sin cambio</p>
          <p className="text-xl font-bold text-muted-foreground tabular-nums">{totalEstable}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setVista(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              vista === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de la vista activa */}
      {vista === "marca"      && <TablaGrupos grupos={data.porMarca} />}
      {vista === "rubro"      && <TablaGrupos grupos={data.porRubro} />}
      {vista === "subRubro"   && <TablaGrupos grupos={data.porSubRubro} />}
      {vista === "individual" && <TablaIndividual items={data.individual} />}
    </div>
  );
}
