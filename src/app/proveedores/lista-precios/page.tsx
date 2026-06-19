import { redirect } from "next/navigation";
import { getProveedoresMercaderia } from "@/actions/proveedores";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { prisma } from "@/lib/prisma";
import { listarRubrosOpcionesDesdeProdTienda } from "@/services/rubrosProdTienda.service";
import ListaPreciosPageClient from "@/components/proveedores/ListaPreciosPageClient";

export const dynamic = "force-dynamic";

export default async function ListaPreciosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.proveedores.listaPrecios)) redirect("/gestion-productos/proveedores/sugeridos");

  const [proveedores, marcasRows, rubros] = await Promise.all([
    getProveedoresMercaderia(),
    prisma.marca.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    listarRubrosOpcionesDesdeProdTienda(),
  ]);

  const marcas = marcasRows.map((m) => ({ id: m.id, nombre: m.nombre }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ListaPreciosPageClient
        proveedores={proveedores}
        marcas={marcas}
        rubros={rubros}
        rol={rol}
      />
    </div>
  );
}
