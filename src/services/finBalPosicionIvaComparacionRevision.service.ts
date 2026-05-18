/**
 * Token de revisión para detectar cambios en insumos del saldo IVA (Posición IVA)
 * que afectan la comparación de proveedores en pedidos.
 */

import { prisma } from "@/lib/prisma";
import { TIPO_COMP_FACTURA_IVA_CREDITO } from "@/services/finBalPosicionIva.service";
import { sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido } from "@/services/finBalPosicionIvaSaldoAcumuladoPedido.service";

function isoMaxUpdatedAt(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString();
}

/**
 * Huella estable: acumulado usado en pedidos + signo (>0 / ≤0) + últimas mutaciones
 * en débito, crédito (gastos con IVA y facturas) y saldos manuales.
 */
export async function getPosicionIvaComparacionRevisionToken(): Promise<string> {
  const [acumulado, debMax, gastoMax, manualMax, facturaMax] = await Promise.all([
    sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido(),
    prisma.finBalIvaDebImportLine.aggregate({ _max: { updatedAt: true } }),
    prisma.finBalGastoMensual.aggregate({
      where: { iva: true },
      _max: { updatedAt: true },
    }),
    prisma.finBalPosicionIvaSaldoManual.aggregate({ _max: { updatedAt: true } }),
    prisma.comprobanteProveedor.aggregate({
      where: {
        tipoComp: { equals: TIPO_COMP_FACTURA_IVA_CREDITO, mode: "insensitive" },
      },
      _max: { updatedAt: true },
    }),
  ]);

  const sign = acumulado > 0 ? "P" : acumulado < 0 ? "N" : "Z";
  const acumRounded = Math.round(acumulado);

  return [
    sign,
    String(acumRounded),
    isoMaxUpdatedAt(debMax._max.updatedAt),
    isoMaxUpdatedAt(gastoMax._max.updatedAt),
    isoMaxUpdatedAt(manualMax._max.updatedAt),
    isoMaxUpdatedAt(facturaMax._max.updatedAt),
  ].join("|");
}
