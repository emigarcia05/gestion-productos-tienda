"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { editarProducto } from "@/actions/productos";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";

interface Producto {
  id: string;
  codProdProv: string;
  codExt: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
  descuentoProducto: number;
  descuentoCantidad: number;
  cxTransporte: number;
  disponible: boolean;
  proveedor: { id: string; nombre: string; codigoUnico: string; sufijo: string };
}

interface Props {
  productos: Producto[];
  rol: Rol;
}

function calcPxCompraFinal(p: Producto): number {
  let precio = p.precioLista;
  precio = precio * (1 - p.descuentoProducto / 100);
  precio = precio * (1 - p.descuentoCantidad / 100);
  precio = precio * (1 + p.cxTransporte / 100);
  return precio;
}

/** Formatea un número como precio: separador de miles con punto, sin decimales. */
function fmtPrecio(n: number): string {
  return Math.round(n).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Formatea un porcentaje sin decimales. */
function fmtPct(n: number): string {
  return `${Math.round(n)}%`;
}

// ─── Celda editable de porcentaje ──────────────────────────────────────────
function CeldaPorcentaje({
  productoId,
  campo,
  valor,
  onUpdate,
}: {
  productoId: string;
  campo: "descuentoProducto" | "descuentoCantidad" | "cxTransporte";
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
      className="w-full text-center text-xs tabular-nums hover:text-primary transition-colors cursor-pointer"
      title="Clic para editar"
    >
      {valor > 0 ? fmtPct(valor) : <span className="text-muted-foreground">—</span>}
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
export default function TablaProductosFiltrada({ productos: inicial, rol }: Props) {
  const [productos, setProductos] = useState(inicial);
  const col = PERMISOS.proveedores.tabla;

  function handleUpdate(id: string, campo: string, val: number | boolean) {
    setProductos((prev) =>
      prev.map((p) => p.id === id ? { ...p, [campo]: val } : p)
    );
  }

  if (productos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No se encontraron productos.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-brand backdrop-blur-sm">
          <tr className="border-b border-brand-fg/20">
            {puede(rol, col.codProdProv) && (
              <th className="text-center py-2 px-2 text-brand-fg font-semibold text-xs w-16 leading-tight">
                Cod.<br />Prov.
              </th>
            )}
            {puede(rol, col.codExt) && (
              <th className="text-center py-2 px-2 text-brand-fg font-semibold text-xs w-24 leading-tight">
                Cód.<br />Externo
              </th>
            )}
            {puede(rol, col.descripcion) && (
              <th className="text-center py-2 px-3 text-brand-fg font-semibold text-xs">
                Descripción
              </th>
            )}
            {puede(rol, col.proveedor) && (
              <th className="text-center py-2 px-2 text-brand-fg font-semibold text-xs w-14 leading-tight">
                Prov.
              </th>
            )}
            {puede(rol, col.precioLista) && (
              <th className="text-center py-2 px-2 text-brand-fg font-semibold text-xs w-20 leading-tight">
                Px<br />Lista
              </th>
            )}
            {puede(rol, col.precioVentaSugerido) && (
              <th className="text-center py-2 px-2 text-brand-fg font-semibold text-xs w-20 leading-tight">
                Px Venta<br />Sug.
              </th>
            )}
            {puede(rol, col.descuentoProducto) && (
              <th className="text-center py-2 px-2 text-brand-fg font-semibold text-xs w-12 leading-tight">
                Dto.<br />Prod.
              </th>
            )}
            {puede(rol, col.descuentoCantidad) && (
              <th className="text-center py-2 px-2 text-brand-fg font-semibold text-xs w-12 leading-tight">
                Dto.<br />Cant.
              </th>
            )}
            {puede(rol, col.cxTransporte) && (
              <th className="text-center py-2 px-2 text-brand-fg font-semibold text-xs w-12 leading-tight">
                Cx<br />Transp.
              </th>
            )}
            {puede(rol, col.precioCompraFinal) && (
              <th className="text-center py-2 px-2 text-brand-fg font-semibold text-xs w-24 leading-tight">
                Px Compra<br />Final
              </th>
            )}
            {puede(rol, col.disponible) && (
              <th className="text-center py-2 px-2 text-brand-fg font-semibold text-xs w-16 leading-tight">
                Disp.
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {productos.map((prod) => (
            <tr key={prod.id} className="tabla-row transition-colors">
              {puede(rol, col.codProdProv) && (
                <td className="py-2 px-2 text-center font-mono text-xs text-muted-foreground">
                  {prod.codProdProv}
                </td>
              )}
              {puede(rol, col.codExt) && (
                <td className="py-2 px-2 text-center whitespace-nowrap">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{prod.codExt}</code>
                </td>
              )}
              {puede(rol, col.descripcion) && (
                <td className="py-2 px-3 text-center">{prod.descripcion}</td>
              )}
              {puede(rol, col.proveedor) && (
                <td className="py-2 px-2 text-center">
                  <Badge variant="secondary" className="font-mono text-xs px-1.5">{prod.proveedor.sufijo}</Badge>
                </td>
              )}
              {puede(rol, col.precioLista) && (
                <td className="py-2 px-2 text-center tabular-nums text-xs whitespace-nowrap">
                  ${fmtPrecio(prod.precioLista)}
                </td>
              )}
              {puede(rol, col.precioVentaSugerido) && (
                <td className="py-2 px-2 text-center tabular-nums text-xs whitespace-nowrap">
                  ${fmtPrecio(prod.precioVentaSugerido)}
                </td>
              )}
              {puede(rol, col.descuentoProducto) && (
                <td className="py-2 px-2 text-center">
                  <CeldaPorcentaje productoId={prod.id} campo="descuentoProducto" valor={prod.descuentoProducto} onUpdate={handleUpdate} />
                </td>
              )}
              {puede(rol, col.descuentoCantidad) && (
                <td className="py-2 px-2 text-center">
                  <CeldaPorcentaje productoId={prod.id} campo="descuentoCantidad" valor={prod.descuentoCantidad} onUpdate={handleUpdate} />
                </td>
              )}
              {puede(rol, col.cxTransporte) && (
                <td className="py-2 px-2 text-center">
                  <CeldaPorcentaje productoId={prod.id} campo="cxTransporte" valor={prod.cxTransporte} onUpdate={handleUpdate} />
                </td>
              )}
              {puede(rol, col.precioCompraFinal) && (
                <td className="py-2 px-2 text-center tabular-nums text-xs font-medium whitespace-nowrap">
                  ${fmtPrecio(calcPxCompraFinal(prod))}
                </td>
              )}
              {puede(rol, col.disponible) && (
                <td className="py-2 px-2 text-center">
                  <CeldaDisponible productoId={prod.id} valor={prod.disponible} onUpdate={handleUpdate} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
