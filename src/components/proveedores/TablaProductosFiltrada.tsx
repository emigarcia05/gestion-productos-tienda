"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { editarProducto } from "@/actions/productos";

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
      <div className="flex items-center justify-end gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") inputRef.current?.blur();
            if (e.key === "Escape") { setDraft(String(valor)); setEditando(false); }
          }}
          className="w-12 text-right text-xs bg-background border border-input rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
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
      className="w-full text-right text-xs tabular-nums hover:text-primary transition-colors cursor-pointer"
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
export default function TablaProductosFiltrada({ productos: inicial }: Props) {
  const [productos, setProductos] = useState(inicial);

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
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
          <tr className="border-b border-border/50">
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-16 leading-tight">
              Cod.<br />Prov.
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-24 leading-tight">
              Cód.<br />Externo
            </th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium text-xs">
              Descripción
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-14 leading-tight">
              Prov.
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-20 leading-tight">
              Px<br />Lista
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-20 leading-tight">
              Px Venta<br />Sug.
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-12 leading-tight">
              Dto.<br />Prod.
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-12 leading-tight">
              Dto.<br />Cant.
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-12 leading-tight">
              Cx<br />Transp.
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-24 leading-tight">
              Px Compra<br />Final
            </th>
            <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-16 leading-tight">
              Disp.
            </th>
          </tr>
        </thead>
        <tbody>
          {productos.map((prod) => (
            <tr key={prod.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
              <td className="py-2 px-2 font-mono text-xs text-muted-foreground">
                {prod.codProdProv}
              </td>
              <td className="py-2 px-2 whitespace-nowrap">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{prod.codExt}</code>
              </td>
              <td className="py-2 px-3">{prod.descripcion}</td>
              <td className="py-2 px-2">
                <Badge variant="secondary" className="font-mono text-xs px-1.5">{prod.proveedor.sufijo}</Badge>
              </td>
              <td className="py-2 px-2 text-right tabular-nums text-xs whitespace-nowrap">
                ${fmtPrecio(prod.precioLista)}
              </td>
              <td className="py-2 px-2 text-right tabular-nums text-xs whitespace-nowrap">
                ${fmtPrecio(prod.precioVentaSugerido)}
              </td>
              <td className="py-2 px-2">
                <CeldaPorcentaje productoId={prod.id} campo="descuentoProducto" valor={prod.descuentoProducto} onUpdate={handleUpdate} />
              </td>
              <td className="py-2 px-2">
                <CeldaPorcentaje productoId={prod.id} campo="descuentoCantidad" valor={prod.descuentoCantidad} onUpdate={handleUpdate} />
              </td>
              <td className="py-2 px-2">
                <CeldaPorcentaje productoId={prod.id} campo="cxTransporte" valor={prod.cxTransporte} onUpdate={handleUpdate} />
              </td>
              <td className="py-2 px-2 text-right tabular-nums text-xs font-medium whitespace-nowrap">
                ${fmtPrecio(calcPxCompraFinal(prod))}
              </td>
              <td className="py-2 px-2">
                <CeldaDisponible productoId={prod.id} valor={prod.disponible} onUpdate={handleUpdate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
