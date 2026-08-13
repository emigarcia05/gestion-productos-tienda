"use client";

import { Plus, Trash2 } from "lucide-react";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import {
  reglaExtraccionVacia,
  type CompetenciaConfigExtraccion,
  type ReglaExtraccionPagina,
} from "@/lib/competenciaConfigExtraccion";
import { cn } from "@/lib/utils";

const PLACEHOLDER_SELECTOR_PRECIO =
  "Clic derecho sobre el precio → Inspeccionar → Copiar → Copiar selector y pegá ese valor en el campo de arriba.";

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
    const nueva = reglaExtraccionVacia(id);
    const next = [...reglas, nueva];
    onChange({
      ...value,
      reglaDefaultId: value.reglaDefaultId?.trim() || id,
      reglas: next,
    });
  };

  const quitarRegla = (index: number) => {
    const next = reglas.filter((_, i) => i !== index);
    const reglaDefaultId =
      value.reglaDefaultId && next.some((r) => r.id === value.reglaDefaultId)
        ? value.reglaDefaultId
        : (next[0]?.id ?? "");
    onChange({ reglaDefaultId: reglaDefaultId || "", reglas: next });
  };

  const reglaDefaultValue = value.reglaDefaultId ?? reglas[0]?.id ?? "";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {reglas.length === 0 ? (
        <Button type="button" variant="outline" size="sm" onClick={agregarRegla}>
          <Plus className="h-4 w-4 mr-1" />
          Configurar lectura del precio
        </Button>
      ) : (
        <>
          {reglas.length > 1 ? (
            <div>
              <ModalMicroLabel>Plantilla por defecto</ModalMicroLabel>
              <Select
                value={reglaDefaultValue || undefined}
                onValueChange={(v) => onChange({ ...value, reglaDefaultId: v })}
              >
                <SelectTrigger
                  className={cn(SELECT_TRIGGER_FILTER_CLASS, "mt-1 w-full max-w-md")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  {reglas.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <ul className="flex flex-col gap-3">
            {reglas.map((regla, index) => (
              <li
                key={`${regla.id}-${index}`}
                className="rounded-md border border-border bg-muted/30 p-3 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <ModalMicroLabel>Nombre de esta plantilla</ModalMicroLabel>
                    <Input
                      value={regla.nombre}
                      onChange={(e) => updateRegla(index, { nombre: e.target.value })}
                      placeholder="Ficha de producto"
                      className="mt-1"
                    />
                  </div>
                  {reglas.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 mt-5"
                      aria-label="Quitar plantilla"
                      onClick={() => quitarRegla(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>

                <div>
                  <ModalMicroLabel>Selector del precio</ModalMicroLabel>
                  <Input
                    value={regla.selectorPrecio ?? ""}
                    onChange={(e) => updateRegla(index, { selectorPrecio: e.target.value })}
                    placeholder={PLACEHOLDER_SELECTOR_PRECIO}
                    className="mt-1 font-mono text-xs"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Si el ID cambia por producto (ej.{" "}
                    <span className="font-mono text-foreground">#price-…-5066</span> y{" "}
                    <span className="font-mono text-foreground">#price-…-5067</span>), pegá un
                    selector de cualquier ficha o usá el prefijo:{" "}
                    <span className="font-mono text-foreground">
                      [id^=&quot;price-including-tax-product-price-&quot;]
                    </span>
                    . Al guardar un ID con número al final, se prueba también el prefijo
                    automáticamente.
                  </p>
                </div>

                <div>
                  <ModalMicroLabel>Regex personalizado</ModalMicroLabel>
                  <Input
                    value={regla.regexPrecio ?? ""}
                    onChange={(e) => updateRegla(index, { regexPrecio: e.target.value })}
                    placeholder="Configurar con IA"
                    className="mt-1 font-mono text-xs"
                  />
                </div>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" size="sm" onClick={agregarRegla}>
            <Plus className="h-4 w-4 mr-1" />
            Otra plantilla (otro tipo de página)
          </Button>
        </>
      )}
    </div>
  );
}
