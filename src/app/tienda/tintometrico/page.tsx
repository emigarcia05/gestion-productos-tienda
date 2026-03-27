import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getProveedoresTintoLts } from "@/actions/tienda";
import TiendaCalcTintometricoPageClient from "@/components/tienda/TiendaCalcTintometricoPageClient";

export const dynamic = "force-dynamic";

export default async function TiendaCalcTintometricoPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.tintoLts)) redirect("/stock");

  const proveedores = await getProveedoresTintoLts();
  const esEditor = rol === "editor";

  return <TiendaCalcTintometricoPageClient proveedores={proveedores} esEditor={esEditor} />;
}
