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
  ...props
}: DuxSyncStyleButtonProps) {
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
