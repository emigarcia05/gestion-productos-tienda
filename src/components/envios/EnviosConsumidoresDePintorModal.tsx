"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import CatalogoFinderRow from "@/components/shared/catalogo-finder/CatalogoFinderRow";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import EnviosTelLink from "@/components/envios/EnviosTelLink";
import { Button } from "@/components/ui/button";
import { matchByMultiTerm } from "@/lib/busqueda";
import {
  nombreCompletoCliente,
  nombrePintorAsociadoCliente,
  partesNombreClienteListado,
  type ClienteItem,
} from "@/lib/envios";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pintor: ClienteItem | null;
  consumidores: ClienteItem[];
  onSelect: (cliente: ClienteItem) => void;
}

export default function EnviosConsumidoresDePintorModal({
  open,
  onOpenChange,
  pintor,
  consumidores,
  onSelect,
}: Props) {
  const [qDebounced, setQDebounced] = useState("");
  const { q, setQ, handleQChange, isDebouncing, ref: searchRef } = useFiltrosConBusqueda({
    qActual: qDebounced,
    debounceMs: 300,
    onDebouncedSearch: setQDebounced,
  });

  const filtrados = useMemo(() => {
    if (!qDebounced.trim()) return consumidores;
    return consumidores.filter((item) =>
      matchByMultiTerm([item.nombreCompleto, item.cel], qDebounced)
    );
  }, [consumidores, qDebounced]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQ("");
      setQDebounced("");
    }
    onOpenChange(next);
  }

  const titulo = pintor
    ? `CONSUMIDORES DE ${nombreCompletoCliente(pintor)}`
    : "CONSUMIDORES FINALES";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <AppModal
        title={titulo}
        size="md"
        actions={
          <div className="flex w-full justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        <div className={cn("flex min-h-0 flex-col gap-3")}>
          <FiltroBusquedaInput
            id="filtro-consumidores-pintor"
            placeholder="BUSCAR CONSUMIDOR..."
            value={q}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={searchRef}
          />
          <div className={cn("max-h-72 overflow-y-auto rounded-md border border-border")}>
            {consumidores.length === 0 ? (
              <CatalogoFinderEmpty mensaje="Este pintor no tiene consumidores finales asociados." />
            ) : filtrados.length === 0 ? (
              <CatalogoFinderEmpty mensaje="Ningún consumidor coincide con la búsqueda." />
            ) : (
              filtrados.map((item) => (
                <CatalogoFinderRow
                  key={item.id}
                  nombre={partesNombreClienteListado(item).principal}
                  nombreSufijo={
                    partesNombreClienteListado(item).sufijo ??
                    nombrePintorAsociadoCliente(item) ??
                    undefined
                  }
                  nombreCentrado
                  nombreAccion={
                    item.cel.trim() ? <EnviosTelLink cel={item.cel} /> : undefined
                  }
                  selected={false}
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
