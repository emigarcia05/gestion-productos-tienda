"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const duxSyncStyleButtonVariants = cva(
  cn(
    "group flex w-full min-h-[3.5rem] flex-col items-center justify-center gap-0.5 group-hover:gap-0",
    "rounded-lg px-2.5 py-1.5 text-center font-inherit outline-none",
    "focus-visible:ring-2 focus-visible:ring-sidebar-ring"
  ),
  {
    variants: {
      surface: {
        sidebar: "bg-sidebar-accent text-sidebar-foreground",
        card: cn(
          "border border-border bg-card text-foreground",
          "hover:bg-muted/60"
        ),
      },
      busy: {
        true: "cursor-wait opacity-90",
        false: "cursor-pointer",
      },
    },
    defaultVariants: {
      surface: "sidebar",
      busy: false,
    },
  }
);

const duxSyncStyleSecondaryVariants = cva(
  "text-xs overflow-hidden transition-[max-height,opacity] duration-150 opacity-100 max-h-[1.25rem] group-hover:opacity-0 group-hover:max-h-0",
  {
    variants: {
      surface: {
        sidebar: "text-sidebar-foreground/80",
        card: "text-muted-foreground",
      },
    },
    defaultVariants: {
      surface: "sidebar",
    },
  }
);

export type DuxSyncStyleButtonSurface = NonNullable<
  VariantProps<typeof duxSyncStyleButtonVariants>["surface"]
>;

export type DuxSyncProgresoDetalle =
  | { procesados: number; total: number }
  | string
  | null
  | undefined;

export interface DuxSyncStyleButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof duxSyncStyleButtonVariants> {
  /** Texto visible en reposo (línea 1). */
  lineIdle: string;
  /** Texto visible al hover (línea 1). */
  lineHover: string;
  /** Segunda línea (ej. Últ. Act.: …). */
  secondary: ReactNode;
  surface?: DuxSyncStyleButtonSurface;
  /**
   * Indicador de proceso en el mismo slot que el botón de sync (sidebar).
   * Reemplaza idle/hover; línea 2 = detalle numérico o texto.
   */
  progreso?: {
    mensaje: string;
    detalle?: DuxSyncProgresoDetalle;
  };
  /** Doble clic en modo progreso (ej. cancelar / liberar bloqueo). */
  onProgresoDoubleClick?: () => void;
  progresoDoubleClickTitle?: string;
}

function formatProgresoDetalle(detalle: DuxSyncProgresoDetalle): string {
  if (detalle == null) return "…";
  if (typeof detalle === "string") return detalle;
  if (detalle.total > 0) {
    return `${detalle.procesados.toLocaleString("es-AR")} de ${detalle.total.toLocaleString("es-AR")}`;
  }
  return "…";
}

export default function DuxSyncStyleButton({
  lineIdle,
  lineHover,
  secondary,
  surface = "sidebar",
  busy = false,
  className,
  disabled,
  type = "button",
  progreso,
  onProgresoDoubleClick,
  progresoDoubleClickTitle,
  ...props
}: DuxSyncStyleButtonProps) {
  if (progreso) {
    const detailLine = formatProgresoDetalle(progreso.detalle);
    return (
      <div
        role="status"
        aria-live="polite"
        onDoubleClick={onProgresoDoubleClick}
        title={onProgresoDoubleClick ? progresoDoubleClickTitle : undefined}
        className={cn(
          duxSyncStyleButtonVariants({ surface, busy: true }),
          "bg-accent2 text-sidebar-foreground",
          onProgresoDoubleClick && "cursor-pointer",
          className
        )}
      >
        <span className="w-full max-w-full truncate text-sm font-semibold whitespace-nowrap">
          {progreso.mensaje}
        </span>
        <span
          className={cn(
            "w-full max-w-full truncate text-xs font-semibold whitespace-nowrap text-sidebar-foreground/90"
          )}
        >
          {detailLine}
        </span>
      </div>
    );
  }

  const isBusy = busy || disabled;
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        duxSyncStyleButtonVariants({ surface, busy: !!isBusy }),
        className
      )}
      {...props}
    >
      <span className="relative flex min-h-[1.125rem] items-center justify-center">
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-sm font-semibold whitespace-nowrap transition-opacity duration-150",
            isBusy ? "opacity-100" : "opacity-100 group-hover:opacity-0"
          )}
        >
          {lineIdle}
        </span>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-sm font-semibold whitespace-nowrap transition-opacity duration-150",
            isBusy ? "opacity-0" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {lineHover}
        </span>
      </span>
      <span className={duxSyncStyleSecondaryVariants({ surface })}>{secondary}</span>
    </button>
  );
}
