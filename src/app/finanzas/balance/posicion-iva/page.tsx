import { redirect } from "next/navigation";
import FinanzasBalancePosicionIvaPage from "@/components/finanzas/FinanzasBalancePosicionIvaPage";
import { mesAnioCalendarioArgentina } from "@/services/finBalGastoMensualBalance.service";
import { listarMontosBrutosFinBalIvaDebPorAnio } from "@/services/finBalIvaDeb.service";
import { sumarIvaCreditoPorMesAnio, ivaCreditoDesdeTotalConIva21 } from "@/services/finBalPosicionIva.service";
import { listarSaldoManualPosicionIvaPorAnio } from "@/services/finBalPosicionIvaSaldoManual.service";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";

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

  const editor = await esEditor();
  const { anio: anioCalendarioActualRaw } = mesAnioCalendarioArgentina();
  const anio = clampAnio(anioCalendarioActualRaw);

  const [montosBrutosVentasConIvaPorMes, ivaCreditoPorMes, saldoManualPorMes] = await Promise.all([
    listarMontosBrutosFinBalIvaDebPorAnio(anio),
    sumarIvaCreditoPorMesAnio(anio),
    listarSaldoManualPosicionIvaPorAnio(anio),
  ]);

  const ivaDebitoPorMes = montosBrutosVentasConIvaPorMes.map((bruto) =>
    ivaCreditoDesdeTotalConIva21(bruto),
  );

  return (
    <FinanzasBalancePosicionIvaPage
      anio={anio}
      esEditor={editor}
      ivaDebitoPorMes={ivaDebitoPorMes}
      ivaCreditoPorMes={ivaCreditoPorMes}
      saldoManualPorMes={saldoManualPorMes}
    />
  );
}
