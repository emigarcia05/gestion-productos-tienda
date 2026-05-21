import { z } from "zod";

/** Orden en que se intentan métodos al relevar un precio. */
export const ORDEN_EXTRACCION_METODOS = [
  "json_ld",
  "css",
  "regex",
  "generico",
] as const;

export type MetodoExtraccion = (typeof ORDEN_EXTRACCION_METODOS)[number];

export const reglaExtraccionPaginaSchema = z.object({
  /** Slug único dentro del competidor (ej. `ficha`, `listado`). */
  id: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_-]+$/i, "Solo letras, números, guión y guión bajo."),
  nombre: z.string().min(1).max(80),
  usarJsonLd: z.boolean().default(true),
  /** Selector CSS del precio (ej. `.product-price`, `[itemprop="price"]`, `#precio`). */
  selectorPrecio: z.string().max(500).optional().or(z.literal("")),
  selectorPrecioAlternativo: z.string().max(500).optional().or(z.literal("")),
  /** Atributo del nodo (ej. `content`, `data-price`). Vacío = texto del elemento. */
  atributoPrecio: z.string().max(80).optional().or(z.literal("")),
  /** Regex con un grupo de captura para el número (ej. `\\$\\s*([\\d.,]+)`). */
  regexPrecio: z.string().max(300).optional().or(z.literal("")),
  ordenMetodos: z
    .array(z.enum(ORDEN_EXTRACCION_METODOS))
    .min(1)
    .max(4)
    .optional(),
});

export type ReglaExtraccionPagina = z.infer<typeof reglaExtraccionPaginaSchema>;

export const competenciaConfigExtraccionSchema = z.object({
  /** Slug de `reglas` usado cuando el vínculo no define `tipoPagina`. */
  reglaDefaultId: z.string().max(40).optional().or(z.literal("")),
  reglas: z.array(reglaExtraccionPaginaSchema).max(10).default([]),
});

export type CompetenciaConfigExtraccion = z.infer<
  typeof competenciaConfigExtraccionSchema
>;

export const TIPO_PAGINA_COMPETENCIA_SLUG = z
  .string()
  .max(40)
  .regex(/^[a-z0-9_-]*$/i)
  .optional()
  .or(z.literal(""));

export function parseCompetenciaConfigExtraccion(
  raw: unknown
): CompetenciaConfigExtraccion | null {
  if (raw == null) return null;
  const parsed = competenciaConfigExtraccionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function reglaExtraccionParaVinculo(
  config: CompetenciaConfigExtraccion | null,
  tipoPagina: string | null | undefined
): ReglaExtraccionPagina | null {
  if (!config?.reglas?.length) return null;
  const slug = tipoPagina?.trim();
  if (slug) {
    const found = config.reglas.find((r) => r.id === slug);
    if (found) return found;
  }
  const defaultId = config.reglaDefaultId?.trim();
  if (defaultId) {
    const found = config.reglas.find((r) => r.id === defaultId);
    if (found) return found;
  }
  return config.reglas[0] ?? null;
}

export function ordenMetodosRegla(regla: ReglaExtraccionPagina): MetodoExtraccion[] {
  if (regla.ordenMetodos?.length) return [...regla.ordenMetodos];
  const orden: MetodoExtraccion[] = [];
  if (regla.selectorPrecio?.trim() || regla.selectorPrecioAlternativo?.trim()) {
    orden.push("css");
  }
  if (regla.usarJsonLd) orden.push("json_ld");
  if (regla.regexPrecio?.trim()) orden.push("regex");
  orden.push("generico");
  return [...new Set(orden)];
}

/**
 * Selectores a probar al relevar (líneas o comas separadas).
 * Si el selector es `#id-1234`, agrega `[id^="id-"]` para fichas con otro número de producto.
 */
export function expandirSelectoresPrecio(raw: string): string[] {
  const tokens = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const resultado: string[] = [];
  const visto = new Set<string>();
  const push = (s: string) => {
    if (!s || visto.has(s)) return;
    visto.add(s);
    resultado.push(s);
  };

  for (const sel of tokens) {
    push(sel);
    if (sel.startsWith("#")) {
      const id = sel.slice(1).split(/[.\s[]/)[0];
      if (id && /-\d+$/.test(id)) {
        const prefijo = id.replace(/-\d+$/, "-");
        push(`[id^="${prefijo}"]`);
      }
    }
  }
  return resultado;
}

/** Regla vacía para formulario de alta. */
export function reglaExtraccionVacia(id = "ficha"): ReglaExtraccionPagina {
  return {
    id,
    nombre: "Ficha de producto",
    usarJsonLd: true,
    selectorPrecio: "",
    selectorPrecioAlternativo: "",
    atributoPrecio: "",
    regexPrecio: "",
  };
}
