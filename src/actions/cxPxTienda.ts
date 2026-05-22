"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { filtroTexto } from "@/lib/busqueda";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/lib/pagination";
import { getCxPxTiendaPageParamsSchema } from "@/lib/validations/cxPxTienda";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";
import { z } from "zod";
import {
  CX_PROD_SELECCION_PROM,
  type ItemCxPxTiendaParaTabla,
  type OpcionCostoCxProdProveedor,
} from "@/lib/cxPxTienda";
import {
  calcularCostoPromedioVinculos,
  costoDesdeCandidato,
  establecerCodExtCostoLista,
  etiquetaProveedorCosto,
  limpiarCodExtCostoLista,
  listarCandidatosCostoPorCodTienda,
} from "@/services/costoListaTienda.service";

async function getCxPxTiendaEmptyOpciones() {
  const [rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      where: { rubro: { not: null } },
      orderBy: { rubro: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { subRubro: true },
      distinct: ["subRubro"],
      where: { subRubro: { not: null } },
      orderBy: { subRubro: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: { marca: { not: null } },
      orderBy: { marca: "asc" },
    }),
  ]);

  return {
    items: [] as ItemCxPxTiendaParaTabla[],
    total: 0,
    totalPaginas: 0,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
  };
}

function mapFilaCxPx(
  r: {
    codTienda: string;
    descripcionTienda: string | null;
    costoCompra: unknown;
    codExtCostoLista: string | null;
  },
  candidatos: Awaited<ReturnType<typeof listarCandidatosCostoPorCodTienda>>
): ItemCxPxTiendaParaTabla {
  const costoDux = Number(r.costoCompra) || 0;
  const costoPromedio = calcularCostoPromedioVinculos(candidatos);

  const opcionesProveedor: OpcionCostoCxProdProveedor[] = candidatos.map((c) => ({
    tipo: "proveedor",
    codExt: c.codExt,
    etiqueta: etiquetaProveedorCosto(c.proveedor.prefijo, c.proveedor.nombre),
    costo: costoDesdeCandidato(c.pxCompraFinalSinIva),
  }));

  let seleccion: typeof CX_PROD_SELECCION_PROM | string = CX_PROD_SELECCION_PROM;
  let costoMostrado = costoPromedio ?? costoDux;

  if (
    r.codExtCostoLista &&
    opcionesProveedor.some((o) => o.codExt === r.codExtCostoLista)
  ) {
    seleccion = r.codExtCostoLista;
    const op = opcionesProveedor.find((o) => o.codExt === r.codExtCostoLista);
    costoMostrado = op && op.costo > 0 ? op.costo : costoDux;
  } else if (opcionesProveedor.length === 1) {
    seleccion = opcionesProveedor[0].codExt;
    costoMostrado =
      opcionesProveedor[0].costo > 0 ? opcionesProveedor[0].costo : costoDux;
  }

  return {
    id: r.codTienda,
    codTienda: r.codTienda,
    descripcion: r.descripcionTienda ?? "",
    codExtCostoLista: r.codExtCostoLista,
    costoPromedio,
    opcionesProveedor,
    seleccion,
    costoMostrado,
  };
}

/** Listado paginado de `prod_precios_tienda` para Cx & Px Tienda. */
export async function getCxPxTiendaPageData(params: {
  q?: string;
  rubro?: string;
  subRubro?: string;
  marca?: string;
  pagina?: string;
}) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return getCxPxTiendaEmptyOpciones();
  }

  const parsed = getCxPxTiendaPageParamsSchema.safeParse(params);
  if (!parsed.success) {
    return getCxPxTiendaEmptyOpciones();
  }

  const { q = "", rubro = "", subRubro = "", marca = "", pagina = "1" } = parsed.data;

  const andParts: Prisma.ListaPrecioTiendaWhereInput[] = [];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (rubro) andParts.push({ rubro });
  if (subRubro) andParts.push({ subRubro });
  if (marca) andParts.push({ marca });

  const where: Prisma.ListaPrecioTiendaWhereInput = andParts.length ? { AND: andParts } : {};

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const andPartsOnlyQ: Prisma.ListaPrecioTiendaWhereInput[] = [];
  if (textFilter.AND?.length) andPartsOnlyQ.push(textFilter);
  const whereMarcas: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { marca: { not: null } }] }
    : { marca: { not: null } };
  const whereRubros: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { rubro: { not: null } }] }
    : { rubro: { not: null } };
  const whereSubRubros: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { subRubro: { not: null } }] }
    : { subRubro: { not: null } };

  const [rows, total, rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      where,
      orderBy: [{ descripcionTienda: "asc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        codTienda: true,
        descripcionTienda: true,
        costoCompra: true,
        codExtCostoLista: true,
      },
    }),
    prisma.listaPrecioTienda.count({ where }),
    prisma.listaPrecioTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      where: whereRubros,
      orderBy: { rubro: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { subRubro: true },
      distinct: ["subRubro"],
      where: whereSubRubros,
      orderBy: { subRubro: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: whereMarcas,
      orderBy: { marca: "asc" },
    }),
  ]);

  const codTiendas = rows.map((r) => r.codTienda);
  const vinculos =
    codTiendas.length > 0
      ? await prisma.listaPrecioProveedor.findMany({
          where: { codTiendaVinculo: { in: codTiendas }, habilitado: true },
          select: {
            codExt: true,
            codTiendaVinculo: true,
            pxCompraFinalSinIva: true,
            proveedor: { select: { nombre: true, prefijo: true } },
          },
          orderBy: [{ proveedor: { nombre: "asc" } }],
        })
      : [];

  const vinculosPorTienda = new Map<string, typeof vinculos>();
  for (const v of vinculos) {
    if (!v.codTiendaVinculo) continue;
    const lista = vinculosPorTienda.get(v.codTiendaVinculo) ?? [];
    lista.push(v);
    vinculosPorTienda.set(v.codTiendaVinculo, lista);
  }

  const items: ItemCxPxTiendaParaTabla[] = rows.map((r) =>
    mapFilaCxPx(r, vinculosPorTienda.get(r.codTienda) ?? [])
  );

  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return {
    items,
    total,
    totalPaginas,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
  };
}

const guardarCostoCxProdSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  seleccion: z.union([z.literal(CX_PROD_SELECCION_PROM), z.string().min(1).max(128)]),
});

/** Persiste costo Cx prod.: proveedor → `cod_ext_costo_lista`; Cx. Prom. → limpia FK (solo promedio en UI). */
export async function guardarCostoCxProdTiendaAction(
  raw: unknown
): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = guardarCostoCxProdSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const { codTienda, seleccion } = parsed.data;

  if (seleccion === CX_PROD_SELECCION_PROM) {
    const res = await limpiarCodExtCostoLista(codTienda);
    if (!res.success) return { ok: false, error: res.error };
  } else {
    const res = await establecerCodExtCostoLista(codTienda, seleccion);
    if (!res.success) return { ok: false, error: res.error };
  }

  revalidatePath("/gestion-productos/tienda/cx-px-tienda");
  revalidatePath("/tienda/cx-px");
  return { ok: true, data: undefined };
}
