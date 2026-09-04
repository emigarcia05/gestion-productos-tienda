import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import FinanzasBalanceGastosPageClient from "@/components/finanzas/FinanzasBalanceGastosPageClient";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  listarImputacionesMensualesBalance,
  listarSucursalesParaGastos,
  mesAnioCalendarioArgentina,
} from "@/services/finBalGastoMensualBalance.service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ANIO_MIN = 2026;
const ANIO_MAX = 2046;

const anioPeriodoSchema = z.coerce.number().int().min(ANIO_MIN).max(ANIO_MAX);

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

/**
 * Parsea `mes` de la URL: `6`, `6,7,8` o varios `mes=`.
 * Ausente, vacío o `todos` → `[]` (sin filtrar por mes).
 */
function parseMesesSearchParam(mesRaw: string | string[] | undefined): number[] {
  if (mesRaw === undefined) return [];
  const tokens: string[] = [];
  if (Array.isArray(mesRaw)) {
    for (const part of mesRaw) {
      tokens.push(...part.split(","));
    }
  } else {
    tokens.push(...mesRaw.split(","));
  }
  if (tokens.some((t) => t.trim().toLowerCase() === "todos")) {
    return [];
  }
  return [
    ...new Set(
      tokens
        .map((t) => Number.parseInt(t.trim(), 10))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12)
    ),
  ].sort((a, b) => a - b);
}

export default async function BalanceGastosPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);
  }
  const esEditor = rol === "editor";

  const sp = await searchParams;
  const defRaw = mesAnioCalendarioArgentina();
  const def = { mes: defRaw.mes, anio: clampAnio(defRaw.anio) };

  const mesRaw = sp.mes;
  const anioStr = primerSearchParam(sp.anio);

  /** Primera carga sin periodo en la URL: fijar mes/año calendario Argentina en la query. */
  if (mesRaw === undefined && anioStr === undefined) {
    redirect(`/finanzas/balance/gastos?mes=${def.mes}&anio=${def.anio}`);
  }

  const anioParsed = anioPeriodoSchema.safeParse(anioStr ?? def.anio);
  if (!anioParsed.success) {
    redirect(`/finanzas/balance/gastos?mes=${def.mes}&anio=${def.anio}`);
  }

  const anio = anioParsed.data;
  const meses = parseMesesSearchParam(mesRaw);

  const [filas, sucursalesCentroCosto] = await Promise.all([
    listarImputacionesMensualesBalance({ meses, anio }),
    listarSucursalesParaGastos(),
  ]);

  return (
    <FinanzasBalanceGastosPageClient
      filas={filas}
      esEditor={esEditor}
      meses={meses}
      anio={anio}
      sucursalesCentroCosto={sucursalesCentroCosto}
    />
  );
}
