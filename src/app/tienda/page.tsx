import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import SyncButton from "@/components/tienda/SyncButton";
import AutoVincularButton from "@/components/tienda/AutoVincularButton";
import TablaTienda from "@/components/tienda/TablaTienda";
import FiltrosTienda from "@/components/tienda/FiltrosTienda";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";

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

  const [items, total, marcas, rubros, subRubros, ultimoSync] = await Promise.all([
    prisma.itemTienda.findMany({
      where,
      orderBy: { descripcion: "asc" },
      skip,
      take: PAGE_SIZE,
      include: { _count: { select: { productos: true } } },
    }),
    prisma.itemTienda.count({ where }),
    // Marcas: sin filtro (siempre todas)
    prisma.itemTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      orderBy: { marca: "asc" },
      where: { marca: { not: null } },
    }),
    // Rubros: filtrados por marca seleccionada
    prisma.itemTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      orderBy: { rubro: "asc" },
      where: {
        rubro: { not: null },
        ...(marca ? { marca } : {}),
      },
    }),
    // Sub-Rubros: filtrados por marca + rubro seleccionados
    prisma.itemTienda.findMany({
      select: { subRubro: true },
      distinct: ["subRubro"],
      orderBy: { subRubro: "asc" },
      where: {
        subRubro: { not: null },
        ...(marca ? { marca } : {}),
        ...(rubro ? { rubro } : {}),
      },
    }),
    prisma.syncLog.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Controles fijos */}
      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-3 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <Link href="/"><ArrowLeft className="h-4 w-4" />Volver</Link>
            </Button>
            <h1 className="text-lg font-semibold tracking-tight">Productos Relacionados a Proveedores</h1>
            {ultimoSync && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {ultimoSync.status === "ok"
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  : <XCircle className="h-3.5 w-3.5 text-destructive" />
                }
                <Clock className="h-3 w-3" />
                <span>
                  Último sync: {new Date(ultimoSync.createdAt).toLocaleString("es-AR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                  })}
                  {ultimoSync.status === "ok" && (
                    <span className="ml-1 text-muted-foreground/70">
                      ({ultimoSync.totalApi.toLocaleString()} items)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {process.env.AUTO_VINCULAR_SECRET && (
              <AutoVincularButton secret={process.env.AUTO_VINCULAR_SECRET} />
            )}
            <SyncButton />
          </div>
        </div>

        <Separator className="opacity-50" />

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
        <TablaTienda items={items} setMejorPrecio={setMejorPrecio} />
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
