import { redirect } from "next/navigation";
import MarketingIdeasPageClient from "@/components/marketing/MarketingIdeasPageClient";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  listarMktPublicacionContenidos,
  listarMktPublicacionRedes,
} from "@/services/mktPublicacionesCatalogo.service";
import { listarMktIdeasJerarquia } from "@/services/mktPublicacionesIdeas.service";

export const dynamic = "force-dynamic";

export default async function MarketingIdeasPublicacionesPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.marketing.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const [jerarquia, redes, contenidos] = await Promise.all([
    listarMktIdeasJerarquia(),
    listarMktPublicacionRedes(),
    listarMktPublicacionContenidos(),
  ]);

  return (
    <div className="area-page-shell">
      <MarketingIdeasPageClient
        jerarquia={jerarquia}
        redes={redes}
        contenidos={contenidos}
        esEditor={rol === "editor"}
      />
    </div>
  );
}
