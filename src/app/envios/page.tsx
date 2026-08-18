import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";

export default function EnviosIndexPage() {
  redirect(GP_ROUTES.envios.programados);
}
