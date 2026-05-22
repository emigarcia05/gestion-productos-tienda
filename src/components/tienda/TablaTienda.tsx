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
import { cn } from "@/lib/utils";

const COL_COUNT = 3;

const MENSAJE_SIN_FILTRO = "Aplicá al menos un filtro (Marca, Rubro, Sub-rubro o búsqueda) para ver los productos.";
const MENSAJE_SIN_RESULTADOS = "No se encontraron items.";

export default function TablaTienda({
  items,
  rol,
  sinFiltros = false,
}: {
  items: ItemTiendaParaTabla[];
  rol: Rol;
  sinFiltros?: boolean;
}) {
  const col = PERMISOS.tienda.tabla;
  const [modalAbierto, setModalAbierto] = useState<string | null>(null);
  const puedeVincular = puede(rol, col.vinculos);

  return (
    <>
      <Table variant="compact" scrollX={false} className="tabla-tienda-listado">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[15%]">COD. TIENDA</TableHead>
            <TableHead className="w-[67%]">DESCRIPCIÓN</TableHead>
            <TableHead className="w-[18%]">VINCULACIÓN</TableHead>
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
