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
import { fmtPrecio, fmtPctEntero } from "@/lib/format";
import { calcMargenSinIvaPct } from "@/lib/calculos";

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
  mejorProveedorNoOficialPrefijo: string | null;
  difMejorPrecioPctEntero: number | null;
}

const MENSAJE_SIN_FILTRO = "Aplicá al menos un filtro (Marca, Rubro, Sub-rubro o búsqueda) para ver los productos.";
const MENSAJE_SIN_RESULTADOS = "No se encontraron items.";

/** DIF.: porcentaje renderizado como reducción con signo "-" (ej. -12%). */
function fmtDifPctEnteroMinus(n: number): string {
  const entero = Math.round(n);
  if (entero > 0) return `-${entero}%`;
  if (entero < 0) return `${entero}%`;
  return "0%";
}

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
  const COLUMNS = 6;

  return (
    <>
      <Table variant="compact" scrollX={false} className="tabla-tienda-listado">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>COD. TIENDA</TableHead>
            <TableHead>DESCRIPCIÓN</TableHead>
            <TableHead>PX. COMPRA FINAL</TableHead>
            <TableHead className="tabla-bloque-secundario-head-divider">
              MARGEN
            </TableHead>
            <TableHead className="tabla-bloque-secundario-head-divider">
              MEJOR PROV.
            </TableHead>
            <TableHead className="tabla-bloque-secundario-head">
              DIF.
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <EmptyTableRow
              colSpan={COLUMNS}
              message={sinFiltros ? MENSAJE_SIN_FILTRO : MENSAJE_SIN_RESULTADOS}
            />
          ) : (
            items.map((item) => {
              const margenSinIvaPct = calcMargenSinIvaPct(
                item.precioLista,
                item.costo,
                item.porcIva
              );
              return (
                <TableRow
                  key={item.id}
                  onDoubleClick={() => puedeVincular && setModalAbierto(item.id)}
                  className={puedeVincular ? "cursor-pointer" : ""}
                >
                  <TableCell className="celda-datos celda-mono whitespace-nowrap">
                    {item.codItem}
                  </TableCell>
                  <TableCell className="celda-datos celda-destacado min-w-0 overflow-hidden">
                    {item.descripcion}
                  </TableCell>
                  <TableCell className="celda-datos celda-numero celda-destacado">
                    ${fmtPrecio(item.costo)}
                  </TableCell>
                  <TableCell className="celda-datos celda-numero tabla-bloque-secundario-cell-divider">
                    {margenSinIvaPct != null ? fmtPctEntero(margenSinIvaPct) : ""}
                  </TableCell>
                  <TableCell className="celda-datos celda-mono tabla-bloque-secundario-cell-divider">
                    {item.mejorProveedorNoOficialPrefijo ?? ""}
                  </TableCell>
                  <TableCell className="celda-datos celda-numero tabla-bloque-secundario-cell">
                    {item.difMejorPrecioPctEntero != null ? fmtDifPctEnteroMinus(item.difMejorPrecioPctEntero) : ""}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

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
            precioListaTienda={item.precioLista}
            porcIva={item.porcIva}
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
