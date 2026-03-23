import { z } from "zod";
import { fetchComprasPage } from "@/lib/duxComprasApi";
import type { CompraDux } from "@/lib/duxComprasApi";

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
  // Extra útil para debugging: se calcula a partir del “primer resultado” del endpoint.
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

  const compras: CompraDux[] = await fetchComprasPage({
    fechaDesde: parsed.data.fechaDesde,
    fechaHasta: parsed.data.fechaHasta,
    idEmpresa: parsed.data.idEmpresa,
    limit: 1,
  });

  const first = compras[0];
  if (!first || !first.comprobante) {
    throw new Error("No se pudo obtener el último comprobante desde DUX (sin resultados).");
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

