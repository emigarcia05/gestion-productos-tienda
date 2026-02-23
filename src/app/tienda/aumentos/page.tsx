import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
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
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Link href="/tienda"><ArrowLeft className="h-4 w-4" />Volver</Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight">Lista TiendaColor</h1>
          <span className="text-xs text-muted-foreground">
            {data.individual.length} producto{data.individual.length !== 1 ? "s" : ""} con código externo vinculado
          </span>
        </div>

        {/* Sub-navegación */}
        <div className="flex gap-1 border-b border-border/50">
          <Link
            href="/tienda"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors -mb-px"
          >
            Productos Relacionados
          </Link>
          <span className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-accent2 text-accent2 -mb-px">
            <TrendingUp className="h-3.5 w-3.5" />
            Control de Aumentos
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-4">
        <TablaAumentos data={data} />
      </div>
    </div>
  );
}
