"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Settings2, ChevronDown, Loader2, CheckCircle2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { aplicarCampoMasivo, type CampoMasivo } from "@/actions/productos";

interface Proveedor {
  id: string;
  nombre: string;
  prefijo: string;
}

interface Props {
  proveedores: Proveedor[];
  /** Filtros activos en la tabla al momento de abrir el modal */
  filtroProveedorActual?: string;
  filtroBusquedaActual?: string;
  totalFiltrado: number;
}

const CAMPOS_OPCIONES: { value: CampoMasivo; label: string; tipo: "porcentaje" | "boolean" }[] = [
  { value: "descuentoRubro", label: "Descuento rubro", tipo: "porcentaje" },
  { value: "descuentoCantidad", label: "Descuento por cant.", tipo: "porcentaje" },
  { value: "cxTransporte",      label: "Cx Transporte",      tipo: "porcentaje" },
  { value: "disponible",        label: "Disponible",         tipo: "boolean" },
];

export default function AccionMasivaModal({
  proveedores,
  filtroProveedorActual = "",
  filtroBusquedaActual = "",
  totalFiltrado,
}: Props) {
  const [open, setOpen] = useState(false);
  const [proveedorId, setProveedorId] = useState(filtroProveedorActual);
  const [usarFiltroQ, setUsarFiltroQ] = useState(!!filtroBusquedaActual);
  const [campo, setCampo] = useState<CampoMasivo>("descuentoRubro");
  const [valor, setValor] = useState("");
  const [pending, startTransition] = useTransition();
  const [afectados, setAfectados] = useState<number | null>(null);

  const campoActual = CAMPOS_OPCIONES.find((c) => c.value === campo)!;
  const hayFiltroQ = !!filtroBusquedaActual;
  const qEfectivo = usarFiltroQ ? filtroBusquedaActual : undefined;

  function handleOpen(v: boolean) {
    if (v) {
      // Al abrir, sincronizar con los filtros actuales de la tabla
      setProveedorId(filtroProveedorActual);
      setUsarFiltroQ(!!filtroBusquedaActual);
      setAfectados(null);
      setValor("");
    }
    setOpen(v);
  }

  function handleAplicar() {
    if (!proveedorId) { toast.error("Seleccioná un proveedor."); return; }

    let valorFinal: number | boolean;
    if (campoActual.tipo === "boolean") {
      if (!valor) { toast.error("Seleccioná un valor."); return; }
      valorFinal = valor === "true";
    } else {
      const num = parseFloat(valor.replace(",", "."));
      if (isNaN(num) || num < 0 || num > 100) { toast.error("Ingresá un porcentaje válido (0–100)."); return; }
      valorFinal = num;
    }

    startTransition(async () => {
      const res = await aplicarCampoMasivo(proveedorId, campo, valorFinal, qEfectivo);
      if (res.ok) {
        setAfectados(res.data.afectados);
        toast.success(`Aplicado a ${res.data.afectados} productos.`);
      } else {
        toast.error(res.error);
      }
    });
  }

  const proveedorNombre = proveedores.find((p) => p.id === proveedorId);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="default" size="default" className="btn-primario-gestion gap-2 shrink-0">
              <Settings2 className="h-4 w-4" />
              Acción Masiva
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Aplicar cambios a varios productos</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acción masiva</DialogTitle>
        </DialogHeader>

        {afectados !== null ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              Se actualizaron {afectados} productos correctamente.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setAfectados(null); setValor(""); }}>Nueva acción</Button>
              <Button onClick={() => handleOpen(false)}>Cerrar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">

            {/* Alcance de la acción */}
            <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2.5 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alcance</p>

              <div className="space-y-1.5">
                <Label className="text-xs">Proveedor</Label>
                <div className="relative">
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>[{p.prefijo}] {p.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Opción de aplicar solo a los productos del filtro de búsqueda activo */}
              {hayFiltroQ && (
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={usarFiltroQ}
                    onChange={(e) => setUsarFiltroQ(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    Solo productos que coincidan con{" "}
                    <Badge variant="secondary" className="font-mono text-xs px-1.5">
                      {filtroBusquedaActual}
                    </Badge>
                  </span>
                </label>
              )}

              {/* Resumen del alcance */}
              {proveedorId && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                  <Filter className="h-3 w-3" />
                  <span>
                    {usarFiltroQ && hayFiltroQ
                      ? <>Afectará aprox. <strong className="text-foreground">{totalFiltrado}</strong> productos filtrados de [{proveedorNombre?.prefijo}]</>
                      : <>Afectará <strong className="text-foreground">todos</strong> los productos de [{proveedorNombre?.prefijo}]</>
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Campo y valor */}
            <div className="space-y-1.5">
              <Label>Campo</Label>
              <div className="relative">
                <select
                  value={campo}
                  onChange={(e) => { setCampo(e.target.value as CampoMasivo); setValor(""); }}
                  className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CAMPOS_OPCIONES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
                    type="number" min={0} max={100} step={0.1} placeholder="Ej: 10"
                    value={valor} onChange={(e) => setValor(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">%</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpen(false)} disabled={pending}>Cancelar</Button>
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
