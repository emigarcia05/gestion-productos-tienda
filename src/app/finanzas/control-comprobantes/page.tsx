import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import ControlComprobantesPageClient from "@/components/finanzas/ControlComprobantesPageClient";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { listarControlComprobantes } from "@/services/controlComprobantes.service";
import { listarProveedoresMercaderiaPlazosPagos } from "@/services/proveedor.service";

export const dynamic = "force-dynamic";

export default async function ControlComprobantesPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);
  }
  const esEditor = rol === "editor";
  const [raw, proveedoresMercaderia] = await Promise.all([
    listarControlComprobantes(),
    listarProveedoresMercaderiaPlazosPagos(),
  ]);
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
    plazoPagoDias: fila.plazoPagoDias,
    plazoEfectivoDias: Number(fila.plazoEfectivoDias),
    plazoProveedorDefault: Number(fila.plazoProveedorDefault),
    fechaVenc: fila.fechaVenc,
  }));

  return (
    <ControlComprobantesPageClient
      filas={filas}
      proveedoresMercaderia={proveedoresMercaderia}
      esEditor={esEditor}
    />
  );
}
