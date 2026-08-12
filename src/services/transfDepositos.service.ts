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
