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
          <Button type="button" variant="secondary" className={cn("h-10 px-4")} asChild>
            <Link href="/finanzas/deuda-proveedores">Deuda Proveedores</Link>
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-4">
          {esEditor ? <SincronizarComprobantesProveedorDuxButton /> : null}
          <p className="text-sm text-muted-foreground">
            El módulo Deuda Proveedores lista el saldo pendiente por proveedor según comprobantes sincronizados
            desde DUX. Acceso desde la cabecera, o slidenav: FINANZAS → Deuda Proveedores.
          </p>
        </div>
      </div>
    </div>
  );
}
