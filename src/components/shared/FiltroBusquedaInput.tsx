"use client";

import { Search, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INPUT_FILTER_CLASS } from "@/components/FilterBar";
import { cn } from "@/lib/utils";

export interface FiltroBusquedaInputProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isDebouncing: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Clases adicionales del input. */
  className?: string;
  disabled?: boolean;
}

/**
 * Input de búsqueda unificado para filtros: icono Search, input con estilo de filtro,
 * tacho #0072BB (`primaryIcon` + `filtro-individual-clear-btn`) cuando hay valor, y Loader al debouncear.
 * Usar con useFiltrosConBusqueda para la lógica.
 */
export default function FiltroBusquedaInput({
  id,
  placeholder,
  value,
  onChange,
  isDebouncing,
  inputRef,
  className,
  disabled = false,
}: FiltroBusquedaInputProps) {
  return (
    <div className="filtro-individual-container relative min-w-0">
      <Search className="absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-primary pointer-events-none" />
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "pl-9 w-full",
          value && isDebouncing && "pr-14",
          INPUT_FILTER_CLASS,
          className
        )}
      />
      {value ? (
        <Button
          type="button"
          variant="primaryIcon"
          size="icon-lg"
          onClick={() => onChange("")}
          className="filtro-individual-clear-btn"
          aria-label="Limpiar búsqueda"
          title="Limpiar búsqueda"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
      {isDebouncing ? (
        <Loader2
          className={cn(
            "absolute top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground animate-spin pointer-events-none",
            value ? "right-[2.65rem]" : "right-3"
          )}
        />
      ) : null}
    </div>
  );
}
