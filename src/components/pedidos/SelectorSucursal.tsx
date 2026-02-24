"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export type SucursalPedido = "guaymallen" | "maipu";

const SUCURSALES: { value: SucursalPedido; label: string }[] = [
  { value: "guaymallen", label: "Guaymallén" },
  { value: "maipu", label: "Maipú" },
];

interface Props {
  sucursalActual: SucursalPedido;
  /** Parámetros actuales a conservar (q, pagina, proveedor) */
  paramsActuales: { q?: string; pagina?: string; proveedor?: string };
  basePath?: string;
}

function buildHref(sucursal: SucursalPedido, params: { q?: string; pagina?: string; proveedor?: string }, basePath: string) {
  const p = new URLSearchParams();
  p.set("sucursal", sucursal);
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
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-xs text-accent2 font-medium mr-1">Sucursal:</span>
      <div className="flex rounded-md border border-input overflow-hidden">
        {SUCURSALES.map((s) => {
          const activo = sucursalActual === s.value;
          return (
            <Button
              key={s.value}
              variant="ghost"
              size="sm"
              className={`h-8 px-3 text-xs rounded-none border-r border-input last:border-r-0 ${activo ? "bg-accent2/20 text-accent2 font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              asChild
            >
              <Link href={buildHref(s.value, paramsActuales, basePath)}>{s.label}</Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
