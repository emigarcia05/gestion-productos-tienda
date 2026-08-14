"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectSearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Placeholder en MAYÚSCULAS. Default: BUSCAR... */
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
}

/**
 * Input de búsqueda para el **primer** renglón de cualquier lista desplegable.
 * Usado por `SelectContent` (shadcn) y por paneles custom (`role="listbox"`).
 */
export default function SelectSearchInput({
  value,
  onValueChange,
  placeholder = "BUSCAR...",
  autoFocus = false,
  className,
  inputClassName,
}: SelectSearchInputProps) {
  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cn("select-search-input", inputClassName)}
        onChange={(e) => onValueChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Evita que Radix Select/Dropdown capture el tipeo (typeahead).
          e.stopPropagation();
          if (e.key === "Escape") {
            e.preventDefault();
            onValueChange("");
          }
        }}
      />
    </div>
  );
}
