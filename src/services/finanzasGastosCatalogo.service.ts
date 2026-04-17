import type { TipoCostoGasto } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types/service.types";

export interface RubroCatalogoOption {
  id: string;
  nombre: string;
}

export interface FinanzasGastoCatalogoItem {
  id: string;
  rubroId: string;
  rubroNombre: string;
  tipoCosto: TipoCostoGasto;
  nombre: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CrearGastoCatalogoInput =
  | {
      tipoCosto: TipoCostoGasto;
      nombre: string;
      rubroId: string;
      rubroNombreNuevo?: undefined;
    }
  | {
      tipoCosto: TipoCostoGasto;
      nombre: string;
      rubroId?: undefined;
      rubroNombreNuevo: string;
    };

export async function listarRubrosCatalogo(): Promise<RubroCatalogoOption[]> {
  const rows = await prisma.finanzasRubro.findMany({
    select: { id: true, nombre: true },
    orderBy: [{ nombre: "asc" }],
  });
  return rows.map((r) => ({ id: r.id, nombre: r.nombre.toUpperCase() }));
}

function mapDbError(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "P2002") {
      return "Ya existe un gasto con ese rubro, tipo de costo y nombre.";
    }
    if (code === "P2025") return "Rubro no encontrado.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function crearGastoCatalogo(
  input: CrearGastoCatalogoInput
): Promise<ServiceResult<FinanzasGastoCatalogoItem>> {
  try {
    const nombreGasto = input.nombre.trim().toUpperCase();
    if (nombreGasto.length === 0) {
      return { success: false, error: "El nombre del gasto es obligatorio." };
    }

    const row = await prisma.$transaction(async (tx) => {
      let rubroId: string;
      if (input.rubroId) {
        const rubro = await tx.finanzasRubro.findUnique({
          where: { id: input.rubroId },
          select: { id: true },
        });
        if (!rubro) throw new Error("Rubro no encontrado.");
        rubroId = rubro.id;
      } else {
        const nombreRubro = input.rubroNombreNuevo.trim().toUpperCase();
        if (nombreRubro.length === 0) {
          throw new Error("El nombre del rubro es obligatorio.");
        }
        const rubro = await tx.finanzasRubro.upsert({
          where: { nombre: nombreRubro },
          update: {},
          create: { nombre: nombreRubro },
          select: { id: true },
        });
        rubroId = rubro.id;
      }

      return tx.finanzasGasto.create({
        data: {
          rubroId,
          tipoCosto: input.tipoCosto,
          nombre: nombreGasto,
        },
        include: { rubro: { select: { nombre: true } } },
      });
    });

    return {
      success: true,
      data: {
        id: row.id,
        rubroId: row.rubroId,
        rubroNombre: row.rubro.nombre.toUpperCase(),
        tipoCosto: row.tipoCosto,
        nombre: row.nombre.toUpperCase(),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear el gasto de catálogo."),
    };
  }
}
