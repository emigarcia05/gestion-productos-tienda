import { permanentRedirect } from "next/navigation";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";

/** Compatibilidad: `/objetivo` → `/objetivos`. */
export default function MarketingObjetivoLegacyRedirect() {
  permanentRedirect(MARKETING_ROUTES.publicaciones.objetivos);
}
