import { redirect } from "next/navigation";
import FinanzasDeudaProveedoresPageClient from "@/components/finanzas/FinanzasDeudaProveedoresPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  listarDeudaProveedores,
  listarDetalleDeudaProveedoresMercaderia,
} from "@/services/deudaProveedores.service";

export const dynamic = "force-dynamic";

export default async function DeudaProveedoresPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const raw = await listarDeudaProveedores();
  const { detalleLineas } = await listarDetalleDeudaProveedoresMercaderia();
  const filas = raw.map((r) => ({
    idProveedorDux: r.idProveedorDux,
    nombre: r.nombre,
    deudaTotal: r.deudaTotal.toFixed(2),
    vencida: r.vencida.toFixed(2),
    dias5: r.dias5.toFixed(2),
    dias30: r.dias30.toFixed(2),
    dias45: r.dias45.toFixed(2),
    dias60: r.dias60.toFixed(2),
  }));

  return (
    <FinanzasDeudaProveedoresPageClient
      filas={filas}
      detalleLineas={detalleLineas}
    />
  );
}
