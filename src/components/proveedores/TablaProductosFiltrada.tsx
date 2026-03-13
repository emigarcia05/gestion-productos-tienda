"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { calcPxCompraFinal } from "@/lib/calculos";
import { fmtPrecio } from "@/lib/format";

function fmtPorcentaje(n: number): string {
  return `${Math.round(n)}%`;
}

interface Producto {
  id: string;
  codProdProv: string;
  codigoExterno: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
  descuentoRubro: number;
  descuentoCantidad: number;
  cxTransporte: number;
  disponible: boolean;
  proveedor: { id: string; nombre: string; codigoUnico: string; prefijo: string };
}

const MENSAJE_SIN_FILTRO = "Aplicá al menos un filtro (Proveedor o búsqueda) para ver los productos.";
const MENSAJE_SIN_RESULTADOS = "No se encontraron productos.";

interface Props {
  productos: Producto[];
  rol: Rol;
  /** true cuando no hay filtros aplicados: se muestra mensaje para invitar a filtrar. */
  sinFiltros?: boolean;
}


// ─── Celda editable de porcentaje ──────────────────────────────────────────
function CeldaPorcentaje({
  productoId,
  campo,
  valor,
  onUpdate,
}: {
  productoId: string;
  campo: "descuentoRubro" | "descuentoCantidad" | "cxTransporte";
  valor: number;
  onUpdate: (id: string, campo: string, val: number) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(String(valor));
  const [saving, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleBlur() {
    const num = parseFloat(draft.replace(",", "."));
    if (isNaN(num) || num < 0 || num > 100) {
      setDraft(String(valor));
      setEditando(false);
      return;
    }
    if (num === valor) { setEditando(false); return; }

    startTransition(async () => {
      const res = await editarProducto(productoId, { [campo]: num });
      if (res.ok) {
        onUpdate(productoId, campo, num);
      } else {
        toast.error(res.error);
        setDraft(String(valor));
      }
      setEditando(false);
    });
  }

  if (editando) {
    return (
      <div className="flex items-center justify-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") inputRef.current?.blur();
            if (e.key === "Escape") { setDraft(String(valor)); setEditando(false); }
          }}
          className="w-12 text-center text-xs bg-background border border-input rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
          autoFocus
        />
        <span className="text-xs text-muted-foreground">%</span>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(valor)); setEditando(true); }}
      className="w-full text-center text-xs tabular-nums text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      title="Clic para editar"
    >
      {valor > 0 ? fmtPorcentaje(valor) : <span className="text-muted-foreground">—</span>}
    </button>
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
      const res = await editarProducto(productoId, { disponible: checked });
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

  function handleUpdate(id: string, campo: string, val: number | boolean) {
    setProductos((prev) =>
      prev.map((p) => p.id === id ? { ...p, [campo]: val } : p)
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
    <div className="h-full overflow-auto rounded-lg border border-border/50 bg-card">
      <Table variant="compact">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {puede(rol, col.codProdProv) && (
              <TableHead className="py-2 px-2 text-xs w-16 leading-tight">Cod.<br />Prov.</TableHead>
            )}
            {puede(rol, col.codExt) && (
              <TableHead className="py-2 px-2 text-xs w-24 leading-tight">Cód.<br />Externo</TableHead>
            )}
            {puede(rol, col.descripcion) && (
              <TableHead className="py-2 px-3 text-xs">Descripción</TableHead>
            )}
            {puede(rol, col.proveedor) && (
              <TableHead className="py-2 px-2 text-xs w-14 leading-tight">Prov.</TableHead>
            )}
            {puede(rol, col.precioLista) && (
              <TableHead className="py-2 px-2 text-xs w-20 leading-tight">Px<br />Lista</TableHead>
            )}
            {puede(rol, col.precioVentaSugerido) && (
              <TableHead className="py-2 px-2 text-xs w-20 leading-tight">Px Venta<br />Sug.</TableHead>
            )}
            {puede(rol, col.descuentoRubro) && (
              <TableHead className="py-2 px-2 text-xs w-12 leading-tight">Dto.<br />Rubro</TableHead>
            )}
            {puede(rol, col.descuentoCantidad) && (
              <TableHead className="py-2 px-2 text-xs w-12 leading-tight">Dto.<br />Cant.</TableHead>
            )}
            {puede(rol, col.cxTransporte) && (
              <TableHead className="py-2 px-2 text-xs w-12 leading-tight">Cx<br />Transp.</TableHead>
            )}
            {puede(rol, col.precioCompraFinal) && (
              <TableHead className="py-2 px-2 text-xs w-24 leading-tight">Px Compra<br />Final</TableHead>
            )}
            {puede(rol, col.disponible) && (
              <TableHead className="py-2 px-2 text-xs w-16 leading-tight">Disp.</TableHead>
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
                <TableCell className="py-2 px-2 font-mono text-xs">{prod.codProdProv}</TableCell>
              )}
              {puede(rol, col.codExt) && (
                <TableCell className="py-2 px-2 whitespace-nowrap">
                  <code className="text-xs px-1.5 py-0.5 rounded font-mono bg-muted">{prod.codigoExterno}</code>
                </TableCell>
              )}
              {puede(rol, col.descripcion) && (
                <TableCell className="py-2 px-3 text-xs font-semibold">{prod.descripcion}</TableCell>
              )}
              {puede(rol, col.proveedor) && (
                <TableCell className="py-2 px-2 text-xs font-mono">{prod.proveedor.prefijo}</TableCell>
              )}
              {puede(rol, col.precioLista) && (
                <TableCell className="py-2 px-2 tabular-nums text-xs whitespace-nowrap">${fmtPrecio(prod.precioLista)}</TableCell>
              )}
              {puede(rol, col.precioVentaSugerido) && (
                <TableCell className="py-2 px-2 tabular-nums text-xs font-bold whitespace-nowrap">${fmtPrecio(prod.precioVentaSugerido)}</TableCell>
              )}
              {puede(rol, col.descuentoRubro) && (
                <TableCell className="py-2 px-2 text-center">
                  <CeldaPorcentaje productoId={prod.id} campo="descuentoRubro" valor={prod.descuentoRubro} onUpdate={handleUpdate} />
                </TableCell>
              )}
              {puede(rol, col.descuentoCantidad) && (
                <TableCell className="py-2 px-2 text-center">
                  <CeldaPorcentaje productoId={prod.id} campo="descuentoCantidad" valor={prod.descuentoCantidad} onUpdate={handleUpdate} />
                </TableCell>
              )}
              {puede(rol, col.cxTransporte) && (
                <TableCell className="py-2 px-2 text-center">
                  <CeldaPorcentaje productoId={prod.id} campo="cxTransporte" valor={prod.cxTransporte} onUpdate={handleUpdate} />
                </TableCell>
              )}
              {puede(rol, col.precioCompraFinal) && (
                <TableCell className="py-2 px-2 tabular-nums text-xs font-bold whitespace-nowrap">
                  ${fmtPrecio(calcPxCompraFinal(prod.precioLista, prod.descuentoRubro, prod.descuentoCantidad, prod.cxTransporte))}
                </TableCell>
              )}
              {puede(rol, col.disponible) && (
                <TableCell className="py-2 px-2 text-center">
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
