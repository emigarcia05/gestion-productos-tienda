import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATALOGO_FINDER_ROW_INTERACTIVE_CLASS,
  CATALOGO_FINDER_ROW_SELECTED_CLASS,
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { Button } from "@/components/ui/button";

/** Layout de fila en columna GASTO FINAL (catálogo balance): 4 renglones + comentarios opcional. */
export interface CatalogoFinderGastoFinalDetalle {
  gastoNombre: string;
  sucursalNombre: string;
  proveedorNombre: string;
  gastoMensual: boolean;
  diaDevengado: number | null;
  /** Días hasta el pago (`fin_bal_gasto_final.plazo_pago_dias`). */
  vencimiento: number | null;
  /** Misma política que **GENERA IVA CRÉDITO** en el modal (`fin_bal_gasto_final.iva`). */
  ivaCredito: "SIEMPRE" | "NUNCA" | "PREGUNTA";
  comentarios: string | null;
}

export default function CatalogoFinderRow({
  nombre,
  meta,
  terceraLinea,
  gastoFinalDetalle,
  selected,
  onClick,
  mostrarAcciones,
  onEditar,
  onEliminar,
}: {
  nombre: string;
  meta?: string;
  /** Tercera fila bajo `meta` (tipos/rubros/gastos; no usar con `gastoFinalDetalle`). */
  terceraLinea?: string;
  /** Si está definido, sustituye `meta`/`terceraLinea` con el layout de gasto final. */
  gastoFinalDetalle?: CatalogoFinderGastoFinalDetalle;
  selected: boolean;
  onClick?: () => void;
  mostrarAcciones: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const isClickable = typeof onClick === "function";
  const gastoFinalComentarios = gastoFinalDetalle?.comentarios?.trim() ?? "";
  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 border-b px-3 py-2 text-sm transition-colors",
        isClickable && CATALOGO_FINDER_ROW_INTERACTIVE_CLASS,
        !isClickable && "cursor-default",
        selected && CATALOGO_FINDER_ROW_SELECTED_CLASS
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!isClickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        {gastoFinalDetalle ? (
          <>
            <div className="truncate text-center text-xs font-semibold uppercase tracking-wide text-foreground">
              {gastoFinalDetalle.gastoNombre}
            </div>
            <div className="h-px w-full bg-border" />
            <div className="min-w-0 truncate text-[11px] leading-tight">
              <span className="font-semibold uppercase tracking-wide text-foreground">
                SUCURSAL:{" "}
              </span>
              <span className="font-normal text-foreground">{gastoFinalDetalle.sucursalNombre}</span>
            </div>
            <div className="min-w-0 truncate text-[11px] leading-tight">
              <span className="font-semibold uppercase tracking-wide text-foreground">
                PROVEEDOR:{" "}
              </span>
              <span className="font-normal text-foreground">{gastoFinalDetalle.proveedorNombre}</span>
            </div>
            <div className="truncate text-[11px] leading-tight text-foreground">
              <span className="font-semibold uppercase tracking-wide text-foreground">DIA DEVENGADO: </span>
              <span className="font-normal text-foreground">{gastoFinalDetalle.diaDevengado ?? "-"}</span>
            </div>
            <div className="truncate text-[11px] leading-tight text-foreground">
              <span className="font-semibold uppercase tracking-wide text-foreground">PLAZO PAGO: </span>
              <span className="font-normal text-foreground">
                {gastoFinalDetalle.vencimiento == null ? "-" : `${gastoFinalDetalle.vencimiento} DIAS`}
              </span>
            </div>
            <div className="truncate text-[11px] leading-tight text-foreground">
              <span className="font-semibold uppercase tracking-wide text-foreground">IVA CRÉDITO: </span>
              <span className="font-normal text-foreground">{gastoFinalDetalle.ivaCredito}</span>
            </div>
            <div className="truncate text-[11px] leading-tight text-foreground">
              <span className="font-semibold uppercase tracking-wide text-foreground">TIPO: </span>
              <span className="font-normal text-foreground">
                {gastoFinalDetalle.gastoMensual ? "MENSUAL" : "EVENTUAL"}
              </span>
            </div>
            {gastoFinalComentarios ? (
              <div
                className="line-clamp-2 break-words text-[11px] font-normal leading-snug text-muted-foreground"
                title={gastoFinalComentarios}
              >
                ({gastoFinalComentarios})
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="truncate font-medium">{nombre}</div>
            {meta && <div className="truncate text-[11px] text-muted-foreground">{meta}</div>}
            {terceraLinea && (
              <div
                className="line-clamp-2 break-words text-[11px] text-muted-foreground"
                title={terceraLinea}
              >
                {terceraLinea}
              </div>
            )}
          </>
        )}
      </div>

      {mostrarAcciones && (
        <div className="pointer-events-none absolute right-2 bottom-2 flex items-center justify-end gap-1 bg-card/75 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS, "pointer-events-auto !h-7 !w-7 !p-1")}
            title="Editar"
            aria-label={`Editar ${nombre}`}
            onClick={(e) => {
              e.stopPropagation();
              onEditar();
            }}
          >
            <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS, "pointer-events-auto !h-7 !w-7 !p-1")}
            title="Eliminar"
            aria-label={`Eliminar ${nombre}`}
            onClick={(e) => {
              e.stopPropagation();
              onEliminar();
            }}
          >
            <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
          </Button>
        </div>
      )}

      {isClickable && (
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:opacity-0",
            selected && "text-primary"
          )}
        />
      )}
    </div>
  );
}
