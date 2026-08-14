import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";

/** Denegación compatible con cualquier `ActionResult<T>` (sin rama `ok: true`). */
export type ActionGateDeny = { ok: false; error: string };

type PermisoFlag = { simple: boolean; editor: boolean };

/**
 * Primer mensaje de Zod `.flatten()` para `ActionResult.error`.
 * No usar `error.message` crudo (puede incluir paths internos).
 */
export function firstZodErrorMessage(error: {
  flatten: () => {
    fieldErrors: Record<string, string[] | undefined>;
    formErrors: string[];
  };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

/**
 * Loguea en servidor y devuelve un mensaje genérico al cliente.
 * No reenviar `Error.message` (Prisma/SQL/stack).
 */
export function mensajeErrorAction(_e: unknown, fallback: string): string {
  console.error(_e);
  return fallback;
}

export async function requirePermiso(
  permiso: PermisoFlag,
  error: string
): Promise<ActionGateDeny | null> {
  const rol = await getRol();
  if (!puede(rol, permiso)) {
    return { ok: false, error };
  }
  return null;
}

export async function requireEditorConPermiso(
  permiso: PermisoFlag,
  errorModulo: string,
  errorEditor = "Sin permisos de editor."
): Promise<ActionGateDeny | null> {
  const gate = await requirePermiso(permiso, errorModulo);
  if (gate) return gate;
  if (!(await esEditor())) {
    return { ok: false, error: errorEditor };
  }
  return null;
}

export function requireMarketingLectura(): Promise<ActionGateDeny | null> {
  return requirePermiso(PERMISOS.marketing.acceso, "Sin permisos para marketing.");
}

export function requireEditorMarketing(): Promise<ActionGateDeny | null> {
  return requireEditorConPermiso(
    PERMISOS.marketing.acceso,
    "Sin permisos para marketing."
  );
}

export function requireFinanzasLectura(): Promise<ActionGateDeny | null> {
  return requirePermiso(PERMISOS.finanzas.acceso, "Sin permisos para finanzas.");
}

export function requireEditorFinanzas(): Promise<ActionGateDeny | null> {
  return requireEditorConPermiso(
    PERMISOS.finanzas.acceso,
    "Sin permisos para finanzas."
  );
}

export function requireEstadisticasLectura(): Promise<ActionGateDeny | null> {
  return requirePermiso(
    PERMISOS.estadisticasProductos.acceso,
    "Sin permisos para estadísticas de productos."
  );
}

export function requireEditorEstadisticas(): Promise<ActionGateDeny | null> {
  return requireEditorConPermiso(
    PERMISOS.estadisticasProductos.acceso,
    "Sin permisos para estadísticas de productos.",
    "Solo el modo editor puede gestionar este catálogo."
  );
}

export function requireAsistenteIaLectura(): Promise<ActionGateDeny | null> {
  return requirePermiso(
    PERMISOS.asistenteIa.acceso,
    "Sin permisos para Asistente IA."
  );
}

export function requireEditorAsistenteIa(): Promise<ActionGateDeny | null> {
  return requireEditorConPermiso(
    PERMISOS.asistenteIa.acceso,
    "Sin permisos para Asistente IA."
  );
}
