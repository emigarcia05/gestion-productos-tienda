"use client";

import { useState, useTransition } from "react";
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
    /** Flag "Proveedor Mercadería" (FK-less). `false` por defecto. */
    proveedorMercaderia?: boolean;
  };
  onSuccess?: () => void;
  /** Id del form para asociar botón externo con form="id". */
  id?: string;
  /** Si true, no renderiza la fila del botón Guardar (para usar botonera del modal). */
  hideSubmitButton?: boolean;
  /** Callback cuando cambia el estado de envío (para deshabilitar botón externo). */
  onPendingChange?: (pending: boolean) => void;
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
}: Props) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!proveedor;

  /**
   * Estado SI/NO del flag `proveedorMercaderia`. Controlled porque shadcn `Select`
   * no rellena `FormData`; sincronizamos un hidden `<input name="proveedorMercaderia">`.
   *
   * Default:
   * - Edición: precarga el valor persistido.
   * - Alta: "si" (UX — el modal se abre desde `/gestion-productos/proveedores/lista`,
   *   donde lo natural es querer que el nuevo proveedor aparezca en esa lista).
   */
  const [proveedorMercaderia, setProveedorMercaderia] = useState<"si" | "no">(
    proveedor?.proveedorMercaderia === false ? "no" : "si"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
        <Label htmlFor="prefijo">
          PREFIJO{" "}
          <span className="text-muted-foreground font-normal text-xs uppercase">
            (OPCIONAL; PREFIJO DEL CÓDIGO EXTERNO)
          </span>
        </Label>
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
        <p className="text-xs text-muted-foreground">
          Si lo completás, exactamente 3 letras (A-Z). Ej. código externo{" "}
          <code className="bg-muted px-1 rounded">PIN-CODPROD</code>. Si lo dejás vacío, el sistema asigna un
          código interno para importaciones y vínculos.
        </p>
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
        <p className="text-xs text-muted-foreground">
          Identificador del proveedor en el sistema DUX (se usa para actualizar costos vía API).
        </p>
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
        <p className="text-xs text-muted-foreground">
          Número para envío de pedido por WhatsApp (internacional, 10 a 15 dígitos, sin +).
        </p>
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
        <p className="text-xs text-muted-foreground">
          Días hasta cada vencimiento desde la fecha del comprobante (30, 60, 90, 120 o 150). Varios valores
          separados por coma, orden creciente; el total se divide en tantas cuotas.
        </p>
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
        <p className="text-xs text-muted-foreground">
          Se usa para el cálculo: monto ingresado x coeficiente del proveedor.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="proveedorMercaderia">PROVEEDOR MERCADERÍA</Label>
        <Select
          value={proveedorMercaderia}
          onValueChange={(v) => setProveedorMercaderia(v as "si" | "no")}
          disabled={pending}
        >
          <SelectTrigger id="proveedorMercaderia" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" side="bottom" align="start">
            <SelectItem value="si">SI</SelectItem>
            <SelectItem value="no">NO</SelectItem>
          </SelectContent>
        </Select>
        {/* Hidden input para que el valor llegue vía FormData al action */}
        <input type="hidden" name="proveedorMercaderia" value={proveedorMercaderia} />
        <p className="text-xs text-muted-foreground">
          Si es <strong>SI</strong>, aparece en la lista de{" "}
          <code className="bg-muted px-1 rounded">/gestion-productos/proveedores/lista</code>.
        </p>
      </div>

      {!hideSubmitButton && (
        <div className="flex justify-end gap-2 pt-2">
          <SubmitButton isEdit={isEdit} pending={pending} />
        </div>
      )}
    </form>
  );
}
