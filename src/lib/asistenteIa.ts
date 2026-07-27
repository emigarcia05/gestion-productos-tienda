/**
 * Constantes y tipos del módulo Asistente IA (Gestión Productos / IA_DISEÑO).
 * Prompt y URL viven en `prod_ia_diseno_promp`. El cuentagotas solo reemplaza
 * el placeholder `(R,G,B)` en la plantilla (la imagen no se persiste).
 */

import type { RgbColor } from "@/lib/colorMuestraImagen";
import { formatRgbTuple } from "@/lib/colorMuestraImagen";

/** Base de conocimiento oficial (capa 3 IA_DISEÑO). */
export const ASISTENTE_IA_BASE_COLORES = "colores_alba_ia" as const;

/** Nombre canónico del submódulo (columna `submodulo`, único). */
export const ASISTENTE_IA_SUBMODULO_BUSCAR_COLOR_IMAGEN =
  "Buscar Color Desde Imagen" as const;

export const ASISTENTE_IA_CHATGPT_BUSCAR_COLOR_URL_DEFAULT =
  "https://chatgpt.com/c/6a6770f3-1a34-83e9-b9a6-a24c979961b0" as const;

/** Placeholder que el cuentagotas sustituye por el RGB real, p. ej. `(128,64,32)`. */
export const ASISTENTE_IA_RGB_PLACEHOLDER = "(R,G,B)" as const;

/**
 * Plantilla seed/fallback del submódulo (debe incluir `(R,G,B)`).
 * La fuente de verdad en runtime es `prod_ia_diseno_promp.promp`.
 */
export function buildPromptBuscarColorDesdeImagenDefault(): string {
  return [
    "Compara este color RGB con el catálogo Alba, calcula la similitud de todos los colores, ordénalos de mayor a menor y devuelve únicamente las 5 coincidencias más cercanas en este formato exacto:",
    "",
    "Otras coincidencias cercanas",
    "",
    "| Nombre | Código | Similitud |",
    "|---------|--------|-----------|",
    "| [Nombre] | [Código] | [XX %] |",
    "| [Nombre] | [Código] | [XX %] |",
    "| [Nombre] | [Código] | [XX %] |",
    "| [Nombre] | [Código] | [XX %] |",
    "| [Nombre] | [Código] | [XX %] |",
    "",
    "No escribas ningún texto adicional.",
    "",
    `RGB: "${ASISTENTE_IA_RGB_PLACEHOLDER}"`,
  ].join("\n");
}

/**
 * Inserta el RGB del cuentagotas en la plantilla del módulo.
 * Reemplaza todas las ocurrencias de `(R,G,B)` (sirve con o sin comillas alrededor).
 * Si la plantilla no trae el placeholder, agrega `RGB: "(r,g,b)"` al final.
 */
export function aplicarRgbAlPromptBuscarColor(
  plantilla: string,
  color: RgbColor,
): string {
  const tuple = formatRgbTuple(color);
  if (plantilla.includes(ASISTENTE_IA_RGB_PLACEHOLDER)) {
    return plantilla.split(ASISTENTE_IA_RGB_PLACEHOLDER).join(tuple);
  }
  const base = plantilla.trimEnd();
  return `${base}\n\nRGB: "${tuple}"`;
}

export interface ProdIaDisenoPrompItem {
  id: string;
  submodulo: string;
  promp: string;
  urlRedireccion: string;
}

export interface AsistenteIaConfigSubmodulo {
  submodulo: string;
  promp: string;
  urlRedireccion: string;
}

/** Fallback si aún no hay fila en BD. */
export function getDefaultConfigBuscarColorImagen(): AsistenteIaConfigSubmodulo {
  return {
    submodulo: ASISTENTE_IA_SUBMODULO_BUSCAR_COLOR_IMAGEN,
    promp: buildPromptBuscarColorDesdeImagenDefault(),
    urlRedireccion: ASISTENTE_IA_CHATGPT_BUSCAR_COLOR_URL_DEFAULT,
  };
}
