import { redirect } from "next/navigation";
import CargarGastoPageClient from "@/components/ayuda-vendedor/CargarGastoPageClient";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
import {
  listarSucursalesParaGastos,
  mesAnioCalendarioArgentina,
} from "@/services/finBalGastoMensualBalance.service";

export const dynamic = "force-dynamic";

export default async function CargarGastoPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso) || !(await esEditor())) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const { mes, anio } = mesAnioCalendarioArgentina();
  const sucursalesCentroCosto = await listarSucursalesParaGastos();

  return (
    <CargarGastoPageClient
      mes={mes}
      anio={anio}
      sucursalesCentroCosto={sucursalesCentroCosto}
    />
  );
}
