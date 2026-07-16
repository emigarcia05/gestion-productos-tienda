import { redirect } from "next/navigation";
import MarketingColoresMarcaPageClient from "@/components/marketing/MarketingColoresMarcaPageClient";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarMktColoresMarca } from "@/services/mktColoresMarca.service";

export const dynamic = "force-dynamic";

export default async function MarketingColoresMarcaPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.marketing.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const items = await listarMktColoresMarca();

  return (
    <div className="area-page-shell">
      <MarketingColoresMarcaPageClient items={items} esEditor={rol === "editor"} />
    </div>
  );
}
