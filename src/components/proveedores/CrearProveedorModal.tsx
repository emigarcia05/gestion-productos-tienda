"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ACTION_BUTTON_PRIMARY } from "@/lib/actionButtons";
import ProveedorForm from "./ProveedorForm";

export default function CrearProveedorModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="default" size="default" className={`gap-2 ${ACTION_BUTTON_PRIMARY}`}>
              <Plus className="h-4 w-4" />
              Crear Proveedor
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Crear nuevo proveedor</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo proveedor</DialogTitle>
          <DialogDescription>
            Se generará un código único automáticamente.
          </DialogDescription>
        </DialogHeader>
        <ProveedorForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
