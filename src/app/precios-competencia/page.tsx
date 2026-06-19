import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";

/** Redirige a la pantalla canónica Px Competencia. */
export default function PreciosCompetenciaRedirectPage() {
  redirect(GP_ROUTES.analisisPrecios.pxCompetencia);
}
