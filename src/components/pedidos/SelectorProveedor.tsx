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
import { cn } from "@/lib/utils";

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

const SELECT_TODOS = "todos";

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
    const proveedorId = value === SELECT_TODOS ? "" : value;
    const url = buildHref(proveedorId, paramsActuales, basePath);
    router.push(url);
  }

  return (
    <div className="w-64 shrink-0">
      <Select
        value={proveedorActual || SELECT_TODOS}
        onValueChange={handleChange}
      >
        <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
          <SelectValue placeholder="Todos los proveedores" />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          className="select-content-filtro"
        >
          <SelectItem value={SELECT_TODOS}>Todos los proveedores</SelectItem>
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
