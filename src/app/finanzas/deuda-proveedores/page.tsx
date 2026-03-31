import { redirect } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaDeudaProveedores from "@/components/finanzas/TablaDeudaProveedores";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { listarDeudaProveedores } from "@/services/deudaProveedores.service";

export const dynamic = "force-dynamic";

export default async function DeudaProveedoresPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const raw = await listarDeudaProveedores();
  const filas = raw.map((r) => ({
    idProveedorDux: r.idProveedorDux,
    nombre: r.nombre,
    deuda: r.deuda.toFixed(2),
  }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ClassicFilteredTableLayout title="Finanzas" subtitle="Deuda Proveedores">
        <TablaDeudaProveedores filas={filas} />
      </ClassicFilteredTableLayout>
    </div>
  );
}
