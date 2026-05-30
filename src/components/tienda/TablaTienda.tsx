"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import CeldaCxProdTienda from "@/components/shared/CeldaCxProdTienda";
import CxCompraVinculosDetalle, {
  recargarVinculosItemTienda,
} from "@/components/tienda/CxCompraVinculosDetalle";
import SeleccionarProductoModal from "@/components/tienda/SeleccionarProductoModal";
import { vincularProducto } from "@/actions/vinculos";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
import type { ItemTiendaParaTabla } from "@/actions/tienda";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const COL_COUNT = 5;
const COL_WIDTHS = [12, 38, 10, 28, 12] as const;

const MENSAJE_SIN_FILTRO =
  "Aplicá al menos un filtro (Marca, Rubro, Sub-rubro o búsqueda) para ver los productos.";
const MENSAJE_SIN_RESULTADOS = "No se encontraron items.";

type VincularItemState = {
  item: ItemTiendaParaTabla;
  idsProveedoresYaVinculados: string[];
};

function FilaTienda({
  item,
  puedeVincular,
  puedeEditarCxProd,
  expandido,
  detalleKey,
  onToggleDetalle,
  onVincular,
}: {
  item: ItemTiendaParaTabla;
  puedeVincular: boolean;
  puedeEditarCxProd: boolean;
  expandido: boolean;
  detalleKey: number;
  onToggleDetalle: () => void;
  onVincular: () => void;
}) {
  const n = item._count.productos;
  const textoVinculacion = n === 0 ? "-" : String(n);

  return (
    <Fragment>
      <TableRow className="hover:bg-transparent">
        <TableCell className="celda-datos celda-mono whitespace-nowrap">
          {item.codItem}
        </TableCell>
        <TableCell className="celda-datos celda-destacado min-w-0 overflow-hidden">
          {item.descripcion}
        </TableCell>
        <TableCell
          className={cn(
            "celda-datos celda-numero tabular-nums text-center",
            n === 0 && "text-muted-foreground"
          )}
        >
          {textoVinculacion}
        </TableCell>
        <TableCell
          className="celda-datos min-w-0 tabla-bloque-secundario-cell-divider"
          onClick={(e) => e.stopPropagation()}
        >
          <CeldaCxProdTienda
            codTienda={item.codItem}
            cxProd={item.cxProd}
            puedeEditar={puedeEditarCxProd}
          />
        </TableCell>
        <TableCell className="celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider">
          <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
              aria-label={expandido ? "Ocultar vínculos" : "Ver vínculos"}
              aria-expanded={expandido}
              onClick={onToggleDetalle}
            >
              {expandido ? (
                <ChevronUp className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
              ) : (
                <ChevronDown className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
              )}
            </Button>
            {puedeVincular ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                aria-label="Vincular proveedor"
                onClick={onVincular}
              >
                <Link2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
              </Button>
            ) : null}
          </div>
        </TableCell>
      </TableRow>
      {expandido ? (
        <CxCompraVinculosDetalle
          key={`${item.id}-${detalleKey}`}
          itemTiendaId={item.id}
          prefijoProveedor={item.proveedorDux}
          puedeEditar={puedeVincular}
        />
      ) : null}
    </Fragment>
  );
}

export default function TablaTienda({
  items,
  rol,
  sinFiltros = false,
  puedeEditarCxProd = false,
}: {
  items: ItemTiendaParaTabla[];
  rol: Rol;
  sinFiltros?: boolean;
  puedeEditarCxProd?: boolean;
}) {
  const router = useRouter();
  const col = PERMISOS.tienda.tabla;
  const puedeVincular = puede(rol, col.vinculos);
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
  const [detalleKeys, setDetalleKeys] = useState<Record<string, number>>({});
  const [vincularItem, setVincularItem] = useState<VincularItemState | null>(null);
  const [, startTransition] = useTransition();

  function toggleDetalle(itemId: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function bumpDetalleKey(itemId: string) {
    setDetalleKeys((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? 0) + 1,
    }));
  }

  async function abrirVincular(item: ItemTiendaParaTabla) {
    const data = await recargarVinculosItemTienda(item.id);
    setVincularItem({
      item,
      idsProveedoresYaVinculados: data?.productos.map((p) => p.proveedorId) ?? [],
    });
  }

  function handleSeleccionar(producto: {
    id: string;
    proveedorId: string;
    codigoExterno: string;
  }) {
    if (!vincularItem) return;
    const { item } = vincularItem;
    if (vincularItem.idsProveedoresYaVinculados.includes(producto.proveedorId)) {
      toast.error(
        "Ya existe un vínculo con ese proveedor. No se puede tener dos vinculaciones del mismo proveedor."
      );
      return;
    }
    setVincularItem(null);
    startTransition(async () => {
      const res = await vincularProducto(item.id, producto.id);
      if (res.ok) {
        toast.success(`Vinculado: ${producto.codigoExterno}`);
        setExpandidos((prev) => new Set(prev).add(item.id));
        bumpDetalleKey(item.id);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <Table variant="compact" scrollX={false} className="tabla-tienda-listado">
        <colgroup>
          {COL_WIDTHS.map((pct, i) => (
            <col key={i} style={{ width: `${pct}%` }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>COD. TIENDA</TableHead>
            <TableHead>DESCRIPCIÓN</TableHead>
            <TableHead className="text-center">VINCULACIÓN</TableHead>
            <TableHead className="text-center tabla-bloque-secundario-head-divider">
              CX PROD.
            </TableHead>
            <TableHead className="text-center tabla-bloque-secundario-head-divider">
              ACCIONES
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <EmptyTableRow
              colSpan={COL_COUNT}
              message={sinFiltros ? MENSAJE_SIN_FILTRO : MENSAJE_SIN_RESULTADOS}
            />
          ) : (
            items.map((item) => (
              <FilaTienda
                key={item.id}
                item={item}
                puedeVincular={puedeVincular}
                puedeEditarCxProd={puedeEditarCxProd}
                expandido={expandidos.has(item.id)}
                detalleKey={detalleKeys[item.id] ?? 0}
                onToggleDetalle={() => toggleDetalle(item.id)}
                onVincular={() => void abrirVincular(item)}
              />
            ))
          )}
        </TableBody>
      </Table>

      {vincularItem ? (
        <SeleccionarProductoModal
          open
          onClose={() => setVincularItem(null)}
          onSeleccionar={handleSeleccionar}
          excluirItemTiendaId={vincularItem.item.id}
          idsProveedoresYaVinculados={vincularItem.idsProveedoresYaVinculados}
          itemDescripcion={vincularItem.item.descripcion}
          marca={vincularItem.item.marca}
          rubro={vincularItem.item.rubro}
          subRubro={vincularItem.item.subRubro}
        />
      ) : null}
    </>
  );
}
