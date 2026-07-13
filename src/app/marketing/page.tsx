import { permanentRedirect } from "next/navigation";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";

/** Entrada del área Marketing: primer submódulo = Calendario de Publicaciones. */
export default function MarketingPage() {
  permanentRedirect(MARKETING_ROUTES.defaultEntry);
}
