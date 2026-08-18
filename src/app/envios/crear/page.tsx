import { redirect } from "next/navigation";
import CrearEnvioPageClient from "@/components/envios/CrearEnvioPageClient";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarEnviosDirecciones } from "@/services/enviosDirecciones.service";
import { listarClientes } from "@/services/clientes.service";

export const dynamic = "force-dynamic";

export default async function EnviosCrearPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.envios.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const [clientesCatalogo, direcciones] = await Promise.all([
    listarClientes(),
    listarEnviosDirecciones(),
  ]);

  return (
    <div className="area-page-shell">
      <CrearEnvioPageClient clientesCatalogo={clientesCatalogo} direcciones={direcciones} />
    </div>
  );
}
