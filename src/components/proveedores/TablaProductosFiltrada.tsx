"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Producto {
  id: string;
  codProdProv: string;
  codExt: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
  proveedor: { id: string; nombre: string; codigoUnico: string; sufijo: string };
}

interface Proveedor {
  id: string;
  nombre: string;
  codigoUnico: string;
  sufijo: string;
}

interface Props {
  productos: Producto[];
  proveedores: Proveedor[];
}

export default function TablaProductosFiltrada({ productos, proveedores }: Props) {
  const [proveedorFiltro, setProveedorFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideProveedor =
        proveedorFiltro === "todos" || p.proveedor.id === proveedorFiltro;
      const coincideBusqueda =
        busqueda === "" ||
        p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codExt.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codProdProv.toLowerCase().includes(busqueda.toLowerCase());
      return coincideProveedor && coincideBusqueda;
    });
  }, [productos, proveedorFiltro, busqueda]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por descripción o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="relative sm:w-64">
          <select
            value={proveedorFiltro}
            onChange={(e) => setProveedorFiltro(e.target.value)}
            className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="todos">Todos los proveedores</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.sufijo}] {p.nombre}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs text-muted-foreground">
        {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? "s" : ""}
        {proveedorFiltro !== "todos" || busqueda
          ? " encontrados"
          : " en total"}
      </p>

      {/* Tabla */}
      {productosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            No se encontraron productos con ese filtro.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Cod. Producto Proveedor</th>
                <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Cód. Externo</th>
                <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Descripción</th>
                <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Proveedor</th>
                <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">Px Lista Proveedor</th>
                <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">Px Venta Sugerido</th>
                <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">Margen</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((prod) => {
                const margen =
                  prod.precioLista > 0
                    ? (((prod.precioVentaSugerido - prod.precioLista) / prod.precioLista) * 100).toFixed(1)
                    : null;

                return (
                  <tr
                    key={prod.id}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {prod.codProdProv}
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {prod.codExt}
                      </code>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">{prod.descripcion}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {prod.proveedor.sufijo}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      ${prod.precioLista.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      ${prod.precioVentaSugerido.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {margen !== null ? (
                        <span className={parseFloat(margen) >= 0 ? "text-emerald-500" : "text-destructive"}>
                          {parseFloat(margen) >= 0 ? "+" : ""}{margen}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
