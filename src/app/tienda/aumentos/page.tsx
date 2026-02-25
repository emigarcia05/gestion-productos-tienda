import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendingUp, Link2 } from "lucide-react";
import { getRol } from "@/lib/sesion";
import { getControlAumentos } from "@/actions/tienda";
import SectionHeader from "@/components/SectionHeader";
import TablaAumentos from "@/components/tienda/TablaAumentos";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ControlAumentosPage() {
  const rol = await getRol();
  if (rol !== "editor") redirect("/tienda");

  const data = await getControlAumentos();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader
        titulo="Control de Aumentos"
        descripcion="Gestioná aumentos de precios de productos vinculados a tienda."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-slate-200" asChild>
              <Link href="/tienda" className="gap-2">
                <Link2 className="h-4 w-4 shrink-0" />
                Productos Relacionados
              </Link>
            </Button>
            <Button size="sm" className="pointer-events-none">
              <TrendingUp className="h-4 w-4 shrink-0" />
              Control de Aumentos
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-4">
        <TablaAumentos data={data} />
      </div>
    </div>
  );
}
