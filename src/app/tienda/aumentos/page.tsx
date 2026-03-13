import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { puede, PERMISOS } from "@/lib/permisos";
import { getControlAumentos } from "@/actions/tienda";
import AumentosPageWithActions from "@/components/tienda/AumentosPageWithActions";

export const dynamic = "force-dynamic";

export default async function ControlAumentosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.controlAumentos)) redirect("/stock");

  const data = await getControlAumentos();

  return <AumentosPageWithActions data={data} />;
}
