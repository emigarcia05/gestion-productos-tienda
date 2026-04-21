import { redirect } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export default async function FinanzasVencimientosGastosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ClassicFilteredTableLayout title="Finanzas" subtitle="Vencimientos Gastos">
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <p className="text-sm text-muted-foreground">
            Esta vista está en preparación. Aquí se mostrarán los vencimientos de gastos de balance (proveedores no
            mercadería) con el mismo criterio de acceso que el resto de Finanzas.
          </p>
        </div>
      </ClassicFilteredTableLayout>
    </div>
  );
}
