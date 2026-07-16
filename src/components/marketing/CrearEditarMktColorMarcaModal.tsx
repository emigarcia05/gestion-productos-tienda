"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  crearMktColorMarcaAction,
  editarMktColorMarcaAction,
} from "@/actions/mktColoresMarca";
import type { MktColorMarcaItem } from "@/lib/mktColoresMarca";
import {
  formatCodHexadecimalesForInput,
  sanitizeHexDigitsInput,
} from "@/lib/mktColoresMarca";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  item?: MktColorMarcaItem | null;
  onSuccess?: () => void;
}

export default function CrearEditarMktColorMarcaModal({
  open,
  onOpenChange,
  modo,
  item = null,
  onSuccess,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [codHexadecimales, setCodHexadecimales] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (modo === "editar" && item) {
      setNombre(item.nombre);
      setDescripcion(item.descripcion);
      setCodHexadecimales(formatCodHexadecimalesForInput(item.codHexadecimales));
      return;
    }
    setNombre("");
    setDescripcion("");
    setCodHexadecimales("");
  }, [open, modo, item]);

  const puedeGuardar =
    nombre.trim().length > 0 &&
    codHexadecimales.trim().length > 0 &&
    (modo === "crear" || Boolean(item?.id));

  async function handleSubmit() {
    if (!puedeGuardar || saving) return;
    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        codHexadecimales: codHexadecimales.trim(),
      };
      const res =
        modo === "crear"
          ? await crearMktColorMarcaAction(payload)
          : await editarMktColorMarcaAction({ id: item!.id, ...payload });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success(modo === "crear" ? "Registro creado." : "Registro actualizado.");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title={modo === "crear" ? "Nuevo Color Marca" : "Editar Color Marca"}
        size="md"
        className="max-w-lg"
        scrollBody
        hideBodyScrollbars
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || !puedeGuardar}
              onClick={() => void handleSubmit()}
            >
              Guardar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>Nombre</ModalMicroLabel>
            <Input
              id="mkt-color-marca-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toLocaleUpperCase("es-AR"))}
              disabled={saving}
              className="uppercase"
              autoComplete="off"
              aria-label="Nombre"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>Descripción</ModalMicroLabel>
            <textarea
              id="mkt-color-marca-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={saving}
              rows={3}
              aria-label="Descripción"
              className={cn(
                "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
                "flex w-full min-w-0 resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
                "focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 min-h-[4.5rem]"
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>Cód. Hexadecimales</ModalMicroLabel>
            <div
              className={cn(
                "border-input flex h-9 w-full min-w-0 items-center rounded-md border bg-transparent shadow-xs",
                "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
                saving && "pointer-events-none opacity-50"
              )}
            >
              <span
                className="text-muted-foreground pointer-events-none shrink-0 select-none pl-3 font-mono text-sm"
                aria-hidden
              >
                #
              </span>
              <input
                id="mkt-color-marca-hex"
                type="text"
                data-slot="input"
                value={codHexadecimales}
                onChange={(e) =>
                  setCodHexadecimales(sanitizeHexDigitsInput(e.target.value))
                }
                disabled={saving}
                aria-label="Códigos hexadecimales"
                autoComplete="off"
                className={cn(
                  "placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent py-1 pr-3 pl-0.5 font-mono text-sm shadow-none outline-none",
                  "focus-visible:ring-0 focus-visible:outline-none",
                  "disabled:cursor-not-allowed"
                )}
              />
            </div>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
