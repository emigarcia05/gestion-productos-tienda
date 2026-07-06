import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ImportarEstPorProdInput } from "@/lib/validations/estPorProd";
import type { ServiceResult } from "@/types";

export interface SucursalConDepositoOption {
  id: string;
  nombre: string;
}

export interface EstPorProdItem {
  id: string;
  sucursalId: string;
  mes: number;
  anio: number;
  codTienda: string;
  vtasEnUn: number;
  createdAt: Date;
  updatedAt: Date;
  sucursal: { id: string; nombre: string };
  producto: { codTienda: string; descripcionTienda: string | null };
}

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}

function mapEstPorProdRow(row: {
  id: string;
  sucursalId: string;
  mes: number;
  anio: number;
  codTienda: string;
  vtasEnUn: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  sucursal: { id: string; nombre: string };
  producto: { codTienda: string; descripcionTienda: string | null };
}): EstPorProdItem {
  return {
    id: row.id,
    sucursalId: row.sucursalId,
    mes: row.mes,
    anio: row.anio,
    codTienda: row.codTienda,
    vtasEnUn: decimalToNumber(row.vtasEnUn),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sucursal: {
      id: row.sucursal.id,
      nombre: row.sucursal.nombre.toLocaleUpperCase("es"),
    },
    producto: {
      codTienda: row.producto.codTienda,
      descripcionTienda: row.producto.descripcionTienda,
    },
  };
}

const estPorProdInclude = {
  sucursal: { select: { id: true, nombre: true } },
  producto: { select: { codTienda: true, descripcionTienda: true } },
} as const;

/** Sucursales elegibles: `deposito` no nulo (regla de negocio del módulo). */
export async function listarSucursalesConDepositoParaEstPorProd(): Promise<SucursalConDepositoOption[]> {
  const rows = await prisma.sucursal.findMany({
    where: { deposito: { not: null } },
    select: { id: true, nombre: true },
    orderBy: [{ nombre: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre.toLocaleUpperCase("es"),
  }));
}

export async function listarEstPorProd(): Promise<EstPorProdItem[]> {
  const rows = await prisma.estPorProd.findMany({
    orderBy: [{ anio: "desc" }, { mes: "desc" }, { sucursal: { nombre: "asc" } }, { codTienda: "asc" }],
    include: estPorProdInclude,
  });
  return rows.map(mapEstPorProdRow);
}

async function sucursalTieneDeposito(sucursalId: string): Promise<boolean> {
  const s = await prisma.sucursal.findUnique({
    where: { id: sucursalId },
    select: { deposito: true },
  });
  return s?.deposito != null && s.deposito.trim() !== "";
}

export interface ImportarEstPorProdResultado {
  importados: number;
  omitidosCodTiendaInexistente: number;
  codigosOmitidos: string[];
}

/** Upsert masivo por periodo + sucursal (una fila por `cod_tienda`). */
export async function importarEstPorProd(
  input: ImportarEstPorProdInput
): Promise<ServiceResult<ImportarEstPorProdResultado>> {
  if (!(await sucursalTieneDeposito(input.sucursalId))) {
    return {
      success: false,
      error: "La sucursal no existe o no tiene depósito configurado.",
    };
  }

  const codigosUnicos = [...new Set(input.lineas.map((l) => l.codTienda))];
  const existentes = await prisma.prodTienda.findMany({
    where: { codTienda: { in: codigosUnicos } },
    select: { codTienda: true },
  });
  const codigosValidos = new Set(existentes.map((e) => e.codTienda));

  const lineasValidas = input.lineas.filter((l) => codigosValidos.has(l.codTienda));
  const omitidos = input.lineas
    .filter((l) => !codigosValidos.has(l.codTienda))
    .map((l) => l.codTienda);
  const codigosOmitidos = [...new Set(omitidos)].slice(0, 20);

  if (lineasValidas.length === 0) {
    return {
      success: false,
      error: "Ningún código de tienda de la planilla existe en el catálogo prod_tienda.",
    };
  }

  const porCodigo = new Map<string, number>();
  for (const linea of lineasValidas) {
    porCodigo.set(linea.codTienda, linea.vtasEnUn);
  }

  try {
    await prisma.$transaction(
      [...porCodigo.entries()].map(([codTienda, vtasEnUn]) =>
        prisma.estPorProd.upsert({
          where: {
            sucursalId_mes_anio_codTienda: {
              sucursalId: input.sucursalId,
              mes: input.mes,
              anio: input.anio,
              codTienda,
            },
          },
          create: {
            sucursalId: input.sucursalId,
            mes: input.mes,
            anio: input.anio,
            codTienda,
            vtasEnUn,
          },
          update: { vtasEnUn },
        })
      )
    );

    return {
      success: true,
      data: {
        importados: porCodigo.size,
        omitidosCodTiendaInexistente: omitidos.length,
        codigosOmitidos,
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo importar la planilla.";
    return { success: false, error: msg };
  }
}

export async function eliminarEstPorProd(id: string): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.estPorProd.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2025") {
      return { success: false, error: "Registro no encontrado." };
    }
    const msg = e instanceof Error ? e.message : "No se pudo eliminar el registro.";
    return { success: false, error: msg };
  }
}
