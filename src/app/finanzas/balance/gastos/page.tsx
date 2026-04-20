import { redirect } from "next/navigation";
import FinanzasBalanceGastosPageClient from "@/components/finanzas/FinanzasBalanceGastosPageClient";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  listarMovimientosFinanzas,
  listarSucursalesParaGastos,
} from "@/services/movimientosFinanzas.service";

export const dynamic = "force-dynamic";

export default async function BalanceGastosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }
  const esEditor = rol === "editor";

  const [items, sucursales] = await Promise.all([
    listarMovimientosFinanzas(),
    listarSucursalesParaGastos(),
  ]);

  const filas = items.map((m) => ({
    id: m.id,
    tipoGasto: m.tipoGasto,
    nombre: m.nombre,
    monto: m.monto,
  }));

  return (
    <FinanzasBalanceGastosPageClient
      filas={filas}
      sucursales={sucursales}
      esEditor={esEditor}
    />
  );
}
