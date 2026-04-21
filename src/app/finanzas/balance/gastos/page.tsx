import { redirect } from "next/navigation";
import FinanzasBalanceGastosPageClient from "@/components/finanzas/FinanzasBalanceGastosPageClient";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  listarImputacionesMensualesBalance,
  mesAnioCalendarioArgentina,
} from "@/services/finBalGastoMensualBalance.service";

export const dynamic = "force-dynamic";

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
  const def = mesAnioCalendarioArgentina();
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
