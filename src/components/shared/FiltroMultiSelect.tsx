"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import SelectSearchInput from "@/components/shared/SelectSearchInput";
import { filterItemsBySelectSearch } from "@/lib/selectSearch";
import { cn } from "@/lib/utils";

export type FiltroMultiSelectOpcion = { value: string; label: string };

function normalizarOpciones(
  opciones: readonly string[] | readonly FiltroMultiSelectOpcion[]
): FiltroMultiSelectOpcion[] {
  if (opciones.length === 0) return [];
  const first = opciones[0];
  if (typeof first === "string") {
    return (opciones as readonly string[]).map((value) => ({
      value,
      label: value,
    }));
  }
  return [...(opciones as readonly FiltroMultiSelectOpcion[])];
}

/**
 * Multi-select de filtros de página: trigger `input-filtro-unificado` + panel
 * `role="listbox"` + `SelectSearchInput`. Vacío = placeholder (sin filtro).
 */
export default function FiltroMultiSelect({
  opciones,
  extras,
  selected,
  onChange,
  placeholder,
  ariaLabel,
}: {
  opciones: readonly string[] | readonly FiltroMultiSelectOpcion[];
  extras?: readonly FiltroMultiSelectOpcion[];
  selected: readonly string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const todas = useMemo(() => {
    const base = normalizarOpciones(opciones);
    return extras && extras.length > 0 ? [...base, ...extras] : base;
  }, [opciones, extras]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const labelPorValor = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of todas) map.set(o.value, o.label);
    return map;
  }, [todas]);

  const filtradas = useMemo(
    () => filterItemsBySelectSearch(todas, query, (o) => o.label),
    [todas, query]
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function toggle(value: string) {
    if (selectedSet.has(value)) {
      onChange(selected.filter((x) => x !== value));
      return;
    }
    onChange([...selected, value]);
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (labelPorValor.get(selected[0]!) ?? selected[0]!)
        : selected
            .map((v) => labelPorValor.get(v) ?? v)
            .join(" · ");

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (!next) setQuery("");
            return next;
          });
        }}
        className={cn(
          SELECT_TRIGGER_FILTER_CLASS,
          "flex w-full items-center justify-between gap-2 text-left font-semibold"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${ariaLabel} (selección múltiple)`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
      </button>
      {open ? (
        <div
          className="absolute top-full left-0 z-50 mt-1 flex max-h-72 min-w-full flex-col overflow-hidden rounded-md border border-border bg-popover shadow-md"
          role="listbox"
          aria-multiselectable="true"
        >
          <div className="shrink-0 border-b border-border p-1">
            <SelectSearchInput
              value={query}
              onValueChange={setQuery}
              autoFocus
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1">
            {filtradas.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground" role="status">
                SIN RESULTADOS
              </p>
            ) : (
              filtradas.map((item) => {
                const checked = selectedSet.has(item.value);
                return (
                  <label
                    key={item.value}
                    role="option"
                    aria-selected={checked}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-muted",
                      checked && "bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.value)}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                      aria-label={item.label}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
