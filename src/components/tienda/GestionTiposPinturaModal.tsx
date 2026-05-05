"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
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
import {
  deleteTipoPinturaRendimientoAction,
  upsertTipoPinturaRendimientoAction,
  type TipoPinturaRendimiento,
} from "@/actions/tiposPinturaRendimientos";
import { Plus, Trash2 } from "lucide-react";

type DraftRow = {
  key: string;
  id?: string;
  tipoPintura: string;
  rendimiento: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: TipoPinturaRendimiento[];
  onSaved?: () => void;
}

function buildDraft(rows: TipoPinturaRendimiento[]): DraftRow[] {
  return rows.map((row) => ({
    key: row.id,
    id: row.id,
    tipoPintura: row.tipoPintura,
    rendimiento: String(row.rendimiento),
  }));
}

export default function GestionTiposPinturaModal({
  open,
  onOpenChange,
  rows,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(buildDraft(rows));
    setDeletedIds([]);
  }, [open, rows]);

  const hasChanges = useMemo(() => {
    if (deletedIds.length > 0) return true;
    if (draft.length !== rows.length) return true;

    const byId = new Map(rows.map((r) => [r.id, r]));
    return draft.some((d) => {
      if (!d.id) return true;
      const original = byId.get(d.id);
      if (!original) return true;
      return (
        d.tipoPintura.trim() !== original.tipoPintura ||
        Number(d.rendimiento || "0") !== original.rendimiento
      );
    });
  }, [deletedIds.length, draft, rows]);

  function updateRow(key: string, field: "tipoPintura" | "rendimiento", value: string) {
    setDraft((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        if (field === "rendimiento") {
          return { ...row, rendimiento: value.replace(/\D/g, "") };
        }
        return { ...row, tipoPintura: value };
      })
    );
  }

  function addRow() {
    const key = `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setDraft((prev) => [...prev, { key, tipoPintura: "", rendimiento: "" }]);
  }

  function removeRow(key: string) {
    setDraft((prev) => {
      const target = prev.find((r) => r.key === key);
      if (target?.id) {
        setDeletedIds((old) => (old.includes(target.id!) ? old : [...old, target.id!]));
      }
      return prev.filter((r) => r.key !== key);
    });
  }

  async function handleGuardar() {
    setSaving(true);
    try {
      for (const id of deletedIds) {
        const deleted = await deleteTipoPinturaRendimientoAction(id);
        if (!deleted.ok) {
          toast.error(deleted.error ?? "No se pudo eliminar un registro.");
          return;
        }
      }

      for (const row of draft) {
        const tipoPintura = row.tipoPintura.trim();
        if (!tipoPintura) {
          toast.error("El tipo de pintura es obligatorio.");
          return;
        }
        const rendimiento = Number(row.rendimiento || "0");
        if (!Number.isInteger(rendimiento)) {
          toast.error("El rendimiento debe ser un número entero.");
          return;
        }

        const saved = await upsertTipoPinturaRendimientoAction({
          id: row.id,
          tipoPintura,
          rendimiento,
        });
        if (!saved.ok) {
          toast.error(saved.error ?? "No se pudo guardar un registro.");
          return;
        }
      }

      toast.success("Tipos de pintura actualizados.");
      onOpenChange(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Editar Rendimientos"
        size="lg"
        className="max-w-4xl"
        padding="sm"
        scrollBody={false}
        actions={
          <div className="flex w-full items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGuardar} disabled={saving || !hasChanges}>
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
                  <TableHead className="w-[65%]">TIPO DE PINTURA</TableHead>
                  <TableHead className="w-[35%]">RENDIMIENTO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.length === 0 ? (
                  <EmptyTableRow colSpan={2} message="SIN REGISTROS." />
                ) : (
                  draft.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="celda-datos">
                        <Input
                          type="text"
                          value={row.tipoPintura}
                          onChange={(e) => updateRow(row.key, "tipoPintura", e.target.value)}
                          className="h-8"
                          disabled={saving}
                          aria-label="Tipo de pintura"
                        />
                      </TableCell>
                      <TableCell className="celda-datos">
                        <div className={cn(TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS, "gap-2")}>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={row.rendimiento}
                            onChange={(e) => updateRow(row.key, "rendimiento", e.target.value)}
                            className="h-8 w-28 self-center text-center"
                            disabled={saving}
                            aria-label="Rendimiento"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(row.key)}
                            disabled={saving}
                            aria-label="Eliminar fila"
                            title="Eliminar Ítem"
                            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          >
                            <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-center border-t border-border px-3 py-2">
            <Button type="button" variant="outline" onClick={addRow} disabled={saving}>
              <Plus className="h-4 w-4" />
              +
            </Button>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
