"use client";

import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";
import VincularModal from "./VincularModal";

interface ItemTienda {
  id: string;
  codItem: string;
  descripcion: string;
  rubro: string | null;
  subRubro: string | null;
  marca: string | null;
  proveedorDux: string | null;
  codigoExterno: string | null;
  costo: number;
  porcIva: number;
  precioLista: number;
  precioMayorista: number;
  stockGuaymallen: number;
  stockMaipu: number;
  habilitado: boolean;
  _count: { productos: number };
}

function fmtPrecio(n: number) {
  return Math.round(n).toLocaleString("es-AR");
}

export default function TablaTienda({ items, setMejorPrecio }: { items: ItemTienda[]; setMejorPrecio: Set<string> }) {
  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No se encontraron items.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
          <tr className="border-b border-border/50">
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-16 leading-tight">
              Cód.<br />Tienda
            </th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium text-xs">
              Descripción
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-24 leading-tight">
              Costo
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-40 leading-tight">
              Proveedor Dux
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-32 leading-tight">
              Rubro
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-32 leading-tight">
              Sub-Rubro
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-16 leading-tight">
              Mejor<br />Precio
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-16 leading-tight">
              Vínculos
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
              <td className="py-2 px-2 text-center font-mono text-xs text-muted-foreground">
                {item.codItem}
              </td>
              <td className="py-2 px-3 text-center text-xs">{item.descripcion}</td>
              <td className="py-2 px-2 text-center tabular-nums text-xs font-medium">
                ${fmtPrecio(item.costo)}
              </td>
              <td className="py-2 px-2 text-center text-xs text-muted-foreground truncate max-w-[160px]">
                {item.proveedorDux ?? "—"}
              </td>
              <td className="py-2 px-2 text-center text-xs text-muted-foreground">
                {item.rubro ?? "—"}
              </td>
              <td className="py-2 px-2 text-center text-xs text-muted-foreground">
                {item.subRubro ?? "—"}
              </td>
              <td className="py-2 px-2 text-center">
                {setMejorPrecio.has(item.id)
                  ? <TrendingDown className="h-4 w-4 text-emerald-500 mx-auto" title="Hay un proveedor con Px Compra Final menor al costo actual" />
                  : <span className="text-muted-foreground text-xs">—</span>
                }
              </td>
              <td className="py-2 px-2 text-center">
                <VincularModal
                  itemTiendaId={item.id}
                  itemDescripcion={item.descripcion}
                  codigoExterno={item.codigoExterno}
                  cantidadVinculos={item._count.productos}
                  costoTienda={item.costo}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
