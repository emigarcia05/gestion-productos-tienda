"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ModalSinProductosExportar({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Exportación</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-foreground py-1">No hay productos para importar</p>
        <DialogFooter className="sm:justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Aceptar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
