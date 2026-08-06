import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";

/** Entrada por defecto: área Vendedor, vista alineada al rol vendedor/`simple` (Px. Vta. Sugeridos). */
export default function HomePage() {
  redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);
}
