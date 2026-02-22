"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ProveedorForm from "./ProveedorForm";

interface Props {
  proveedor: { id: string; nombre: string };
}

export default function EditarProveedorModal({ proveedor }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar proveedor</DialogTitle>
          <DialogDescription>
            El código único no puede modificarse.
          </DialogDescription>
        </DialogHeader>
        <ProveedorForm proveedor={proveedor} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
