"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AsistenteIaFuncionTileProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Botón de función del hub Asistente IA.
 * Proporción 2:1 (alto:ancho) → CSS `aspect-ratio: 1 / 2`.
 * Ícono arriba + nombre del módulo en MAYÚSCULAS abajo.
 */
export default function AsistenteIaFuncionTile({
  label,
  icon,
  onClick,
  disabled,
  className,
}: AsistenteIaFuncionTileProps) {
  return (
    <Button
      type="button"
      variant="default"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={cn(
        "aspect-[1/2] h-auto w-36 flex-col gap-3 rounded-lg px-3 py-4",
        "whitespace-normal text-center font-semibold uppercase leading-tight",
        "has-[>svg]:px-3",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center [&_svg]:size-8">
        {icon}
      </span>
      <span className="text-xs tracking-wide">{label}</span>
    </Button>
  );
}
