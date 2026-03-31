import { redirect } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import VencPorFechaCalendario from "@/components/finanzas/VencPorFechaCalendario";
import { diasEnMes, parseMesFinanzasParam, shiftMesYm } from "@/lib/calendarioMesFinanzas";
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

  const totalPorDia: Record<string, number> = {};
  const detallePorDiaProveedor: Record<string, Record<string, number>> = {};
  for (const l of lineas) {
    const key = claveDiaFechaVenc(l.fechaVenc);
    totalPorDia[key] = (totalPorDia[key] ?? 0) + Number(l.saldo);
    if (!detallePorDiaProveedor[key]) detallePorDiaProveedor[key] = {};
    detallePorDiaProveedor[key][l.nombre] =
      (detallePorDiaProveedor[key][l.nombre] ?? 0) + Number(l.saldo);
  }

  const filas = Object.entries(totalPorDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([isoYmd, total]) => ({
      isoYmd,
      dia: Number(isoYmd.slice(8, 10)),
      aPagar: total,
    }));
  const detallesPorDia = Object.fromEntries(
    Object.entries(detallePorDiaProveedor).map(([isoYmd, porProveedor]) => [
      isoYmd,
      Object.entries(porProveedor)
        .map(([proveedor, vencimiento]) => ({ proveedor, vencimiento }))
        .sort((a, b) => a.proveedor.localeCompare(b.proveedor)),
    ])
  );

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
          hoyIso={dateToIsoYmdArgentina(new Date())}
          detallesPorDia={detallesPorDia}
          filas={filas}
        />
      </ClassicFilteredTableLayout>
    </div>
  );
}
