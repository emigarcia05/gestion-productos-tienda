import { getProveedores } from "@/actions/proveedores";
import { getRol } from "@/lib/sesion";
import { prisma } from "@/lib/prisma";
import ListaPreciosPageClient from "@/components/proveedores/ListaPreciosPageClient";
import { getListaPreciosConTienda } from "@/services/listaPrecios.service";

export const dynamic = "force-dynamic";

export default async function ListaPreciosPage() {
  const [proveedores, rol, filasParaCliente, marcasRows] = await Promise.all([
    getProveedores(),
    getRol(),
    getListaPreciosConTienda(),
    prisma.marca.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const marcas = marcasRows.map((m) => ({ id: m.id, nombre: m.nombre }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ListaPreciosPageClient
        filas={filasParaCliente}
        proveedores={proveedores}
        marcas={marcas}
        rol={rol}
      />
    </div>
  );
}
