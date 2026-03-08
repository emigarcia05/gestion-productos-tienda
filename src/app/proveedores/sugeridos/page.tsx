import { getProveedores } from "@/actions/proveedores";
import { prisma } from "@/lib/prisma";
import SugeridosPageClient from "@/components/proveedores/SugeridosPageClient";

export const dynamic = "force-dynamic";

export default async function PxVtaSugeridosPage() {
  const [proveedores, marcasRows] = await Promise.all([
    getProveedores(),
    prisma.marca.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const marcas = marcasRows.map((m) => ({ id: m.id, nombre: m.nombre }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SugeridosPageClient proveedores={proveedores} marcas={marcas} />
    </div>
  );
}
