"use client";

import { useState, useMemo, useTransition, useRef } from "react";
import { ChevronDown, Search, Loader2, Settings2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { editarProducto, aplicarCampoMasivo, type CampoMasivo } from "@/actions/productos";

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

interface Proveedor {
  id: string;
  nombre: string;
  codigoUnico: string;
  sufijo: string;
}

interface Props {
  productos: Producto[];
  proveedores: Proveedor[];
}

// ─── Cálculo de Px Compra Final ────────────────────────────────────────────
function calcPxCompraFinal(p: Producto): number {
  let precio = p.precioLista;
  precio = precio * (1 - p.descuentoProducto / 100);
  precio = precio * (1 - p.descuentoCantidad / 100);
  precio = precio * (1 + p.cxTransporte / 100);
  return precio;
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
          onKeyDown={(e) => { if (e.key === "Enter") inputRef.current?.blur(); if (e.key === "Escape") { setDraft(String(valor)); setEditando(false); } }}
          className="w-16 text-right text-xs bg-background border border-input rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
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
      {valor > 0 ? `${valor}%` : <span className="text-muted-foreground">—</span>}
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

// ─── Modal de acción masiva ────────────────────────────────────────────────
function AccionMasivaModal({ proveedores }: { proveedores: Proveedor[] }) {
  const [open, setOpen] = useState(false);
  const [proveedorId, setProveedorId] = useState("");
  const [campo, setCampo] = useState<CampoMasivo>("descuentoProducto");
  const [valor, setValor] = useState("");
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<number | null>(null);

  const camposOpciones: { value: CampoMasivo; label: string; tipo: "porcentaje" | "boolean" }[] = [
    { value: "descuentoProducto", label: "Descuento producto", tipo: "porcentaje" },
    { value: "descuentoCantidad", label: "Descuento por cant.", tipo: "porcentaje" },
    { value: "cxTransporte",      label: "Cx Transporte",      tipo: "porcentaje" },
    { value: "disponible",        label: "Disponible",         tipo: "boolean" },
  ];

  const campoActual = camposOpciones.find((c) => c.value === campo)!;

  function handleAplicar() {
    if (!proveedorId) { toast.error("Seleccioná un proveedor."); return; }

    let valorFinal: number | boolean;
    if (campoActual.tipo === "boolean") {
      valorFinal = valor === "true";
    } else {
      const num = parseFloat(valor.replace(",", "."));
      if (isNaN(num) || num < 0 || num > 100) { toast.error("Ingresá un porcentaje válido (0-100)."); return; }
      valorFinal = num;
    }

    startTransition(async () => {
      const res = await aplicarCampoMasivo(proveedorId, campo, valorFinal);
      if (res.ok) {
        setResultado(res.data.afectados);
        toast.success(`Aplicado a ${res.data.afectados} productos.`);
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleClose(v: boolean) {
    if (!v) { setProveedorId(""); setValor(""); setResultado(null); }
    setOpen(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Acción masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acción masiva por proveedor</DialogTitle>
        </DialogHeader>

        {resultado !== null ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              Se actualizaron {resultado} productos correctamente.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResultado(null)}>Nueva acción</Button>
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <div className="relative">
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>[{p.sufijo}] {p.nombre}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Campo a modificar</Label>
              <div className="relative">
                <select
                  value={campo}
                  onChange={(e) => { setCampo(e.target.value as CampoMasivo); setValor(""); }}
                  className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {camposOpciones.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Valor</Label>
              {campoActual.tipo === "boolean" ? (
                <div className="relative">
                  <select
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="true">Disponible</option>
                    <option value="false">No disponible</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="Ej: 10"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">%</span>
                </div>
              )}
              {campoActual.tipo === "porcentaje" && (
                <p className="text-xs text-muted-foreground">
                  Se aplicará a todos los productos del proveedor seleccionado.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)} disabled={pending}>Cancelar</Button>
              <Button onClick={handleAplicar} disabled={pending || !proveedorId || !valor} className="gap-2">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Aplicar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Tabla principal ───────────────────────────────────────────────────────
export default function TablaProductosFiltrada({ productos: inicial, proveedores }: Props) {
  const [productos, setProductos] = useState(inicial);
  const [proveedorFiltro, setProveedorFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("todos");

  // Sincronizar cuando el servidor revalida
  useState(() => { setProductos(inicial); });

  function handleUpdate(id: string, campo: string, val: number | boolean) {
    setProductos((prev) =>
      prev.map((p) => p.id === id ? { ...p, [campo]: val } : p)
    );
  }

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideProveedor = proveedorFiltro === "todos" || p.proveedor.id === proveedorFiltro;
      const q = busqueda === "todos" ? "" : busqueda.toLowerCase();
      const coincideBusqueda = !q ||
        p.descripcion.toLowerCase().includes(q) ||
        p.codExt.toLowerCase().includes(q) ||
        p.codProdProv.toLowerCase().includes(q);
      return coincideProveedor && coincideBusqueda;
    });
  }, [productos, proveedorFiltro, busqueda]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por descripción o código..."
            onChange={(e) => setBusqueda(e.target.value || "todos")}
            className="pl-9"
          />
        </div>
        <div className="relative sm:w-64">
          <select
            value={proveedorFiltro}
            onChange={(e) => setProveedorFiltro(e.target.value)}
            className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="todos">Todos los proveedores</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>[{p.sufijo}] {p.nombre}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <AccionMasivaModal proveedores={proveedores} />
      </div>

      <p className="text-xs text-muted-foreground">
        {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? "s" : ""}
        {proveedorFiltro !== "todos" || busqueda !== "todos" ? " encontrados" : " en total"}
      </p>

      {productosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">No se encontraron productos.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">Cod. Prod. Prov.</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">Cód. Externo</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Descripción</th>
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">Proveedor</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">Px Lista</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">Px Venta Sug.</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">Dto. Prod.</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">Dto. Cant.</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">Cx Transp.</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium whitespace-nowrap">Px Compra Final</th>
                <th className="text-center py-2.5 px-3 text-muted-foreground font-medium">Disponible</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((prod) => (
                <tr key={prod.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {prod.codProdProv}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{prod.codExt}</code>
                  </td>
                  <td className="py-2.5 px-3 max-w-[200px] truncate">{prod.descripcion}</td>
                  <td className="py-2.5 px-3">
                    <Badge variant="secondary" className="font-mono text-xs">{prod.proveedor.sufijo}</Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                    ${prod.precioLista.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                    ${prod.precioVentaSugerido.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 w-20">
                    <CeldaPorcentaje productoId={prod.id} campo="descuentoProducto" valor={prod.descuentoProducto} onUpdate={handleUpdate} />
                  </td>
                  <td className="py-2.5 px-3 w-20">
                    <CeldaPorcentaje productoId={prod.id} campo="descuentoCantidad" valor={prod.descuentoCantidad} onUpdate={handleUpdate} />
                  </td>
                  <td className="py-2.5 px-3 w-20">
                    <CeldaPorcentaje productoId={prod.id} campo="cxTransporte" valor={prod.cxTransporte} onUpdate={handleUpdate} />
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-medium whitespace-nowrap">
                    ${calcPxCompraFinal(prod).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3">
                    <CeldaDisponible productoId={prod.id} valor={prod.disponible} onUpdate={handleUpdate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
