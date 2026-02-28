"use client";

import { ChevronDown } from "lucide-react";

interface Proveedor {
  id: string;
  nombre: string;
  prefijo: string;
}

interface Props {
  proveedores: Proveedor[];
  proveedorActual: string;
  /** Parámetros a conservar en la URL (q, sucursal, pagina) */
  paramsActuales: { q?: string; sucursal?: string; pagina?: string };
  basePath?: string;
}

function buildHref(proveedorId: string, params: Props["paramsActuales"], basePath: string) {
  const p = new URLSearchParams();
  if (proveedorId) p.set("proveedor", proveedorId);
  if (params.q) p.set("q", params.q);
  if (params.sucursal) p.set("sucursal", params.sucursal);
  if (params.pagina && params.pagina !== "1") p.set("pagina", params.pagina);
  return `${basePath}?${p.toString()}`;
}

export default function SelectorProveedor({
  proveedores,
  proveedorActual,
  paramsActuales,
  basePath = "/pedidos/urgente",
}: Props) {
  function handleChange(value: string) {
    const url = buildHref(value, paramsActuales, basePath);
    window.location.href = url;
  }

  return (
    <div className="relative sm:w-64 shrink-0">
      <select
        value={proveedorActual}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Todos los proveedores</option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>
            [{p.prefijo}] {p.nombre}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
