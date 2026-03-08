"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AppModal from "@/components/shared/AppModal";
import ProveedorForm from "./ProveedorForm";

const FORM_ID = "crear-proveedor-form";

export default function CrearProveedorModal() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="default" size="default" className="btn-primario-gestion gap-2">
              <Plus className="h-4 w-4" />
              Crear Proveedor
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Crear nuevo proveedor</TooltipContent>
      </Tooltip>
      <AppModal
        title="Nuevo proveedor"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID} disabled={pending} className="gap-2">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground mb-4">
          Se generará un código único automáticamente.
        </p>
        <ProveedorForm
          id={FORM_ID}
          hideSubmitButton
          onSuccess={() => setOpen(false)}
          onPendingChange={setPending}
        />
      </AppModal>
    </Dialog>
  );
}
