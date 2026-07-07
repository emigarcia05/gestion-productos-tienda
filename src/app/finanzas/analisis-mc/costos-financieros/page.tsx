import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import FinAnaCosFinaPageClient from "@/components/finanzas/FinAnaCosFinaPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { listarFinAnaCosFina } from "@/services/finAnaCosFina.service";

export const dynamic = "force-dynamic";

export default async function FinAnaCosFinaPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);
  }

  const esEditor = rol === "editor";
  const filas = await listarFinAnaCosFina();

  return <FinAnaCosFinaPageClient filas={filas} esEditor={esEditor} />;
}
