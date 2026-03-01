"use client";

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
import { Loader2 } from "lucide-react";

export interface ColumnaModalTabla<T> {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface ModalTablaConFiltrosProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Contenido de la barra de filtros (FilterBar + selects/inputs). Reutilizable en otros módulos. */
  filterContent: React.ReactNode;
  columns: ColumnaModalTabla<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowDoubleClick: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  count?: number;
  /** Contenido a la derecha del footer (ej. botón Cancelar). */
  footerRight?: React.ReactNode;
}

/**
 * Modal reutilizable: título + filtros + tabla + doble clic en fila.
 * Para módulos que necesiten listar datos filtrados y seleccionar por doble clic (ej. vincular producto).
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
  loading = false,
  emptyMessage = "Sin resultados",
  count,
  footerRight,
}: ModalTablaConFiltrosProps<T>) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </DialogHeader>

        {/* Filtros: slot reutilizable (FilterBar + proveedor/descripción u otros) */}
        <div className="px-6 pb-3 border-b border-border/50">{filterContent}</div>

        {/* Tabla */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <Table variant="compact">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
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
                {rows.map((row) => (
                  <TableRow
                    key={getRowId(row)}
                    onDoubleClick={() => onRowDoubleClick(row)}
                    className="cursor-pointer select-none hover:bg-primary/5"
                    title="Doble clic para seleccionar"
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={col.className ?? "py-2.5 px-3 text-xs"}
                      >
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 flex justify-between items-center shrink-0">
          <p className="text-xs text-muted-foreground">
            {count !== undefined && (
              <span className="text-primary tabular-nums font-semibold">
                {count.toLocaleString()}
              </span>
            )}
            {count !== undefined && " resultado(s)"}
          </p>
          {footerRight}
        </div>
      </DialogContent>
    </Dialog>
  );
}
