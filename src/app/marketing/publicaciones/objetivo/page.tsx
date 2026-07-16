import { redirect } from "next/navigation";
import MarketingObjetivosPageClient from "@/components/marketing/MarketingObjetivosPageClient";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  listarMktPublicacionContenidos,
  listarMktPublicacionRedes,
} from "@/services/mktPublicacionesCatalogo.service";
import { listarMktIdeasJerarquia } from "@/services/mktPublicacionesIdeas.service";
import { listarMktPublicacionObjs } from "@/services/mktPublicacionesObj.service";

export const dynamic = "force-dynamic";

export default async function MarketingObjetivoPublicacionesPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.marketing.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const esEditor = rol === "editor";
  const [redes, contenidos, seccionesIdeas, objetivosIniciales] = await Promise.all([
    listarMktPublicacionRedes(),
    listarMktPublicacionContenidos(),
    listarMktIdeasJerarquia(),
    listarMktPublicacionObjs(),
  ]);

  const secciones = seccionesIdeas.map((s) => ({ id: s.id, nombre: s.nombre }));

  return (
    <div className="area-page-shell">
      <MarketingObjetivosPageClient
        objetivosIniciales={objetivosIniciales}
        redes={redes}
        contenidos={contenidos}
        secciones={secciones}
        esEditor={esEditor}
      />
    </div>
  );
}
