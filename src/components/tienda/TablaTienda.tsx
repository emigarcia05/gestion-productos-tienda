"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";
import VincularModal from "./VincularModal";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";

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

export default function TablaTienda({ items, setMejorPrecio, rol }: { items: ItemTienda[]; setMejorPrecio: Set<string>; rol: Rol }) {
  const col = PERMISOS.tienda.tabla;
  const [modalAbierto, setModalAbierto] = useState<string | null>(null);
  const puedeVincular = puede(rol, col.vinculos);

  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No se encontraron items.</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="border-b border-border/50">
              {puede(rol, col.codItem) && (
                <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-16 leading-tight">
                  Cód.<br />Tienda
                </th>
              )}
              {puede(rol, col.descripcion) && (
                <th className="text-center py-2 px-3 text-muted-foreground font-medium text-xs">
                  Descripción
                </th>
              )}
              {puede(rol, col.costo) && (
                <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-24 leading-tight">
                  Costo
                </th>
              )}
              {puede(rol, col.proveedorDux) && (
                <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-40 leading-tight">
                  Proveedor Dux
                </th>
              )}
              {puede(rol, col.rubro) && (
                <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-32 leading-tight">
                  Rubro
                </th>
              )}
              {puede(rol, col.subRubro) && (
                <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-32 leading-tight">
                  Sub-Rubro
                </th>
              )}
              {puede(rol, col.mejorPrecio) && (
                <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-16 leading-tight">
                  Mejor<br />Precio
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => puedeVincular && setModalAbierto(item.id)}
                className={`border-b border-border/30 transition-colors ${puedeVincular ? "hover:bg-muted/30 cursor-pointer" : "hover:bg-muted/20"}`}
              >
                {puede(rol, col.codItem) && (
                  <td className="py-2 px-2 text-center font-mono text-xs text-muted-foreground">
                    {item.codItem}
                  </td>
                )}
                {puede(rol, col.descripcion) && (
                  <td className="py-2 px-3 text-center text-xs">{item.descripcion}</td>
                )}
                {puede(rol, col.costo) && (
                  <td className="py-2 px-2 text-center tabular-nums text-xs font-medium">
                    ${fmtPrecio(item.costo)}
                  </td>
                )}
                {puede(rol, col.proveedorDux) && (
                  <td className="py-2 px-2 text-center text-xs text-muted-foreground truncate max-w-[160px]">
                    {item.proveedorDux ?? "—"}
                  </td>
                )}
                {puede(rol, col.rubro) && (
                  <td className="py-2 px-2 text-center text-xs text-muted-foreground">
                    {item.rubro ?? "—"}
                  </td>
                )}
                {puede(rol, col.subRubro) && (
                  <td className="py-2 px-2 text-center text-xs text-muted-foreground">
                    {item.subRubro ?? "—"}
                  </td>
                )}
                {puede(rol, col.mejorPrecio) && (
                  <td className="py-2 px-2 text-center">
                    {setMejorPrecio.has(item.id)
                      ? <span title="Hay un proveedor con Px Compra Final menor al costo actual" className="flex justify-center"><TrendingDown className="h-4 w-4 text-emerald-500" /></span>
                      : <span className="text-muted-foreground text-xs">—</span>
                    }
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modales de vínculos — uno por item, se monta solo el que está abierto */}
      {puedeVincular && items.map((item) => (
        modalAbierto === item.id && (
          <VincularModal
            key={item.id}
            itemTiendaId={item.id}
            itemDescripcion={item.descripcion}
            codigoExterno={item.codigoExterno}
            cantidadVinculos={item._count.productos}
            costoTienda={item.costo}
            open={modalAbierto === item.id}
            onOpenChange={(v) => !v && setModalAbierto(null)}
          />
        )
      ))}
    </>
  );
}
