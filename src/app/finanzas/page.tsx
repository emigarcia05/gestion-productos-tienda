import SectionHeader from "@/components/SectionHeader";
import SincronizarComprobantesProveedorDuxButton from "@/components/finanzas/SincronizarComprobantesProveedorDuxButton";
import { getRol } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const rol = await getRol();
  const esEditor = rol === "editor";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SectionHeader titulo="Finanzas" subtitulo="A construir" />
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-4">
          {esEditor ? <SincronizarComprobantesProveedorDuxButton /> : null}
          <p className="text-sm text-muted-foreground">
            Esta área está en desarrollo. Pronto vas a poder gestionar información financiera desde aquí.
          </p>
        </div>
      </div>
    </div>
  );
}
