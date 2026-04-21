import { redirect } from "next/navigation";
import FinanzasBalanceGastosPageClient from "@/components/finanzas/FinanzasBalanceGastosPageClient";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  listarImputacionesMensualesBalance,
  mesAnioCalendarioArgentina,
} from "@/services/finBalGastoMensualBalance.service";

export const dynamic = "force-dynamic";

export default async function BalanceGastosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }
  const esEditor = rol === "editor";

  const { mes, anio } = mesAnioCalendarioArgentina();
  const filas = await listarImputacionesMensualesBalance({ mes, anio });

  return <FinanzasBalanceGastosPageClient filas={filas} esEditor={esEditor} />;
}
