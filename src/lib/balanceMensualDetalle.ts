import type { BalanceGastoMensualFila } from "@/services/finBalGastoMensualBalance.service";
import {
  partCostosVariablesFijos,
  repartoIgualEnteros,
} from "@/lib/balanceMensual";

/** Clave sintética para la fila de reparto de centros de costo sin balance (pool). */
export const BALANCE_MENSUAL_RUBRO_REPARTO_CC = "__reparto_cc__" as const;

export type BalanceMensualColumnaDetalle =
  | { ambito: "global" }
  | { ambito: "sucursal"; nombre: string };

export interface BalanceMensualFilaDetalleGasto {
  gastoNombre: string;
  proveedorNombre: string;
  sucursalNombre: string;
  rubroNombre: string;
  tipoGastoNombre: string;
  monto: number;
}

/**
 * Misma lista ordenada que usa `resumenBalanceMensualDesdeFilas` para columnas por sucursal.
 */
function sucursalesOrdenadasComoResumen(
  filas: BalanceGastoMensualFila[],
  sucursalesGeneranBalance: { id: string; nombre: string }[],
): string[] {
  const nombresSet = new Set<string>();
  for (const s of sucursalesGeneranBalance) nombresSet.add(s.nombre);
  for (const f of filas) {
    if (f.sucursalGeneraBalance) nombresSet.add(f.sucursalNombre);
  }
  return [...nombresSet].sort((a, b) => a.localeCompare(b, "es"));
}

function montoTipo(f: BalanceGastoMensualFila, tipo: "variables" | "fijos"): number {
  const { costosVariables, costosFijos } = partCostosVariablesFijos(
    f.tipoGastoNombre,
    f.monto,
  );
  return tipo === "variables" ? costosVariables : costosFijos;
}

/** Totales directos, pool y reparto por sucursal (misma lógica que el resumen del balance). */
export function contextoRepartoBalanceMensual(
  filas: BalanceGastoMensualFila[],
  sucursalesGeneranBalance: { id: string; nombre: string }[],
): {
  sucursalesOrdenadas: string[];
  /** Solo la parte repartida del pool (sin sumar imputación directa). */
  repartoPoolCv: number[];
  repartoPoolCf: number[];
  directCv: Record<string, number>;
  directCf: Record<string, number>;
  poolCvTotal: number;
  poolCfTotal: number;
} {
  const sucursalesOrdenadas = sucursalesOrdenadasComoResumen(
    filas,
    sucursalesGeneranBalance,
  );
  const n = sucursalesOrdenadas.length;
  let poolCvTotal = 0;
  let poolCfTotal = 0;
  const directCv: Record<string, number> = Object.fromEntries(
    sucursalesOrdenadas.map((nombre) => [nombre, 0]),
  );
  const directCf: Record<string, number> = Object.fromEntries(
    sucursalesOrdenadas.map((nombre) => [nombre, 0]),
  );

  for (const f of filas) {
    const { costosVariables, costosFijos } = partCostosVariablesFijos(
      f.tipoGastoNombre,
      f.monto,
    );
    if (f.sucursalCentroCosto && !f.sucursalGeneraBalance) {
      poolCvTotal += costosVariables;
      poolCfTotal += costosFijos;
    } else if (f.sucursalGeneraBalance) {
      const k = f.sucursalNombre;
      directCv[k] = (directCv[k] ?? 0) + costosVariables;
      directCf[k] = (directCf[k] ?? 0) + costosFijos;
    }
  }

  const repartoPoolCv = n > 0 ? repartoIgualEnteros(poolCvTotal, n) : [];
  const repartoPoolCf = n > 0 ? repartoIgualEnteros(poolCfTotal, n) : [];

  return {
    sucursalesOrdenadas,
    repartoPoolCv,
    repartoPoolCf,
    directCv,
    directCf,
    poolCvTotal,
    poolCfTotal,
  };
}

export interface BalanceMensualRubroAgrupado {
  clave: string;
  etiqueta: string;
  monto: number;
  esRepartoPool: boolean;
}

/** Rubros con montos coherentes con la celda del balance (global o sucursal × variable/fijo). */
export function agruparRubrosCostoMensual(
  filas: BalanceGastoMensualFila[],
  sucursalesGeneranBalance: { id: string; nombre: string }[],
  columna: BalanceMensualColumnaDetalle,
  tipo: "variables" | "fijos",
): BalanceMensualRubroAgrupado[] {
  const ctx = contextoRepartoBalanceMensual(filas, sucursalesGeneranBalance);
  const mapa = new Map<string, number>();

  if (columna.ambito === "global") {
    for (const f of filas) {
      const m = montoTipo(f, tipo);
      if (m <= 0) continue;
      const r = f.rubroNombre.trim() || "Sin rubro";
      mapa.set(r, (mapa.get(r) ?? 0) + m);
    }
  } else {
    const nombre = columna.nombre;
    const idx = ctx.sucursalesOrdenadas.indexOf(nombre);
    if (idx < 0) return [];

    for (const f of filas) {
      const m = montoTipo(f, tipo);
      if (m <= 0) continue;
      if (f.sucursalGeneraBalance && f.sucursalNombre === nombre) {
        const r = f.rubroNombre.trim() || "Sin rubro";
        mapa.set(r, (mapa.get(r) ?? 0) + m);
      }
    }

    const poolPart =
      tipo === "variables"
        ? ctx.repartoPoolCv[idx] ?? 0
        : ctx.repartoPoolCf[idx] ?? 0;

    if (poolPart > 0) {
      mapa.set(BALANCE_MENSUAL_RUBRO_REPARTO_CC, poolPart);
    }
  }

  const filasOut: BalanceMensualRubroAgrupado[] = [];
  for (const [clave, monto] of mapa) {
    if (monto <= 0) continue;
    filasOut.push({
      clave,
      etiqueta:
        clave === BALANCE_MENSUAL_RUBRO_REPARTO_CC
          ? "Centros de costo (reparto entre sucursales)"
          : clave,
      monto,
      esRepartoPool: clave === BALANCE_MENSUAL_RUBRO_REPARTO_CC,
    });
  }
  filasOut.sort((a, b) => {
    if (a.esRepartoPool !== b.esRepartoPool) return a.esRepartoPool ? 1 : -1;
    return a.etiqueta.localeCompare(b.etiqueta, "es");
  });
  return filasOut;
}

/** Líneas de gasto para un rubro (o listado del pool CC para la clave sintética). */
export function listarGastosDetalleRubro(
  filas: BalanceGastoMensualFila[],
  columna: BalanceMensualColumnaDetalle,
  tipo: "variables" | "fijos",
  rubroClave: string,
): BalanceMensualFilaDetalleGasto[] {
  const out: BalanceMensualFilaDetalleGasto[] = [];

  if (rubroClave === BALANCE_MENSUAL_RUBRO_REPARTO_CC) {
    if (columna.ambito !== "sucursal") return [];
    for (const f of filas) {
      if (!(f.sucursalCentroCosto && !f.sucursalGeneraBalance)) continue;
      const m = montoTipo(f, tipo);
      if (m <= 0) continue;
      out.push({
        gastoNombre: f.gastoNombre,
        proveedorNombre: f.proveedorNombre,
        sucursalNombre: f.sucursalNombre,
        rubroNombre: f.rubroNombre,
        tipoGastoNombre: f.tipoGastoNombre,
        monto: m,
      });
    }
    out.sort((a, b) =>
      `${a.gastoNombre}|${a.sucursalNombre}`.localeCompare(
        `${b.gastoNombre}|${b.sucursalNombre}`,
        "es",
      ),
    );
    return out;
  }

  if (columna.ambito === "global") {
    for (const f of filas) {
      const r = f.rubroNombre.trim() || "Sin rubro";
      if (r !== rubroClave) continue;
      const m = montoTipo(f, tipo);
      if (m <= 0) continue;
      out.push({
        gastoNombre: f.gastoNombre,
        proveedorNombre: f.proveedorNombre,
        sucursalNombre: f.sucursalNombre,
        rubroNombre: f.rubroNombre,
        tipoGastoNombre: f.tipoGastoNombre,
        monto: m,
      });
    }
  } else {
    const nombre = columna.nombre;
    for (const f of filas) {
      if (!f.sucursalGeneraBalance || f.sucursalNombre !== nombre) continue;
      const r = f.rubroNombre.trim() || "Sin rubro";
      if (r !== rubroClave) continue;
      const m = montoTipo(f, tipo);
      if (m <= 0) continue;
      out.push({
        gastoNombre: f.gastoNombre,
        proveedorNombre: f.proveedorNombre,
        sucursalNombre: f.sucursalNombre,
        rubroNombre: f.rubroNombre,
        tipoGastoNombre: f.tipoGastoNombre,
        monto: m,
      });
    }
  }

  out.sort((a, b) =>
    `${a.gastoNombre}|${a.proveedorNombre}`.localeCompare(
      `${b.gastoNombre}|${b.proveedorNombre}`,
      "es",
    ),
  );
  return out;
}
