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
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
  stockeable: boolean;
  habilitado: boolean;
  _count: { productos: number };
  mejorProveedorNoOficialPrefijo: string | null;
  difMejorPrecioPctEntero: number | null;
}

const MENSAJE_SIN_FILTRO = "Aplicá al menos un filtro (Marca, Rubro, Sub-rubro o búsqueda) para ver los productos.";
const MENSAJE_SIN_RESULTADOS = "No se encontraron items.";

export default function TablaTienda({
  items,
  rol,
  sinFiltros = false,
  selectedIds,
  onToggleSelected,
  onToggleAllVisible,
  canBulkSelect = false,
}: {
  items: ItemTienda[];
  rol: Rol;
  sinFiltros?: boolean;
  selectedIds?: Set<string>;
  onToggleSelected?: (id: string, checked: boolean) => void;
  onToggleAllVisible?: (checked: boolean) => void;
  canBulkSelect?: boolean;
}) {
  const col = PERMISOS.tienda.tabla;
  const [modalAbierto, setModalAbierto] = useState<string | null>(null);
  const puedeVincular = puede(rol, col.vinculos);
  const COLUMNS = canBulkSelect ? 6 : 5;
  const allVisibleSelected =
    canBulkSelect &&
    items.length > 0 &&
    items.every((item) => selectedIds?.has(item.id));

  return (
    <>
      <Table
        variant="compact"
        scrollX={false}
        className={cn("tabla-tienda-listado", canBulkSelect && "tabla-tienda-listado--with-select")}
      >
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {canBulkSelect ? (
              <TableHead className="w-[5%] text-center">
                <button
                  type="button"
                  onClick={() => onToggleAllVisible?.(!allVisibleSelected)}
                  onDoubleClick={(e) => e.stopPropagation()}
                  aria-label={allVisibleSelected ? "Deseleccionar Todos" : "Seleccionar Todos"}
                  className="tabla-head-toggle"
                >
                  <Check className="h-4 w-4" strokeWidth={2.75} aria-hidden />
                </button>
              </TableHead>
            ) : null}
            <TableHead className="w-[10%]">COD. TIENDA</TableHead>
            <TableHead className="w-[55%]">DESCRIPCIÓN</TableHead>
            <TableHead className="w-[10%]">PX. COMPRA FINAL</TableHead>
            <TableHead className="w-[10%] tabla-bloque-secundario-head-divider">
              MEJOR PROV.
            </TableHead>
            <TableHead className="w-[10%] tabla-bloque-secundario-head">
              VARIACIÓN
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
              return (
                <TableRow
                  key={item.id}
                  onDoubleClick={() => puedeVincular && setModalAbierto(item.id)}
                  className={puedeVincular ? "cursor-pointer" : ""}
                >
                  {canBulkSelect ? (
                    <TableCell className="celda-datos">
                      <input
                        type="checkbox"
                        checked={!!selectedIds?.has(item.id)}
                        onChange={(e) => onToggleSelected?.(item.id, e.currentTarget.checked)}
                        onDoubleClick={(e) => e.stopPropagation()}
                        aria-label={`Seleccionar ${item.codItem}`}
                        className="tabla-check-toggle"
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="celda-datos celda-mono whitespace-nowrap">
                    {item.codItem}
                  </TableCell>
                  <TableCell className="celda-datos celda-destacado min-w-0 overflow-hidden">
                    {item.descripcion}
                  </TableCell>
                  <TableCell className="celda-datos celda-numero celda-destacado">
                    ${fmtPrecio(item.costo)}
                  </TableCell>
                  <TableCell className="celda-datos celda-mono tabla-bloque-secundario-cell-divider">
                    {item.mejorProveedorNoOficialPrefijo ?? ""}
                  </TableCell>
                  <TableCell className="celda-datos celda-numero tabla-bloque-secundario-cell">
                    {item.difMejorPrecioPctEntero != null ? fmtPctEntero(item.difMejorPrecioPctEntero) : ""}
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
