import { redirect } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import VencPorFechaCalendario from "@/components/finanzas/VencPorFechaCalendario";
import {
  addDaysToIsoYmdArgentina,
  dateToIsoYmdArgentina,
  formatIsoYmdDdMmYyyyArgentina,
} from "@/lib/fechaArgentina";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  listarVencimientosEnRango,
  sumarSaldoVencimientosConFechaVencAnteriorA,
} from "@/services/vencimientosPorFecha.service";

export const dynamic = "force-dynamic";

/** Ventana fija: desde hoy (AR) hasta 150 días adelante (inclusive). */
const DIAS_VENTANA_VENC_POR_FECHA = 150;

function claveDiaFechaVenc(fechaVenc: string | Date): string {
  if (typeof fechaVenc === "string") {
    return fechaVenc.length >= 10 ? fechaVenc.slice(0, 10) : fechaVenc;
  }
  return dateToIsoYmdArgentina(fechaVenc);
}

export default async function VencPorFechaPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const hoyIso = dateToIsoYmdArgentina(new Date());
  const hastaIso = addDaysToIsoYmdArgentina(hoyIso, DIAS_VENTANA_VENC_POR_FECHA);

  const [lineas, saldoVencidoAntesDeHoy] = await Promise.all([
    listarVencimientosEnRango(hoyIso, hastaIso),
    sumarSaldoVencimientosConFechaVencAnteriorA(hoyIso),
  ]);

  const totalPorDia: Record<string, number> = {};
  const detallePorDiaProveedor: Record<string, Record<string, number>> = {};
  for (const l of lineas) {
    const key = claveDiaFechaVenc(l.fechaVenc);
    if (key < hoyIso || key > hastaIso) continue;
    totalPorDia[key] = (totalPorDia[key] ?? 0) + Number(l.saldo);
    if (!detallePorDiaProveedor[key]) detallePorDiaProveedor[key] = {};
    detallePorDiaProveedor[key][l.nombre] =
      (detallePorDiaProveedor[key][l.nombre] ?? 0) + Number(l.saldo);
  }

  const filas = Object.entries(totalPorDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([isoYmd, total]) => ({
      isoYmd,
      vencimientoDelDia: total,
    }));

  const detallesPorDia = Object.fromEntries(
    Object.entries(detallePorDiaProveedor).map(([isoYmd, porProveedor]) => [
      isoYmd,
      Object.entries(porProveedor)
        .map(([proveedor, vencimiento]) => ({ proveedor, vencimiento }))
        .sort((a, b) => a.proveedor.localeCompare(b.proveedor)),
    ])
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ClassicFilteredTableLayout title="Finanzas" subtitle="Venc. por fecha">
        <VencPorFechaCalendario
          rangoDesdeLabel={formatIsoYmdDdMmYyyyArgentina(hoyIso)}
          rangoHastaLabel={formatIsoYmdDdMmYyyyArgentina(hastaIso)}
          saldoVencidoAntesDeHoy={saldoVencidoAntesDeHoy}
          detallesPorDia={detallesPorDia}
          filas={filas}
        />
      </ClassicFilteredTableLayout>
    </div>
  );
}
