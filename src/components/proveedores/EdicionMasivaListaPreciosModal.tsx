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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actualizarListaPreciosMasivoAction, type ActualizacionMasivaListaPrecios } from "@/actions/listaPrecios";

interface MarcaOption {
  id: string;
  nombre: string;
}

const CAMPOS_NUMERICOS: { key: keyof ActualizacionMasivaListaPrecios; label: string }[] = [
  { key: "dtoProveedor", label: "Desc. Proveedor (%)" },
  { key: "dtoMarca", label: "Desc. Marca (%)" },
  { key: "dtoProducto", label: "Desc. Productor (%)" },
  { key: "dtoCantidad", label: "Desc. Cantidad (%)" },
  { key: "cxTransporte", label: "Cx. Aprox. Transporte (%)" },
];

interface Props {
  filteredIds: string[];
  marcas: MarcaOption[];
  disabled?: boolean;
  onSuccess?: () => void;
}

export default function EdicionMasivaListaPreciosModal({
  filteredIds,
  marcas,
  disabled = false,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [marcaNombre, setMarcaNombre] = useState<string>("");
  const [values, setValues] = useState<ActualizacionMasivaListaPrecios>({
    dtoProveedor: undefined,
    dtoMarca: undefined,
    dtoProducto: undefined,
    dtoCantidad: undefined,
    cxTransporte: undefined,
  });

  function handleChange(key: keyof ActualizacionMasivaListaPrecios, value: string) {
    const num = value === "" ? undefined : parseInt(value, 10);
    setValues((prev) => ({ ...prev, [key]: num }));
  }

  async function handleGuardar() {
    const data: ActualizacionMasivaListaPrecios = {};
    if (marcaNombre) data.marca = marcaNombre;
    if (values.dtoProveedor !== undefined && !Number.isNaN(values.dtoProveedor)) data.dtoProveedor = values.dtoProveedor;
    if (values.dtoMarca !== undefined && !Number.isNaN(values.dtoMarca)) data.dtoMarca = values.dtoMarca;
    if (values.dtoProducto !== undefined && !Number.isNaN(values.dtoProducto)) data.dtoProducto = values.dtoProducto;
    if (values.dtoCantidad !== undefined && !Number.isNaN(values.dtoCantidad)) data.dtoCantidad = values.dtoCantidad;
    if (values.cxTransporte !== undefined && !Number.isNaN(values.cxTransporte)) data.cxTransporte = values.cxTransporte;

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
      setMarcaNombre("");
      setValues({ dtoProveedor: undefined, dtoMarca: undefined, dtoProducto: undefined, dtoCantidad: undefined, cxTransporte: undefined });
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
          variant="default"
          size="default"
          className="btn-primario-gestion gap-2 shrink-0"
          disabled={disabled || cantidad === 0}
        >
          <Pencil className="h-4 w-4 shrink-0" />
          Edición masiva
        </Button>
      </DialogTrigger>
      <DialogContent className="modal-app">
        {/* 1. Título */}
        <DialogHeader className="modal-app__header">
          <DialogTitle className="modal-app__title">
            Edición masiva
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Se aplicará a los <strong>{cantidad.toLocaleString()}</strong> producto{cantidad !== 1 ? "s" : ""} del filtro actual.
          </p>
        </DialogHeader>

        {/* 2. Campos: Marca (select) + descuentos (%) en orden */}
        <div className="modal-app__body px-6 py-4 flex flex-col gap-4">
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4 items-center">
              <Label htmlFor="marca" className="text-right text-muted-foreground font-medium">
                Marca
              </Label>
              <Select value={marcaNombre || "none"} onValueChange={(v) => setMarcaNombre(v === "none" ? "" : v)}>
                <SelectTrigger id="marca" className="input-filtro-unificado tabular-nums">
                  <SelectValue placeholder="Seleccionar marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {marcas.map((m) => (
                    <SelectItem key={m.id} value={m.nombre}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {CAMPOS_NUMERICOS.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-2 gap-4 items-center">
                <Label htmlFor={key} className="text-right text-muted-foreground font-medium">
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
        </div>

        {/* 3. Botón Guardar */}
        <div className="px-6 pt-6 pb-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleGuardar} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
