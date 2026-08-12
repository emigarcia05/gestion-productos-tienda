import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";
import {
  SUCURSAL_LABEL_TRANSF,
  TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS,
  TRANSF_DEPOSITOS_VENTANA_HISTORIAL_DIAS,
} from "@/lib/transfDepositosControl";
import type { RegistrarControlTransfDepositosInput } from "@/lib/validations/transfDepositos";

export type SucursalCodigoTransf = "guaymallen" | "maipu";

export type ControlTransfDepositosReciente = {
  codTienda: string;
  cantidad: number;
  createdAtIso: string;
};

export type RegistrarControlTransfDepositosResult = {
  id: string;
  createdAtIso: string;
  /** true si se persistió pese a haber un duplicado reciente (forzar). */
  eraDuplicado: boolean;
};

export type HistorialTransfDepositosItem = {
  createdAtIso: string;
  cantidad: number;
};

export type HistorialTransfDepositosSeccion = {
  origenCodigo: SucursalCodigoTransf;
  destinoCodigo: SucursalCodigoTransf;
  /** Ej. `GUAYMALLÉN → MAIPÚ`. */
  titulo: string;
  items: HistorialTransfDepositosItem[];
};

function desdeVentanaDuplicado(): Date {
  const d = new Date();
  d.setDate(d.getDate() - TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS);
  return d;
}

function desdeVentanaHistorial(): Date {
  const d = new Date();
  d.setDate(d.getDate() - TRANSF_DEPOSITOS_VENTANA_HISTORIAL_DIAS);
  return d;
}

function labelSucursal(codigo: string): string {
  if (codigo === "guaymallen" || codigo === "maipu") {
    return SUCURSAL_LABEL_TRANSF[codigo];
  }
  return codigo.toUpperCase();
}

/**
 * Controles recientes del par origen→destino (ventana anti-duplicado),
 * para pintar advertencias en la grilla.
 */
export async function listarControlesRecientesTransfDepositos(
  origen: SucursalCodigoTransf,
  destino: SucursalCodigoTransf,
  codTiendas: string[]
): Promise<ControlTransfDepositosReciente[]> {
  if (origen === destino || codTiendas.length === 0) return [];
  const desde = desdeVentanaDuplicado();
  const rows = await prisma.prodStockTransfDep.findMany({
    where: {
      origenCodigo: origen,
      destinoCodigo: destino,
      codTienda: { in: codTiendas },
      createdAt: { gte: desde },
    },
    orderBy: { createdAt: "desc" },
    select: {
      codTienda: true,
      cantidad: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    codTienda: r.codTienda,
    cantidad: r.cantidad,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

/**
 * Historial de transferencias de un producto (cualquier par origen→destino)
 * en la ventana de historial, agrupado por sección.
 */
export async function listarHistorialTransfDepositosPorProducto(
  codTienda: string
): Promise<HistorialTransfDepositosSeccion[]> {
  const desde = desdeVentanaHistorial();
  const rows = await prisma.prodStockTransfDep.findMany({
    where: {
      codTienda,
      createdAt: { gte: desde },
    },
    orderBy: [
      { origenCodigo: "asc" },
      { destinoCodigo: "asc" },
      { createdAt: "desc" },
    ],
    select: {
      origenCodigo: true,
      destinoCodigo: true,
      cantidad: true,
      createdAt: true,
    },
  });

  const porPar = new Map<string, HistorialTransfDepositosSeccion>();
  for (const r of rows) {
    const origen = r.origenCodigo as SucursalCodigoTransf;
    const destino = r.destinoCodigo as SucursalCodigoTransf;
    const key = `${origen}|${destino}`;
    let seccion = porPar.get(key);
    if (!seccion) {
      seccion = {
        origenCodigo: origen,
        destinoCodigo: destino,
        titulo: `${labelSucursal(origen)} → ${labelSucursal(destino)}`,
        items: [],
      };
      porPar.set(key, seccion);
    }
    seccion.items.push({
      createdAtIso: r.createdAt.toISOString(),
      cantidad: r.cantidad,
    });
  }

  return Array.from(porPar.values()).sort((a, b) =>
    a.titulo.localeCompare(b.titulo, "es")
  );
}

async function buscarDuplicadoReciente(input: {
  codTienda: string;
  origen: SucursalCodigoTransf;
  destino: SucursalCodigoTransf;
  cantidad: number;
}): Promise<{ id: string; createdAt: Date } | null> {
  const row = await prisma.prodStockTransfDep.findFirst({
    where: {
      codTienda: input.codTienda,
      origenCodigo: input.origen,
      destinoCodigo: input.destino,
      cantidad: input.cantidad,
      createdAt: { gte: desdeVentanaDuplicado() },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
  return row;
}

/**
 * Registra un control de transferencia. Si hay duplicado reciente y `forzar` es false,
 * no persiste y devuelve advertencia con la fecha del último registro.
 * Reservado para el futuro export Excel.
 */
export async function registrarControlTransfDepositos(
  input: RegistrarControlTransfDepositosInput
): Promise<
  ServiceResult<
    | RegistrarControlTransfDepositosResult
    | {
        requiereConfirmacion: true;
        ultimoCreatedAtIso: string;
      }
  >
> {
  try {
    const dup = await buscarDuplicadoReciente({
      codTienda: input.codTienda,
      origen: input.origen,
      destino: input.destino,
      cantidad: input.cantidad,
    });

    if (dup && !input.forzar) {
      return {
        success: true,
        data: {
          requiereConfirmacion: true,
          ultimoCreatedAtIso: dup.createdAt.toISOString(),
        },
      };
    }

    const created = await prisma.prodStockTransfDep.create({
      data: {
        codTienda: input.codTienda,
        origenCodigo: input.origen,
        destinoCodigo: input.destino,
        cantidad: input.cantidad,
        /** Pendiente de Excel origen (EGRESO) y destino (INGRESO). */
        exportadoOrigenAt: null,
        exportadoDestinoAt: null,
      },
      select: { id: true, createdAt: true },
    });

    return {
      success: true,
      data: {
        id: created.id,
        createdAtIso: created.createdAt.toISOString(),
        eraDuplicado: Boolean(dup),
      },
    };
  } catch (e) {
    console.error("[registrarControlTransfDepositos]", e);
    const message =
      e instanceof Error ? e.message : "Error al registrar control.";
    return { success: false, error: message };
  }
}

export type PendienteExportTransfDepositos = {
  sucursal: SucursalCodigoTransf;
  label: string;
  cantidadRegistros: number;
  /** ISO de la transferencia pendiente más reciente. */
  fechaIso: string;
};

export type FilaExcelTransfDepositos = {
  cod: string;
  tipoMovimiento: "EGRESO" | "INGRESO";
  cantidad: number;
};

/**
 * Encola ítems de la grilla como transferencias pendientes de export Excel
 * (ambos lados sin marcar exportado). Omite check de duplicado (forzar).
 */
export async function encolarTransferenciasPendientes(input: {
  origen: SucursalCodigoTransf;
  destino: SucursalCodigoTransf;
  items: { codTienda: string; cantidad: number }[];
}): Promise<ServiceResult<{ creados: number }>> {
  try {
    if (input.origen === input.destino) {
      return { success: false, error: "Origen y destino deben ser distintos." };
    }
    if (input.items.length === 0) {
      return { success: false, error: "No hay cantidades para registrar." };
    }

    await prisma.prodStockTransfDep.createMany({
      data: input.items.map((it) => ({
        codTienda: it.codTienda,
        origenCodigo: input.origen,
        destinoCodigo: input.destino,
        cantidad: it.cantidad,
        exportadoOrigenAt: null,
        exportadoDestinoAt: null,
      })),
    });

    return { success: true, data: { creados: input.items.length } };
  } catch (e) {
    console.error("[encolarTransferenciasPendientes]", e);
    const message =
      e instanceof Error ? e.message : "Error al encolar transferencias.";
    return { success: false, error: message };
  }
}

/**
 * Resumen de pendientes de Excel por sucursal (EGRESO u INGRESO sin exportar).
 */
export async function listarPendientesExportTransfDepositos(): Promise<
  PendienteExportTransfDepositos[]
> {
  const sucursales: SucursalCodigoTransf[] = ["guaymallen", "maipu"];
  const out: PendienteExportTransfDepositos[] = [];

  for (const suc of sucursales) {
    const [comoOrigen, comoDestino] = await Promise.all([
      prisma.prodStockTransfDep.findMany({
        where: { origenCodigo: suc, exportadoOrigenAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.prodStockTransfDep.findMany({
        where: { destinoCodigo: suc, exportadoDestinoAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const cantidadRegistros = comoOrigen.length + comoDestino.length;
    if (cantidadRegistros === 0) continue;
    const fechas = [...comoOrigen, ...comoDestino].map((r) =>
      r.createdAt.getTime()
    );
    const maxTs = Math.max(...fechas);
    out.push({
      sucursal: suc,
      label: labelSucursal(suc),
      cantidadRegistros,
      fechaIso: new Date(maxTs).toISOString(),
    });
  }

  return out.sort((a, b) => a.label.localeCompare(b.label, "es"));
}

/**
 * Arma filas Excel para una sucursal y marca esos movimientos como exportados.
 */
export async function exportarPendientesTransfDepositosPorSucursal(
  sucursal: SucursalCodigoTransf
): Promise<
  ServiceResult<{
    filas: FilaExcelTransfDepositos[];
    marcados: number;
  }>
> {
  try {
    const ahora = new Date();
    const [egresos, ingresos] = await Promise.all([
      prisma.prodStockTransfDep.findMany({
        where: { origenCodigo: sucursal, exportadoOrigenAt: null },
        select: { id: true, codTienda: true, cantidad: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.prodStockTransfDep.findMany({
        where: { destinoCodigo: sucursal, exportadoDestinoAt: null },
        select: { id: true, codTienda: true, cantidad: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (egresos.length === 0 && ingresos.length === 0) {
      return { success: false, error: "No hay registros pendientes." };
    }

    const filas: FilaExcelTransfDepositos[] = [
      ...egresos.map((r) => ({
        cod: r.codTienda,
        tipoMovimiento: "EGRESO" as const,
        cantidad: r.cantidad,
      })),
      ...ingresos.map((r) => ({
        cod: r.codTienda,
        tipoMovimiento: "INGRESO" as const,
        cantidad: r.cantidad,
      })),
    ];

    await prisma.$transaction([
      prisma.prodStockTransfDep.updateMany({
        where: { id: { in: egresos.map((r) => r.id) } },
        data: { exportadoOrigenAt: ahora },
      }),
      prisma.prodStockTransfDep.updateMany({
        where: { id: { in: ingresos.map((r) => r.id) } },
        data: { exportadoDestinoAt: ahora },
      }),
    ]);

    return {
      success: true,
      data: {
        filas,
        marcados: egresos.length + ingresos.length,
      },
    };
  } catch (e) {
    console.error("[exportarPendientesTransfDepositosPorSucursal]", e);
    const message =
      e instanceof Error ? e.message : "Error al exportar pendientes.";
    return { success: false, error: message };
  }
}
