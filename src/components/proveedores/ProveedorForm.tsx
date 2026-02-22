"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearProveedor, editarProveedor } from "@/actions/proveedores";

interface Props {
  proveedor?: { id: string; nombre: string; sufijo: string };
  onSuccess?: () => void;
}

export default function ProveedorForm({ proveedor, onSuccess }: Props) {
  const [pending, startTransition] = useTransition();
  const isEdit = !!proveedor;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEdit
        ? await editarProveedor(proveedor.id, formData)
        : await crearProveedor(formData);

      if (result.ok) {
        toast.success(isEdit ? "Proveedor actualizado." : "Proveedor creado.");
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Label htmlFor="sufijo">
          Sufijo{" "}
          <span className="text-muted-foreground font-normal text-xs">
            (se usará como prefijo del código externo)
          </span>
        </Label>
        <Input
          id="sufijo"
          name="sufijo"
          placeholder="Ej: PIN"
          defaultValue={proveedor?.sufijo ?? ""}
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

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Guardar cambios" : "Crear proveedor"}
        </Button>
      </div>
    </form>
  );
}
