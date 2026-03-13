"use client";

import { Search, Loader2, X } from "lucide-react";
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
 * botón limpiar (X) cuando hay valor y no está debouncing, y Loader cuando está debouncing.
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
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary pointer-events-none" />
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pl-9 pr-8 w-full", INPUT_FILTER_CLASS, className)}
      />
      {value && !isDebouncing && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      {isDebouncing && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin pointer-events-none" />
      )}
    </div>
  );
}
