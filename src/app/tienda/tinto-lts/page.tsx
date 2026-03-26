import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getTiendaPageData } from "@/actions/tienda";
import PxTintoCalculoLtsPageClient from "@/components/tienda/PxTintoCalculoLtsPageClient";

export const dynamic = "force-dynamic";

export default async function PxTintoCalculoLtsPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) redirect("/stock");

  const { proveedores } = await getTiendaPageData({});

  return <PxTintoCalculoLtsPageClient proveedores={proveedores} />;
}
