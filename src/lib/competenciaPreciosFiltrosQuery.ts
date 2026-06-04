import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getIdPrecioListaPrincipal } from "@/lib/duxApi";
import {
  CONFIGURADO_FILTRO,
  DIF_PROMEDIO_FILTRO,
  type ConfiguradoFiltro,
  type DifPromedioFiltro,
} from "@/lib/competenciaPreciosFiltros";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";

export interface FiltrosPrecioCompetenciaQuery {
  difPromedio?: DifPromedioFiltro | "";
  provCaroCompetenciaId?: string;
  provBaratoCompetenciaId?: string;
  /** Solo productos con px relevado para este competidor (scraping OK o px_vta_sugerido). */
  competenciaId?: string;
  configurado?: ConfiguradoFiltro | "";
}

function intersectCodTiendas(partes: string[][]): string[] {
  if (partes.length === 0) return [];
  let set = new Set(partes[0]);
  for (let i = 1; i < partes.length; i++) {
    const next = new Set(partes[i]);
    set = new Set([...set].filter((c) => next.has(c)));
  }
  return [...set];
}

/**
 * Productos con precio relevado para el competidor: scraping (`estado = OK`, `px_competencia`)
 * o `px_vta_sugerido` del proveedor asociado en `prod_precios_provee`.
 */
export async function codTiendasConPxRelevadoCompetidor(
  competenciaId: string
): Promise<string[]> {
  const competencia = await prisma.prodCompetencia.findUnique({
    where: { id: competenciaId },
    select: { idProveedor: true },
  });

  const desdeUrl = await prisma.$queryRaw<{ cod_tienda: string }[]>`
    SELECT DISTINCT ppc.cod_tienda
    FROM prod_precios_competencia ppc
    WHERE ppc.competencia_id = ${competenciaId}
      AND ppc.estado = ${ESTADO_RELEVAMIENTO_COMPETENCIA.OK}
      AND ppc.px_competencia IS NOT NULL
  `;

  const codSet = new Set(desdeUrl.map((r) => r.cod_tienda));

  if (competencia?.idProveedor) {
    const desdeSugerido = await prisma.listaPrecioProveedor.findMany({
      where: {
        idProveedor: competencia.idProveedor,
        habilitado: true,
        pxVtaSugerido: { not: null, gt: 0 },
        codTiendaVinculo: { not: null },
      },
      select: { codTiendaVinculo: true },
      distinct: ["codTiendaVinculo"],
    });
    for (const row of desdeSugerido) {
      if (row.codTiendaVinculo) codSet.add(row.codTiendaVinculo);
    }
  }

  return [...codSet];
}

async function codTiendasDifPromedio(
  difPromedio: DifPromedioFiltro
): Promise<string[]> {
  const idLista = getIdPrecioListaPrincipal();
  const operador =
    difPromedio === DIF_PROMEDIO_FILTRO.MAS_CARO
      ? Prisma.sql`>`
      : Prisma.sql`<`;
  const rows = await prisma.$queryRaw<{ cod_tienda: string }[]>`
    SELECT t.cod_tienda
    FROM prod_tienda t
    INNER JOIN prod_tienda_precios pl
      ON pl.cod_tienda = t.cod_tienda AND pl.id_lista = ${idLista}
    INNER JOIN prod_precios_competencia ppc ON ppc.cod_tienda = t.cod_tienda
    WHERE ppc.estado = ${ESTADO_RELEVAMIENTO_COMPETENCIA.OK}
      AND ppc.px_competencia IS NOT NULL
    GROUP BY t.cod_tienda, pl.precio
    HAVING pl.precio ${operador} ROUND(AVG(ppc.px_competencia::numeric))
  `;
  return rows.map((r) => r.cod_tienda);
}

async function codTiendasTiendaMasBarataQueCompetidor(
  competenciaId: string
): Promise<string[]> {
  const idLista = getIdPrecioListaPrincipal();
  const rows = await prisma.$queryRaw<{ cod_tienda: string }[]>`
    SELECT DISTINCT t.cod_tienda
    FROM prod_tienda t
    INNER JOIN prod_tienda_precios pl
      ON pl.cod_tienda = t.cod_tienda AND pl.id_lista = ${idLista}
    INNER JOIN prod_precios_competencia ppc
      ON ppc.cod_tienda = t.cod_tienda
      AND ppc.competencia_id = ${competenciaId}
    WHERE ppc.estado = ${ESTADO_RELEVAMIENTO_COMPETENCIA.OK}
      AND ppc.px_competencia IS NOT NULL
      AND pl.precio < ppc.px_competencia
  `;
  return rows.map((r) => r.cod_tienda);
}

async function codTiendasTiendaMasCaraQueCompetidor(
  competenciaId: string
): Promise<string[]> {
  const idLista = getIdPrecioListaPrincipal();
  const rows = await prisma.$queryRaw<{ cod_tienda: string }[]>`
    SELECT DISTINCT t.cod_tienda
    FROM prod_tienda t
    INNER JOIN prod_tienda_precios pl
      ON pl.cod_tienda = t.cod_tienda AND pl.id_lista = ${idLista}
    INNER JOIN prod_precios_competencia ppc
      ON ppc.cod_tienda = t.cod_tienda
      AND ppc.competencia_id = ${competenciaId}
    WHERE ppc.estado = ${ESTADO_RELEVAMIENTO_COMPETENCIA.OK}
      AND ppc.px_competencia IS NOT NULL
      AND pl.precio > ppc.px_competencia
  `;
  return rows.map((r) => r.cod_tienda);
}

/**
 * Restringe `codTienda` cuando hay filtros por precio (promedio o competidor).
 * `undefined` = sin restricción adicional por precio.
 */
export async function codTiendasFiltrosPrecioCompetencia(
  filtros: FiltrosPrecioCompetenciaQuery
): Promise<string[] | undefined> {
  const partes: Promise<string[]>[] = [];

  if (filtros.difPromedio) {
    partes.push(codTiendasDifPromedio(filtros.difPromedio));
  }
  if (filtros.provCaroCompetenciaId?.trim()) {
    partes.push(
      codTiendasTiendaMasBarataQueCompetidor(filtros.provCaroCompetenciaId.trim())
    );
  }
  if (filtros.provBaratoCompetenciaId?.trim()) {
    partes.push(
      codTiendasTiendaMasCaraQueCompetidor(filtros.provBaratoCompetenciaId.trim())
    );
  }
  if (filtros.competenciaId?.trim()) {
    partes.push(codTiendasConPxRelevadoCompetidor(filtros.competenciaId.trim()));
  }

  if (partes.length === 0) return undefined;

  const listas = await Promise.all(partes);
  return intersectCodTiendas(listas);
}

export function whereConfiguradoCompetencia(
  configurado: string
): Prisma.ProdTiendaWhereInput | null {
  if (configurado === CONFIGURADO_FILTRO.SI) {
    return {
      preciosCompetencia: {
        some: { urlProducto: { not: null } },
      },
    };
  }
  if (configurado === CONFIGURADO_FILTRO.NO) {
    return {
      NOT: {
        preciosCompetencia: {
          some: { urlProducto: { not: null } },
        },
      },
    };
  }
  return null;
}
