import { redirect } from "next/navigation";
import FinanzasVencimientosGastosPageClient from "@/components/finanzas/FinanzasVencimientosGastosPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { listarObligacionesGastoVencidasNoMercaderia } from "@/services/finBalGastoMensualBalance.service";

export const dynamic = "force-dynamic";

export default async function FinanzasVencimientosGastosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const { hoyIso, proveedores, detalleLineas } = await listarObligacionesGastoVencidasNoMercaderia();

  return (
    <FinanzasVencimientosGastosPageClient
      hoyIso={hoyIso}
      proveedores={proveedores}
      detalleLineas={detalleLineas}
    />
  );
}