"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { actualizarCoeficientesTintometricosAction } from "@/actions/proveedores";
import { toast } from "sonner";

type ProveedorCoef = {
  id: string;
  nombre: string;
  coeficienteTintometrico: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedores: ProveedorCoef[];
  onSaved?: () => void;
}

export default function EditarCoeficientesModal({
  open,
  onOpenChange,
  proveedores,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const p of proveedores) {
      next[p.id] = String(p.coeficienteTintometrico);
    }
    setDraft(next);
  }, [open, proveedores]);

  const payload = useMemo(
    () =>
      proveedores.map((p) => ({
        id: p.id,
        coeficienteTintometrico: Number(draft[p.id] ?? p.coeficienteTintometrico),
      })),
    [draft, proveedores]
  );

  const hayCambios = useMemo(
    () =>
      proveedores.some((p) => {
        const next = Number(draft[p.id] ?? p.coeficienteTintometrico);
        return Number.isFinite(next) && next !== p.coeficienteTintometrico;
      }),
    [draft, proveedores]
  );

  function setCoef(id: string, value: string) {
    const sanitized = value
      .replace(",", ".")
      .replace(/[^0-9.]/g, "")
      .replace(/^(\d*\.\d*).*$/, "$1");
    setDraft((prev) => ({ ...prev, [id]: sanitized }));
  }

  async function handleGuardar() {
    setSaving(true);
    try {
      const res = await actualizarCoeficientesTintometricosAction(payload);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudieron guardar los coeficientes.");
        return;
      }
      toast.success("Coeficientes actualizados.");
      onOpenChange(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Editar Coeficientes"
        size="lg"
        className="sm:max-w-3xl"
        padding="sm"
        scrollBody={false}
        actions={
          <div className="flex w-full items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGuardar}
              disabled={saving || !hayCambios}
              className="disabled:cursor-not-allowed"
            >
              Guardar
            </Button>
          </div>
        }
      >
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background">
          <div className="h-full min-h-0 overflow-y-auto no-scrollbar">
            <Table variant="compact" scrollX={false}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[65%]">PROVEEDOR</TableHead>
                  <TableHead className="w-[35%]">COEFICIENTE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.length === 0 ? (
                  <EmptyTableRow colSpan={2} message="SIN PROVEEDORES." />
                ) : (
                  proveedores.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="celda-datos text-left">{p.nombre}</TableCell>
                      <TableCell className="celda-datos">
                        <div className="flex justify-center">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="COEF."
                            value={draft[p.id] ?? String(p.coeficienteTintometrico)}
                            onChange={(e) => setCoef(p.id, e.target.value)}
                            className="h-8 w-28 text-center"
                            aria-label={`Coeficiente de ${p.nombre}`}
                            disabled={saving}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
