import { redirect } from "next/navigation";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarFinBalGastosJerarquia } from "@/services/finBalGastosCatalogo.service";
import { getProveedoresNoMercaderia } from "@/services/proveedor.service";
import FinBalGastosCatalogoPageClient from "@/components/finanzas/FinBalGastosCatalogoPageClient";

export const dynamic = "force-dynamic";

export default async function FinBalGastosCatalogoPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const esEditor = rol === "editor";
  const [jerarquia, proveedores] = await Promise.all([
    listarFinBalGastosJerarquia(),
    getProveedoresNoMercaderia(),
  ]);

  return (
    <FinBalGastosCatalogoPageClient
      jerarquia={jerarquia}
      proveedores={proveedores}
      esEditor={esEditor}
    />
  );
}
