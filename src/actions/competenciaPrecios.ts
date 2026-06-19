"use server";

import { REVALIDATE_PX_COMPETENCIA } from "@/lib/gestionProductosRoutes";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  createCompetenciaSchema,
  deleteCompetenciaSchema,
  competenciaPreciosFiltrosSchema,
  guardarUrlVinculoSchema,
  relevarUrlVinculoSchema,
  relevarUrlsProductoSchema,
  updateCompetenciaSchema,
} from "@/lib/validations/competenciaPrecios";
import * as competenciaService from "@/services/competencia.service";
import {
  guardarUrlVinculoCompetencia,
  type DatoVinculoCompetenciaCliente,
} from "@/services/competenciaVinculo.service";
import {
  relevarVinculoCompetenciaUnico,
  relevarVinculosPorCodTienda,
  type RelevarVinculosPorCodTiendaResult,
} from "@/services/syncCompetenciaPrecios.service";
import {
  getCompetenciaPreciosList,
  type CompetenciaPreciosListResult,
} from "@/services/competenciaPreciosList.service";
import type { CompetenciaParaCliente } from "@/services/competencia.service";

function revalidateCompetenciaPreciosPaths() {
  for (const path of REVALIDATE_PX_COMPETENCIA) {
    revalidatePath(path);
  }
}

async function gateAcceso(): Promise<{ ok: false; error: string } | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.competenciaPrecios.acceso)) {
    return { ok: false, error: "Sin permisos para comparación de competencia." };
  }
  return null;
}

async function gateEditar(): Promise<{ ok: false; error: string } | null> {
  const denied = await gateAcceso();
  if (denied) return denied;
  if (!puede(await getRol(), PERMISOS.competenciaPrecios.editar)) {
    return { ok: false, error: "Sin permisos de edición." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  return null;
}

const EMPTY_LIST: CompetenciaPreciosListResult = {
  filas: [],
  total: 0,
  totalPaginas: 1,
  competencias: [],
};

export async function getCompetenciaPreciosListAction(
  params: unknown
): Promise<CompetenciaPreciosListResult> {
  try {
    const denied = await gateAcceso();
    if (denied) return EMPTY_LIST;
    const parsed = competenciaPreciosFiltrosSchema.safeParse(params);
    if (!parsed.success) return EMPTY_LIST;
    return await getCompetenciaPreciosList(parsed.data);
  } catch {
    return EMPTY_LIST;
  }
}

export async function listCompetenciasAction(): Promise<CompetenciaParaCliente[]> {
  try {
    const denied = await gateAcceso();
    if (denied) return [];
    return await competenciaService.listCompetencias();
  } catch {
    return [];
  }
}

export async function createCompetenciaAction(
  raw: unknown
): Promise<ActionResult<CompetenciaParaCliente>> {
  try {
    const denied = await gateEditar();
    if (denied) return denied;
    const parsed = createCompetenciaSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return {
        ok: false,
        error:
          msg.nombre?.[0] ??
          msg.web?.[0] ??
          msg.configExtraccion?.[0] ??
          msg.idProveedor?.[0] ??
          "Datos inválidos.",
      };
    }
    const row = await competenciaService.createCompetencia(parsed.data);
    revalidateCompetenciaPreciosPaths();
    return { ok: true, data: row };
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo crear el competidor.";
    if (message.includes("Unique constraint")) {
      return { ok: false, error: "Ya existe un competidor con ese nombre." };
    }
    return { ok: false, error: message };
  }
}

export async function updateCompetenciaAction(
  raw: unknown
): Promise<ActionResult<CompetenciaParaCliente>> {
  try {
    const denied = await gateEditar();
    if (denied) return denied;
    const parsed = updateCompetenciaSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return {
        ok: false,
        error:
          msg.nombre?.[0] ??
          msg.web?.[0] ??
          msg.id?.[0] ??
          msg.configExtraccion?.[0] ??
          msg.idProveedor?.[0] ??
          "Datos inválidos.",
      };
    }
    const row = await competenciaService.updateCompetencia(parsed.data);
    revalidateCompetenciaPreciosPaths();
    return { ok: true, data: row };
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo actualizar el competidor.";
    if (message.includes("Unique constraint")) {
      return { ok: false, error: "Ya existe un competidor con ese nombre." };
    }
    return { ok: false, error: message };
  }
}

export async function deleteCompetenciaAction(raw: unknown): Promise<ActionResult<void>> {
  try {
    const denied = await gateEditar();
    if (denied) return denied;
    const parsed = deleteCompetenciaSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "ID inválido." };
    }
    await competenciaService.deleteCompetencia(parsed.data.id);
    revalidateCompetenciaPreciosPaths();
    return { ok: true, data: undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo eliminar el competidor.",
    };
  }
}

export async function guardarUrlVinculoCompetenciaAction(
  raw: unknown
): Promise<ActionResult<DatoVinculoCompetenciaCliente>> {
  try {
    const denied = await gateEditar();
    if (denied) return denied;
    const parsed = guardarUrlVinculoSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return {
        ok: false,
        error:
          msg.codTienda?.[0] ??
          msg.competenciaId?.[0] ??
          msg.urlProducto?.[0] ??
          "Datos inválidos.",
      };
    }
    const row = await guardarUrlVinculoCompetencia(parsed.data);
    revalidateCompetenciaPreciosPaths();
    return { ok: true, data: row };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar la URL.",
    };
  }
}

export async function relevarUrlVinculoCompetenciaAction(
  raw: unknown
): Promise<ActionResult<DatoVinculoCompetenciaCliente>> {
  try {
    const denied = await gateEditar();
    if (denied) return denied;
    const parsed = relevarUrlVinculoSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return {
        ok: false,
        error:
          msg.codTienda?.[0] ??
          msg.competenciaId?.[0] ??
          "Datos inválidos.",
      };
    }
    const row = await relevarVinculoCompetenciaUnico(parsed.data);
    revalidateCompetenciaPreciosPaths();
    return { ok: true, data: row };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo relevar la URL.",
    };
  }
}

export async function relevarUrlsProductoCompetenciaAction(
  raw: unknown
): Promise<ActionResult<RelevarVinculosPorCodTiendaResult>> {
  try {
    const denied = await gateEditar();
    if (denied) return denied;
    const parsed = relevarUrlsProductoSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return {
        ok: false,
        error: msg.codTienda?.[0] ?? "Datos inválidos.",
      };
    }
    const result = await relevarVinculosPorCodTienda(parsed.data.codTienda);
    revalidateCompetenciaPreciosPaths();
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo relevar las URLs.",
    };
  }
}
