"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";
import VincularModal from "./VincularModal";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
import { fmtPrecio } from "@/lib/format";

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
      <div className="h-full overflow-auto rounded-lg border border-border/50 bg-white">
        <table className="tabla-gestion-compacta">
          <thead className="sticky top-0 z-10">
            <tr>
              {puede(rol, col.codItem) && (
                <th className="w-16 py-2 px-2 text-xs leading-tight">
                  Cód.<br />Tienda
                </th>
              )}
              {puede(rol, col.descripcion) && (
                <th className="py-2 px-3 text-xs">Descripción</th>
              )}
              {puede(rol, col.costo) && (
                <th className="w-24 py-2 px-2 text-xs leading-tight">Costo</th>
              )}
              {puede(rol, col.proveedorDux) && (
                <th className="w-40 py-2 px-2 text-xs leading-tight">Proveedor Dux</th>
              )}
              {puede(rol, col.rubro) && (
                <th className="w-32 py-2 px-2 text-xs leading-tight">Rubro</th>
              )}
              {puede(rol, col.subRubro) && (
                <th className="w-32 py-2 px-2 text-xs leading-tight">Sub-Rubro</th>
              )}
              {puede(rol, col.mejorPrecio) && (
                <th className="w-16 py-2 px-2 text-xs leading-tight">
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
                className={puedeVincular ? "cursor-pointer" : ""}
              >
                {puede(rol, col.codItem) && (
                  <td className="py-2 px-2 font-mono text-xs">
                    {item.codItem}
                  </td>
                )}
                {puede(rol, col.descripcion) && (
                  <td className="py-2 px-3 text-xs font-semibold">{item.descripcion}</td>
                )}
                {puede(rol, col.costo) && (
                  <td className="py-2 px-2 tabular-nums text-xs font-bold">
                    ${fmtPrecio(item.costo)}
                  </td>
                )}
                {puede(rol, col.proveedorDux) && (
                  <td className="py-2 px-2 text-xs truncate max-w-[160px]">
                    {item.proveedorDux ?? "—"}
                  </td>
                )}
                {puede(rol, col.rubro) && (
                  <td className="py-2 px-2 text-xs">{item.rubro ?? "—"}</td>
                )}
                {puede(rol, col.subRubro) && (
                  <td className="py-2 px-2 text-xs">{item.subRubro ?? "—"}</td>
                )}
                {puede(rol, col.mejorPrecio) && (
                  <td className="py-2 px-2 text-center">
                    {setMejorPrecio.has(item.id)
                      ? <span title="Hay un proveedor con Px Compra Final menor al costo actual" className="flex justify-center"><TrendingDown className="h-4 w-4 text-emerald-500" /></span>
                      : <span className="text-slate-400 text-xs">—</span>
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
