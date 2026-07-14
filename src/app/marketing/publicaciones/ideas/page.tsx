import { redirect } from "next/navigation";
import MarketingIdeasPageClient from "@/components/marketing/MarketingIdeasPageClient";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  listarMktPublicacionContenidos,
  listarMktPublicacionRedes,
  listarMktPublicacionTipos,
} from "@/services/mktPublicacionesCatalogo.service";
import { listarMktIdeasJerarquia } from "@/services/mktPublicacionesIdeas.service";

export const dynamic = "force-dynamic";

export default async function MarketingIdeasPublicacionesPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.marketing.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const [jerarquia, redes, tipos, contenidos] = await Promise.all([
    listarMktIdeasJerarquia(),
    listarMktPublicacionRedes(),
    listarMktPublicacionTipos(),
    listarMktPublicacionContenidos(),
  ]);

  return (
    <div className="area-page-shell">
      <MarketingIdeasPageClient
        jerarquia={jerarquia}
        redes={redes}
        tipos={tipos}
        contenidos={contenidos}
        esEditor={rol === "editor"}
      />
    </div>
  );
}
