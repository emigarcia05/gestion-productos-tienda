import { getProveedores } from "@/actions/proveedores";
import { getRol } from "@/lib/sesion";
import { prisma } from "@/lib/prisma";
import ListaPreciosPageClient from "@/components/proveedores/ListaPreciosPageClient";
import { getListaPreciosConOpcionesAction } from "@/actions/listaPrecios";

export const dynamic = "force-dynamic";

export default async function ListaPreciosPage() {
  const [proveedores, rol, marcasRows] = await Promise.all([
    getProveedores(),
    getRol(),
    prisma.marca.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const marcas = marcasRows.map((m) => ({ id: m.id, nombre: m.nombre }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ListaPreciosPageClient
        proveedores={proveedores}
        marcas={marcas}
        rol={rol}
        fetchListaPreciosConOpcionesAction={getListaPreciosConOpcionesAction}
      />
    </div>
  );
}
