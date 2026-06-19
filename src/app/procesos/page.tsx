import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ProcesosPageClient from "@/components/procesos/ProcesosPageClient";

export const dynamic = "force-dynamic";

export default async function ProcesosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.procesos.acceso)) {
    redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);
  }

  return <ProcesosPageClient rol={rol} />;
}
