import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { mesAnioCalendarioArgentina } from "@/services/finBalGastoMensualBalance.service";
import {
  listarEstPorProd,
  listarSucursalesConDepositoParaEstPorProd,
} from "@/services/estPorProd.service";
import { listarEstPorProdColores } from "@/services/estPorProdColores.service";
import EstPorProdPageClient from "@/components/estadisticas-productos/EstPorProdPageClient";

export const dynamic = "force-dynamic";

export default async function EstadisticasProductosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const esEditor = rol === "editor";
  const { mes: defaultMes, anio: defaultAnio } = mesAnioCalendarioArgentina();
  const [filas, sucursales, colores] = await Promise.all([
    listarEstPorProd(),
    listarSucursalesConDepositoParaEstPorProd(),
    listarEstPorProdColores(),
  ]);

  return (
    <div className="area-page-shell">
      <EstPorProdPageClient
        filas={filas}
        sucursales={sucursales}
        colores={colores}
        esEditor={esEditor}
        defaultMes={defaultMes}
        defaultAnio={defaultAnio}
      />
    </div>
  );
}
