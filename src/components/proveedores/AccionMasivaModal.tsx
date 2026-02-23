"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Settings2, ChevronDown, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { aplicarCampoMasivo, type CampoMasivo } from "@/actions/productos";

interface Proveedor {
  id: string;
  nombre: string;
  sufijo: string;
}

const CAMPOS_OPCIONES: { value: CampoMasivo; label: string; tipo: "porcentaje" | "boolean" }[] = [
  { value: "descuentoProducto", label: "Descuento producto", tipo: "porcentaje" },
  { value: "descuentoCantidad", label: "Descuento por cant.", tipo: "porcentaje" },
  { value: "cxTransporte",      label: "Cx Transporte",      tipo: "porcentaje" },
  { value: "disponible",        label: "Disponible",         tipo: "boolean" },
];

export default function AccionMasivaModal({ proveedores }: { proveedores: Proveedor[] }) {
  const [open, setOpen] = useState(false);
  const [proveedorId, setProveedorId] = useState("");
  const [campo, setCampo] = useState<CampoMasivo>("descuentoProducto");
  const [valor, setValor] = useState("");
  const [pending, startTransition] = useTransition();
  const [afectados, setAfectados] = useState<number | null>(null);

  const campoActual = CAMPOS_OPCIONES.find((c) => c.value === campo)!;

  function handleClose(v: boolean) {
    if (!v) { setProveedorId(""); setValor(""); setAfectados(null); }
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
      const res = await aplicarCampoMasivo(proveedorId, campo, valorFinal);
      if (res.ok) {
        setAfectados(res.data.afectados);
        toast.success(`Aplicado a ${res.data.afectados} productos.`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shrink-0">
          <Settings2 className="h-4 w-4" />
          Acción masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acción masiva por proveedor</DialogTitle>
        </DialogHeader>

        {afectados !== null ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              Se actualizaron {afectados} productos correctamente.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setAfectados(null); setValor(""); }}>Nueva acción</Button>
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <div className="relative">
                <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}
                  className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>[{p.sufijo}] {p.nombre}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Campo</Label>
              <div className="relative">
                <select value={campo} onChange={(e) => { setCampo(e.target.value as CampoMasivo); setValor(""); }}
                  className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {CAMPOS_OPCIONES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Valor</Label>
              {campoActual.tipo === "boolean" ? (
                <div className="relative">
                  <select value={valor} onChange={(e) => setValor(e.target.value)}
                    className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Seleccionar...</option>
                    <option value="true">Disponible</option>
                    <option value="false">No disponible</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={100} step={0.1} placeholder="Ej: 10"
                    value={valor} onChange={(e) => setValor(e.target.value)} />
                  <span className="text-sm text-muted-foreground shrink-0">%</span>
                </div>
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
