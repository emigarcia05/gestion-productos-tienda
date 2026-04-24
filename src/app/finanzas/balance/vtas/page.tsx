import { redirect } from "next/navigation";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { mesAnioCalendarioArgentina } from "@/services/finBalGastoMensualBalance.service";
import {
  listarFinBalVtas,
  listarSucursalesGeneraBalanceParaVtas,
} from "@/services/finBalVtas.service";
import FinBalVtasPageClient from "@/components/finanzas/FinBalVtasPageClient";

export const dynamic = "force-dynamic";

export default async function FinBalVtasPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const esEditor = rol === "editor";
  const { mes: defaultMes, anio: defaultAnio } = mesAnioCalendarioArgentina();
  const [filas, sucursales] = await Promise.all([
    listarFinBalVtas(),
    listarSucursalesGeneraBalanceParaVtas(),
  ]);

  return (
    <FinBalVtasPageClient
      filas={filas}
      sucursales={sucursales}
      esEditor={esEditor}
      defaultMes={defaultMes}
      defaultAnio={defaultAnio}
    />
  );
}
