import { z } from "zod";
import { DUX_COMPRAS_API_PAGE_LIMIT, fetchComprasPage, type CompraDux } from "@/lib/duxComprasApi";
import {
  comprobanteDuxEsOrdenableParaCorrelativo,
  compareComprobanteDuxSortKey,
  incrementarComprobanteDux,
  parseComprobanteDuxSortKey,
} from "@/lib/duxComprobanteCorrelativo";
import { prisma } from "@/lib/prisma";

/** Misma cota que permite DUX por página (sync y máximo en recepción para no truncar correlativos). */
const DUX_COMPROBANTE_QUERY_LIMIT = DUX_COMPRAS_API_PAGE_LIMIT;
const DUX_COMPROBANTE_INCREMENTO = 5;

/** DUX devuelve 429 si las peticiones a `/compras` van demasiado seguidas; mínimo 5 s entre una y otra. */
function duxComprasMinIntervalMs(): number {
  const raw = process.env.DUX_COMPRAS_MIN_INTERVAL_MS;
  if (raw == null || raw === "") return 5000;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 5000;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const fechaDuxCompraSchema = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Fecha inválida. Formato esperado: DD/MM/YYYY");

export const idEmpresaDuxSchema = z.number().int().positive().max(99999999);

/** Valores canónicos de `tipo_comp` en DUX para correlativos FACTURA vs COMPROBANTE_COMPRA. */
export const tipoCompFiltroDuxSchema = z.enum(["FACTURA", "COMPROBANTE_COMPRA"]);

export type TipoCompFiltroDux = z.infer<typeof tipoCompFiltroDuxSchema>;

export const siguienteComprobanteDuxParamsSchema = z.object({
  fechaDesde: fechaDuxCompraSchema,
  fechaHasta: fechaDuxCompraSchema,
  idEmpresa: idEmpresaDuxSchema,
  /**
   * Si se informa: sólo considera compras cuyo `tipo_comp` coincida con este valor
   * (emisión correlativa aparte por tipo — recepción de pedidos / Excel).
   * Si no se informa: se mantiene el comportamiento previo (máximo entre todos los tipos).
   */
  tipoComp: tipoCompFiltroDuxSchema.optional(),
});

/** Normaliza `tipo_comp` / `tipo_comprobante` de DUX para comparar con {@link TipoCompFiltroDux}. */
export function normalizarTipoCompRespuestaDux(raw: string | undefined): string {
  return (raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function compraCumpleFiltroTipoComp(
  c: CompraDux,
  filtro: TipoCompFiltroDux | undefined
): boolean {
  if (filtro === undefined) return true;
  const t = normalizarTipoCompRespuestaDux(c.tipoComp);
  if (!t) return false;
  return t === filtro;
}

export interface SiguienteComprobanteResult {
  ultimoComprobante: string;
  siguienteComprobante: string;
  // Extra útil para debugging: calculado a partir del comprobante máximo obtenido.
  fechaComp?: string;
  totalImporte: number;
}

/** Incluye sólo filas cuyo texto de comprobante podemos ordenar/incrementar coherentemente. */
function comprobanteAceptadoParaCorrelativo(
  compra: CompraDux,
  filtroTipo: TipoCompFiltroDux | undefined
): boolean {
  const comp = (compra.comprobante ?? "").trim();
  if (!comp) return false;
  if (!compraCumpleFiltroTipoComp(compra, filtroTipo)) return false;

  if (filtroTipo === "COMPROBANTE_COMPRA") {
    return /^\d+$/.test(comp);
  }
  if (filtroTipo === "FACTURA") {
    return comprobanteDuxEsOrdenableParaCorrelativo(comp);
  }
  // Sin filtro de tipo (comportamiento legacy): cualquier formato que sepamos ordenar.
  return comprobanteDuxEsOrdenableParaCorrelativo(comp);
}

function comprobanteEsMayorOIgual(aRaw: string, bRaw: string): boolean {
  const ka = parseComprobanteDuxSortKey(aRaw);
  const kb = parseComprobanteDuxSortKey(bRaw);
  if (!ka || !kb) return false;
  const c = compareComprobanteDuxSortKey(ka, kb);
  return c >= 0;
}

/** Mayor `CompraDux` por texto de `comprobante` (mismas reglas que `parseComprobanteDuxSortKey`). */
function mayorComprobanteEntre(a: CompraDux, b: CompraDux): CompraDux {
  const ac = (a.comprobante ?? "").trim();
  const bc = (b.comprobante ?? "").trim();
  return comprobanteEsMayorOIgual(bc, ac) ? b : a;
}

/** Entre dos candidatos `{ c, idSucursal }` tras agregar sucursales. */
function elegirMayorEntrada(
  best: { c: CompraDux; idSucursal: number },
  cur: { c: CompraDux; idSucursal: number }
): { c: CompraDux; idSucursal: number } {
  const ac = (best.c.comprobante ?? "").trim();
  const bc = (cur.c.comprobante ?? "").trim();
  return comprobanteEsMayorOIgual(bc, ac) ? cur : best;
}

function toNextComprobante(comprobante: string): string {
  return incrementarComprobanteDux(comprobante, DUX_COMPROBANTE_INCREMENTO);
}

export async function getSiguienteComprobanteDuxCompra(params: {
  fechaDesde: string;
  fechaHasta: string;
  idEmpresa: number;
  tipoComp?: TipoCompFiltroDux;
}): Promise<SiguienteComprobanteResult> {
  const parsed = siguienteComprobanteDuxParamsSchema.safeParse(params);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((e) => e.message).join(" ").trim() || "Parámetros inválidos para DUX."
    );
  }

  const filtroTipo = parsed.data.tipoComp;

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

  const intervalMs = duxComprasMinIntervalMs();
  const comprasPorSucursal: Array<{ idSucursal: number; compras: CompraDux[] }> = [];
  for (let i = 0; i < sucursalIdDux.length; i++) {
    const idSucursal = sucursalIdDux[i];
    if (i > 0 && intervalMs > 0) {
      await delay(intervalMs);
    }
    try {
      const compras: CompraDux[] = await fetchComprasPage({
        fechaDesde: parsed.data.fechaDesde,
        fechaHasta: parsed.data.fechaHasta,
        idEmpresa: parsed.data.idEmpresa,
        idSucursal,
        limit: DUX_COMPROBANTE_QUERY_LIMIT,
      });
      comprasPorSucursal.push({ idSucursal, compras });
    } catch {
      // Si DUX no soporta el filtro por sucursal (o falla el query), no rompemos todo:
      // intentamos el fallback al final si no hay resultados globales.
      comprasPorSucursal.push({ idSucursal, compras: [] });
    }
  }

  const comprasValidas = comprasPorSucursal
    .flatMap((r) => r.compras.map((c) => ({ c, idSucursal: r.idSucursal })))
    .filter(({ c }) => comprobanteAceptadoParaCorrelativo(c, filtroTipo));

  function mensajeSinComprobantesDelTipo(): string {
    const etiqueta =
      filtroTipo === "FACTURA"
        ? "tipo FACTURA"
        : filtroTipo === "COMPROBANTE_COMPRA"
          ? "tipo Comprobante de compra"
          : "ningún tipo filtrado";
    return `No se pudo obtener el último comprobante desde DUX (sin resultados válidos para ${etiqueta} en el rango consultado).`;
  }

  if (comprasValidas.length === 0) {
    // Fallback: comportamiento anterior (sin filtrar por sucursal).
    if (sucursalIdDux.length > 0 && intervalMs > 0) {
      await delay(intervalMs);
    }
    const compras: CompraDux[] = await fetchComprasPage({
      fechaDesde: parsed.data.fechaDesde,
      fechaHasta: parsed.data.fechaHasta,
      idEmpresa: parsed.data.idEmpresa,
      limit: DUX_COMPROBANTE_QUERY_LIMIT,
    });

    const candidatos = compras.filter((row) => comprobanteAceptadoParaCorrelativo(row, filtroTipo));

    if (candidatos.length === 0) {
      throw new Error(
        filtroTipo
          ? mensajeSinComprobantesDelTipo()
          : "No se pudo obtener el último comprobante desde DUX (sin resultados válidos)."
      );
    }

    const mejor = candidatos.reduce((max, cur) => mayorComprobanteEntre(max, cur));

    const ultimoComprobante = mejor.comprobante;
    const siguienteComprobante = toNextComprobante(ultimoComprobante);

    const totalStr = mejor.total ?? mejor.montoAplicado;
    const totalImporte = totalStr ? Number.parseFloat(String(totalStr)) : NaN;
    if (!Number.isFinite(totalImporte)) {
      throw new Error("DUX no devolvió un 'total' válido para calcular el PRECIO.");
    }

    return { ultimoComprobante, siguienteComprobante, totalImporte };
  }

  const compraMaxEntry = comprasValidas.reduce((max, cur) => elegirMayorEntrada(max, cur));

  const ultimoComprobante = compraMaxEntry.c.comprobante;
  const siguienteComprobante = toNextComprobante(ultimoComprobante);

  const totalStr = compraMaxEntry.c.total ?? compraMaxEntry.c.montoAplicado;
  const totalImporte = totalStr ? Number.parseFloat(String(totalStr)) : NaN;
  if (!Number.isFinite(totalImporte)) {
    throw new Error("DUX no devolvió un 'total' válido para calcular el PRECIO.");
  }

  return { ultimoComprobante, siguienteComprobante, totalImporte };
}

