import { redirect } from "next/navigation";
import FinanzasBalancePosicionIvaPage from "@/components/finanzas/FinanzasBalancePosicionIvaPage";
import { mesAnioCalendarioArgentina } from "@/services/finBalGastoMensualBalance.service";
import { sumarIvaCreditoPorMesAnio } from "@/services/finBalPosicionIva.service";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";

export const dynamic = "force-dynamic";

const ANIO_MIN = 2026;
const ANIO_MAX = 2046;

function clampAnio(a: number): number {
  return Math.min(ANIO_MAX, Math.max(ANIO_MIN, a));
}

export default async function BalancePosicionIvaPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const { anio: anioRaw } = mesAnioCalendarioArgentina();
  const anio = clampAnio(anioRaw);

  const ivaCreditoPorMes = await sumarIvaCreditoPorMesAnio(anio);

  return <FinanzasBalancePosicionIvaPage anio={anio} ivaCreditoPorMes={ivaCreditoPorMes} />;
}
