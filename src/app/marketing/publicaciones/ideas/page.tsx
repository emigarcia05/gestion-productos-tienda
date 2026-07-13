import { redirect } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function MarketingIdeasPublicacionesPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.marketing.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  return (
    <div className="area-page-shell">
      <ClassicFilteredTableLayout title="Marketing" subtitle="Ideas">
        <div className="flex flex-1 items-center justify-center px-4 py-12 text-sm text-muted-foreground">
          Módulo En Construcción.
        </div>
      </ClassicFilteredTableLayout>
    </div>
  );
}
