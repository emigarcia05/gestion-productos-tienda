import { redirect } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import VencPorFechaCalendario from "@/components/finanzas/VencPorFechaCalendario";
import {
  construirGrillaMes,
  diasEnMes,
  parseMesFinanzasParam,
  shiftMesYm,
} from "@/lib/calendarioMesFinanzas";
import {
  dateToIsoYmdArgentina,
  formatMesAnioTituloArgentina,
  isoYearMonthArgentina,
} from "@/lib/fechaArgentina";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { listarVencimientosEnRango } from "@/services/vencimientosPorFecha.service";

export const dynamic = "force-dynamic";

function claveDiaFechaVenc(fechaVenc: string | Date): string {
  if (typeof fechaVenc === "string") {
    return fechaVenc.length >= 10 ? fechaVenc.slice(0, 10) : fechaVenc;
  }
  return dateToIsoYmdArgentina(fechaVenc);
}

interface Props {
  searchParams: Promise<{ mes?: string }>;
}

export default async function VencPorFechaPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const sp = await searchParams;
  const fallback = isoYearMonthArgentina();
  const { year, month, ym } = parseMesFinanzasParam(sp.mes, fallback);

  const pad = (n: number) => String(n).padStart(2, "0");
  const fechaDesde = `${year}-${pad(month)}-01`;
  const fechaHasta = `${year}-${pad(month)}-${pad(diasEnMes(year, month))}`;

  const lineas = await listarVencimientosEnRango(fechaDesde, fechaHasta);

  const porDia: Record<string, { nombre: string; saldo: string }[]> = {};
  for (const l of lineas) {
    const key = claveDiaFechaVenc(l.fechaVenc);
    if (!porDia[key]) porDia[key] = [];
    porDia[key].push({ nombre: l.nombre, saldo: l.saldo.toFixed(2) });
  }

  const celdas = construirGrillaMes(year, month);
  const mesAnteriorYm = shiftMesYm(year, month, -1);
  const mesSiguienteYm = shiftMesYm(year, month, 1);
  const tituloMes = formatMesAnioTituloArgentina(year, month);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ClassicFilteredTableLayout title="Finanzas" subtitle="Venc. por fecha">
        <VencPorFechaCalendario
          tituloMes={tituloMes}
          mesYm={ym}
          mesAnteriorYm={mesAnteriorYm}
          mesSiguienteYm={mesSiguienteYm}
          celdas={celdas}
          porDia={porDia}
        />
      </ClassicFilteredTableLayout>
    </div>
  );
}
