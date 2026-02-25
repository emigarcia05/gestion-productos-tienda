import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import SyncButton from "@/components/tienda/SyncButton";
import TablaTienda from "@/components/tienda/TablaTienda";
import FiltrosTienda from "@/components/tienda/FiltrosTienda";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";
import { Button } from "@/components/ui/button";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{
    q?: string;
    rubro?: string;
    subRubro?: string;
    marca?: string;
    habilitado?: string;
    mejorPrecio?: string;
    pagina?: string;
  }>;
}

export default async function TiendaPage({ searchParams }: Props) {
  const { q = "", rubro = "", subRubro = "", marca = "", habilitado = "", mejorPrecio = "", pagina = "1" } = await searchParams;
  const paginaNum = Math.max(1, parseInt(pagina) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;
  const rol = await getRol();

  // IDs de items que tienen al menos un producto vinculado con Px Compra Final < costo
  // Px Compra Final = precioLista * (1 - dto1/100) * (1 - dto2/100) * (1 + cx/100)
  const itemsConMejorPrecio = await prisma.$queryRaw<{ item_tienda_id: string }[]>`
    SELECT DISTINCT itp."itemTiendaId" AS item_tienda_id
    FROM items_tienda_productos itp
    JOIN productos p ON p.id = itp."productoId"
    JOIN items_tienda it ON it.id = itp."itemTiendaId"
    WHERE it.costo > 0
      AND (
        p."precioLista"
        * (1 - p."descuentoProducto" / 100.0)
        * (1 - p."descuentoCantidad" / 100.0)
        * (1 + p."cxTransporte"     / 100.0)
      ) < it.costo * 0.99
  `;
  const setMejorPrecio = new Set(itemsConMejorPrecio.map((r) => r.item_tienda_id));

  const where = {
    ...(marca    ? { marca }    : {}),
    ...(rubro    ? { rubro }    : {}),
    ...(subRubro ? { subRubro } : {}),
    ...(habilitado === "true"  ? { habilitado: true }  : {}),
    ...(habilitado === "false" ? { habilitado: false } : {}),
    ...(mejorPrecio === "true"  ? { id: { in: Array.from(setMejorPrecio) } } : {}),
    ...(mejorPrecio === "false" ? { id: { notIn: Array.from(setMejorPrecio) } } : {}),
    ...(q ? filtroTexto(q, ["descripcion", "codItem", "codigoExterno", "marca"]) : {}),
  };

  const [items, total, marcas, rubros, subRubros] = await Promise.all([
    prisma.itemTienda.findMany({
      where,
      orderBy: { descripcion: "asc" },
      skip,
      take: PAGE_SIZE,
      include: { _count: { select: { productos: true } } },
    }),
    prisma.itemTienda.count({ where }),
    // Marcas: siempre todas
    prisma.itemTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      orderBy: { marca: "asc" },
      where: { marca: { not: null } },
    }),
    // Rubros: siempre todos
    prisma.itemTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      orderBy: { rubro: "asc" },
      where: { rubro: { not: null } },
    }),
    // Sub-Rubros: siempre todos
    prisma.itemTienda.findMany({
      select: { subRubro: true },
      distinct: ["subRubro"],
      orderBy: { subRubro: "asc" },
      where: { subRubro: { not: null } },
    }),
  ]);

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  const acciones =
    puede(rol, PERMISOS.tienda.acciones.sincronizar) ? (
      <div className="flex gap-2">
        <SyncButton />
        <Button variant="outline" size="sm" className="border-slate-200" asChild>
          <Link href="/tienda/aumentos" className="gap-2">
            <TrendingUp className="h-4 w-4 shrink-0" />
            Control de Aumentos
          </Link>
        </Button>
      </div>
    ) : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader
        titulo="Tienda"
        descripcion="Productos relacionados con items de tienda y control de aumentos."
        actions={acciones}
      />

      {/* Filtros */}
      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-3 pb-2">
        <FiltrosTienda
          marcas={marcas.map((m) => m.marca!)}
          rubros={rubros.map((r) => r.rubro!)}
          subRubros={subRubros.map((s) => s.subRubro!)}
          totalItems={total}
          qActual={q}
          marcaActual={marca}
          rubroActual={rubro}
          subRubroActual={subRubro}
          habilitadoActual={habilitado}
          mejorPrecioActual={mejorPrecio}
        />
      </div>

      {/* Tabla con scroll interno */}
      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-3">
        <TablaTienda items={items} setMejorPrecio={setMejorPrecio} rol={rol} />
      </div>

      {/* Paginación fija abajo */}
      <div className="shrink-0 border-t border-border/50 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3">
        <PaginacionProductos
          paginaActual={paginaNum}
          totalPaginas={totalPaginas}
          total={total}
          pageSize={PAGE_SIZE}
          q={q}
          proveedor=""
          basePath="/tienda"
          extraParams={{ marca, rubro, subRubro, habilitado, mejorPrecio }}
        />
      </div>
    </div>
  );
}
