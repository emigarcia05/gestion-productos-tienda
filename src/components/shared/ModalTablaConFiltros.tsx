"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnaModalTabla<T> {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface ModalTablaConFiltrosBase<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  filterContent: React.ReactNode;
  columns: ColumnaModalTabla<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  count?: number;
  contentClassName?: string;
}

interface ModalTablaSingleSelect<T> extends ModalTablaConFiltrosBase<T> {
  selectionMode?: "single";
  onRowDoubleClick: (row: T) => void;
  onConfirm?: never;
  confirmLabel?: never;
  confirmPending?: never;
  /** Contenido a la derecha del footer (ej. botón Cancelar). En multi se ignora. */
  footerRight?: React.ReactNode;
}

interface ModalTablaMultiSelect<T> extends ModalTablaConFiltrosBase<T> {
  selectionMode: "multi";
  onRowDoubleClick?: never;
  onConfirm: (ids: string[]) => void | Promise<void>;
  confirmLabel?: (count: number) => string;
  confirmPending?: boolean;
  footerRight?: never;
}

type ModalTablaConFiltrosProps<T> = ModalTablaSingleSelect<T> | ModalTablaMultiSelect<T>;

/**
 * Modal reutilizable: título + filtros + tabla.
 * - single: doble clic en fila para seleccionar (ej. vincular producto).
 * - multi: checkboxes para selección múltiple + botón confirmar (ej. asignar productos a categoría).
 */
export default function ModalTablaConFiltros<T>({
  open,
  onClose,
  title,
  subtitle,
  filterContent,
  columns,
  rows,
  getRowId,
  onRowDoubleClick,
  onConfirm,
  selectionMode = "single",
  confirmLabel = (n) => `Asignar ${n} producto(s)`,
  confirmPending = false,
  loading = false,
  emptyMessage = "Sin resultados",
  count,
  contentClassName,
  footerRight: footerRightProp,
}: ModalTablaConFiltrosProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) setSelectedIds(new Set());
  }, [open]);

  const isMulti = selectionMode === "multi";

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => getRowId(r))));
    }
  }

  async function handleConfirm() {
    if (!isMulti || selectedIds.size === 0 || !onConfirm) return;
    try {
      await onConfirm(Array.from(selectedIds));
      onClose();
    } catch {
      /* El padre muestra toast de error; no cerramos */
    }
  }

  const footerRight = isMulti ? (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClose}
        disabled={confirmPending}
      >
        Cancelar
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={handleConfirm}
        disabled={confirmPending || selectedIds.size === 0}
      >
        {confirmPending ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel(selectedIds.size)}
      </Button>
    </>
  ) : (
    footerRightProp ?? (
      <Button variant="outline" size="sm" onClick={onClose}>
        Cancelar
      </Button>
    )
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className={cn("modal-app", contentClassName)}>
        <DialogHeader className="modal-app__header">
          <DialogTitle className="modal-app__title">{title}</DialogTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </DialogHeader>

        <div className="modal-tabla-filtros">{filterContent}</div>

        <div className={cn("modal-tabla-body", "modal-app__body")}>
          {loading ? (
            <div className="modal-mensaje-carga">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : rows.length === 0 ? (
            <div className="modal-mensaje-vacio">
              {emptyMessage}
            </div>
          ) : (
            <Table variant="compact">
              <TableHeader className="modal-tabla-thead-sticky">
                <TableRow className="hover:bg-transparent border-b-0">
                  {isMulti && (
                    <TableHead className="py-2 px-2 w-10">
                      <label className="flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && selectedIds.size === rows.length}
                          onChange={toggleSelectAll}
                          className="rounded border-input"
                        />
                      </label>
                    </TableHead>
                  )}
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={col.className ?? "py-2 px-3 text-xs"}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const id = getRowId(row);
                  return (
                    <TableRow
                      key={id}
                      onDoubleClick={!isMulti ? () => onRowDoubleClick?.(row) : undefined}
                      className={cn(
                        !isMulti && "cursor-pointer select-none hover:bg-primary/5",
                        isMulti && selectedIds.has(id) && "bg-primary/5"
                      )}
                      title={!isMulti ? "Doble clic para seleccionar" : undefined}
                    >
                      {isMulti && (
                        <TableCell className="py-2.5 px-2 w-10">
                          <label className="flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(id)}
                              onChange={() => toggleSelect(id)}
                              className="rounded border-input"
                            />
                          </label>
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={col.className ?? "py-2.5 px-3 text-xs"}
                        >
                          {col.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="modal-tabla-footer">
          <p className="modal-tabla-footer__count">
            {count !== undefined && (
              <>
                <strong>{count.toLocaleString()}</strong>
                {" resultado(s)"}
              </>
            )}
          </p>
          {footerRight}
        </div>
      </DialogContent>
    </Dialog>
  );
}
