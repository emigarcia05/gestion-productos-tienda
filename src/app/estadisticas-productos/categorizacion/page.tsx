import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarProdTiendaCategorizacion } from "@/services/estCategorizacion.service";
import EstCategorizacionPageClient from "@/components/estadisticas-productos/EstCategorizacionPageClient";

export const dynamic = "force-dynamic";

export default async function EstCategorizacionPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const filas = await listarProdTiendaCategorizacion();

  return (
    <div className="area-page-shell">
      <EstCategorizacionPageClient filas={filas} />
    </div>
  );
}
