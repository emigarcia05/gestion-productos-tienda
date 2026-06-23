import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";

export const dynamic = "force-dynamic";

/** Ruta legacy unificada en Comparacion. */
export default function CategoriasComparacionPage() {
  redirect(GP_ROUTES.analisisPrecios.compCategorias.comparacion);
}
