import { redirect } from "next/navigation";
import MarketingBaseMultimediaPageClient from "@/components/marketing/MarketingBaseMultimediaPageClient";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarMktContenidoUrlDrive } from "@/services/mktContenidoUrlDrive.service";

export const dynamic = "force-dynamic";

export default async function MarketingBaseMultimediaPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.marketing.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const items = await listarMktContenidoUrlDrive();

  return (
    <div className="area-page-shell">
      <MarketingBaseMultimediaPageClient items={items} esEditor={rol === "editor"} />
    </div>
  );
}
