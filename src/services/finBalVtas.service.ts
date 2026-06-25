import { prisma } from "@/lib/prisma";
import type {
  CrearFinBalVtasInput,
  GuardarFinBalVtasCargaPeriodoInput,
} from "@/lib/validations/finBalVtas";
import type { ServiceResult } from "@/types";

export interface SucursalGeneraBalanceOption {
  id: string;
  nombre: string;
}

export interface FinBalVtasItem {
  id: string;
  sucursalId: string;
  mes: number;
  anio: number;
  monto: number;
  createdAt: Date;
  updatedAt: Date;
  sucursal: { id: string; nombre: string };
}

/** Sucursales elegibles: solo `genera_balance = true` (regla de negocio pedida). */
export async function listarSucursalesGeneraBalanceParaVtas(): Promise<SucursalGeneraBalanceOption[]> {
  const rows = await prisma.sucursal.findMany({
    where: { generaBalance: true },
    select: { id: true, nombre: true },
    orderBy: [{ nombre: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre.toLocaleUpperCase("es"),
  }));
}

export async function listarFinBalVtas(): Promise<FinBalVtasItem[]> {
  const rows = await prisma.finBalVtas.findMany({
    orderBy: [{ anio: "desc" }, { mes: "desc" }, { createdAt: "desc" }],
    include: { sucursal: { select: { id: true, nombre: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    sucursalId: r.sucursalId,
    mes: r.mes,
    anio: r.anio,
    monto: r.monto,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    sucursal: {
      id: r.sucursal.id,
      nombre: r.sucursal.nombre.toLocaleUpperCase("es"),
    },
  }));
}

/** Ventas cargadas para un periodo (balance mensual). */
export async function listarFinBalVtasPorMesAnio(mes: number, anio: number): Promise<FinBalVtasItem[]> {
  const rows = await prisma.finBalVtas.findMany({
    where: { mes, anio },
    orderBy: [{ sucursal: { nombre: "asc" } }],
    include: { sucursal: { select: { id: true, nombre: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    sucursalId: r.sucursalId,
    mes: r.mes,
    anio: r.anio,
    monto: r.monto,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    sucursal: {
      id: r.sucursal.id,
      nombre: r.sucursal.nombre.toLocaleUpperCase("es"),
    },
  }));
}

async function sucursalGeneraBalance(sucursalId: string): Promise<boolean> {
  const s = await prisma.sucursal.findUnique({
    where: { id: sucursalId },
    select: { generaBalance: true },
  });
  return Boolean(s?.generaBalance);
}

export async function crearFinBalVtas(
  input: CrearFinBalVtasInput
): Promise<ServiceResult<FinBalVtasItem>> {
  if (!(await sucursalGeneraBalance(input.sucursalId))) {
    return {
      success: false,
      error: "La sucursal no existe o no tiene activado “generar balance”.",
    };
  }
  try {
    const row = await prisma.finBalVtas.upsert({
      where: {
        sucursalId_mes_anio: {
          sucursalId: input.sucursalId,
          mes: input.mes,
          anio: input.anio,
        },
      },
      create: {
        sucursalId: input.sucursalId,
        mes: input.mes,
        anio: input.anio,
        monto: input.monto,
      },
      update: { monto: input.monto },
      include: { sucursal: { select: { id: true, nombre: true } } },
    });
    return {
      success: true,
      data: mapFinBalVtasRow(row),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo registrar la venta.";
    return { success: false, error: msg };
  }
}

function mapFinBalVtasRow(row: {
  id: string;
  sucursalId: string;
  mes: number;
  anio: number;
  monto: number;
  createdAt: Date;
  updatedAt: Date;
  sucursal: { id: string; nombre: string };
}): FinBalVtasItem {
  return {
    id: row.id,
    sucursalId: row.sucursalId,
    mes: row.mes,
    anio: row.anio,
    monto: row.monto,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sucursal: {
      id: row.sucursal.id,
      nombre: row.sucursal.nombre.toLocaleUpperCase("es"),
    },
  };
}

/** Upsert de una o más sucursales para el mismo mes/año (carga masiva del modal). */
export async function guardarFinBalVtasCargaPeriodo(
  input: GuardarFinBalVtasCargaPeriodoInput
): Promise<ServiceResult<{ guardados: number }>> {
  for (const linea of input.lineas) {
    if (!(await sucursalGeneraBalance(linea.sucursalId))) {
      return {
        success: false,
        error: "Una sucursal no existe o no tiene activado “generar balance”.",
      };
    }
  }

  try {
    await prisma.$transaction(
      input.lineas.map((linea) =>
        prisma.finBalVtas.upsert({
          where: {
            sucursalId_mes_anio: {
              sucursalId: linea.sucursalId,
              mes: input.mes,
              anio: input.anio,
            },
          },
          create: {
            sucursalId: linea.sucursalId,
            mes: input.mes,
            anio: input.anio,
            monto: linea.monto,
          },
          update: { monto: linea.monto },
        })
      )
    );
    return { success: true, data: { guardados: input.lineas.length } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo guardar la carga de ventas.";
    return { success: false, error: msg };
  }
}

export async function eliminarFinBalVtas(id: string): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.finBalVtas.delete({ where: { id } });
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
