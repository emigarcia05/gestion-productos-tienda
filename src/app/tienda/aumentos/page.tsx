import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRol } from "@/lib/sesion";
import { getControlAumentos } from "@/actions/tienda";
import TablaAumentos from "@/components/tienda/TablaAumentos";

export const dynamic = "force-dynamic";

export default async function ControlAumentosPage() {
  const rol = await getRol();
  if (rol !== "editor") redirect("/tienda");

  const data = await getControlAumentos();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 space-y-1">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Link href="/tienda"><ArrowLeft className="h-4 w-4" />Volver</Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight">Control de Aumentos</h1>
          <span className="text-xs text-muted-foreground">
            {data.individual.length} producto{data.individual.length !== 1 ? "s" : ""} con código externo vinculado
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
        <TablaAumentos data={data} />
      </div>
    </div>
  );
}
