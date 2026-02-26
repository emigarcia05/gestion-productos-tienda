import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { getControlAumentos } from "@/actions/tienda";
import SectionHeader from "@/components/SectionHeader";
import TablaAumentos from "@/components/tienda/TablaAumentos";

export const dynamic = "force-dynamic";

export default async function ControlAumentosPage() {
  const rol = await getRol();
  if (rol !== "editor") redirect("/tienda");

  const data = await getControlAumentos();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader titulo="Lista Tienda" subtitulo="Control aumentos" />

      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-4">
        <TablaAumentos data={data} />
      </div>
    </div>
  );
}
