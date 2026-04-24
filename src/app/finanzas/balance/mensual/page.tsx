import { redirect } from "next/navigation";
import FinanzasBalanceMensualPageClient from "@/components/finanzas/FinanzasBalanceMensualPageClient";
import { resumenBalanceMensualDesdeFilas } from "@/lib/balanceMensual";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
import {
  listarImputacionesMensualesBalance,
  mesAnioCalendarioArgentina,
} from "@/services/finBalGastoMensualBalance.service";
import {
  listarFinBalVtasPorMesAnio,
  listarSucursalesGeneraBalanceParaVtas,
} from "@/services/finBalVtas.service";

export const dynamic = "force-dynamic";

const ANIO_MIN = 2026;
const ANIO_MAX = 2046;

function clampAnio(a: number): number {
  return Math.min(ANIO_MAX, Math.max(ANIO_MIN, a));
}

interface Props {
  searchParams: Promise<{ mes?: string | string[]; anio?: string | string[] }>;
}

function primerSearchParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  if (s === undefined || s === "") return undefined;
  return s;
}

export default async function BalanceMensualPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const sp = await searchParams;
  const defRaw = mesAnioCalendarioArgentina();
  const def = { mes: defRaw.mes, anio: clampAnio(defRaw.anio) };

  const mesStr = primerSearchParam(sp.mes);
  const anioStr = primerSearchParam(sp.anio);

  if (mesStr === undefined && anioStr === undefined) {
    redirect(`/finanzas/balance/mensual?mes=${def.mes}&anio=${def.anio}`);
  }

  const parsed = mesAnioQuerySchema.safeParse({
    mes: mesStr ?? def.mes,
    anio: anioStr ?? def.anio,
  });
  if (!parsed.success) {
    redirect(`/finanzas/balance/mensual?mes=${def.mes}&anio=${def.anio}`);
  }

  const { mes, anio } = parsed.data;
  const [filas, sucursalesBalance, vtasMes] = await Promise.all([
    listarImputacionesMensualesBalance({ mes, anio }),
    listarSucursalesGeneraBalanceParaVtas(),
    listarFinBalVtasPorMesAnio(mes, anio),
  ]);
  const ventasPorSucursalNombre: Record<string, number> = {};
  for (const v of vtasMes) {
    ventasPorSucursalNombre[v.sucursal.nombre] = v.monto;
  }
  const resumen = resumenBalanceMensualDesdeFilas(filas, ventasPorSucursalNombre, sucursalesBalance);
  const puedeEditarVentas = await esEditor();

  return (
    <FinanzasBalanceMensualPageClient
      mes={mes}
      anio={anio}
      resumen={resumen}
      puedeEditarVentas={puedeEditarVentas}
    />
  );
}
