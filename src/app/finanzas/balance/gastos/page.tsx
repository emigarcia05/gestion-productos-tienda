import { redirect } from "next/navigation";
import FinanzasBalanceGastosPageClient from "@/components/finanzas/FinanzasBalanceGastosPageClient";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarImputacionesMensualesBalance, mesAnioCalendarioArgentina } from "@/services/finBalGastoMensualBalance.service";

export const dynamic = "force-dynamic";

const ANIO_MIN = 2026;
const ANIO_MAX = 2046;

function clampAnio(a: number): number {
  return Math.min(ANIO_MAX, Math.max(ANIO_MIN, a));
}

interface Props {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}

export default async function BalanceGastosPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }
  const esEditor = rol === "editor";

  const sp = await searchParams;
  const defRaw = mesAnioCalendarioArgentina();
  const def = { mes: defRaw.mes, anio: clampAnio(defRaw.anio) };

  let mes = def.mes;
  let anio = def.anio;
  const parsed = mesAnioQuerySchema.safeParse({
    mes: sp.mes ?? def.mes,
    anio: sp.anio ?? def.anio,
  });
  if (parsed.success) {
    mes = parsed.data.mes;
    anio = parsed.data.anio;
  }

  const filas = await listarImputacionesMensualesBalance({ mes, anio });

  return (
    <FinanzasBalanceGastosPageClient filas={filas} esEditor={esEditor} mes={mes} anio={anio} />
  );
}
