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
  { key: "dtoFinanciero", label: "Desc. Finan. (%)" },
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
    if (values.dtoFinanciero !== undefined && !Number.isNaN(values.dtoFinanciero)) data.dtoFinanciero = values.dtoFinanciero;
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
      setValues({ dtoProveedor: undefined, dtoMarca: undefined, dtoProducto: undefined, dtoCantidad: undefined, dtoFinanciero: undefined, cxTransporte: undefined });
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
        {/* 1. Título (solo título en el header) */}
        <DialogHeader className="modal-app__header">
          <DialogTitle className="modal-app__title">Edición masiva</DialogTitle>
        </DialogHeader>

        {/* 2. Contenedor único (cuerpo + footer) para que los botones queden dentro del cuadro */}
        <div className="modal-app__content">
          <div className="modal-app__body px-6 py-4 flex flex-col gap-4">
            <p className="text-sm">
              Se aplicará a los <strong>{cantidad.toLocaleString()}</strong> producto
              {cantidad !== 1 ? "s" : ""} del filtro actual.
            </p>

            <div className="grid gap-0 py-1">
              <div className="modal-app__form-row">
                <Label htmlFor="marca" className="text-right font-medium">
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
                <div key={key} className="modal-app__form-row">
                  <Label htmlFor={key} className="text-right font-medium">
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

          <div className="modal-app__footer">
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
