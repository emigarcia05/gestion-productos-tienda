import { redirect } from "next/navigation";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarFinBalGastosJerarquia } from "@/services/finBalGastosCatalogo.service";
import { getProveedores } from "@/services/proveedor.service";
import FinBalGastosCatalogoPageClient from "@/components/finanzas/FinBalGastosCatalogoPageClient";

export const dynamic = "force-dynamic";

export default async function FinBalGastosCatalogoPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const esEditor = rol === "editor";
  const [jerarquia, proveedoresRaw] = await Promise.all([
    listarFinBalGastosJerarquia(),
    getProveedores(),
  ]);

  // Payload mínimo para el Select de proveedor en el modal de gasto.
  const proveedores = proveedoresRaw.map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <FinBalGastosCatalogoPageClient
      jerarquia={jerarquia}
      proveedores={proveedores}
      esEditor={esEditor}
    />
  );
}
