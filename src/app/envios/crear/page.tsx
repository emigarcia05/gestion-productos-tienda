import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";

export default function EnviosCrearRedirectPage() {
  redirect(GP_ROUTES.envios.conductor);
}
