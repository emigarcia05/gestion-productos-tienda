import { z } from "zod";
import { fetchComprasPage } from "@/lib/duxComprasApi";
import type { CompraDux } from "@/lib/duxComprasApi";
import { prisma } from "@/lib/prisma";

export const fechaDuxCompraSchema = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Fecha inválida. Formato esperado: DD/MM/YYYY");

export const idEmpresaDuxSchema = z.number().int().positive().max(99999999);

export const siguienteComprobanteDuxParamsSchema = z.object({
  fechaDesde: fechaDuxCompraSchema,
  fechaHasta: fechaDuxCompraSchema,
  idEmpresa: idEmpresaDuxSchema,
});

export interface SiguienteComprobanteResult {
  ultimoComprobante: string;
  siguienteComprobante: string;
  // Extra útil para debugging: calculado a partir del comprobante máximo obtenido.
  fechaComp?: string;
  totalImporte: number;
}

function toNextComprobante(comprobante: string): string {
  // El “comprobante” viene como string numérico. Usamos BigInt para no depender del safe integer.
  if (!/^\d+$/.test(comprobante)) throw new Error("El comprobante DUX no es numérico.");
  // Evitar literal BigInt `1n` porque el TS target del proyecto puede ser < ES2020.
  const next = BigInt(comprobante) + BigInt(1);
  return next.toString();
}

export async function getSiguienteComprobanteDuxCompra(params: {
  fechaDesde: string;
  fechaHasta: string;
  idEmpresa: number;
}): Promise<SiguienteComprobanteResult> {
  const parsed = siguienteComprobanteDuxParamsSchema.safeParse(params);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((e) => e.message).join(" ").trim() || "Parámetros inválidos para DUX."
    );
  }

  // DUX puede devolver datos “atados” a una sucursal.
  // Como el comprobante es correlativo global, tomamos el mayor comprobante por sucursal
  // y luego sumamos +1.
  const sucursales = await prisma.sucursal.findMany({
    select: { idDux: true },
  });

  const sucursalIdDux = sucursales
    .map((s) => (s.idDux ?? "").trim())
    .filter((id) => /^\d+$/.test(id))
    .map((id) => Number(id));

  if (sucursalIdDux.length === 0) {
    throw new Error("No se pudo resolver 'id_dux' en sucursales (sin idSucursal válidos).");
  }

  const comprasPorSucursal = await Promise.all(
    sucursalIdDux.map(async (idSucursal) => {
      try {
        const compras: CompraDux[] = await fetchComprasPage({
          fechaDesde: parsed.data.fechaDesde,
          fechaHasta: parsed.data.fechaHasta,
          idEmpresa: parsed.data.idEmpresa,
          idSucursal,
          limit: 1,
        });
        return { idSucursal, compras };
      } catch {
        // Si DUX no soporta el filtro por sucursal (o falla el query), no rompemos todo:
        // intentamos el fallback al final si no hay resultados globales.
        return { idSucursal, compras: [] };
      }
    })
  );

  const comprasValidas = comprasPorSucursal
    .flatMap((r) => r.compras.map((c) => ({ c, idSucursal: r.idSucursal })))
    .filter(({ c }) => c && c.comprobante && /^\d+$/.test(c.comprobante));

  if (comprasValidas.length === 0) {
    // Fallback: comportamiento anterior (sin filtrar por sucursal).
    const compras: CompraDux[] = await fetchComprasPage({
      fechaDesde: parsed.data.fechaDesde,
      fechaHasta: parsed.data.fechaHasta,
      idEmpresa: parsed.data.idEmpresa,
      limit: 1,
    });

    const first = compras[0];
    if (!first || !first.comprobante || !/^\d+$/.test(first.comprobante)) {
      throw new Error("No se pudo obtener el último comprobante desde DUX (sin resultados válidos).");
    }

    const ultimoComprobante = first.comprobante;
    const siguienteComprobante = toNextComprobante(ultimoComprobante);

    const totalStr = first.total ?? first.montoAplicado;
    const totalImporte = totalStr ? Number.parseFloat(String(totalStr)) : NaN;
    if (!Number.isFinite(totalImporte)) {
      throw new Error("DUX no devolvió un 'total' válido para calcular el PRECIO.");
    }

    return { ultimoComprobante, siguienteComprobante, totalImporte };
  }

  const compraMax = comprasValidas.reduce((max, cur) => {
    // Comparamos numéricamente con BigInt.
    const maxB = BigInt(max.c.comprobante);
    const curB = BigInt(cur.c.comprobante);
    return curB > maxB ? cur : max;
  });

  const ultimoComprobante = compraMax.c.comprobante;
  const siguienteComprobante = toNextComprobante(ultimoComprobante);

  const totalStr = compraMax.c.total ?? compraMax.c.montoAplicado;
  const totalImporte = totalStr ? Number.parseFloat(String(totalStr)) : NaN;
  if (!Number.isFinite(totalImporte)) {
    throw new Error("DUX no devolvió un 'total' válido para calcular el PRECIO.");
  }

  return { ultimoComprobante, siguienteComprobante, totalImporte };
}

