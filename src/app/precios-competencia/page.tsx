import { redirect } from "next/navigation";

/** Redirige a la pantalla canónica Px Competencia. */
export default function PreciosCompetenciaRedirectPage() {
  redirect("/gestion-productos/tienda/cx-px-tienda");
}
