import { redirect } from "next/navigation";
import FinanzasBalanceGastosPageClient from "@/components/finanzas/FinanzasBalanceGastosPageClient";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  listarImputacionesMensualesBalance,
  listarPeriodosConImputacionesEnDb,
  mesAnioCalendarioArgentina,
  type PeriodosImputacionesDisponibles,
} from "@/services/finBalGastoMensualBalance.service";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}

/** Pares (año, mes) presentes en DB, orden (año desc, mes desc) — el primero es el “más reciente”. */
function periodosOrdenadosDesc(periodos: PeriodosImputacionesDisponibles): { anio: number; mes: number }[] {
  const out: { anio: number; mes: number }[] = [];
  for (const anio of periodos.anios) {
    const meses = periodos.mesesPorAnio[String(anio)] ?? [];
    for (const mes of meses) out.push({ anio, mes });
  }
  out.sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes));
  return out;
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

  const periodosDb = await listarPeriodosConImputacionesEnDb();
  const pairs = periodosOrdenadosDesc(periodosDb);

  if (pairs.length > 0) {
    const existe = pairs.some((p) => p.anio === anio && p.mes === mes);
    if (!existe) {
      const p = pairs[0];
      redirect(`/finanzas/balance/gastos?mes=${p.mes}&anio=${p.anio}`);
    }
  }

  /** Opciones de selects: solo datos en DB; si no hay ninguna fila, se usa el periodo de la vista (calendario/URL) como único par elegible. */
  const periodosOpciones: PeriodosImputacionesDisponibles =
    periodosDb.anios.length > 0
      ? periodosDb
      : {
          anios: [anio],
          mesesPorAnio: { [String(anio)]: [mes] },
        };

  const filas = await listarImputacionesMensualesBalance({ mes, anio });

  return (
    <FinanzasBalanceGastosPageClient
      filas={filas}
      esEditor={esEditor}
      mes={mes}
      anio={anio}
      periodosOpciones={periodosOpciones}
    />
  );
}
