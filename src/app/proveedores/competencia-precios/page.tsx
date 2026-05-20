import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import CompetenciaPreciosPageClient from "@/components/proveedores/competencia-precios/CompetenciaPreciosPageClient";

export const dynamic = "force-dynamic";

export default async function CompetenciaPreciosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.competenciaPrecios.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  return (
    <div className="area-page-shell">
      <CompetenciaPreciosPageClient rol={rol} />
    </div>
  );
}
