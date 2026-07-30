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

/** Submódulo de recomendaciones guiadas por formulario. */
export const ASISTENTE_IA_SUBMODULO_DISENAR_COLORES =
  "Diseñar Colores" as const;

export const ASISTENTE_IA_CHATGPT_BUSCAR_COLOR_URL_DEFAULT =
  "https://chatgpt.com/c/6a6770f3-1a34-83e9-b9a6-a24c979961b0" as const;

/** Clave canónica de la variable RGB (cuentagotas). */
export const ASISTENTE_IA_VAR_RGB = "RGB" as const;

/** Variables del formulario Diseñar Colores. */
export const ASISTENTE_IA_VAR_CANTIDAD_COLORES = "CANTIDAD_COLORES" as const;
export const ASISTENTE_IA_VAR_SUPERFICIES = "SUPERFICIES" as const;
export const ASISTENTE_IA_VAR_OBJETIVOS = "OBJETIVOS" as const;
export const ASISTENTE_IA_VAR_ESTILO = "ESTILO" as const;
export const ASISTENTE_IA_VAR_COMBINAR = "COMBINAR" as const;

/** Cantidad de colores permitida en Diseñar Colores. */
export type AsistenteIaCantidadColores = 1 | 2 | 3 | 4;

export const ASISTENTE_IA_CANTIDADES_COLORES: readonly AsistenteIaCantidadColores[] =
  [1, 2, 3, 4] as const;

export interface AsistenteIaSuperficieConColor {
  superficieId: string;
  superficieNombre: string;
  /** Índice 1-based del color asignado (Color 1…N). */
  colorIndex: number;
}

export interface AsistenteIaDisenarColoresRespuestas {
  cantidadColores: AsistenteIaCantidadColores;
  superficies: AsistenteIaSuperficieConColor[];
  objetivos: string[];
  estilo: string;
  combinar: string[];
}

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
    {
      clave: ASISTENTE_IA_VAR_CANTIDAD_COLORES,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_CANTIDAD_COLORES),
      etiqueta: "Cantidad de colores",
      descripcion: "Cantidad elegida en Diseñar Colores (1–4).",
    },
    {
      clave: ASISTENTE_IA_VAR_SUPERFICIES,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_SUPERFICIES),
      etiqueta: "Superficies",
      descripcion:
        "Lista de superficies a pintar con su Color N asignado (Diseñar Colores).",
    },
    {
      clave: ASISTENTE_IA_VAR_OBJETIVOS,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_OBJETIVOS),
      etiqueta: "Objetivos",
      descripcion: "Objetivos de diseño seleccionados (Diseñar Colores).",
    },
    {
      clave: ASISTENTE_IA_VAR_ESTILO,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_ESTILO),
      etiqueta: "Estilo",
      descripcion: "Estilo de diseño único (Diseñar Colores).",
    },
    {
      clave: ASISTENTE_IA_VAR_COMBINAR,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_COMBINAR),
      etiqueta: "Combinar",
      descripcion: "Elementos existentes a combinar (Diseñar Colores).",
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
    "| Nombre | Código | Similitud | URL | RGB (digital) |",
    "|---------|--------|-----------|-----|---------------|",
    "| [Nombre] | [Código] | [XX %] | [URL] | (R,G,B) |",
    "| [Nombre] | [Código] | [XX %] | [URL] | (R,G,B) |",
    "| [Nombre] | [Código] | [XX %] | [URL] | (R,G,B) |",
    "| [Nombre] | [Código] | [XX %] | [URL] | (R,G,B) |",
    "| [Nombre] | [Código] | [XX %] | [URL] | (R,G,B) |",
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

/** Plantilla seed/fallback de Diseñar Colores. */
export function buildPromptDisenarColoresDefault(): string {
  return [
    "Sos el asesor de diseño y colores de una pinturería Alba.",
    "Recomendá únicamente colores reales del catálogo Alba (código + nombre exactos).",
    "Máximo tres recomendaciones salvo que el pedido pida otra cantidad de colores a buscar.",
    "Justificá cada opción y, si hay ambiente, incluí un prompt de render concreto.",
    "",
    "Datos del pedido:",
    `- Cantidad de colores a buscar: ${tokenVariablePrompt(ASISTENTE_IA_VAR_CANTIDAD_COLORES)}`,
    `- Superficies a pintar (con asignación de Color N): ${tokenVariablePrompt(ASISTENTE_IA_VAR_SUPERFICIES)}`,
    `- Objetivos: ${tokenVariablePrompt(ASISTENTE_IA_VAR_OBJETIVOS)}`,
    `- Estilo: ${tokenVariablePrompt(ASISTENTE_IA_VAR_ESTILO)}`,
    `- Combinar con elementos existentes: ${tokenVariablePrompt(ASISTENTE_IA_VAR_COMBINAR)}`,
    "",
    "Respondé con el formato del asesor (contexto, recomendaciones, prompt de render, notas si aplica).",
  ].join("\n");
}

export function getDefaultConfigDisenarColores(): AsistenteIaConfigSubmodulo {
  return {
    submodulo: ASISTENTE_IA_SUBMODULO_DISENAR_COLORES,
    promp: buildPromptDisenarColoresDefault(),
    urlRedireccion: ASISTENTE_IA_CHATGPT_BUSCAR_COLOR_URL_DEFAULT,
  };
}

/** Texto legible de superficies → Color N para inyectar en el prompt. */
export function formatSuperficiesParaPrompt(
  superficies: AsistenteIaSuperficieConColor[],
): string {
  if (superficies.length === 0) return "(sin superficies)";
  return superficies
    .map((s) => `${s.superficieNombre} → Color ${s.colorIndex}`)
    .join("; ");
}

export function formatListaONada(items: string[], vacio = "(ninguno)"): string {
  const cleaned = items.map((s) => s.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join("; ") : vacio;
}

/** Sustituye variables del formulario Diseñar Colores en la plantilla. */
export function aplicarRespuestasAlPromptDisenarColores(
  plantilla: string,
  respuestas: AsistenteIaDisenarColoresRespuestas,
): string {
  return aplicarVariablesAlPrompt(plantilla, {
    [ASISTENTE_IA_VAR_CANTIDAD_COLORES]: String(respuestas.cantidadColores),
    [ASISTENTE_IA_VAR_SUPERFICIES]: formatSuperficiesParaPrompt(
      respuestas.superficies,
    ),
    [ASISTENTE_IA_VAR_OBJETIVOS]: formatListaONada(respuestas.objetivos),
    [ASISTENTE_IA_VAR_ESTILO]: respuestas.estilo.trim() || "(sin estilo)",
    [ASISTENTE_IA_VAR_COMBINAR]: formatListaONada(respuestas.combinar),
  });
}
