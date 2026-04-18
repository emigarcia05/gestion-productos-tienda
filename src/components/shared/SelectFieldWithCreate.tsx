"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";

/**
 * `SelectFieldWithCreate`
 *
 * Campo de formulario compuesto por:
 *  - Etiqueta (label uppercase, tokens tipográficos del sistema).
 *  - Select (shadcn/radix) con placeholder y opciones tipadas.
 *  - Botón opcional "+" para disparar creación inline de un ítem nuevo
 *    (por ejemplo, abrir un submodal para dar de alta la opción faltante).
 *
 * Uso típico: formularios con catálogos jerárquicos donde un editor puede
 * crear el padre directamente desde el formulario hijo sin abandonar el flujo.
 *
 * Accesibilidad:
 *  - Label asociado al trigger vía `htmlFor` / `id` (`selectId`).
 *  - El botón "+" siempre expone `aria-label` descriptivo.
 *  - Cuando el select está vacío y hay `onCreate`, el placeholder informa la acción disponible.
 */
const selectFieldVariants = cva("flex min-w-0 flex-col gap-1", {
  variants: {
    density: {
      /** Modal/formulario estándar. */
      default: "",
      /** Filas densas (toolbars, filtros horizontales). */
      compact: "gap-0.5",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

const selectFieldLabelVariants = cva(
  "font-semibold uppercase tracking-[0.06em] text-muted-foreground",
  {
    variants: {
      density: {
        default: "text-xs",
        compact: "text-[11px]",
      },
    },
    defaultVariants: {
      density: "default",
    },
  }
);

export interface SelectFieldOption<TValue extends string = string> {
  /** Valor persistido. No puede ser string vacía (reservada por radix). */
  value: TValue;
  /** Texto visible en el trigger y el item. */
  label: string;
  /** Si `true`, se muestra deshabilitado en la lista. */
  disabled?: boolean;
}

export interface SelectFieldWithCreateProps<TValue extends string = string>
  extends VariantProps<typeof selectFieldVariants> {
  /** Texto del label (se renderiza en MAYÚSCULAS vía clase, pasarlo ya en mayúsculas). */
  label: string;
  /** Valor actualmente seleccionado o `""` cuando no hay selección. */
  value: TValue | "";
  /** Callback al cambiar selección. Se recibe `""` si el usuario elige la opción "placeholder". */
  onValueChange: (value: TValue | "") => void;
  /** Opciones disponibles en el dropdown. */
  options: ReadonlyArray<SelectFieldOption<TValue>>;
  /** Placeholder del trigger (y opción "reset" interna). */
  placeholder: string;
  /** Identificador estable del select (label→trigger). Default: derivado de `label`. */
  selectId?: string;
  /** Deshabilita todo el control (select + botón). */
  disabled?: boolean;
  /**
   * Si se pasa, se muestra el botón "+" a la derecha del select.
   * Pensado para abrir un submodal de alta y luego reseleccionar el ítem creado.
   */
  onCreate?: () => void;
  /** Override del `aria-label` del botón "+". Por defecto `Crear {label}`. */
  createAriaLabel?: string;
  /** Tooltip del botón "+". Por defecto igual al `aria-label`. */
  createTitle?: string;
  /** Mensaje a renderizar debajo (ej. ayuda, error). Texto libre o nodo. */
  helper?: React.ReactNode;
  /** Clases adicionales para el contenedor. */
  className?: string;
}

/**
 * Campo reutilizable "Select + botón Crear".
 *
 * @example
 * <SelectFieldWithCreate
 *   label="RUBRO"
 *   placeholder="SELECCIONAR RUBRO"
 *   value={rubroId}
 *   onValueChange={setRubroId}
 *   options={rubros.map((r) => ({ value: r.id, label: r.nombre }))}
 *   onCreate={() => setSubmodal({ open: true, nivel: "rubro" })}
 * />
 */
export default function SelectFieldWithCreate<TValue extends string = string>({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  selectId,
  disabled = false,
  onCreate,
  createAriaLabel,
  createTitle,
  helper,
  density,
  className,
}: SelectFieldWithCreateProps<TValue>) {
  const reactId = React.useId();
  const controlId = selectId ?? `sel-${reactId}`;
  const NONE_VALUE = "__none__" as const;

  const ariaLabelCreate = createAriaLabel ?? `Crear ${label.toLocaleLowerCase()}`;

  return (
    <div className={cn(selectFieldVariants({ density }), className)}>
      <label
        htmlFor={controlId}
        className={cn(selectFieldLabelVariants({ density }))}
      >
        {label}
      </label>

      <div className="flex min-w-0 items-center gap-2">
        <Select
          value={value === "" ? NONE_VALUE : value}
          onValueChange={(next) =>
            onValueChange(next === NONE_VALUE ? "" : (next as TValue))
          }
          disabled={disabled}
        >
          <SelectTrigger
            id={controlId}
            className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full flex-1 min-w-0")}
            aria-label={label}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            align="start"
            className="select-content-filtro"
          >
            <SelectItem value={NONE_VALUE}>{placeholder}</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {onCreate ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onCreate}
            disabled={disabled}
            aria-label={ariaLabelCreate}
            title={createTitle ?? ariaLabelCreate}
            className="h-9 w-9 shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      {helper ? (
        <p className="text-[11px] leading-tight text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

export { selectFieldVariants, selectFieldLabelVariants };
