import { permanentRedirect } from "next/navigation";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";

/** Entrada del módulo Publicaciones. */
export default function MarketingPublicacionesPage() {
  permanentRedirect(MARKETING_ROUTES.publicaciones.calendario);
}
