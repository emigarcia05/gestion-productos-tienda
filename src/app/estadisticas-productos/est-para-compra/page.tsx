import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import EstParaCompraPageClient from "@/components/estadisticas-productos/EstParaCompraPageClient";

export const dynamic = "force-dynamic";

export default async function EstParaCompraPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  return (
    <div className="area-page-shell">
      <EstParaCompraPageClient />
    </div>
  );
}
