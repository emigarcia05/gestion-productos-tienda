import Link from "next/link";
import SectionHeader from "@/components/SectionHeader";
import SincronizarComprobantesProveedorDuxButton from "@/components/finanzas/SincronizarComprobantesProveedorDuxButton";
import { Button } from "@/components/ui/button";
import { getRol } from "@/lib/sesion";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const rol = await getRol();
  const esEditor = rol === "editor";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SectionHeader
        titulo="Finanzas"
        subtitulo="Resumen"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" className={cn("h-10 px-4")} asChild>
              <Link href="/finanzas/deuda-proveedores">Deuda Proveedores</Link>
            </Button>
            <Button type="button" variant="secondary" className={cn("h-10 px-4")} asChild>
              <Link href="/finanzas/venc-por-fecha">Venc. por fecha</Link>
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-4">
          {esEditor ? <SincronizarComprobantesProveedorDuxButton /> : null}
          <p className="text-sm text-muted-foreground">
            Deuda Proveedores resume saldos por proveedor y columnas por ventana de vencimiento. Venc. por fecha
            muestra un calendario mensual con los vencimientos por día. Acceso desde la cabecera o slidenav
            (FINANZAS).
          </p>
        </div>
      </div>
    </div>
  );
}
