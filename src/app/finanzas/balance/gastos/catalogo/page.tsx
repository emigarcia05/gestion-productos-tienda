import { redirect } from "next/navigation";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarFinBalGastosJerarquia } from "@/services/finBalGastosCatalogo.service";
import { listarSucursalesParaGastos } from "@/services/movimientosFinanzas.service";
import { getProveedoresNoMercaderia } from "@/services/proveedor.service";
import FinBalGastosCatalogoPageClient from "@/components/finanzas/FinBalGastosCatalogoPageClient";

export const dynamic = "force-dynamic";

export default async function FinBalGastosCatalogoPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const esEditor = rol === "editor";
  const [jerarquia, proveedores, sucursales] = await Promise.all([
    listarFinBalGastosJerarquia(),
    getProveedoresNoMercaderia(),
    listarSucursalesParaGastos(),
  ]);

  return (
    <FinBalGastosCatalogoPageClient
      jerarquia={jerarquia}
      proveedores={proveedores}
      sucursales={sucursales}
      esEditor={esEditor}
    />
  );
}
