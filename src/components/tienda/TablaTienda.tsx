"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  diferenciaMejorPrecio: number | null;
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
      <div className="h-full contenedor-tabla-paginada">
        <Table variant="compact" className="tabla-tienda-listado">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-2 px-2 text-xs leading-tight">Cod. Tienda</TableHead>
              <TableHead className="py-2 px-3 text-xs">Descripción</TableHead>
              <TableHead className="py-2 px-2 text-xs leading-tight">Px Compra Final</TableHead>
              <TableHead className="py-2 px-2 text-xs leading-tight" title="✓ = Hay otro proveedor vinculado con mejor precio que el principal">✓</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                onDoubleClick={() => puedeVincular && setModalAbierto(item.id)}
                className={puedeVincular ? "cursor-pointer" : ""}
              >
                <TableCell className="py-2 px-2 font-mono text-xs">
                  {item.codItem}
                </TableCell>
                <TableCell className="py-2 px-3 text-xs font-bold">
                  {item.descripcion}
                </TableCell>
                <TableCell className="py-2 px-2 tabular-nums text-xs font-bold">
                  ${fmtPrecio(item.costo)}
                </TableCell>
                <TableCell className="py-2 px-2 text-center text-xs">
                  {item.diferenciaMejorPrecio != null && item.diferenciaMejorPrecio > 0 ? (
                    <span className="font-semibold" title="Hay otro proveedor vinculado con mejor precio que el principal" style={{ color: "#0072BB" }}>
                      ✓
                    </span>
                  ) : null}
                </TableCell>
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
            marca={item.marca}
            rubro={item.rubro}
            subRubro={item.subRubro}
            prefijoProveedor={item.proveedorDux}
            open={modalAbierto === item.id}
            onOpenChange={(v) => !v && setModalAbierto(null)}
          />
        )
      ))}
    </>
  );
}
