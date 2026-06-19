import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";

/** Entrada por defecto: módulo Gestión Productos, vista alineada al rol simple (Px. Vta. Sugeridos). */
export default function HomePage() {
  redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);
}
