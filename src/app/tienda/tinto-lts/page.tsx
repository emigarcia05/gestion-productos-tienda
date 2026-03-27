import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getProveedoresTintoLts } from "@/actions/tienda";
import { getTiposPinturaRendimientosAction } from "@/actions/tiposPinturaRendimientos";
import PxTintoCalculoLtsPageClient from "@/components/tienda/PxTintoCalculoLtsPageClient";

export const dynamic = "force-dynamic";

export default async function PxTintoCalculoLtsPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.tintoLts)) redirect("/stock");

  const [proveedores, tiposPintura] = await Promise.all([
    getProveedoresTintoLts(),
    getTiposPinturaRendimientosAction(),
  ]);
  const esEditor = rol === "editor";

  return (
    <PxTintoCalculoLtsPageClient
      proveedores={proveedores}
      tiposPintura={tiposPintura}
      esEditor={esEditor}
    />
  );
}
