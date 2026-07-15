import { redirect } from "next/navigation";
import MarketingCalendarioPageClient from "@/components/marketing/MarketingCalendarioPageClient";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  listarMktPublicacionContenidos,
  listarMktPublicacionRedes,
} from "@/services/mktPublicacionesCatalogo.service";
import { listarMktIdeasJerarquia } from "@/services/mktPublicacionesIdeas.service";
import { listarMktPublicacionesCalendario } from "@/services/mktPublicaciones.service";
import { listarMktPublicacionObjs } from "@/services/mktPublicacionesObj.service";

export const dynamic = "force-dynamic";

export default async function MarketingCalendarioPublicacionesPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.marketing.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const esEditor = rol === "editor";
  const [
    redesIniciales,
    contenidosIniciales,
    seccionesIdeas,
    objetivosIniciales,
    publicaciones,
  ] = await Promise.all([
    listarMktPublicacionRedes(),
    listarMktPublicacionContenidos(),
    listarMktIdeasJerarquia(),
    listarMktPublicacionObjs(),
    listarMktPublicacionesCalendario(),
  ]);

  return (
    <div className="area-page-shell">
      <MarketingCalendarioPageClient
        redesIniciales={redesIniciales}
        contenidosIniciales={contenidosIniciales}
        seccionesIdeas={seccionesIdeas}
        objetivosIniciales={objetivosIniciales}
        publicaciones={publicaciones}
        esEditor={esEditor}
      />
    </div>
  );
}
