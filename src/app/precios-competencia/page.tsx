import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import CompetenciaPreciosPageClient from "@/components/precios-competencia/CompetenciaPreciosPageClient";

export const dynamic = "force-dynamic";

export default async function PreciosCompetenciaPage() {
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
