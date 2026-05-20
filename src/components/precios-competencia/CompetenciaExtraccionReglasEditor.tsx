"use client";

import { Plus, Trash2 } from "lucide-react";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CALLOUT_WARNING_CLASS } from "@/lib/ui-classes";
import {
  reglaExtraccionVacia,
  type CompetenciaConfigExtraccion,
  type ReglaExtraccionPagina,
} from "@/lib/competenciaConfigExtraccion";
import { cn } from "@/lib/utils";

interface Props {
  value: CompetenciaConfigExtraccion;
  onChange: (next: CompetenciaConfigExtraccion) => void;
  className?: string;
}

export default function CompetenciaExtraccionReglasEditor({ value, onChange, className }: Props) {
  const reglas = value.reglas;

  const setReglas = (next: ReglaExtraccionPagina[]) => {
    onChange({ ...value, reglas: next });
  };

  const updateRegla = (index: number, patch: Partial<ReglaExtraccionPagina>) => {
    const next = [...reglas];
    next[index] = { ...next[index], ...patch };
    setReglas(next);
  };

  const agregarRegla = () => {
    const id = reglas.length === 0 ? "ficha" : `tipo_${reglas.length + 1}`;
    setReglas([...reglas, reglaExtraccionVacia(id)]);
  };

  const quitarRegla = (index: number) => {
    const next = reglas.filter((_, i) => i !== index);
    const reglaDefaultId =
      value.reglaDefaultId && next.some((r) => r.id === value.reglaDefaultId)
        ? value.reglaDefaultId
        : (next[0]?.id ?? "");
    onChange({ reglaDefaultId: reglaDefaultId || "", reglas: next });
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div>
        <Label className="text-sm font-semibold text-foreground">
          Extracción de precio por tipo de página
        </Label>
        <p className={cn("mt-1 text-xs", CALLOUT_WARNING_CLASS)}>
          Abrí una ficha de producto del competidor en el navegador, clic derecho sobre el precio →
          Inspeccionar, y copiá el selector CSS (clase, id o atributo). Definí una regla por
          plantilla (ficha, listado, etc.) y elegí el tipo al guardar cada URL de producto.
        </p>
      </div>

      {reglas.length === 0 ? (
        <Button type="button" variant="outline" size="sm" onClick={agregarRegla}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar tipo de página
        </Button>
      ) : (
        <>
          <div>
            <ModalMicroLabel>Regla por defecto</ModalMicroLabel>
            <select
              className="mt-1 input-filtro-unificado w-full max-w-md"
              value={value.reglaDefaultId ?? reglas[0]?.id ?? ""}
              onChange={(e) => onChange({ ...value, reglaDefaultId: e.target.value })}
            >
              {reglas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} ({r.id})
                </option>
              ))}
            </select>
          </div>

          <ul className="flex flex-col gap-3">
            {reglas.map((regla, index) => (
              <li
                key={`${regla.id}-${index}`}
                className="rounded-md border border-border bg-muted/30 p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">Tipo de página</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar regla"
                    onClick={() => quitarRegla(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <ModalMicroLabel>Id (slug)</ModalMicroLabel>
                    <Input
                      value={regla.id}
                      onChange={(e) => updateRegla(index, { id: e.target.value })}
                      placeholder="ficha"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <ModalMicroLabel>Nombre</ModalMicroLabel>
                    <Input
                      value={regla.nombre}
                      onChange={(e) => updateRegla(index, { nombre: e.target.value })}
                      placeholder="Ficha de producto"
                      className="mt-1"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={regla.usarJsonLd}
                    onChange={(e) => updateRegla(index, { usarJsonLd: e.target.checked })}
                  />
                  Usar JSON-LD (datos estructurados)
                </label>
                <div>
                  <ModalMicroLabel>Selector CSS del precio</ModalMicroLabel>
                  <Input
                    value={regla.selectorPrecio ?? ""}
                    onChange={(e) => updateRegla(index, { selectorPrecio: e.target.value })}
                    placeholder='.price-box .sale-price o [itemprop="price"]'
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <ModalMicroLabel>Selector alternativo</ModalMicroLabel>
                  <Input
                    value={regla.selectorPrecioAlternativo ?? ""}
                    onChange={(e) =>
                      updateRegla(index, { selectorPrecioAlternativo: e.target.value })
                    }
                    placeholder="Opcional"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <ModalMicroLabel>Atributo del nodo (opcional)</ModalMicroLabel>
                  <Input
                    value={regla.atributoPrecio ?? ""}
                    onChange={(e) => updateRegla(index, { atributoPrecio: e.target.value })}
                    placeholder="content, data-price… vacío = texto visible"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <ModalMicroLabel>Regex personalizado (opcional)</ModalMicroLabel>
                  <Input
                    value={regla.regexPrecio ?? ""}
                    onChange={(e) => updateRegla(index, { regexPrecio: e.target.value })}
                    placeholder='Ej: \\$\\s*([\\d.,]+)'
                    className="mt-1 font-mono text-xs"
                  />
                </div>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" size="sm" onClick={agregarRegla}>
            <Plus className="h-4 w-4 mr-1" />
            Otro tipo de página
          </Button>
        </>
      )}
    </div>
  );
}
