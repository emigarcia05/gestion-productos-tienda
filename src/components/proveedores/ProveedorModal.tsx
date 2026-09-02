"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
  whatsapp?: string | null;
  coeficienteTintometrico?: number;
  plazoPago1Dias?: number | null;
  plazoPago2Dias?: number | null;
  plazoPago3Dias?: number | null;
  plazoPago4Dias?: number | null;
  /** Tiempo de entrega en días; null = no configurado. */
  tiempoEntregaEnDias?: number | null;
  /** Flag "Proveedor Mercadería" (edición). */
  proveedorMercaderia?: boolean;
  /** Flag fábrica (edición). */
  esFabrica?: boolean;
  /** Política IVA persistida (edición). */
  iva?: "SIEMPRE" | "NUNCA" | "PREGUNTA";
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
  const [mercaderiaListo, setMercaderiaListo] = useState(false);
  const isEdit = !!proveedor;

  useEffect(() => {
    if (!open) return;
    setMercaderiaListo(isEdit);
  }, [open, isEdit, proveedor?.id]);

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
      title={isEdit ? "Editar Proveedor" : "Nuevo Proveedor"}
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
              className={cn("mr-auto gap-2")}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
          <Button
            type="submit"
            form={FORM_ID}
            disabled={pending || deleting || (!isEdit && !mercaderiaListo)}
            className="gap-2"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar Cambios" : "Guardar"}
          </Button>
        </>
      }
    >
      <ProveedorForm
        id={FORM_ID}
        proveedor={proveedor ?? undefined}
        hideSubmitButton
        modalOpen={open}
        onProveedorMercaderiaListoChange={setMercaderiaListo}
        onSuccess={handleSuccess}
        onPendingChange={setPending}
      />
    </AppModal>
  );
}
