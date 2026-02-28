"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        <Table variant="compact">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {puede(rol, col.codItem) && (
                <TableHead className="w-16 py-2 px-2 text-xs leading-tight">
                  Cód.<br />Tienda
                </TableHead>
              )}
              {puede(rol, col.descripcion) && (
                <TableHead className="py-2 px-3 text-xs">Descripción</TableHead>
              )}
              {puede(rol, col.costo) && (
                <TableHead className="w-24 py-2 px-2 text-xs leading-tight">Costo</TableHead>
              )}
              {puede(rol, col.proveedorDux) && (
                <TableHead className="w-40 py-2 px-2 text-xs leading-tight">Proveedor Dux</TableHead>
              )}
              {puede(rol, col.rubro) && (
                <TableHead className="w-32 py-2 px-2 text-xs leading-tight">Rubro</TableHead>
              )}
              {puede(rol, col.subRubro) && (
                <TableHead className="w-32 py-2 px-2 text-xs leading-tight">Sub-Rubro</TableHead>
              )}
              {puede(rol, col.mejorPrecio) && (
                <TableHead className="w-16 py-2 px-2 text-xs leading-tight">
                  Mejor<br />Precio
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                onClick={() => puedeVincular && setModalAbierto(item.id)}
                className={puedeVincular ? "cursor-pointer" : ""}
              >
                {puede(rol, col.codItem) && (
                  <TableCell className="py-2 px-2 font-mono text-xs">
                    {item.codItem}
                  </TableCell>
                )}
                {puede(rol, col.descripcion) && (
                  <TableCell className="py-2 px-3 text-xs font-semibold">{item.descripcion}</TableCell>
                )}
                {puede(rol, col.costo) && (
                  <TableCell className="py-2 px-2 tabular-nums text-xs font-bold">
                    ${fmtPrecio(item.costo)}
                  </TableCell>
                )}
                {puede(rol, col.proveedorDux) && (
                  <TableCell className="py-2 px-2 text-xs truncate max-w-[160px]">
                    {item.proveedorDux ?? "—"}
                  </TableCell>
                )}
                {puede(rol, col.rubro) && (
                  <TableCell className="py-2 px-2 text-xs">{item.rubro ?? "—"}</TableCell>
                )}
                {puede(rol, col.subRubro) && (
                  <TableCell className="py-2 px-2 text-xs">{item.subRubro ?? "—"}</TableCell>
                )}
                {puede(rol, col.mejorPrecio) && (
                  <TableCell className="py-2 px-2 text-center">
                    {setMejorPrecio.has(item.id)
                      ? <span title="Hay un proveedor con Px Compra Final menor al costo actual" className="flex justify-center"><TrendingDown className="h-4 w-4 text-emerald-500" /></span>
                      : <span className="text-slate-400 text-xs">—</span>
                    }
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
