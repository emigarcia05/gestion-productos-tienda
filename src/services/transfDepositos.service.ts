import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";
import {
  SUCURSAL_LABEL_TRANSF,
  TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS,
  TRANSF_DEPOSITOS_VENTANA_HISTORIAL_DIAS,
} from "@/lib/transfDepositosControl";

export type SucursalCodigoTransf = "guaymallen" | "maipu";

export type ControlTransfDepositosReciente = {
  codTienda: string;
  cantidad: number;
  createdAtIso: string;
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

/** Transferir = Excel EGRESO (origen); Recibir = Excel INGRESO (destino). */
export type TipoPendienteTransfDepositos = "transferir" | "recibir";

export type PendienteExportTransfDepositos = {
  /** Clave estable `tipo|origen|destino`. */
  id: string;
  tipo: TipoPendienteTransfDepositos;
  tipoLabel: "TRANSFERIR" | "RECIBIR";
  origenCodigo: SucursalCodigoTransf;
  destinoCodigo: SucursalCodigoTransf;
  origenLabel: string;
  destinoLabel: string;
  /** Sucursal del Excel (origen si transferir, destino si recibir). */
  sucursalExcel: SucursalCodigoTransf;
  sucursalExcelLabel: string;
  cantidadRegistros: number;
  /** ISO de la transferencia pendiente más reciente del grupo. */
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
 * Pendientes de Excel por par origen→destino y lado:
 * Transferir (EGRESO origen) / Recibir (INGRESO destino).
 */
export async function listarPendientesExportTransfDepositos(): Promise<
  PendienteExportTransfDepositos[]
> {
  const [pendientesOrigen, pendientesDestino] = await Promise.all([
    prisma.prodStockTransfDep.findMany({
      where: { exportadoOrigenAt: null },
      select: {
        origenCodigo: true,
        destinoCodigo: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.prodStockTransfDep.findMany({
      where: { exportadoDestinoAt: null },
      select: {
        origenCodigo: true,
        destinoCodigo: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  type Agg = { count: number; maxTs: number };
  const transferir = new Map<string, Agg>();
  const recibir = new Map<string, Agg>();

  for (const r of pendientesOrigen) {
    if (r.origenCodigo === r.destinoCodigo) continue;
    if (r.origenCodigo !== "guaymallen" && r.origenCodigo !== "maipu") continue;
    if (r.destinoCodigo !== "guaymallen" && r.destinoCodigo !== "maipu") continue;
    const key = `${r.origenCodigo}|${r.destinoCodigo}`;
    const prev = transferir.get(key);
    const ts = r.createdAt.getTime();
    if (!prev) transferir.set(key, { count: 1, maxTs: ts });
    else {
      prev.count += 1;
      if (ts > prev.maxTs) prev.maxTs = ts;
    }
  }

  for (const r of pendientesDestino) {
    if (r.origenCodigo === r.destinoCodigo) continue;
    if (r.origenCodigo !== "guaymallen" && r.origenCodigo !== "maipu") continue;
    if (r.destinoCodigo !== "guaymallen" && r.destinoCodigo !== "maipu") continue;
    const key = `${r.origenCodigo}|${r.destinoCodigo}`;
    const prev = recibir.get(key);
    const ts = r.createdAt.getTime();
    if (!prev) recibir.set(key, { count: 1, maxTs: ts });
    else {
      prev.count += 1;
      if (ts > prev.maxTs) prev.maxTs = ts;
    }
  }

  const out: PendienteExportTransfDepositos[] = [];

  for (const [key, agg] of transferir) {
    const [origenCodigo, destinoCodigo] = key.split("|") as [
      SucursalCodigoTransf,
      SucursalCodigoTransf,
    ];
    out.push({
      id: `transferir|${key}`,
      tipo: "transferir",
      tipoLabel: "TRANSFERIR",
      origenCodigo,
      destinoCodigo,
      origenLabel: labelSucursal(origenCodigo),
      destinoLabel: labelSucursal(destinoCodigo),
      sucursalExcel: origenCodigo,
      sucursalExcelLabel: labelSucursal(origenCodigo),
      cantidadRegistros: agg.count,
      fechaIso: new Date(agg.maxTs).toISOString(),
    });
  }

  for (const [key, agg] of recibir) {
    const [origenCodigo, destinoCodigo] = key.split("|") as [
      SucursalCodigoTransf,
      SucursalCodigoTransf,
    ];
    out.push({
      id: `recibir|${key}`,
      tipo: "recibir",
      tipoLabel: "RECIBIR",
      origenCodigo,
      destinoCodigo,
      origenLabel: labelSucursal(origenCodigo),
      destinoLabel: labelSucursal(destinoCodigo),
      sucursalExcel: destinoCodigo,
      sucursalExcelLabel: labelSucursal(destinoCodigo),
      cantidadRegistros: agg.count,
      fechaIso: new Date(agg.maxTs).toISOString(),
    });
  }

  return out.sort((a, b) => {
    const byFecha = b.fechaIso.localeCompare(a.fechaIso);
    if (byFecha !== 0) return byFecha;
    const byTipo = a.tipoLabel.localeCompare(b.tipoLabel, "es");
    if (byTipo !== 0) return byTipo;
    return a.origenLabel.localeCompare(b.origenLabel, "es");
  });
}

export type ConteosTransfSlidenav = {
  emision: number;
  recepcion: number;
};

/**
 * Pendientes Excel de una sucursal (filas del modal Transf. Pendiente Registro):
 * Emisión = TRANSFERIR, Recepción = RECIBIR.
 */
export async function contarPendientesTransfPorSucursal(
  sucursal: SucursalCodigoTransf
): Promise<ConteosTransfSlidenav> {
  const pendientes = await listarPendientesExportTransfDepositos();
  let emision = 0;
  let recepcion = 0;
  for (const p of pendientes) {
    if (p.sucursalExcel !== sucursal) continue;
    if (p.tipo === "transferir") emision += 1;
    else recepcion += 1;
  }
  return { emision, recepcion };
}

/**
 * Excel de un pendiente (par + Transferir/Recibir) y marca ese lado como exportado.
 */
export async function exportarPendientesTransfDepositos(
  input: {
    tipo: TipoPendienteTransfDepositos;
    origen: SucursalCodigoTransf;
    destino: SucursalCodigoTransf;
  }
): Promise<
  ServiceResult<{
    filas: FilaExcelTransfDepositos[];
    marcados: number;
    sucursalExcelLabel: string;
  }>
> {
  try {
    if (input.origen === input.destino) {
      return { success: false, error: "Origen y destino deben ser distintos." };
    }

    const ahora = new Date();

    if (input.tipo === "transferir") {
      const egresos = await prisma.prodStockTransfDep.findMany({
        where: {
          origenCodigo: input.origen,
          destinoCodigo: input.destino,
          exportadoOrigenAt: null,
        },
        select: { id: true, codTienda: true, cantidad: true },
        orderBy: { createdAt: "asc" },
      });
      if (egresos.length === 0) {
        return { success: false, error: "No hay registros pendientes." };
      }
      const filas: FilaExcelTransfDepositos[] = egresos.map((r) => ({
        cod: r.codTienda,
        tipoMovimiento: "EGRESO" as const,
        cantidad: r.cantidad,
      }));
      await prisma.prodStockTransfDep.updateMany({
        where: { id: { in: egresos.map((r) => r.id) } },
        data: { exportadoOrigenAt: ahora },
      });
      return {
        success: true,
        data: {
          filas,
          marcados: egresos.length,
          sucursalExcelLabel: labelSucursal(input.origen),
        },
      };
    }

    const ingresos = await prisma.prodStockTransfDep.findMany({
      where: {
        origenCodigo: input.origen,
        destinoCodigo: input.destino,
        exportadoDestinoAt: null,
      },
      select: { id: true, codTienda: true, cantidad: true },
      orderBy: { createdAt: "asc" },
    });
    if (ingresos.length === 0) {
      return { success: false, error: "No hay registros pendientes." };
    }
    const filas: FilaExcelTransfDepositos[] = ingresos.map((r) => ({
      cod: r.codTienda,
      tipoMovimiento: "INGRESO" as const,
      cantidad: r.cantidad,
    }));
    await prisma.prodStockTransfDep.updateMany({
      where: { id: { in: ingresos.map((r) => r.id) } },
      data: { exportadoDestinoAt: ahora },
    });
    return {
      success: true,
      data: {
        filas,
        marcados: ingresos.length,
        sucursalExcelLabel: labelSucursal(input.destino),
      },
    };
  } catch (e) {
    console.error("[exportarPendientesTransfDepositos]", e);
    const message =
      e instanceof Error ? e.message : "Error al exportar pendientes.";
    return { success: false, error: message };
  }
}
