"use client";

import { useRef, useState, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  rubros: string[];
  marcas: string[];
  totalItems: number;
  qActual: string;
  rubroActual: string;
  marcaActual: string;
  habilitadoActual: string;
}

export default function FiltrosTienda({
  rubros, marcas, totalItems,
  qActual, rubroActual, marcaActual, habilitadoActual,
}: Props) {
  const formRef    = useRef<HTMLFormElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(qActual);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorRef   = useRef<number | null>(null);

  // Restaurar foco y cursor tras navegación
  useEffect(() => {
    if (cursorRef.current !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  });

  function submitForm() {
    cursorRef.current = inputRef.current?.selectionStart ?? null;
    formRef.current?.requestSubmit();
  }

  function handleBusqueda(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(submitForm, 400);
  }

  return (
    <form ref={formRef} action="" method="GET" className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">

      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          name="q"
          placeholder="Buscar por descripción, código o marca..."
          value={inputValue}
          onChange={(e) => handleBusqueda(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="relative sm:w-52">
        <select name="rubro" defaultValue={rubroActual} onChange={submitForm}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos los rubros</option>
          {rubros.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <div className="relative sm:w-44">
        <select name="marca" defaultValue={marcaActual} onChange={submitForm}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todas las marcas</option>
          {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <div className="relative sm:w-36">
        <select name="habilitado" defaultValue={habilitadoActual} onChange={submitForm}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos</option>
          <option value="true">Habilitados</option>
          <option value="false">Deshabilitados</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <p className="text-xs text-muted-foreground whitespace-nowrap">
        {totalItems.toLocaleString()} item{totalItems !== 1 ? "s" : ""}
      </p>
    </form>
  );
}
