"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { INPUT_FILTER_CLASS } from "@/components/FilterBar";
import { cn } from "@/lib/utils";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competencias: CompetenciaParaCliente[];
  idsEnLista: Set<string>;
  vinculosPorCompetencia: Record<string, DatoVinculoCompetenciaCliente>;
  onSeleccionar: (competenciaId: string) => void;
}

function normalizarBusqueda(texto: string): string {
  return texto.trim().toLowerCase();
}

export default function AgregarProveedorUrlCompetenciaModal({
  open,
  onOpenChange,
  competencias,
  idsEnLista,
  vinculosPorCompetencia,
  onSeleccionar,
}: Props) {
  const [busqueda, setBusqueda] = useState("");

  const competidoresDisponibles = useMemo(() => {
    const q = normalizarBusqueda(busqueda);
    return competencias.filter((c) => {
      if (idsEnLista.has(c.id)) return false;
      const v = vinculosPorCompetencia[c.id];
      if (v?.urlBloqueadaPorPxSugerido) return false;
      if ((v?.urlProducto ?? "").trim() !== "") return false;
      if (!q) return true;
      return c.nombre.toLowerCase().includes(q);
    });
  }, [competencias, idsEnLista, vinculosPorCompetencia, busqueda]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setBusqueda("");
      }}
    >
      <AppModal
        size="md"
        title="Agregar Proveedor"
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Elegí un proveedor que aún no tenga URL cargada para este producto.
          </p>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
              aria-hidden
            />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar proveedor..."
              className={cn("w-full pl-9", INPUT_FILTER_CLASS)}
              aria-label="Buscar proveedor sin URL"
            />
          </div>
          <ul
            className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border"
            role="listbox"
            aria-label="Proveedores disponibles"
          >
            {competidoresDisponibles.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                {busqueda.trim()
                  ? "No hay proveedores que coincidan."
                  : "No hay más proveedores para agregar."}
              </li>
            ) : (
              competidoresDisponibles.map((c) => (
                <li key={c.id}>
                  <Button
                    type="button"
                    variant="default"
                    role="option"
                    aria-selected={false}
                    className="h-auto w-full justify-start px-3 py-2.5 text-sm font-medium"
                    onClick={() => {
                      onSeleccionar(c.id);
                      onOpenChange(false);
                    }}
                  >
                    {c.nombre}
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
      </AppModal>
    </Dialog>
  );
}
