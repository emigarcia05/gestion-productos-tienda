"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CALLOUT_WARNING_CLASS } from "@/lib/ui-classes";
import GuiaCampoExtraccionCompetencia from "@/components/precios-competencia/GuiaCampoExtraccionCompetencia";
import {
  reglaExtraccionVacia,
  type CompetenciaConfigExtraccion,
  type ReglaExtraccionPagina,
} from "@/lib/competenciaConfigExtraccion";
import { cn } from "@/lib/utils";

const TIP_COPIAR_SELECTOR =
  "elegí Copiar → Copiar selector (en Chrome/Edge). No uses HTML, XPath ni «copiar elemento». Si solo ves XPath, anotá la clase del precio (ej. price) y pegá .price";

interface Props {
  value: CompetenciaConfigExtraccion;
  onChange: (next: CompetenciaConfigExtraccion) => void;
  className?: string;
}

export default function CompetenciaExtraccionReglasEditor({ value, onChange, className }: Props) {
  const reglas = value.reglas;
  const [avanzadoAbierto, setAvanzadoAbierto] = useState<Record<number, boolean>>({});

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

  const toggleAvanzado = (index: number) => {
    setAvanzadoAbierto((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div>
        <Label className="text-sm font-semibold text-foreground">
          Cómo leer el precio en el sitio del competidor
        </Label>
        <p className={cn("mt-1 text-xs", CALLOUT_WARNING_CLASS)}>
          Abrí una ficha de producto real en el navegador del competidor. Con el botón derecho
          sobre el precio → Inspeccionar, copiá el selector y pegalo acá. Probá con Comparar
          Precios (1 producto) antes de cargar muchas URLs.
        </p>
      </div>

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
              <select
                className="mt-1 input-filtro-unificado w-full max-w-md"
                value={value.reglaDefaultId ?? reglas[0]?.id ?? ""}
                onChange={(e) => onChange({ ...value, reglaDefaultId: e.target.value })}
              >
                {reglas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Se usa al guardar la URL de un producto si elegís ese tipo de página.
              </p>
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
                  <ModalMicroLabel>Elemento precio (obligatorio)</ModalMicroLabel>
                  <Input
                    value={regla.selectorPrecio ?? ""}
                    onChange={(e) => updateRegla(index, { selectorPrecio: e.target.value })}
                    placeholder=".precio-venta"
                    className="mt-1 font-mono text-xs"
                  />
                  <GuiaCampoExtraccionCompetencia
                    pasos={[
                      "En la página del competidor, ubicá el número que ves como precio de venta (ej. $ 12.500).",
                      "Clic derecho sobre ese número → Inspeccionar.",
                      "En el panel, clic derecho sobre la línea resaltada del precio → Copiar → Copiar selector.",
                      "Pegá aquí lo copiado (suele verse como .algo o #algo).",
                    ]}
                    tip={TIP_COPIAR_SELECTOR}
                  />
                </div>

                <div>
                  <ModalMicroLabel>Contenedor del precio (opcional)</ModalMicroLabel>
                  <Input
                    value={regla.selectorPrecioAlternativo ?? ""}
                    onChange={(e) =>
                      updateRegla(index, { selectorPrecioAlternativo: e.target.value })
                    }
                    placeholder=".bloque-precio-producto"
                    className="mt-1 font-mono text-xs"
                  />
                  <GuiaCampoExtraccionCompetencia
                    pasos={[
                      "Si el precio sale mal o trae otro número de la página, volvé al inspector.",
                      "Subí un nivel: elegí el div o sección que envuelve solo el precio del producto (no el menú ni productos relacionados).",
                      "Clic derecho en ese contenedor → Copiar → Copiar selector, y pegá aquí.",
                      "Dejá vacío si todavía no lo necesitás; primero probá solo con Elemento precio.",
                    ]}
                    tip={TIP_COPIAR_SELECTOR}
                  />
                </div>

                <div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    onClick={() => toggleAvanzado(index)}
                    aria-expanded={!!avanzadoAbierto[index]}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        avanzadoAbierto[index] && "rotate-180"
                      )}
                    />
                    Opciones avanzadas (solo si lo anterior no alcanza)
                  </button>
                  {avanzadoAbierto[index] ? (
                    <div className="mt-2 flex flex-col gap-2 pl-1">
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={regla.usarJsonLd}
                          onChange={(e) => updateRegla(index, { usarJsonLd: e.target.checked })}
                        />
                        Intentar también datos estructurados de la página (JSON-LD)
                      </label>
                      <div>
                        <ModalMicroLabel>Regex personalizado</ModalMicroLabel>
                        <Input
                          value={regla.regexPrecio ?? ""}
                          onChange={(e) => updateRegla(index, { regexPrecio: e.target.value })}
                          placeholder="Solo con ayuda técnica"
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                    </div>
                  ) : null}
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
