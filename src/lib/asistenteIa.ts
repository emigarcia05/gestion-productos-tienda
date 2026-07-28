/**
 * Constantes y tipos del módulo Asistente IA (Gestión Productos / IA_DISEÑO).
 * Prompt y URL viven en `prod_ia_diseno_promp`.
 * Variables del prompt: sintaxis `{{CLAVE}}` (p. ej. `{{RGB}}` del cuentagotas).
 */

import type { RgbColor } from "@/lib/colorMuestraImagen";
import { formatRgbTuple } from "@/lib/colorMuestraImagen";

/** Base de conocimiento oficial (capa 3 IA_DISEÑO). */
export const ASISTENTE_IA_BASE_COLORES = "colores_alba_ia" as const;

/** Nombre canónico del submódulo (columna `submodulo`, único). */
export const ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN =
  "Buscar Código Desde Imagen" as const;

/** Nombre legacy en filas ya sembradas (antes del rename). */
export const ASISTENTE_IA_SUBMODULO_BUSCAR_COLOR_IMAGEN_LEGACY =
  "Buscar Color Desde Imagen" as const;

/** @deprecated Preferir ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN. */
export const ASISTENTE_IA_SUBMODULO_BUSCAR_COLOR_IMAGEN =
  ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN;

export const ASISTENTE_IA_CHATGPT_BUSCAR_COLOR_URL_DEFAULT =
  "https://chatgpt.com/c/6a6770f3-1a34-83e9-b9a6-a24c979961b0" as const;

/** Clave canónica de la variable RGB (cuentagotas). */
export const ASISTENTE_IA_VAR_RGB = "RGB" as const;

/** Token insertable en plantillas: `{{RGB}}`. */
export function tokenVariablePrompt(clave: string): string {
  return `{{${clave}}}`;
}

export const ASISTENTE_IA_RGB_TOKEN = tokenVariablePrompt(
  ASISTENTE_IA_VAR_RGB,
) as "{{RGB}}";

/**
 * Alias legacy en plantillas antiguas (antes de `{{RGB}}`).
 * Se sigue reemplazando por compatibilidad con filas ya guardadas.
 */
export const ASISTENTE_IA_RGB_PLACEHOLDER_LEGACY = "(R,G,B)" as const;

export interface AsistenteIaVariablePrompt {
  clave: string;
  token: string;
  etiqueta: string;
  descripcion: string;
}

/** Catálogo de variables insertables en GESTION PROMP & URL. */
export const ASISTENTE_IA_VARIABLES_PROMPT: readonly AsistenteIaVariablePrompt[] =
  [
    {
      clave: ASISTENTE_IA_VAR_RGB,
      token: ASISTENTE_IA_RGB_TOKEN,
      etiqueta: "RGB",
      descripcion: "Color tomado con el cuentagotas, p. ej. (128,64,32).",
    },
  ] as const;

/**
 * Plantilla seed/fallback del submódulo (debe incluir `{{RGB}}`).
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
    `RGB: "${ASISTENTE_IA_RGB_TOKEN}"`,
  ].join("\n");
}

/**
 * Sustituye `{{CLAVE}}` por valores. Claves sin valor se dejan intactas.
 */
export function aplicarVariablesAlPrompt(
  plantilla: string,
  valores: Record<string, string>,
): string {
  return plantilla.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, clave: string) => {
    const key = clave.toUpperCase();
    const found = Object.entries(valores).find(([k]) => k.toUpperCase() === key);
    return found ? found[1] : match;
  });
}

/**
 * Inserta el RGB del cuentagotas en la plantilla del módulo.
 * Prioridad: `{{RGB}}` → legacy `(R,G,B)` → append al final.
 */
export function aplicarRgbAlPromptBuscarColor(
  plantilla: string,
  color: RgbColor,
): string {
  const tuple = formatRgbTuple(color);
  if (plantilla.includes(ASISTENTE_IA_RGB_TOKEN) || /\{\{\s*RGB\s*\}\}/i.test(plantilla)) {
    return aplicarVariablesAlPrompt(plantilla, { [ASISTENTE_IA_VAR_RGB]: tuple });
  }
  if (plantilla.includes(ASISTENTE_IA_RGB_PLACEHOLDER_LEGACY)) {
    return plantilla
      .split(ASISTENTE_IA_RGB_PLACEHOLDER_LEGACY)
      .join(tuple);
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
    submodulo: ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN,
    promp: buildPromptBuscarColorDesdeImagenDefault(),
    urlRedireccion: ASISTENTE_IA_CHATGPT_BUSCAR_COLOR_URL_DEFAULT,
  };
}
