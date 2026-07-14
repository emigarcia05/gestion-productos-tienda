import { redirect } from "next/navigation";
import MarketingCalendarioPageClient from "@/components/marketing/MarketingCalendarioPageClient";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  listarMktPublicacionContenidos,
  listarMktPublicacionRedes,
  listarMktPublicacionTipos,
} from "@/services/mktPublicacionesCatalogo.service";
import { listarMktIdeasJerarquia } from "@/services/mktPublicacionesIdeas.service";
import { listarMktPublicacionesCalendario } from "@/services/mktPublicaciones.service";

export const dynamic = "force-dynamic";

export default async function MarketingCalendarioPublicacionesPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.marketing.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const esEditor = rol === "editor";
  const [
    redesIniciales,
    tiposIniciales,
    contenidosIniciales,
    seccionesIdeas,
    publicaciones,
  ] = await Promise.all([
    listarMktPublicacionRedes(),
    listarMktPublicacionTipos(),
    listarMktPublicacionContenidos(),
    listarMktIdeasJerarquia(),
    listarMktPublicacionesCalendario(),
  ]);

  return (
    <div className="area-page-shell">
      <MarketingCalendarioPageClient
        redesIniciales={redesIniciales}
        tiposIniciales={tiposIniciales}
        contenidosIniciales={contenidosIniciales}
        seccionesIdeas={seccionesIdeas}
        publicaciones={publicaciones}
        esEditor={esEditor}
      />
    </div>
  );
}
