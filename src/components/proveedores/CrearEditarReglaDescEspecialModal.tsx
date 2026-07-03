"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import PorcentajeCentInput from "@/components/shared/PorcentajeCentInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  crearReglaDescEspecialAction,
  actualizarReglaDescEspecialAction,
  type ReglaDescEspecialDetalle,
} from "@/actions/descEspecialReglas";
import {
  parsePorcentajeCentNormalized,
  porcentajeCentFromNumber,
} from "@/lib/porcentajeCentMask";
import ReglaDescEspecialAgregarProductosModal from "@/components/proveedores/ReglaDescEspecialAgregarProductosModal";
import { cn } from "@/lib/utils";

type Modo = "crear" | "editar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: Modo;
  regla?: ReglaDescEspecialDetalle | null;
  onSuccess?: () => void;
}

const FORM_GRID_CLASS = "grid grid-cols-[1.35fr_minmax(0,1fr)] gap-x-4 gap-y-2 items-center";
const LABEL_CLASS = "text-right font-medium text-sm";

export default function CrearEditarReglaDescEspecialModal({
  open,
  onOpenChange,
  modo,
  regla,
  onSuccess,
}: Props) {
  const [pending, setPending] = useState(false);
  const [nombre, setNombre] = useState("");
  const [valorNorm, setValorNorm] = useState("");
  const [codigosExt, setCodigosExt] = useState<string[]>([]);
  const [agregarOpen, setAgregarOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (modo === "editar" && regla) {
      setNombre(regla.nombre);
      setValorNorm(porcentajeCentFromNumber(regla.valor));
      setCodigosExt(regla.codigosExt);
      return;
    }
    setNombre("");
    setValorNorm("");
    setCodigosExt([]);
  }, [open, modo, regla]);

  const titulo = modo === "crear" ? "Nueva Regla Desc. Específico" : "Editar Regla Desc. Específico";

  const resumenProductos = useMemo(() => {
    if (codigosExt.length === 0) return "Sin productos vinculados.";
    if (codigosExt.length <= 3) return codigosExt.join(", ");
    return `${codigosExt.slice(0, 3).join(", ")} y ${codigosExt.length - 3} más`;
  }, [codigosExt]);

  async function handleGuardar() {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      toast.error("Ingresá un nombre para la regla.");
      return;
    }

    const valor = parsePorcentajeCentNormalized(valorNorm);
    if (valor === undefined) {
      toast.error("Ingresá un porcentaje válido (0–100).");
      return;
    }

    if (codigosExt.length === 0) {
      toast.error("Vinculá al menos un producto.");
      return;
    }

    setPending(true);
    try {
      const payload = { nombre: nombreTrim, valor, codigosExt };
      const result =
        modo === "editar" && regla
          ? await actualizarReglaDescEspecialAction({ id: regla.id, ...payload })
          : await crearReglaDescEspecialAction(payload);

      if (!result.ok) {
        toast.error(result.error ?? "No se pudo guardar la regla.");
        return;
      }

      toast.success(
        modo === "crear"
          ? "Regla creada. Se actualizó desc. específico en los productos."
          : "Regla actualizada."
      );
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  function quitarCodigo(codExt: string) {
    setCodigosExt((prev) => prev.filter((c) => c !== codExt));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
        <AppModal
          title={titulo}
          size="lg"
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleGuardar} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Los productos vinculados reciben el valor en <strong className="text-foreground">desc. específico</strong>{" "}
              y se suma al cálculo de px. final sin IVA.
            </p>

            <div className={cn(FORM_GRID_CLASS, "py-1")}>
              <Label htmlFor="nombre-regla-esp" className={LABEL_CLASS}>
                NOMBRE
              </Label>
              <div className="min-w-0">
                <Input
                  id="nombre-regla-esp"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="border-primary w-full min-w-0"
                  placeholder="Ej. Descuento por fullpallet Paclin"
                />
              </div>

              <Label htmlFor="valor-regla-esp" className={LABEL_CLASS}>
                VALOR
              </Label>
              <div className="min-w-0">
                <PorcentajeCentInput
                  id="valor-regla-esp"
                  valueNormalized={valorNorm}
                  onValueNormalizedChange={setValorNorm}
                  placeholder="0,00%"
                  className="border-primary w-full min-w-0"
                />
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  Productos asociados ({codigosExt.length})
                </p>
                <Button type="button" size="sm" variant="default" onClick={() => setAgregarOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Agregar Productos
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground truncate" title={codigosExt.join(", ")}>
                {resumenProductos}
              </p>
              {codigosExt.length > 0 && (
                <ul className="mt-3 max-h-40 overflow-y-auto flex flex-col gap-1">
                  {codigosExt.map((codExt) => (
                    <li
                      key={codExt}
                      className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2 py-1 text-sm"
                    >
                      <span className="tabular-nums truncate">{codExt}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        aria-label={`Quitar ${codExt}`}
                        onClick={() => quitarCodigo(codExt)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </AppModal>
      </Dialog>

      <ReglaDescEspecialAgregarProductosModal
        open={agregarOpen}
        onOpenChange={setAgregarOpen}
        codigosSeleccionados={codigosExt}
        onConfirm={(nuevos) => {
          setCodigosExt((prev) => [...new Set([...prev, ...nuevos])]);
          setAgregarOpen(false);
        }}
      />
    </>
  );
}
