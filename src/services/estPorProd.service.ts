import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  EstPorProdItem,
  ImportarEstPorProdResultado,
  SucursalConDepositoOption,
} from "@/lib/estPorProdTypes";
import type { ImportarEstPorProdInput } from "@/lib/validations/estPorProd";
import type { ServiceResult } from "@/types";

export type {
  EstPorProdItem,
  ImportarEstPorProdResultado,
  SucursalConDepositoOption,
} from "@/lib/estPorProdTypes";

const IMPORT_UPSERT_CHUNK = 100;

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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
  try {
    const rows = await prisma.sucursal.findMany({
      where: { deposito: { not: null } },
      select: { id: true, nombre: true },
      orderBy: [{ nombre: "asc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      nombre: r.nombre.toLocaleUpperCase("es"),
    }));
  } catch (e: unknown) {
    console.error("[estPorProd.service] listarSucursalesConDepositoParaEstPorProd:", e);
    return [];
  }
}

export async function listarEstPorProd(): Promise<EstPorProdItem[]> {
  try {
    const rows = await prisma.estPorProd.findMany({
      orderBy: [{ anio: "desc" }, { mes: "desc" }, { sucursal: { nombre: "asc" } }, { codTienda: "asc" }],
      include: estPorProdInclude,
    });
    return rows.map(mapEstPorProdRow);
  } catch (e: unknown) {
    console.error("[estPorProd.service] listarEstPorProd:", e);
    return [];
  }
}

async function sucursalTieneDeposito(sucursalId: string): Promise<boolean> {
  const s = await prisma.sucursal.findUnique({
    where: { id: sucursalId },
    select: { deposito: true },
  });
  return s?.deposito != null && s.deposito.trim() !== "";
}

export interface EstPorProdPeriodoExistente {
  existe: boolean;
  cantidad: number;
}

export async function verificarEstPorProdPeriodo(
  sucursalId: string,
  mes: number,
  anio: number
): Promise<EstPorProdPeriodoExistente> {
  const cantidad = await prisma.estPorProd.count({
    where: { sucursalId, mes, anio },
  });
  return { existe: cantidad > 0, cantidad };
}

async function eliminarEstPorProdPorPeriodo(
  sucursalId: string,
  mes: number,
  anio: number
): Promise<number> {
  const res = await prisma.estPorProd.deleteMany({
    where: { sucursalId, mes, anio },
  });
  return res.count;
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

  const periodoExistente = await verificarEstPorProdPeriodo(
    input.sucursalId,
    input.mes,
    input.anio
  );
  if (periodoExistente.existe && !input.reemplazarPeriodo) {
    return {
      success: false,
      error: "Ya existen datos para este periodo y sucursal. Confirmá el reemplazo.",
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
    let reemplazados = 0;
    if (input.reemplazarPeriodo && periodoExistente.existe) {
      reemplazados = await eliminarEstPorProdPorPeriodo(
        input.sucursalId,
        input.mes,
        input.anio
      );
    }

    const entries = [...porCodigo.entries()];
    for (let i = 0; i < entries.length; i += IMPORT_UPSERT_CHUNK) {
      const slice = entries.slice(i, i + IMPORT_UPSERT_CHUNK);
      await prisma.$transaction(
        slice.map(([codTienda, vtasEnUn]) =>
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
    }

    return {
      success: true,
      data: {
        importados: porCodigo.size,
        omitidosCodTiendaInexistente: omitidos.length,
        codigosOmitidos,
        reemplazados,
      },
    };
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2021" || code === "P2022") {
      return {
        success: false,
        error: "Falta la tabla est_por_prod en la base. Aplicá las migraciones Prisma.",
      };
    }
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
