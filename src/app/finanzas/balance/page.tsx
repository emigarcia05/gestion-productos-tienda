import { redirect } from "next/navigation";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { mesAnioCalendarioArgentina } from "@/services/finBalGastoMensualBalance.service";

export const dynamic = "force-dynamic";

const ANIO_MIN = 2026;
const ANIO_MAX = 2046;

function clampAnio(a: number): number {
  return Math.min(ANIO_MAX, Math.max(ANIO_MIN, a));
}

/** Entrada del módulo Balance: primer submódulo = Balance mensual. */
export default async function BalanceIndexPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }
  const { mes, anio: anioRaw } = mesAnioCalendarioArgentina();
  const anio = clampAnio(anioRaw);
  redirect(`/finanzas/balance/mensual?mes=${mes}&anio=${anio}`);
}
