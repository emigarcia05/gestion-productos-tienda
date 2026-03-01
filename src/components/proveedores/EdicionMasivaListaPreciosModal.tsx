"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarListaPreciosMasivoAction, type ActualizacionMasivaListaPrecios } from "@/actions/listaPrecios";

const CAMPOS: { key: keyof ActualizacionMasivaListaPrecios; label: string }[] = [
  { key: "dtoMarca", label: "Desc. Marca (%)" },
  { key: "dtoProducto", label: "Desc. Producto (%)" },
  { key: "dtoCantidad", label: "Desc. Cantidad (%)" },
  { key: "cxAproxTransporte", label: "Cx. Aprox Transporte (%)" },
];

interface Props {
  filteredIds: string[];
  disabled?: boolean;
  onSuccess?: () => void;
}

export default function EdicionMasivaListaPreciosModal({
  filteredIds,
  disabled = false,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState<ActualizacionMasivaListaPrecios>({
    dtoMarca: undefined,
    dtoProducto: undefined,
    dtoCantidad: undefined,
    cxAproxTransporte: undefined,
  });

  function handleChange(key: keyof ActualizacionMasivaListaPrecios, value: string) {
    const num = value === "" ? undefined : parseInt(value, 10);
    setValues((prev) => ({ ...prev, [key]: num }));
  }

  async function handleGuardar() {
    const data: ActualizacionMasivaListaPrecios = {};
    if (values.dtoMarca !== undefined && !Number.isNaN(values.dtoMarca)) data.dtoMarca = values.dtoMarca;
    if (values.dtoProducto !== undefined && !Number.isNaN(values.dtoProducto)) data.dtoProducto = values.dtoProducto;
    if (values.dtoCantidad !== undefined && !Number.isNaN(values.dtoCantidad)) data.dtoCantidad = values.dtoCantidad;
    if (values.cxAproxTransporte !== undefined && !Number.isNaN(values.cxAproxTransporte)) data.cxAproxTransporte = values.cxAproxTransporte;

    if (Object.keys(data).length === 0) {
      toast.error("Ingresá al menos un valor para actualizar.");
      return;
    }
    setPending(true);
    try {
      const result = await actualizarListaPreciosMasivoAction(filteredIds, data);
      if (!result.ok) {
        toast.error(result.error ?? "Error al actualizar.");
        return;
      }
      toast.success(`Se actualizaron ${result.actualizados ?? 0} productos.`);
      setOpen(false);
      setValues({ dtoMarca: undefined, dtoProducto: undefined, dtoCantidad: undefined, cxAproxTransporte: undefined });
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  const cantidad = filteredIds.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="default"
          className="gap-2 shrink-0"
          disabled={disabled || cantidad === 0}
        >
          <Pencil className="h-4 w-4 shrink-0" />
          Edición masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="modal-app">
        <DialogHeader className="modal-app__header">
          <DialogTitle className="modal-app__title">
            Edición masiva
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Se aplicará a los <strong>{cantidad.toLocaleString()}</strong> producto{cantidad !== 1 ? "s" : ""} del filtro actual.
          </p>
          <div className="grid gap-4 py-2">
            {CAMPOS.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-2 gap-4 items-center">
                <Label htmlFor={key} className="text-right">
                  {label}
                </Label>
                <Input
                  id={key}
                  type="number"
                  min={0}
                  max={100}
                  placeholder="—"
                  value={values[key] ?? ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="tabular-nums"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGuardar} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
