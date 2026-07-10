import {
  mapCxFinancieroPorFormaPago,
  type CxFinancieroPorFormaPago,
} from "@/lib/finAnaMargenContribucion";
import { margenDesdePrecioDux } from "@/lib/pxListasPreciosCelda";
import {
  ensureFinAnaCosFinaSeed,
  listarFinAnaCosFina,
  type FinAnaCosFinaItem,
} from "@/services/finAnaCosFina.service";
import { listarFinAnaCosFinaTerminales } from "@/services/finAnaCosFinaTerminal.service";
import { listarFinAnaCosFinaPagos } from "@/services/finAnaCosFinaPago.service";
import type { FinAnaCosFinaPagoItem } from "@/lib/finAnaCosFinaPagos";
import { getPrecioListaPrincipal } from "@/services/prodTiendaPrecios.service";
import type { FinAnaCosFinaTerminalItem } from "@/lib/finAnaCosFinaTerminales";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";
import { listarDescuentosFpMargenContribucion } from "@/services/finAnaMcDescuentoFp.service";
import type { DescuentoFpMargenContribucionMap } from "@/services/finAnaMcDescuentoFp.service";

export type { CxFinancieroPorFormaPago };

export type ProductoDatosMargenContribucion = {
  codTienda: string;
  descripcionTienda: string;
  costoCompra: number;
  pxLista: number | null;
  porcUtilidadPct: number | null;
};

export type DatosPaginaMargenContribucion = {
  filasCostosFinancieros: FinAnaCosFinaItem[];
  terminales: FinAnaCosFinaTerminalItem[];
  pagos: FinAnaCosFinaPagoItem[];
  cxFinancieroPorFormaPago: CxFinancieroPorFormaPago;
  descuentosPorFormaPago: DescuentoFpMargenContribucionMap;
};

export async function getDatosPaginaMargenContribucion(): Promise<DatosPaginaMargenContribucion> {
  await ensureFinAnaCosFinaSeed();
  const [filasCostosFinancieros, terminales, pagos, descuentosPorFormaPago] =
    await Promise.all([
      listarFinAnaCosFina(),
      listarFinAnaCosFinaTerminales(),
      listarFinAnaCosFinaPagos(),
      listarDescuentosFpMargenContribucion(),
    ]);

  return {
    filasCostosFinancieros,
    terminales,
    pagos,
    cxFinancieroPorFormaPago: mapCxFinancieroPorFormaPago(filasCostosFinancieros, pagos),
    descuentosPorFormaPago,
  };
}

/** Datos de un producto tienda para el simulador (lista principal + margen derivado). */
export async function getProductoDatosMargenContribucion(
  codTienda: string
): Promise<ServiceResult<ProductoDatosMargenContribucion>> {
  try {
    const producto = await prisma.prodTienda.findUnique({
      where: { codTienda },
      select: {
        codTienda: true,
        descripcionTienda: true,
        costoCompra: true,
      },
    });
    if (!producto) {
      return { success: false, error: "Producto no encontrado." };
    }

    const pxLista = await getPrecioListaPrincipal(codTienda);
    const costoCompra = Number(producto.costoCompra);
    const porcUtilidadPct =
      pxLista != null && pxLista > 0
        ? margenDesdePrecioDux(pxLista, costoCompra)
        : null;

    return {
      success: true,
      data: {
        codTienda: producto.codTienda,
        descripcionTienda: (producto.descripcionTienda ?? "").trim(),
        costoCompra,
        pxLista,
        porcUtilidadPct,
      },
    };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Error al cargar datos del producto.";
    return { success: false, error: msg };
  }
}
