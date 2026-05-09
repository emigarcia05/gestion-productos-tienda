import { redirect } from "next/navigation";
import FinanzasBalanceGastosPageClient from "@/components/finanzas/FinanzasBalanceGastosPageClient";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarImputacionesMensualesBalance, mesAnioCalendarioArgentina } from "@/services/finBalGastoMensualBalance.service";
import { listarSucursalesParaGastos } from "@/services/movimientosFinanzas.service";

export const dynamic = "force-dynamic";

const ANIO_MIN = 2026;
const ANIO_MAX = 2046;

function clampAnio(a: number): number {
  return Math.min(ANIO_MAX, Math.max(ANIO_MIN, a));
}

interface Props {
  searchParams: Promise<{ mes?: string | string[]; anio?: string | string[] }>;
}

/** Primer valor de un query param (Next puede devolver `string[]`). */
function primerSearchParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  if (s === undefined || s === "") return undefined;
  return s;
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

  const mesStr = primerSearchParam(sp.mes);
  const anioStr = primerSearchParam(sp.anio);

  /** Primera carga sin periodo en la URL: fijar mes/año calendario Argentina en la query. */
  if (mesStr === undefined && anioStr === undefined) {
    redirect(`/finanzas/balance/gastos?mes=${def.mes}&anio=${def.anio}`);
  }

  const parsed = mesAnioQuerySchema.safeParse({
    mes: mesStr ?? def.mes,
    anio: anioStr ?? def.anio,
  });
  if (!parsed.success) {
    redirect(`/finanzas/balance/gastos?mes=${def.mes}&anio=${def.anio}`);
  }

  const { mes, anio } = parsed.data;

  const [filas, sucursalesCentroCosto] = await Promise.all([
    listarImputacionesMensualesBalance({ mes, anio }),
    listarSucursalesParaGastos(),
  ]);

  return (
    <FinanzasBalanceGastosPageClient
      filas={filas}
      esEditor={esEditor}
      mes={mes}
      anio={anio}
      sucursalesCentroCosto={sucursalesCentroCosto}
    />
  );
}
