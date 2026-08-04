import { permanentRedirect } from "next/navigation";
import { ESTADISTICAS_PRODUCTOS_ROUTES } from "@/lib/estadisticasProductosRoutes";

/** Entrada del área → Ventas Por Producto. */
export default function EstadisticasProductosIndexPage() {
  permanentRedirect(ESTADISTICAS_PRODUCTOS_ROUTES.defaultEntry);
}
