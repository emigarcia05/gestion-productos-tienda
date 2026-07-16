import { prisma } from "@/lib/prisma";
import type { MktColorMarcaItem } from "@/lib/mktColoresMarca";
import {
  parseCodHexadecimalesStored,
  serializeCodHexadecimales,
} from "@/lib/mktColoresMarca";
import type {
  CrearMktColorMarcaInput,
  EditarMktColorMarcaInput,
} from "@/lib/validations/mktColoresMarca";
import type { ServiceResult } from "@/types/service.types";

const select = {
  id: true,
  nombre: true,
  descripcion: true,
  codHexadecimales: true,
} as const;

function mapRow(row: {
  id: string;
  nombre: string;
  descripcion: string;
  codHexadecimales: string;
}): MktColorMarcaItem {
  return {
    id: row.id,
    nombre: row.nombre.toLocaleUpperCase("es-AR"),
    descripcion: row.descripcion.trim(),
    codHexadecimales: parseCodHexadecimalesStored(row.codHexadecimales),
  };
}

export async function listarMktColoresMarca(): Promise<MktColorMarcaItem[]> {
  const rows = await prisma.mktColoresMarca.findMany({
    orderBy: [{ nombre: "asc" }, { createdAt: "asc" }],
    select,
  });
  return rows.map(mapRow);
}

export async function crearMktColorMarca(
  input: CrearMktColorMarcaInput
): Promise<ServiceResult<MktColorMarcaItem>> {
  try {
    const row = await prisma.mktColoresMarca.create({
      data: {
        nombre: input.nombre.trim().toLocaleUpperCase("es-AR"),
        descripcion: input.descripcion.trim(),
        codHexadecimales: serializeCodHexadecimales(input.codHexadecimales),
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "No se pudo crear el registro.",
    };
  }
}

export async function editarMktColorMarca(
  input: EditarMktColorMarcaInput
): Promise<ServiceResult<MktColorMarcaItem>> {
  try {
    const row = await prisma.mktColoresMarca.update({
      where: { id: input.id },
      data: {
        nombre: input.nombre.trim().toLocaleUpperCase("es-AR"),
        descripcion: input.descripcion.trim(),
        codHexadecimales: serializeCodHexadecimales(input.codHexadecimales),
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return { success: false, error: "El registro no existe." };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "No se pudo actualizar el registro.",
    };
  }
}

export async function eliminarMktColorMarca(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.mktColoresMarca.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return { success: false, error: "El registro no existe." };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "No se pudo eliminar el registro.",
    };
  }
}
