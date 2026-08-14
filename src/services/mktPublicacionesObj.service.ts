import type { MktPubliObjEje, MktPubliObjPeriodo, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  destinoClaveMktPubliObj,
  type MktPublicacionObjItem,
} from "@/lib/mktPublicacionesObj";
import type {
  CrearMktPublicacionObjInput,
  EditarMktPublicacionObjInput,
} from "@/lib/validations/mktPublicacionesObj";
import type { ServiceResult } from "@/types/service.types";

function mapDbError(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "P2002") {
      return "Ya existe un objetivo para ese destino.";
    }
    if (code === "P2025") return "Objetivo no encontrado.";
    if (code === "P2003") {
      return "No se puede eliminar: hay datos relacionados.";
    }
  }
  return error instanceof Error ? error.message : fallback;
}

type ObjRow = {
  id: string;
  periodo: MktPubliObjPeriodo;
  eje: MktPubliObjEje;
  cantidad: number;
  redId: string | null;
  tipoContenidoId: string | null;
  seccionId: string | null;
  red: { redSocialNombre: string } | null;
  tipoContenido: { contenidoNombre: string } | null;
  seccion: { ideaNombre: string } | null;
};

const objSelect = {
  id: true,
  periodo: true,
  eje: true,
  cantidad: true,
  redId: true,
  tipoContenidoId: true,
  seccionId: true,
  red: { select: { redSocialNombre: true } },
  tipoContenido: { select: { contenidoNombre: true } },
  seccion: { select: { ideaNombre: true } },
} satisfies Prisma.MktPublicacionObjSelect;

function mapObj(row: ObjRow): MktPublicacionObjItem {
  let destinoId = "";
  let destinoNombre = "";
  switch (row.eje) {
    case "RED":
      destinoId = row.redId ?? "";
      destinoNombre = (row.red?.redSocialNombre ?? "").toLocaleUpperCase("es-AR");
      break;
    case "CONTENIDO":
      destinoId = row.tipoContenidoId ?? "";
      destinoNombre = (row.tipoContenido?.contenidoNombre ?? "").toLocaleUpperCase("es-AR");
      break;
    case "SECCION":
      destinoId = row.seccionId ?? "";
      destinoNombre = (row.seccion?.ideaNombre ?? "").toLocaleUpperCase("es-AR");
      break;
  }
  return {
    id: row.id,
    periodo: row.periodo,
    eje: row.eje,
    cantidad: row.cantidad,
    destinoId,
    destinoNombre,
  };
}

async function assertDestinoExiste(
  eje: MktPubliObjEje,
  destinoId: string
): Promise<ServiceResult<{ nombre: string }>> {
  if (eje === "RED") {
    const red = await prisma.mktPublicacionRed.findUnique({
      where: { id: destinoId },
      select: { redSocialNombre: true },
    });
    if (!red) return { success: false, error: "La red no existe." };
    return { success: true, data: { nombre: red.redSocialNombre } };
  }
  if (eje === "CONTENIDO") {
    const contenido = await prisma.mktPublicacionContenidoTipo.findUnique({
      where: { id: destinoId },
      select: { contenidoNombre: true },
    });
    if (!contenido) return { success: false, error: "El tipo de contenido no existe." };
    return { success: true, data: { nombre: contenido.contenidoNombre } };
  }
  const seccion = await prisma.mktPublicacionIdeaSeccion.findUnique({
    where: { id: destinoId },
    select: { ideaNombre: true },
  });
  if (!seccion) return { success: false, error: "La sección no existe." };
  return { success: true, data: { nombre: seccion.ideaNombre } };
}

function dataFksDesdeEje(
  eje: MktPubliObjEje,
  destinoId: string
): {
  redId: string | null;
  tipoContenidoId: string | null;
  seccionId: string | null;
} {
  return {
    redId: eje === "RED" ? destinoId : null,
    tipoContenidoId: eje === "CONTENIDO" ? destinoId : null,
    seccionId: eje === "SECCION" ? destinoId : null,
  };
}

export async function listarMktPublicacionObjs(): Promise<MktPublicacionObjItem[]> {
  const rows = await prisma.mktPublicacionObj.findMany({
    orderBy: [{ periodo: "asc" }, { eje: "asc" }, { createdAt: "asc" }],
    select: objSelect,
  });
  return rows.map(mapObj).sort((a, b) => {
    const byPeriodo = a.periodo.localeCompare(b.periodo);
    if (byPeriodo !== 0) return byPeriodo;
    const byEje = a.eje.localeCompare(b.eje);
    if (byEje !== 0) return byEje;
    return a.destinoNombre.localeCompare(b.destinoNombre, "es");
  });
}

export async function crearMktPublicacionObj(
  input: CrearMktPublicacionObjInput
): Promise<ServiceResult<MktPublicacionObjItem>> {
  const eje = input.eje as MktPubliObjEje;
  const periodo = input.periodo as MktPubliObjPeriodo;
  const destinoOk = await assertDestinoExiste(eje, input.destinoId);
  if (!destinoOk.success) return destinoOk;

  const fks = dataFksDesdeEje(eje, input.destinoId);
  try {
    const created = await prisma.mktPublicacionObj.create({
      data: {
        periodo,
        eje,
        destinoClave: destinoClaveMktPubliObj(eje, input.destinoId),
        cantidad: input.cantidad,
        ...fks,
      },
      select: objSelect,
    });
    return { success: true, data: mapObj(created) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear el objetivo."),
    };
  }
}

export async function editarMktPublicacionObj(
  input: EditarMktPublicacionObjInput
): Promise<ServiceResult<MktPublicacionObjItem>> {
  const periodo = input.periodo as MktPubliObjPeriodo;
  try {
    const updated = await prisma.mktPublicacionObj.update({
      where: { id: input.id },
      data: {
        periodo,
        cantidad: input.cantidad,
      },
      select: objSelect,
    });
    return { success: true, data: mapObj(updated) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo actualizar el objetivo."),
    };
  }
}

export async function eliminarMktPublicacionObj(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.mktPublicacionObj.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo eliminar el objetivo."),
    };
  }
}
