import { redirect } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FinanzasTesoreriaPageClient from "@/components/finanzas/FinanzasTesoreriaPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { listarCajasTesoreria } from "@/services/cajasTesoreria.service";
import { formatFechaHoraCompletaArgentina } from "@/lib/fechaArgentina";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FinanzasTesoreriaPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }
  const esEditor = rol === "editor";

  const [items, sucursales] = await Promise.all([
    listarCajasTesoreria(),
    prisma.sucursal.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);
  const filas = items.map((c) => ({
    id: c.id,
    nombreCaja: c.nombreCaja,
    sucursal: c.sucursalNombre,
    tipoCaja: c.tipoCaja,
    monto: c.monto,
    ultActualizacion: formatFechaHoraCompletaArgentina(c.ultActualizacion),
  }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ClassicFilteredTableLayout title="Finanzas" subtitle="Tesorería">
        <FinanzasTesoreriaPageClient
          filas={filas}
          sucursales={sucursales}
          esEditor={esEditor}
        />
      </ClassicFilteredTableLayout>
    </div>
  );
}
