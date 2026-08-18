import { redirect } from "next/navigation";
import EnviosPageClient from "@/components/envios/EnviosPageClient";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarEnviosDirecciones } from "@/services/enviosDirecciones.service";
import { listarEnviosFinal } from "@/services/enviosFinal.service";
import { listarEnviosPersonas } from "@/services/enviosPersonas.service";

export const dynamic = "force-dynamic";

export default async function EnviosProgramadosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.envios.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const [envios, personas, direcciones] = await Promise.all([
    listarEnviosFinal(),
    listarEnviosPersonas(),
    listarEnviosDirecciones(),
  ]);

  return (
    <div className="area-page-shell">
      <EnviosPageClient envios={envios} personas={personas} direcciones={direcciones} />
    </div>
  );
}
