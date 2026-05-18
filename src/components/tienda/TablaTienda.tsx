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
import type { ItemTiendaParaTabla } from "@/actions/tienda";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const COL_COUNT = 4;

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
  items: ItemTiendaParaTabla[];
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
  const allVisibleSelected =
    canBulkSelect &&
    items.length > 0 &&
    items.every((item) => selectedIds?.has(item.id));

  return (
    <>
      <Table variant="compact" scrollX={false} className="tabla-tienda-listado">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[5%] text-center">
              {canBulkSelect ? (
                <button
                  type="button"
                  onClick={() => onToggleAllVisible?.(!allVisibleSelected)}
                  onDoubleClick={(e) => e.stopPropagation()}
                  aria-label={allVisibleSelected ? "Deseleccionar Todos" : "Seleccionar Todos"}
                  className="tabla-head-toggle"
                >
                  <Check className="h-4 w-4" strokeWidth={2.75} aria-hidden />
                </button>
              ) : (
                <span className="sr-only">TILDE</span>
              )}
            </TableHead>
            <TableHead className="w-[12%]">COD. TIENDA</TableHead>
            <TableHead className="w-[58%]">DESCRIPCIÓN</TableHead>
            <TableHead className="w-[15%]">VINCULACIÓN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <EmptyTableRow colSpan={COL_COUNT} message={sinFiltros ? MENSAJE_SIN_FILTRO : MENSAJE_SIN_RESULTADOS} />
          ) : (
            items.map((item) => {
              const n = item._count.productos;
              const textoVinculacion = n === 0 ? "-" : String(n);
              return (
                <TableRow
                  key={item.id}
                  onDoubleClick={() => puedeVincular && setModalAbierto(item.id)}
                  className={puedeVincular ? "cursor-pointer" : ""}
                >
                  <TableCell className="celda-datos text-center">
                    {canBulkSelect ? (
                      <input
                        type="checkbox"
                        checked={!!selectedIds?.has(item.id)}
                        onChange={(e) => onToggleSelected?.(item.id, e.currentTarget.checked)}
                        onDoubleClick={(e) => e.stopPropagation()}
                        aria-label={`Seleccionar ${item.codItem}`}
                        className="tabla-check-toggle"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="celda-datos celda-mono whitespace-nowrap">{item.codItem}</TableCell>
                  <TableCell className="celda-datos celda-destacado min-w-0 overflow-hidden">{item.descripcion}</TableCell>
                  <TableCell
                    className={cn(
                      "celda-datos celda-numero tabular-nums",
                      n === 0 && "text-muted-foreground"
                    )}
                  >
                    {textoVinculacion}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {puedeVincular &&
        items.length > 0 &&
        items.map((item) =>
          modalAbierto === item.id ? (
            <VincularModal
              key={item.id}
              rol={rol}
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
          ) : null
        )}
    </>
  );
}
