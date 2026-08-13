"use client";

import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";

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
  basePath = GP_ROUTES.pedidoMercaderia.confPedido.urgente,
}: Props) {
  const router = useRouter();

  function handleChange(value: string) {
    const url = buildHref(value === "todos" ? "" : value, paramsActuales, basePath);
    router.push(url);
  }

  return (
    <div className="w-64 shrink-0">
      <Select
        value={proveedorActual || "todos"}
        onValueChange={handleChange}
      >
        <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
          <SelectValue placeholder="PROVEEDOR" />
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="start">
          <SelectItem value="todos">TODOS LOS PROVEEDORES</SelectItem>
          {proveedores.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              [{p.prefijo}] {p.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
