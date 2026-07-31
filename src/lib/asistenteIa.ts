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

/**
 * Submódulos del hub que pueden tener fila en GESTION PROMP & URL.
 * No incluye el nombre legacy; el lookup sigue resolviendo filas viejas.
 */
export const ASISTENTE_IA_SUBMODULOS_PROMP = [
  ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN,
  ASISTENTE_IA_SUBMODULO_DISENAR_COLORES,
] as const;

export type AsistenteIaSubmoduloPromp =
  (typeof ASISTENTE_IA_SUBMODULOS_PROMP)[number];

/**
 * Los `submodulo` de BD conviven en distinto casing (filas viejas en MAYÚSCULAS,
 * altas nuevas en Title Case). Toda comparación pasa por acá.
 */
export function normalizarSubmoduloPromp(value: string): string {
  return value.trim().toLocaleUpperCase("es-AR");
}

export function mismoSubmoduloPromp(a: string, b: string): boolean {
  return normalizarSubmoduloPromp(a) === normalizarSubmoduloPromp(b);
}

export function isAsistenteIaSubmoduloPromp(
  value: string,
): value is AsistenteIaSubmoduloPromp {
  return (ASISTENTE_IA_SUBMODULOS_PROMP as readonly string[]).some((s) =>
    mismoSubmoduloPromp(s, value),
  );
}

/** True si el `submodulo` de BD ocupa el slot de Buscar Código (canónico o legacy). */
export function ocupaSlotBuscarCodigoImagen(submodulo: string): boolean {
  return (
    mismoSubmoduloPromp(submodulo, ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN) ||
    mismoSubmoduloPromp(
      submodulo,
      ASISTENTE_IA_SUBMODULO_BUSCAR_COLOR_IMAGEN_LEGACY,
    )
  );
}

/**
 * Indica si ya hay prompt para un submódulo canónico del hub
 * (para Buscar Código también cuenta la fila legacy).
 */
export function submoduloPrompYaAsignado(
  submoduloCanonico: AsistenteIaSubmoduloPromp,
  items: readonly { submodulo: string }[],
): boolean {
  if (submoduloCanonico === ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN) {
    return items.some((i) => ocupaSlotBuscarCodigoImagen(i.submodulo));
  }
  return items.some((i) => mismoSubmoduloPromp(i.submodulo, submoduloCanonico));
}

export function submodulosPrompDisponiblesParaAlta(
  items: readonly { submodulo: string }[],
): AsistenteIaSubmoduloPromp[] {
  return ASISTENTE_IA_SUBMODULOS_PROMP.filter(
    (s) => !submoduloPrompYaAsignado(s, items),
  );
}

export const ASISTENTE_IA_CHATGPT_BUSCAR_COLOR_URL_DEFAULT =
  "https://chatgpt.com/c/6a6770f3-1a34-83e9-b9a6-a24c979961b0" as const;

/** Clave canónica de la variable RGB (cuentagotas). */
export const ASISTENTE_IA_VAR_RGB = "RGB" as const;

/** Variables del formulario Diseñar Colores (tokens siempre en MAYÚSCULA). */
export const ASISTENTE_IA_VAR_SUPERFICIES = "SUPERFICIES" as const;
export const ASISTENTE_IA_VAR_OBJETIVOS = "OBJETIVOS" as const;
export const ASISTENTE_IA_VAR_ESTILO = "ESTILO" as const;
/** Token canónico del Prompt Maestro. */
export const ASISTENTE_IA_VAR_COMBINAR_CON = "COMBINARCON" as const;
/** @deprecated Alias de plantillas viejas; se sigue rellenando en runtime. */
export const ASISTENTE_IA_VAR_COMBINAR = "COMBINAR" as const;
export const ASISTENTE_IA_VAR_ILUMINACION_NATURAL =
  "ILUMINACION_NATURAL" as const;
export const ASISTENTE_IA_VAR_ILUMINACION_ARTIFICIAL =
  "ILUMINACION_ARTIFICIAL" as const;

/** Índices de Color N (Color 1…4) en asignación superficie→color. */
export type AsistenteIaIndiceColor = 1 | 2 | 3 | 4;

export const ASISTENTE_IA_INDICES_COLOR: readonly AsistenteIaIndiceColor[] = [
  1, 2, 3, 4,
] as const;

/** Opciones seed de iluminación natural (catálogo `luz_natural`). */
export const ASISTENTE_IA_ILUMINACION_NATURAL_OPCIONES = [
  "INTERIOR - NULA",
  "INTERIOR - LEVE",
  "INTERIOR - BUENA",
  "INTERIOR - MUY BUENA",
  "EXTERIOR - SOL DIRECTO",
  "EXTERIOR - SOL INDIRECTO",
] as const;

export type AsistenteIaIluminacionNatural =
  (typeof ASISTENTE_IA_ILUMINACION_NATURAL_OPCIONES)[number];

/** Opciones seed de iluminación artificial (catálogo `luz_artificial`). */
export const ASISTENTE_IA_ILUMINACION_ARTIFICIAL_OPCIONES = [
  "FRIA - LEVE",
  "FRIA - MEDIA",
  "FRIA - MUCHA",
  "CÁLIDA - LEVE",
  "CÁLIDA - MEDIA",
  "CÁLIDA - MUCHA",
] as const;

export type AsistenteIaIluminacionArtificial =
  (typeof ASISTENTE_IA_ILUMINACION_ARTIFICIAL_OPCIONES)[number];

export interface AsistenteIaSuperficieConColor {
  superficieId: string;
  superficieNombre: string;
  /** Índice 1-based del color asignado (Color 1…4). */
  colorIndex: number;
}

export interface AsistenteIaDisenarColoresRespuestas {
  superficies: AsistenteIaSuperficieConColor[];
  objetivos: string[];
  estilo: string;
  combinar: string[];
  iluminacionNatural: string;
  iluminacionArtificial: string;
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
  /** Módulos del hub donde esta fuente se puede inyectar. */
  modulos: readonly ("buscar_codigo" | "disenar_colores")[];
}

export type AsistenteIaModuloVariable = "buscar_codigo" | "disenar_colores";

/** Resuelve el slot de variables según el nombre de submódulo en BD. */
export function moduloVariableDesdeSubmodulo(
  submodulo: string,
): AsistenteIaModuloVariable | null {
  if (ocupaSlotBuscarCodigoImagen(submodulo)) return "buscar_codigo";
  if (mismoSubmoduloPromp(submodulo, ASISTENTE_IA_SUBMODULO_DISENAR_COLORES)) {
    return "disenar_colores";
  }
  return null;
}

/** Nombre canónico del módulo del hub al que aplica una fila de BD. */
export function submoduloCanonicoDesdeBd(
  submodulo: string,
): AsistenteIaSubmoduloPromp | null {
  const modulo = moduloVariableDesdeSubmodulo(submodulo);
  if (modulo === "buscar_codigo") {
    return ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN;
  }
  if (modulo === "disenar_colores") {
    return ASISTENTE_IA_SUBMODULO_DISENAR_COLORES;
  }
  return null;
}

/** Catálogo de fuentes que la app puede inyectar en prompts. */
export const ASISTENTE_IA_VARIABLES_PROMPT: readonly AsistenteIaVariablePrompt[] =
  [
    {
      clave: ASISTENTE_IA_VAR_RGB,
      token: ASISTENTE_IA_RGB_TOKEN,
      etiqueta: "RGB (cuentagotas)",
      descripcion: "Color tomado con el cuentagotas, p. ej. (128,64,32).",
      modulos: ["buscar_codigo"],
    },
    {
      clave: ASISTENTE_IA_VAR_SUPERFICIES,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_SUPERFICIES),
      etiqueta: "Superficie a pintar",
      descripcion:
        "Obligatorio, hasta 4. Lista: `- Nombre {{ColorN}}.` (una línea por superficie).",
      modulos: ["disenar_colores"],
    },
    {
      clave: ASISTENTE_IA_VAR_OBJETIVOS,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_OBJETIVOS),
      etiqueta: "Objetivo de diseño",
      descripcion: "Obligatorio · 1 sola respuesta (Diseñar Colores).",
      modulos: ["disenar_colores"],
    },
    {
      clave: ASISTENTE_IA_VAR_ESTILO,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_ESTILO),
      etiqueta: "Estilo de diseño",
      descripcion: "Obligatorio · 1 sola respuesta (Diseñar Colores).",
      modulos: ["disenar_colores"],
    },
    {
      clave: ASISTENTE_IA_VAR_ILUMINACION_NATURAL,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_ILUMINACION_NATURAL),
      etiqueta: "Luz natural",
      descripcion:
        "Obligatorio · 1 sola: INTERIOR/EXTERIOR con nivel o sol.",
      modulos: ["disenar_colores"],
    },
    {
      clave: ASISTENTE_IA_VAR_ILUMINACION_ARTIFICIAL,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_ILUMINACION_ARTIFICIAL),
      etiqueta: "Luz artificial",
      descripcion:
        "Obligatorio · 1 sola: Fría/Cálida con intensidad.",
      modulos: ["disenar_colores"],
    },
    {
      clave: ASISTENTE_IA_VAR_COMBINAR_CON,
      token: tokenVariablePrompt(ASISTENTE_IA_VAR_COMBINAR_CON),
      etiqueta: "Combinar",
      descripcion: "Opcional · 1 sola respuesta (Diseñar Colores).",
      modulos: ["disenar_colores"],
    },
  ] as const;

export function fuentesPromptParaModulo(
  modulo: AsistenteIaModuloVariable | null,
): AsistenteIaVariablePrompt[] {
  if (!modulo) return [...ASISTENTE_IA_VARIABLES_PROMPT];
  return ASISTENTE_IA_VARIABLES_PROMPT.filter((v) =>
    v.modulos.includes(modulo),
  );
}

export function isFuentePromptValida(fuente: string): boolean {
  return ASISTENTE_IA_VARIABLES_PROMPT.some((v) => v.clave === fuente);
}

/** Normaliza nombre de variable a MAYÚSCULA [A-Z0-9_]. */
export function normalizarNombreVariablePrompt(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export interface ProdIaDisenoPrompVarItem {
  id: string;
  prompId: string;
  fuente: string;
  variable: string;
}

/**
 * Une fuentes del módulo con alias guardados (default = clave de fuente).
 */
export function resolverVariablesPromptParaUi(
  modulo: AsistenteIaModuloVariable | null,
  guardadas: readonly ProdIaDisenoPrompVarItem[],
): AsistenteIaVariablePrompt[] {
  const byFuente = new Map(
    guardadas.map((g) => [g.fuente, g.variable] as const),
  );
  return fuentesPromptParaModulo(modulo).map((f) => {
    const variable = byFuente.get(f.clave) ?? f.clave;
    return {
      ...f,
      clave: f.clave,
      token: tokenVariablePrompt(variable),
      etiqueta: f.etiqueta,
      descripcion: `${f.descripcion} Token: {{${variable}}}.`,
      modulos: f.modulos,
      // keep fuente in clave for insert mapping - token uses custom name
    };
  });
}

/**
 * Expande valores por fuente canónica agregando claves alias (MAYÚSCULA).
 */
export function expandirValoresConAliasVariables(
  valoresPorFuente: Record<string, string>,
  alias: readonly { fuente: string; variable: string }[],
): Record<string, string> {
  const out: Record<string, string> = { ...valoresPorFuente };
  for (const a of alias) {
    const fuenteKey = Object.keys(valoresPorFuente).find(
      (k) => k.toUpperCase() === a.fuente.toUpperCase(),
    );
    if (!fuenteKey) continue;
    const nombre = normalizarNombreVariablePrompt(a.variable);
    if (!nombre) continue;
    out[nombre] = valoresPorFuente[fuenteKey]!;
  }
  return out;
}

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
 * Prioridad: token alias de RGB / `{{RGB}}` → legacy `(R,G,B)` → append al final.
 */
export function aplicarRgbAlPromptBuscarColor(
  plantilla: string,
  color: RgbColor,
  alias: readonly { fuente: string; variable: string }[] = [],
): string {
  const tuple = formatRgbTuple(color);
  const valores = expandirValoresConAliasVariables(
    { [ASISTENTE_IA_VAR_RGB]: tuple },
    alias,
  );
  const aliasRgb = alias.find(
    (a) => a.fuente.toUpperCase() === ASISTENTE_IA_VAR_RGB,
  );
  const tokenAlias = aliasRgb
    ? tokenVariablePrompt(normalizarNombreVariablePrompt(aliasRgb.variable))
    : null;

  if (
    (tokenAlias && plantilla.includes(tokenAlias)) ||
    plantilla.includes(ASISTENTE_IA_RGB_TOKEN) ||
    /\{\{\s*RGB\s*\}\}/i.test(plantilla)
  ) {
    return aplicarVariablesAlPrompt(plantilla, valores);
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
  /** Alias fuente→variable guardados para este prompt (opcional). */
  variablesAlias?: ProdIaDisenoPrompVarItem[];
}

/** Fallback si aún no hay fila en BD. */
export function getDefaultConfigBuscarColorImagen(): AsistenteIaConfigSubmodulo {
  return {
    submodulo: ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN,
    promp: buildPromptBuscarColorDesdeImagenDefault(),
    urlRedireccion: ASISTENTE_IA_CHATGPT_BUSCAR_COLOR_URL_DEFAULT,
  };
}

/** Plantilla seed/fallback de Diseñar Colores (Prompt Maestro). */
export function buildPromptDisenarColoresDefault(): string {
  const superficies = tokenVariablePrompt(ASISTENTE_IA_VAR_SUPERFICIES);
  const objetivos = tokenVariablePrompt(ASISTENTE_IA_VAR_OBJETIVOS);
  const estilo = tokenVariablePrompt(ASISTENTE_IA_VAR_ESTILO);
  const combinarCon = tokenVariablePrompt(ASISTENTE_IA_VAR_COMBINAR_CON);
  const iluminacionNatural = tokenVariablePrompt(
    ASISTENTE_IA_VAR_ILUMINACION_NATURAL,
  );
  const iluminacionArtificial = tokenVariablePrompt(
    ASISTENTE_IA_VAR_ILUMINACION_ARTIFICIAL,
  );

  return [
    "# Prompt Maestro – Asesor Profesional de Color para Pinturas",
    "",
    "## Rol",
    "",
    "Actúa como un **Asesor Profesional en Colorimetría, Pintura Arquitectónica y Diseño de Interiores y Exteriores**.",
    "",
    "Analiza primero la fotografía proporcionada y luego interpreta las variables recibidas para elaborar una propuesta cromática profesional utilizando **exclusivamente** los colores disponibles en el catálogo suministrado.",
    "",
    "---",
    "",
    "## Variables",
    "",
    "Las siguientes variables son proporcionadas automáticamente por el sistema.",
    "",
    "Si una variable está vacía, considérala como **no especificada** e ignórala completamente durante el análisis.",
    "",
    "No inventes ni supongas información para completar variables vacías.",
    "",
    "### Superficies",
    "",
    `'${superficies}'`,
    "",
    "Formato de la variable de superficies:",
    "",
    "- Una línea por superficie: `- Nombre {{ColorN}}.` (ej. `- CIELO RASO {{Color1}}.`).",
    "",
    "Cada identificador (`{{Color1}}`, `{{Color2}}`, etc.) representa un único color del catálogo.",
    "",
    "Si un mismo identificador aparece en varias superficies, todas deberán utilizar exactamente el mismo color.",
    "",
    "### Objetivos",
    "",
    `'${objetivos}'`,
    "",
    "### Estilo",
    "",
    `'${estilo}'`,
    "",
    "### Iluminación natural",
    "",
    `'${iluminacionNatural}'`,
    "",
    "### Iluminación artificial",
    "",
    `'${iluminacionArtificial}'`,
    "",
    "### Combinar con",
    "",
    `'${combinarCon}'`,
    "",
    "---",
    "",
    "## Antes de responder",
    "",
    "Realiza internamente el siguiente proceso:",
    "",
    "1. Analiza la fotografía.",
    "2. Identifica las superficies visibles y los elementos existentes.",
    "3. Interpreta las variables recibidas.",
    "4. Determina la estrategia cromática más adecuada.",
    "5. Selecciona los colores exclusivamente desde el catálogo.",
    "6. Verifica que todos los colores pertenezcan al catálogo.",
    `7. Verifica que todos los identificadores de color sean consistentes con la variable **${superficies}**.`,
    "8. Genera la respuesta final.",
    "",
    "---",
    "",
    "## Criterios de decisión",
    "",
    "Para elaborar la propuesta considera de forma conjunta:",
    "",
    "* La arquitectura del ambiente o fachada.",
    "* La iluminación natural y artificial indicadas (y la visible en la foto).",
    "* Las proporciones del espacio.",
    "* Los materiales y colores existentes.",
    "* Los objetivos indicados.",
    "* El estilo solicitado.",
    "* Los elementos con los cuales deba combinarse, cuando existan.",
    "",
    "Prioriza siempre la armonía cromática, el equilibrio visual, la funcionalidad y la coherencia arquitectónica.",
    "",
    "---",
    "",
    "## Orden de prioridad",
    "",
    "Cuando exista información proveniente de distintas fuentes, utiliza el siguiente orden de prioridad:",
    "",
    "1. La fotografía.",
    "2. Las variables proporcionadas.",
    "3. El catálogo de colores.",
    "4. Los principios de arquitectura, diseño y teoría del color.",
    "",
    "Si detectas una contradicción entre la fotografía y las variables, indícalo explícitamente y fundamenta la recomendación utilizando la evidencia visual disponible.",
    "",
    "---",
    "",
    "## Reglas obligatorias",
    "",
    "* Utiliza únicamente colores existentes en el catálogo proporcionado.",
    "* Nunca inventes nombres de colores.",
    "* Nunca modifiques los nombres del catálogo.",
    `* Asigna un único color del catálogo a cada identificador presente en **${superficies}**.`,
    "* Todos los elementos que compartan el mismo identificador deberán utilizar exactamente el mismo color.",
    "* No generes nuevos identificadores de color.",
    `* No propongas pintar superficies distintas de las especificadas en **${superficies}**.`,
    "* Si alguna superficie no puede identificarse claramente en la fotografía, indícalo antes de realizar la recomendación.",
    "* Fundamenta todas las elecciones utilizando criterios de diseño arquitectónico, percepción espacial, iluminación y teoría del color.",
    "",
    "---",
    "",
    "# Formato de respuesta",
    "",
    "## Concepto de diseño",
    "",
    "Describe brevemente el concepto general de la propuesta.",
    "",
    "---",
    "",
    "## Paleta seleccionada",
    "",
    "Para cada identificador utilizado indica:",
    "",
    "* Identificador.",
    "* Nombre exacto del color del catálogo.",
    "* Código del color (si existe).",
    "* Justificación técnica de la elección.",
    "",
    "---",
    "",
    "## Distribución de colores",
    "",
    "Relaciona cada superficie con el identificador correspondiente.",
    "",
    "---",
    "",
    "## Justificación técnica",
    "",
    "Explica cómo la propuesta:",
    "",
    "* Cumple los objetivos indicados.",
    "* Refuerza el estilo solicitado.",
    "* Armoniza con los elementos existentes.",
    "* Aprovecha la iluminación y las características arquitectónicas del espacio.",
    "",
    "---",
    "",
    "## Recomendaciones",
    "",
    "Incluye recomendaciones de aplicación, contraste, equilibrio visual y cualquier observación relevante que contribuya a obtener el mejor resultado final.",
  ].join("\n");
}

export function getDefaultConfigDisenarColores(): AsistenteIaConfigSubmodulo {
  return {
    submodulo: ASISTENTE_IA_SUBMODULO_DISENAR_COLORES,
    promp: buildPromptDisenarColoresDefault(),
    urlRedireccion: ASISTENTE_IA_CHATGPT_BUSCAR_COLOR_URL_DEFAULT,
  };
}

/**
 * Formato Prompt Maestro para GPT (lista, no matriz):
 * `- Nombre {{ColorN}}.`
 * Vacío si no hay superficies.
 */
export function formatSuperficiesParaPrompt(
  superficies: AsistenteIaSuperficieConColor[],
): string {
  if (superficies.length === 0) return "";
  return superficies
    .map((s) => `- ${s.superficieNombre} {{Color${s.colorIndex}}}.`)
    .join("\n");
}

/** Lista unida por saltos de línea; vacío si no hay ítems. */
export function formatListaONada(items: string[], vacio = ""): string {
  const cleaned = items.map((s) => s.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join("\n") : vacio;
}

/** Sustituye variables del formulario Diseñar Colores en la plantilla. */
export function aplicarRespuestasAlPromptDisenarColores(
  plantilla: string,
  respuestas: AsistenteIaDisenarColoresRespuestas,
  alias: readonly { fuente: string; variable: string }[] = [],
): string {
  const superficies = formatSuperficiesParaPrompt(respuestas.superficies);
  const objetivos = formatListaONada(respuestas.objetivos);
  const estilo = respuestas.estilo.trim();
  const combinar = formatListaONada(respuestas.combinar);
  const iluminacionNatural = respuestas.iluminacionNatural.trim();
  const iluminacionArtificial = respuestas.iluminacionArtificial.trim();

  const porFuente: Record<string, string> = {
    [ASISTENTE_IA_VAR_SUPERFICIES]: superficies,
    [ASISTENTE_IA_VAR_OBJETIVOS]: objetivos,
    [ASISTENTE_IA_VAR_ESTILO]: estilo,
    [ASISTENTE_IA_VAR_COMBINAR_CON]: combinar,
    [ASISTENTE_IA_VAR_COMBINAR]: combinar,
    [ASISTENTE_IA_VAR_ILUMINACION_NATURAL]: iluminacionNatural,
    [ASISTENTE_IA_VAR_ILUMINACION_ARTIFICIAL]: iluminacionArtificial,
    Superficies: superficies,
    Objetivos: objetivos,
    Estilo: estilo,
    CombinarCon: combinar,
  };

  return aplicarVariablesAlPrompt(
    plantilla,
    expandirValoresConAliasVariables(porFuente, alias),
  );
}
