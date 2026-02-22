import { prisma } from "@/lib/prisma";
import { Separator } from "@/components/ui/separator";
import CrearProveedorModal from "@/components/proveedores/CrearProveedorModal";
import ImportarModal from "@/components/proveedores/ImportarModal";
import TablaProductosFiltrada from "@/components/proveedores/TablaProductosFiltrada";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const [proveedores, productos] = await Promise.all([
    prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    }),
    prisma.producto.findMany({
      orderBy: { codExt: "asc" },
      include: { proveedor: { select: { id: true, nombre: true, codigoUnico: true, sufijo: true } } },
      orderBy: { codExt: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6">

        {/* Botones de acción */}
        <div className="flex items-center gap-3">
          <CrearProveedorModal />
          <ImportarModal proveedores={proveedores} />
        </div>

        <Separator className="opacity-50" />

        {/* Tabla de productos con filtro */}
        <TablaProductosFiltrada
          productos={productos}
          proveedores={proveedores}
        />

      </main>
    </div>
  );
}
