import { redirect } from "next/navigation";
import FinanzasTesoreriaPageClient from "@/components/finanzas/FinanzasTesoreriaPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { listarCajasTesoreria } from "@/services/cajasTesoreria.service";
import { formatFechaHoraCompletaArgentina } from "@/lib/fechaArgentina";

export const dynamic = "force-dynamic";

export default async function FinanzasTesoreriaPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }
  const esEditor = rol === "editor";

  const items = await listarCajasTesoreria();
  const filas = items.map((c) => ({
    id: c.id,
    nombreCaja: c.nombreCaja,
    titular: c.titular,
    tipoCaja: c.tipoCaja,
    monto: c.monto,
    montoDisponible: c.montoDisponible,
    montoChequesDiferidos: c.montoChequesDiferidos,
    ultActualizacion: formatFechaHoraCompletaArgentina(c.ultActualizacion),
    ultActualizacionIso: c.ultActualizacion.toISOString(),
  }));

  return <FinanzasTesoreriaPageClient filas={filas} esEditor={esEditor} />;
}
