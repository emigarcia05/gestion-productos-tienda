import { redirect } from "next/navigation";
import EnviosConductorPageClient from "@/components/envios/EnviosConductorPageClient";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarEnviosPendientesConductor } from "@/services/enviosFinal.service";

export const dynamic = "force-dynamic";

export default async function EnviosConductorPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.envios.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const envios = await listarEnviosPendientesConductor();

  return (
    <div className="area-page-shell">
      <EnviosConductorPageClient envios={envios} />
    </div>
  );
}
