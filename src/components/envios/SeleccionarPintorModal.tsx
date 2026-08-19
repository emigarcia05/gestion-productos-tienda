"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import CatalogoFinderRow from "@/components/shared/catalogo-finder/CatalogoFinderRow";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { Button } from "@/components/ui/button";
import { matchByMultiTerm } from "@/lib/busqueda";
import { nombreCompletoCliente, type ClienteItem } from "@/lib/envios";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pintores: ClienteItem[];
  seleccionadoId?: string | null;
  onSelect: (pintor: ClienteItem) => void;
}

export default function SeleccionarPintorModal({
  open,
  onOpenChange,
  pintores,
  seleccionadoId = null,
  onSelect,
}: Props) {
  const [qDebounced, setQDebounced] = useState("");
  const { q, setQ, handleQChange, isDebouncing, ref: searchRef } = useFiltrosConBusqueda({
    qActual: qDebounced,
    debounceMs: 300,
    onDebouncedSearch: setQDebounced,
  });

  const pintoresFiltrados = useMemo(() => {
    if (!qDebounced.trim()) return pintores;
    return pintores.filter((item) =>
      matchByMultiTerm([item.nombreCompleto, item.cel], qDebounced)
    );
  }, [pintores, qDebounced]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQ("");
      setQDebounced("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <AppModal
        title="Pintores"
        size="md"
        actions={
          <div className="flex w-full justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        }
      >
        <div className={cn("flex min-h-0 flex-col gap-3")}>
          <FiltroBusquedaInput
            id="filtro-seleccionar-pintor"
            placeholder="BUSCAR PINTOR..."
            value={q}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={searchRef}
          />
          <div className={cn("max-h-72 overflow-y-auto rounded-md border border-border")}>
            {pintores.length === 0 ? (
              <CatalogoFinderEmpty mensaje="No hay pintores." />
            ) : pintoresFiltrados.length === 0 ? (
              <CatalogoFinderEmpty mensaje="Ningún pintor coincide con la búsqueda." />
            ) : (
              pintoresFiltrados.map((item) => (
                <CatalogoFinderRow
                  key={item.id}
                  nombre={nombreCompletoCliente(item)}
                  meta={item.cel}
                  selected={item.id === seleccionadoId}
                  onClick={() => onSelect(item)}
                  mostrarAcciones={false}
                  onEditar={() => undefined}
                  onEliminar={() => undefined}
                />
              ))
            )}
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
