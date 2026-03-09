import { getProveedores } from "@/actions/proveedores";
import { getRol } from "@/lib/sesion";
import { prisma } from "@/lib/prisma";
import ListaPreciosPageClient from "@/components/proveedores/ListaPreciosPageClient";
import { getListaPreciosConOpcionesAction } from "@/actions/listaPrecios";

export const dynamic = "force-dynamic";

export default async function ListaPreciosPage() {
  const [proveedores, rol, marcasRows, rubrosRows] = await Promise.all([
    getProveedores(),
    getRol(),
    prisma.marca.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.listaPrecioTienda.findMany({
      where: { rubro: { not: null } },
      distinct: ["rubro"],
      orderBy: { rubro: "asc" },
      select: { rubro: true },
    }),
  ]);

  const marcas = marcasRows.map((m) => ({ id: m.id, nombre: m.nombre }));
  const rubros = rubrosRows
    .map((r) => (r.rubro ?? "").trim())
    .filter((r) => r.length > 0)
    .map((r) => ({ id: r, nombre: r }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ListaPreciosPageClient
        proveedores={proveedores}
        marcas={marcas}
        rubros={rubros}
        rol={rol}
        fetchListaPreciosConOpcionesAction={getListaPreciosConOpcionesAction}
      />
    </div>
  );
}
