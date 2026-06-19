"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { editarProducto } from "@/actions/productos";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
import { fmtPrecio, fmtPorcentajeTabla } from "@/lib/format";

import type { ProductoProveedoresPage } from "@/lib/productoProveedoresPage";

const MENSAJE_SIN_FILTRO = "Aplicá al menos un filtro (Proveedor o búsqueda) para ver los productos.";
const MENSAJE_SIN_RESULTADOS = "No se encontraron productos.";

interface Props {
  productos: ProductoProveedoresPage[];
  rol: Rol;
  /** true cuando no hay filtros aplicados: se muestra mensaje para invitar a filtrar. */
  sinFiltros?: boolean;
}

function CeldaPorcentajeSoloLectura({ valor }: { valor: number }) {
  return (
    <span className="block w-full text-center text-xs tabular-nums text-muted-foreground">
      {valor > 0 ? fmtPorcentajeTabla(valor) : "—"}
    </span>
  );
}

// ─── Celda switch disponible ───────────────────────────────────────────────
function CeldaDisponible({
  productoId,
  valor,
  onUpdate,
}: {
  productoId: string;
  valor: boolean;
  onUpdate: (id: string, campo: string, val: boolean) => void;
}) {
  const [saving, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    startTransition(async () => {
      const res = await editarProducto({ id: productoId, campos: { disponible: checked } });
      if (res.ok) {
        onUpdate(productoId, "disponible", checked);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex justify-center items-center gap-1">
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      <Switch checked={valor} onCheckedChange={handleChange} disabled={saving} className="scale-75" />
    </div>
  );
}

// ─── Tabla principal ───────────────────────────────────────────────────────
export default function TablaProductosFiltrada({ productos: inicial, rol, sinFiltros = false }: Props) {
  const [productos, setProductos] = useState(inicial);
  const col = PERMISOS.proveedores.tabla;

  function handleUpdate(id: string, campo: string, val: boolean) {
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: val } : p))
    );
  }

  const columnCount = [
    puede(rol, col.codProdProv),
    puede(rol, col.codExt),
    puede(rol, col.descripcion),
    puede(rol, col.proveedor),
    puede(rol, col.precioLista),
    puede(rol, col.precioVentaSugerido),
    puede(rol, col.descuentoRubro),
    puede(rol, col.descuentoCantidad),
    puede(rol, col.cxTransporte),
    puede(rol, col.precioCompraFinal),
    puede(rol, col.disponible),
  ].filter(Boolean).length || 1;

  return (
    <div className="h-full min-h-0 overflow-auto rounded-lg border border-border/50 bg-card">
      <Table variant="compact">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {puede(rol, col.codProdProv) && (
              <TableHead className="w-16 leading-tight">COD.<br />PROV.</TableHead>
            )}
            {puede(rol, col.codExt) && (
              <TableHead className="w-24 leading-tight">CÓD.<br />EXTERNO</TableHead>
            )}
            {puede(rol, col.descripcion) && (
              <TableHead>DESCRIPCIÓN</TableHead>
            )}
            {puede(rol, col.proveedor) && (
              <TableHead className="w-14 leading-tight">Prov.</TableHead>
            )}
            {puede(rol, col.precioLista) && (
              <TableHead className="w-20 leading-tight">PX.<br />LISTA</TableHead>
            )}
            {puede(rol, col.precioVentaSugerido) && (
              <TableHead className="w-20 leading-tight">PX. VENTA<br />SUG.</TableHead>
            )}
            {puede(rol, col.descuentoRubro) && (
              <TableHead className="w-12 leading-tight">DTO.<br />RUBRO</TableHead>
            )}
            {puede(rol, col.descuentoCantidad) && (
              <TableHead className="w-12 leading-tight">DTO.<br />CANT.</TableHead>
            )}
            {puede(rol, col.cxTransporte) && (
              <TableHead className="w-12 leading-tight">CX.<br />TRANSP.</TableHead>
            )}
            {puede(rol, col.precioCompraFinal) && (
              <TableHead className="w-24 leading-tight">PX. COMPRA<br />FINAL</TableHead>
            )}
            {puede(rol, col.disponible) && (
              <TableHead className="w-16 leading-tight">DISP.</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.length === 0 ? (
            <EmptyTableRow
              colSpan={columnCount || 1}
              message={sinFiltros ? MENSAJE_SIN_FILTRO : MENSAJE_SIN_RESULTADOS}
            />
          ) : (
          productos.map((prod) => (
            <TableRow key={prod.id}>
              {puede(rol, col.codProdProv) && (
                <TableCell className="celda-datos celda-mono">{prod.codProdProv}</TableCell>
              )}
              {puede(rol, col.codExt) && (
                <TableCell className="celda-datos whitespace-nowrap">
                  <code className="text-xs px-1.5 py-0.5 rounded font-mono bg-muted">{prod.codigoExterno}</code>
                </TableCell>
              )}
              {puede(rol, col.descripcion) && (
                <TableCell className="celda-datos font-semibold">{prod.descripcion}</TableCell>
              )}
              {puede(rol, col.proveedor) && (
                <TableCell className="celda-datos celda-mono">{prod.proveedor.prefijo}</TableCell>
              )}
              {puede(rol, col.precioLista) && (
                <TableCell className="celda-datos tabular-nums whitespace-nowrap">${fmtPrecio(prod.precioLista)}</TableCell>
              )}
              {puede(rol, col.precioVentaSugerido) && (
                <TableCell className="celda-datos tabular-nums font-bold whitespace-nowrap">${fmtPrecio(prod.precioVentaSugerido)}</TableCell>
              )}
              {puede(rol, col.descuentoRubro) && (
                <TableCell className="celda-datos text-center">
                  <CeldaPorcentajeSoloLectura valor={prod.descuentoRubro} />
                </TableCell>
              )}
              {puede(rol, col.descuentoCantidad) && (
                <TableCell className="celda-datos text-center">
                  <CeldaPorcentajeSoloLectura valor={prod.descuentoCantidad} />
                </TableCell>
              )}
              {puede(rol, col.cxTransporte) && (
                <TableCell className="celda-datos text-center">
                  <CeldaPorcentajeSoloLectura valor={prod.cxTransporte} />
                </TableCell>
              )}
              {puede(rol, col.precioCompraFinal) && (
                <TableCell className="celda-datos tabular-nums font-bold whitespace-nowrap">
                  ${fmtPrecio(prod.pxCompraFinalSinIva ?? 0)}
                </TableCell>
              )}
              {puede(rol, col.disponible) && (
                <TableCell className="celda-datos text-center">
                  <CeldaDisponible productoId={prod.id} valor={prod.disponible} onUpdate={handleUpdate} />
                </TableCell>
              )}
            </TableRow>
          ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
