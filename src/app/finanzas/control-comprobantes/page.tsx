import { redirect } from "next/navigation";
import TablaControlComprobantes from "@/components/finanzas/TablaControlComprobantes";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarControlComprobantes } from "@/services/controlComprobantes.service";

export const dynamic = "force-dynamic";

export default async function ControlComprobantesPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }
  const esEditor = rol === "editor";
  const raw = await listarControlComprobantes();
  const filas = raw.map((fila) => ({
    id: fila.id,
    fechaComp: fila.fechaComp,
    proveedorNombre: fila.proveedorNombre,
    sucursalNombre: fila.sucursalNombre,
    comprobante: fila.comprobante,
    total: fila.total.toFixed(2),
    montoAplicado: fila.montoAplicado.toFixed(2),
    vencimientoSaldo: fila.vencimientoSaldo.toFixed(2),
    controlado: fila.controlado,
  }));

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <ClassicFilteredTableLayout
        title="Finanzas"
        subtitle="Control Comprobantes"
      >
        <TablaControlComprobantes filas={filas} esEditor={esEditor} />
      </ClassicFilteredTableLayout>
    </div>
  );
}
