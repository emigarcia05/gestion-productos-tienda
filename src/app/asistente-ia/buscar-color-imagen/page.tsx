import { redirect } from "next/navigation";
import AsistenteIaBuscarColorImagenPageClient from "@/components/asistente-ia/AsistenteIaBuscarColorImagenPageClient";
import {
  ASISTENTE_IA_SUBMODULO_BUSCAR_COLOR_IMAGEN,
  getDefaultConfigBuscarColorImagen,
} from "@/lib/asistenteIa";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  getProdIaDisenoPrompPorSubmodulo,
  listarProdIaDisenoPromps,
} from "@/services/prodIaDisenoPromp.service";

export const dynamic = "force-dynamic";

export default async function AsistenteIaBuscarColorImagenPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.asistenteIa.acceso)) {
    redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);
  }

  const [row, catalogo] = await Promise.all([
    getProdIaDisenoPrompPorSubmodulo(ASISTENTE_IA_SUBMODULO_BUSCAR_COLOR_IMAGEN),
    listarProdIaDisenoPromps(),
  ]);

  const defaults = getDefaultConfigBuscarColorImagen();
  const config = row
    ? {
        submodulo: row.submodulo,
        promp: row.promp,
        urlRedireccion: row.urlRedireccion,
      }
    : defaults;

  return (
    <AsistenteIaBuscarColorImagenPageClient
      config={config}
      catalogoInicial={catalogo}
      esEditor={rol === "editor"}
    />
  );
}
