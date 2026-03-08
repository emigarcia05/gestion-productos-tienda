"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearProveedor, editarProveedor } from "@/actions/proveedores";

interface Props {
  proveedor?: { id: string; nombre: string; prefijo: string };
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
        <Label htmlFor="nombre">Nombre del proveedor</Label>
        <Input
          id="nombre"
          name="nombre"
          placeholder="Ej: Distribuidora Norte S.A."
          defaultValue={proveedor?.nombre ?? ""}
          required
          minLength={2}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prefijo">
          Prefijo{" "}
          <span className="text-muted-foreground font-normal text-xs">
            (se usará como prefijo del código externo)
          </span>
        </Label>
        <Input
          id="prefijo"
          name="prefijo"
          placeholder="Ej: PIN"
          defaultValue={proveedor?.prefijo ?? ""}
          required
          minLength={3}
          maxLength={3}
          disabled={pending}
          className="uppercase tracking-widest"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
          }}
        />
        <p className="text-xs text-muted-foreground">
          Exactamente 3 letras. El código externo quedará como{" "}
          <code className="bg-muted px-1 rounded">PIN-CODPROD</code>
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
