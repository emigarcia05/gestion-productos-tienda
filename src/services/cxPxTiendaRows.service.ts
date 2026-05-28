import { prisma } from "@/lib/prisma";
import {
  CX_PROD_SELECCION_PROM,
  type CxProdDatosFila,
  type OpcionCostoCxProdProveedor,
} from "@/lib/cxPxTienda";
import {
  calcularCostoPromedioVinculos,
  costoDesdeCandidato,
  etiquetaProveedorCosto,
  listarCandidatosCostoPorCodTienda,
} from "@/services/costoListaTienda.service";

export type FilaCxProdDb = {
  codTienda: string;
  costoCompra: unknown;
  costoCompraCodExt: string | null;
};

type CandidatoCostoVinculo = Awaited<
  ReturnType<typeof listarCandidatosCostoPorCodTienda>
>[number];

async function cargarVinculosCostoPorCodTienda(codTiendas: string[]) {
  if (codTiendas.length === 0) return new Map<string, CandidatoCostoVinculo[]>();

  const vinculos = await prisma.listaPrecioProveedor.findMany({
    where: { codTiendaVinculo: { in: codTiendas }, habilitado: true },
    select: {
      codExt: true,
      codTiendaVinculo: true,
      pxCompraFinalSinIva: true,
      proveedor: { select: { nombre: true, prefijo: true } },
    },
    orderBy: [{ proveedor: { nombre: "asc" } }],
  });

  const vinculosPorTienda = new Map<string, CandidatoCostoVinculo[]>();
  for (const v of vinculos) {
    if (!v.codTiendaVinculo) continue;
    const lista = vinculosPorTienda.get(v.codTiendaVinculo) ?? [];
    lista.push(v);
    vinculosPorTienda.set(v.codTiendaVinculo, lista);
  }
  return vinculosPorTienda;
}

/** Mapeo de CX PROD. para Cx Compra y exportación de costos. */
export function mapCxProdDesdeCandidatos(
  costoCompra: unknown,
  costoCompraCodExt: string | null,
  candidatos: CandidatoCostoVinculo[]
): CxProdDatosFila {
  const costoDux = Number(costoCompra) || 0;
  const costoPromedio = calcularCostoPromedioVinculos(candidatos);

  const opcionesProveedor: OpcionCostoCxProdProveedor[] = candidatos.map((c) => ({
    tipo: "proveedor",
    codExt: c.codExt,
    etiqueta: etiquetaProveedorCosto(c.proveedor.prefijo, c.proveedor.nombre),
    costo: costoDesdeCandidato(c.pxCompraFinalSinIva),
  }));

  let seleccion: typeof CX_PROD_SELECCION_PROM | string = CX_PROD_SELECCION_PROM;
  let costoMostrado = costoPromedio ?? costoDux;

  if (costoCompraCodExt && opcionesProveedor.some((o) => o.codExt === costoCompraCodExt)) {
    seleccion = costoCompraCodExt;
    const op = opcionesProveedor.find((o) => o.codExt === costoCompraCodExt);
    costoMostrado = op && op.costo > 0 ? op.costo : costoDux;
  } else if (opcionesProveedor.length === 1) {
    seleccion = opcionesProveedor[0].codExt;
    costoMostrado =
      opcionesProveedor[0].costo > 0 ? opcionesProveedor[0].costo : costoDux;
  }

  return {
    opcionesProveedor,
    seleccion,
    costoPromedio,
    costoMostrado,
  };
}

export async function buildCxProdMapDesdeFilas(
  rows: FilaCxProdDb[]
): Promise<Map<string, CxProdDatosFila>> {
  const vinculosPorTienda = await cargarVinculosCostoPorCodTienda(
    rows.map((r) => r.codTienda)
  );
  const map = new Map<string, CxProdDatosFila>();
  for (const r of rows) {
    map.set(
      r.codTienda,
      mapCxProdDesdeCandidatos(
        r.costoCompra,
        r.costoCompraCodExt,
        vinculosPorTienda.get(r.codTienda) ?? []
      )
    );
  }
  return map;
}
