import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, skipForPagina, totalPaginasFromTotal } from "@/lib/pagination";
import type { CompetenciaPreciosFiltros } from "@/lib/validations/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";

export interface FilaCompetenciaPrecios {
  codTienda: string;
  descripcionTienda: string | null;
  pxListaTienda: number;
  marca: string | null;
  rubro: string | null;
  preciosPorCompetencia: Record<string, number | null>;
}

export interface CompetenciaPreciosListResult {
  filas: FilaCompetenciaPrecios[];
  total: number;
  totalPaginas: number;
  competencias: CompetenciaParaCliente[];
  marcasDisponibles: string[];
  rubrosDisponibles: string[];
}

export async function getCompetenciaPreciosList(
  filtros: CompetenciaPreciosFiltros
): Promise<CompetenciaPreciosListResult> {
  const pagina = Math.max(1, parseInt(filtros.pagina, 10) || 1);
  const q = filtros.q.trim();
  const marca = filtros.marca.trim();
  const rubro = filtros.rubro.trim();

  const competencias = await prisma.prodCompetencia.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, web: true, urlBusqueda: true },
  });

  const where = {
    ...(q
      ? {
          OR: [
            { codTienda: { contains: q, mode: "insensitive" as const } },
            { descripcionTienda: { contains: q, mode: "insensitive" as const } },
            { codExt: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(marca ? { marca: { equals: marca, mode: "insensitive" as const } } : {}),
    ...(rubro ? { rubro: { equals: rubro, mode: "insensitive" as const } } : {}),
  };

  const [total, productos, marcasRows, rubrosRows] = await Promise.all([
    prisma.listaPrecioTienda.count({ where }),
    prisma.listaPrecioTienda.findMany({
      where,
      orderBy: { descripcionTienda: "asc" },
      skip: skipForPagina(pagina),
      take: PAGE_SIZE,
      select: {
        codTienda: true,
        descripcionTienda: true,
        pxListaTienda: true,
        marca: true,
        rubro: true,
      },
    }),
    prisma.listaPrecioTienda.findMany({
      where: { marca: { not: null } },
      distinct: ["marca"],
      select: { marca: true },
      orderBy: { marca: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      where: { rubro: { not: null } },
      distinct: ["rubro"],
      select: { rubro: true },
      orderBy: { rubro: "asc" },
    }),
  ]);

  const codTiendas = productos.map((p) => p.codTienda);
  const preciosRows =
    codTiendas.length > 0
      ? await prisma.prodPrecioCompetencia.findMany({
          where: { codTienda: { in: codTiendas } },
          select: {
            codTienda: true,
            competenciaId: true,
            pxCompetencia: true,
          },
        })
      : [];

  const preciosMap = new Map<string, Record<string, number | null>>();
  for (const p of productos) {
    const entry: Record<string, number | null> = {};
    for (const c of competencias) entry[c.id] = null;
    preciosMap.set(p.codTienda, entry);
  }
  for (const row of preciosRows) {
    const entry = preciosMap.get(row.codTienda);
    if (!entry) continue;
    entry[row.competenciaId] =
      row.pxCompetencia != null ? Number(row.pxCompetencia) : null;
  }

  const filas: FilaCompetenciaPrecios[] = productos.map((p) => ({
    codTienda: p.codTienda,
    descripcionTienda: p.descripcionTienda,
    pxListaTienda: Number(p.pxListaTienda),
    marca: p.marca,
    rubro: p.rubro,
    preciosPorCompetencia: preciosMap.get(p.codTienda) ?? {},
  }));

  return {
    filas,
    total,
    totalPaginas: totalPaginasFromTotal(total),
    competencias,
    marcasDisponibles: marcasRows
      .map((m) => m.marca)
      .filter((m): m is string => !!m),
    rubrosDisponibles: rubrosRows
      .map((r) => r.rubro)
      .filter((r): r is string => !!r),
  };
}
