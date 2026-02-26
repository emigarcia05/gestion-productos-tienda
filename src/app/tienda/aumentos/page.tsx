import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { getControlAumentos } from "@/actions/tienda";
import AumentosPageWithActions from "@/components/tienda/AumentosPageWithActions";

export const dynamic = "force-dynamic";

export default async function ControlAumentosPage() {
  const rol = await getRol();
  if (rol !== "editor") redirect("/tienda");

  const data = await getControlAumentos();

  return <AumentosPageWithActions data={data} />;
}
