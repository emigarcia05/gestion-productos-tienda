"use client";

import { useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FilterBar, {
  FilaFiltrosDesplegables,
  FilterRowSelection,
  FiltroIndividualContainer,
  SELECT_TRIGGER_FILTER_CLASS,
} from "@/components/FilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ProveedorFabricaOption = {
  id: string;
  nombre: string;
  prefijo: string;
};

interface Props {
  proveedoresFabrica: ProveedorFabricaOption[];
}

/**
 * Módulo **Pedido A Fábrica** (pilar sidebar Administración).
 * Primer control: **PROVEEDOR** (solo `es_fabrica = true`).
 */
export default function PedidoAFabricaPageClient({
  proveedoresFabrica,
}: Props) {
  const [proveedorId, setProveedorId] = useState<string>("");

  const proveedorActivo = proveedorId !== "";

  return (
    <ClassicFilteredTableLayout
      title="PEDIDO A FÁBRICA"
      subtitle="Pedido A Fábrica"
      contentWidth="full"
      filters={
        <FilterBar className="filtros-contenedor-tienda bg-card">
          <FilterRowSelection>
            <FilaFiltrosDesplegables columnas={5}>
              <FiltroIndividualContainer
                activo={proveedorActivo}
                onLimpiar={() => setProveedorId("")}
              >
                <Select
                  value={proveedorId || undefined}
                  onValueChange={setProveedorId}
                >
                  <SelectTrigger
                    className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}
                    aria-label="PROVEEDOR"
                  >
                    <SelectValue placeholder="PROVEEDOR" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    {proveedoresFabrica.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.prefijo
                          ? `[${p.prefijo}] ${p.nombre}`.toLocaleUpperCase("es")
                          : p.nombre.toLocaleUpperCase("es")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
            </FilaFiltrosDesplegables>
          </FilterRowSelection>
        </FilterBar>
      }
    >
      <div className="flex min-h-[12rem] flex-1 items-center justify-center rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {proveedorActivo
            ? "Proveedor seleccionado. El contenido del pedido a fábrica se completará en los próximos pasos."
            : "Seleccioná un proveedor de fábrica para continuar."}
        </p>
      </div>
    </ClassicFilteredTableLayout>
  );
}
