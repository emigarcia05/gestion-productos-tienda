"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { crearProveedor, editarProveedor } from "@/actions/proveedores";

interface Props {
  proveedor?: {
    id: string;
    nombre: string;
    prefijo?: string | null;
    idProveedorDux?: string;
    whatsapp?: string | null;
    coeficienteTintometrico?: number;
    plazosPagos?: string | null;
    /** Flag "Proveedor Mercadería" (solo edición: precarga SI/NO). */
    proveedorMercaderia?: boolean;
  };
  onSuccess?: () => void;
  /** Id del form para asociar botón externo con form="id". */
  id?: string;
  /** Si true, no renderiza la fila del botón Guardar (para usar botonera del modal). */
  hideSubmitButton?: boolean;
  /** Callback cuando cambia el estado de envío (para deshabilitar botón externo). */
  onPendingChange?: (pending: boolean) => void;
  /** Desde el modal: al abrirse, reinicia “Proveedor Mercadería” en alta y precarga en edición. */
  modalOpen?: boolean;
  /** Si el usuario ya eligió SI/NO (para deshabilitar Guardar del modal en alta). */
  onProveedorMercaderiaListoChange?: (listo: boolean) => void;
}

function SubmitButton({ isEdit, pending }: { isEdit: boolean; pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="gap-2">
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {isEdit ? "Guardar cambios" : "Guardar"}
    </Button>
  );
}

export default function ProveedorForm({
  proveedor,
  onSuccess,
  id,
  hideSubmitButton = false,
  onPendingChange,
  modalOpen = true,
  onProveedorMercaderiaListoChange,
}: Props) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!proveedor;

  type ProveedorMercaderiaSel = "si" | "no" | "";

  /**
   * SI/NO de `proveedorMercaderia`. Controlled + hidden `name="proveedorMercaderia"`.
   * Alta: sin valor por defecto (el usuario debe elegir).
   * Edición: precarga el valor persistido.
   */
  const [proveedorMercaderia, setProveedorMercaderia] = useState<ProveedorMercaderiaSel>(() => {
    if (!proveedor) return "";
    return proveedor.proveedorMercaderia === false ? "no" : "si";
  });

  useEffect(() => {
    if (!modalOpen) return;
    if (!proveedor) {
      setProveedorMercaderia("");
    } else {
      setProveedorMercaderia(proveedor.proveedorMercaderia === false ? "no" : "si");
    }
  }, [modalOpen, proveedor?.id, proveedor?.proveedorMercaderia]);

  useEffect(() => {
    onProveedorMercaderiaListoChange?.(proveedorMercaderia !== "");
  }, [proveedorMercaderia, onProveedorMercaderiaListoChange]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (proveedorMercaderia === "") {
      toast.error("Seleccioná SI o NO en Proveedor Mercadería.");
      return;
    }
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      onPendingChange?.(true);
      try {
        const result = isEdit
          ? await editarProveedor(proveedor.id, formData)
          : await crearProveedor(formData);

        if (result.ok) {
          toast.success(isEdit ? "Proveedor actualizado." : "Proveedor guardado con éxito.");
          if (!isEdit) form.reset();
          onSuccess?.();
        } else {
          toast.error(result.error);
        }
      } finally {
        onPendingChange?.(false);
      }
    });
  }

  return (
    <form id={id} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nombre">NOMBRE DEL PROVEEDOR</Label>
        <Input
          id="nombre"
          name="nombre"
          placeholder="EJ: DISTRIBUIDORA NORTE S.A."
          defaultValue={proveedor?.nombre ?? ""}
          required
          minLength={2}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prefijo">PREFIJO</Label>
        <Input
          id="prefijo"
          name="prefijo"
          placeholder="EJ: PIN"
          defaultValue={proveedor?.prefijo ?? ""}
          maxLength={3}
          disabled={pending}
          className="uppercase tracking-widest"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="proveedorMercaderia">
          PROVEEDOR MERCADERÍA{" "}
          <span className="text-destructive" aria-hidden>
            *
          </span>
        </Label>
        <Select
          value={proveedorMercaderia === "" ? undefined : proveedorMercaderia}
          onValueChange={(v) => setProveedorMercaderia(v as "si" | "no")}
          disabled={pending}
          required
        >
          <SelectTrigger id="proveedorMercaderia" className="w-full" aria-required>
            <SelectValue placeholder="SELECCIONAR SI O NO" />
          </SelectTrigger>
          <SelectContent position="popper" side="bottom" align="start">
            <SelectItem value="si">SI</SelectItem>
            <SelectItem value="no">NO</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="proveedorMercaderia" value={proveedorMercaderia} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="idProveedorDux">ID PROVEEDOR EN DUX</Label>
        <Input
          id="idProveedorDux"
          name="idProveedorDux"
          placeholder="EJ: 1234"
          defaultValue={proveedor?.idProveedorDux ?? ""}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="whatsapp">WHATSAPP</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          placeholder="EJ: 5491112345678 (SIN +)"
          defaultValue={proveedor?.whatsapp ?? ""}
          disabled={pending}
          inputMode="numeric"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="plazosPagos">PLAZOS PAGO (DÍAS)</Label>
        <Input
          id="plazosPagos"
          name="plazosPagos"
          placeholder="EJ: 30, 60 O 90, 120, 150"
          defaultValue={proveedor?.plazosPagos ?? ""}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="coeficienteTintometrico">COEF. TINTOMÉTRICO</Label>
        <Input
          id="coeficienteTintometrico"
          name="coeficienteTintometrico"
          placeholder="EJ: 1,250000"
          defaultValue={String(proveedor?.coeficienteTintometrico ?? 1)}
          disabled={pending}
          inputMode="decimal"
        />
      </div>

      {!hideSubmitButton && (
        <div className="flex justify-end gap-2 pt-2">
          <SubmitButton isEdit={isEdit} pending={pending} />
        </div>
      )}
    </form>
  );
}
