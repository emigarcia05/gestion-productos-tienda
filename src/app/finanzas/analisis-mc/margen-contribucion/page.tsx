import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import FinAnaMargenContribucionPageClient from "@/components/finanzas/FinAnaMargenContribucionPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getDatosPaginaMargenContribucion } from "@/services/finAnaMargenContribucion.service";

export const dynamic = "force-dynamic";

export default async function FinAnaMargenContribucionPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);
  }

  const esEditor = rol === "editor";
  const { filasCostosFinancieros, terminales, pagos, descuentosPorFormaPago } =
    await getDatosPaginaMargenContribucion();

  return (
    <FinAnaMargenContribucionPageClient
      key={pagos.map((p) => `${p.id}:${p.orden}`).join("|")}
      filasCostosFinancieros={filasCostosFinancieros}
      terminales={terminales}
      pagos={pagos}
      descuentosPorFormaPago={descuentosPorFormaPago}
      esEditor={esEditor}
    />
  );
}
