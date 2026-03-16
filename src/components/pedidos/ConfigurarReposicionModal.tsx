"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppModal from "@/components/shared/AppModal";
import SelectorProductosReposicionModal from "./SelectorProductosReposicionModal";
import type { ItemReposicion, SucursalReposicion, FormaPedirReposicionOption } from "@/actions/reposicion";
import { upsertReglaReposicion } from "@/actions/reposicion";
import type { ItemSelectorReposicion } from "@/actions/reposicion";

const FORMA_PEDIR_OPTIONS: { value: FormaPedirReposicionOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "CANT_MAXIMA", label: "CANT. MAX." },
  { value: "CANT_FIJA", label: "CANT. FIJA" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemReposicion;
  sucursal: SucursalReposicion;
}

export default function ConfigurarReposicionModal({
  open,
  onOpenChange,
  item,
  sucursal,
}: Props) {
  const router = useRouter();
  const [formaPedir, setFormaPedir] = useState<FormaPedirReposicionOption>(item.formaPedir || "");
  const [puntoReposicion, setPuntoReposicion] = useState(item.puntoReposicion);
  const [cant, setCant] = useState(item.cant);
  const [productosAdicionales, setProductosAdicionales] = useState<ItemSelectorReposicion[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setFormaPedir(item.formaPedir || "");
      setPuntoReposicion(item.puntoReposicion);
      setCant(item.cant);
      setProductosAdicionales([]);
    }
  }, [open, item.idListaTienda, item.codExt, item.formaPedir, item.puntoReposicion, item.cant]);

  const nombreProducto = item.descripcionTienda ?? "—";

  const handleAgregarProductos = (seleccionados: ItemSelectorReposicion[]) => {
    setProductosAdicionales((prev) => {
      const keys = new Set(prev.map((p) => `${p.idListaTienda}:${p.codExt}`));
      const nuevos = seleccionados.filter((p) => !keys.has(`${p.idListaTienda}:${p.codExt}`));
      return [...prev, ...nuevos];
    });
  };

  const handleGuardar = async () => {
    if (!item.idProveedor) {
      toast.error("Este producto no tiene proveedor asignado.");
      return;
    }
    if (!formaPedir) {
      toast.error("Seleccioná Forma Pedir.");
      return;
    }
    const punto = Math.max(0, Math.floor(Number(puntoReposicion)) || 0);
    const cantNum = Math.max(0, Math.floor(Number(cant)) || 0);

    setGuardando(true);
    try {
      const todos: { idProveedor: string; codExt: string }[] = [
        { idProveedor: item.idProveedor, codExt: item.codExt },
        ...productosAdicionales.map((p) => ({ idProveedor: p.idProveedor, codExt: p.codExt })),
      ];
      for (const t of todos) {
        const res = await upsertReglaReposicion({
          idProveedor: t.idProveedor,
          sucursalCodigo: sucursal,
          codExt: t.codExt,
          formaPedir: formaPedir as "CANT_MAXIMA" | "CANT_FIJA",
          puntoReposicion: punto,
          cant: cantNum,
        });
        if (!res.ok) {
          toast.error(res.error ?? "Error al guardar.");
          return;
        }
      }
      toast.success(
        productosAdicionales.length > 0
          ? `Configuración guardada para ${todos.length} producto(s).`
          : "Configuración guardada."
      );
      onOpenChange(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AppModal
          title="Configurar Reposición"
          className="sm:max-w-[40rem] max-h-[100vh]"
          actions={
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button type="button" onClick={handleGuardar} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            <div>
              <Label className="text-sm font-medium text-foreground">Producto</Label>
              <p className="text-sm text-foreground mt-1 font-medium">{nombreProducto}</p>
            </div>

            <div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Label className="text-xs font-medium text-muted-foreground">FORMA PEDIR</Label>
                <Label className="text-xs font-medium text-muted-foreground">PUNTO REPOSICIÓN</Label>
                <Label className="text-xs font-medium text-muted-foreground">CANT. REPOSICIÓN</Label>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <Select
                  value={formaPedir || "none"}
                  onValueChange={(v) => setFormaPedir(v === "none" ? "" : (v as FormaPedirReposicionOption))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start">
                    {FORMA_PEDIR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "none"} value={opt.value || "none"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={puntoReposicion}
                  onChange={(e) => setPuntoReposicion(parseInt(e.target.value, 10) || 0)}
                  className="tabular-nums"
                />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={cant}
                  onChange={(e) => setCant(parseInt(e.target.value, 10) || 0)}
                  className="tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-foreground">Agregar esta configuración a estos productos</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setSelectorOpen(true)}
                aria-label="Abrir selector de productos"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {productosAdicionales.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {productosAdicionales.length} producto(s) agregado(s) para aplicar la misma configuración.
              </div>
            )}
          </div>
        </AppModal>
      </Dialog>

      <SelectorProductosReposicionModal
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        sucursal={sucursal}
        onConfirmar={handleAgregarProductos}
        excludeIds={[item.idListaTienda]}
      />
    </>
  );
}
