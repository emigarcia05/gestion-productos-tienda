"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
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

const MENSAJE_SIN_FILTRO = "Aplicá al menos un filtro (Marca, Rubro, Sub-rubro o búsqueda) para ver los productos.";
const MENSAJE_SIN_RESULTADOS = "No se encontraron items.";

export default function TablaTienda({
  items,
  setMejorPrecio,
  rol,
  sinFiltros = false,
}: {
  items: ItemTienda[];
  setMejorPrecio: Set<string>;
  rol: Rol;
  sinFiltros?: boolean;
}) {
  const col = PERMISOS.tienda.tabla;
  const [modalAbierto, setModalAbierto] = useState<string | null>(null);
  const puedeVincular = puede(rol, col.vinculos);
  const COLUMNS = 4;

  return (
    <>
      <div className="h-full contenedor-tabla-paginada">
        <Table variant="compact" className="tabla-tienda-listado">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-2 px-2 text-xs leading-tight">Cod. Tienda</TableHead>
              <TableHead className="py-2 px-3 text-xs">Descripción</TableHead>
              <TableHead className="py-2 px-2 text-xs leading-tight">Px Compra Final</TableHead>
              <TableHead className="py-2 px-2 text-xs leading-tight" title="✓ = Menor Cx Disponible: hay al menos un proveedor vinculado con costo menor que el principal. Filtrable por COSTO → Menor Cx Disponible.">✓</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <EmptyTableRow
                colSpan={COLUMNS}
                message={sinFiltros ? MENSAJE_SIN_FILTRO : MENSAJE_SIN_RESULTADOS}
              />
            ) : (
              items.map((item) => (
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
                  {item.diferenciaMejorPrecio != null ? (
                    <span className="font-semibold text-primary" title="Hay otro proveedor vinculado con mejor precio que el principal">
                      ✓
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modales de vínculos — uno por item, se monta solo el que está abierto */}
      {puedeVincular && items.length > 0 && items.map((item) => (
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
