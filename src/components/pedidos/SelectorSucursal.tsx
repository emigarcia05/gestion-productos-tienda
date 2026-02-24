"use client";

import { ChevronDown } from "lucide-react";

export type SucursalPedido = "guaymallen" | "maipu";

const SUCURSALES: { value: SucursalPedido; label: string }[] = [
  { value: "guaymallen", label: "Guaymallén" },
  { value: "maipu", label: "Maipú" },
];

interface Props {
  /** Valor actual (vacío = ninguna seleccionada) */
  sucursalActual: SucursalPedido | "";
  /** Parámetros actuales a conservar (q, pagina, proveedor) */
  paramsActuales: { q?: string; pagina?: string; proveedor?: string };
  basePath?: string;
}

function buildHref(sucursal: SucursalPedido | "", params: Props["paramsActuales"], basePath: string) {
  const p = new URLSearchParams();
  if (sucursal) p.set("sucursal", sucursal);
  if (params.q) p.set("q", params.q);
  if (params.pagina && params.pagina !== "1") p.set("pagina", params.pagina);
  if (params.proveedor) p.set("proveedor", params.proveedor);
  return `${basePath}?${p.toString()}`;
}

export default function SelectorSucursal({
  sucursalActual,
  paramsActuales,
  basePath = "/pedidos/urgente",
}: Props) {
  function handleChange(value: string) {
    const url = buildHref(value as SucursalPedido | "", paramsActuales, basePath);
    window.location.href = url;
  }

  return (
    <div className="relative sm:w-64 shrink-0">
      <select
        value={sucursalActual}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Sucursal</option>
        {SUCURSALES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
