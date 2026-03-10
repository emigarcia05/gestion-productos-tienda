"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppModal from "@/components/shared/AppModal";
import ProveedorForm from "./ProveedorForm";
import { eliminarProveedor } from "@/actions/proveedores";
import { toast } from "sonner";

const FORM_ID = "proveedor-form";

export interface ProveedorParaModal {
  id: string;
  nombre: string;
  prefijo: string;
  idProveedorDux?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si no se pasa, modo crear. Si se pasa, modo editar (con botón Eliminar). */
  proveedor?: ProveedorParaModal | null;
  /** Llamado tras guardar o eliminar para que el padre refresque. */
  onSuccess?: () => void;
}

export default function ProveedorModal({ open, onOpenChange, proveedor, onSuccess }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isEdit = !!proveedor;

  function handleSuccess() {
    onOpenChange(false);
    onSuccess?.();
    router.refresh();
  }

  async function handleEliminar() {
    if (!proveedor) return;
    const ok = window.confirm(`¿Eliminar al proveedor "${proveedor.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    setDeleting(true);
    try {
      const result = await eliminarProveedor(proveedor.id);
      if (result.ok) {
        toast.success(`Proveedor "${proveedor.nombre}" eliminado.`);
        handleSuccess();
      } else {
        toast.error(result.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppModal
      title={isEdit ? "Editar proveedor" : "Nuevo proveedor"}
      actions={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending || deleting}>
            Cancelar
          </Button>
          {isEdit && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleEliminar}
              disabled={pending || deleting}
              className="gap-2 mr-auto"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
          <Button type="submit" form={FORM_ID} disabled={pending || deleting} className="gap-2">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar" : "Guardar"}
          </Button>
        </>
      }
    >
      {!isEdit && (
        <p className="text-sm text-muted-foreground mb-4">
          Se generará un código único automáticamente.
        </p>
      )}
      {isEdit && (
        <p className="text-sm text-muted-foreground mb-4">
          El código único no puede modificarse.
        </p>
      )}
      <ProveedorForm
        id={FORM_ID}
        proveedor={proveedor ?? undefined}
        hideSubmitButton
        onSuccess={handleSuccess}
        onPendingChange={setPending}
      />
    </AppModal>
  );
}
