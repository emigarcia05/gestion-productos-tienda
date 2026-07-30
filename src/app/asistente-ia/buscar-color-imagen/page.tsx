import { redirect } from "next/navigation";
import AsistenteIaBuscarColorImagenPageClient from "@/components/asistente-ia/AsistenteIaBuscarColorImagenPageClient";
import {
  ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN,
  ASISTENTE_IA_SUBMODULO_BUSCAR_COLOR_IMAGEN_LEGACY,
  ASISTENTE_IA_SUBMODULO_DISENAR_COLORES,
  getDefaultConfigBuscarColorImagen,
  getDefaultConfigDisenarColores,
} from "@/lib/asistenteIa";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import {
  getProdIaDisenoPrompPorSubmodulo,
  listarProdIaDisenoPromps,
} from "@/services/prodIaDisenoPromp.service";
import { listarProdIaDisenoCatalogoNombre } from "@/services/prodIaDisenoCatalogos.service";

export const dynamic = "force-dynamic";

export default async function AsistenteIaBuscarColorImagenPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.asistenteIa.acceso)) {
    redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);
  }

  const [
    rowNuevo,
    rowLegacy,
    rowDisenar,
    catalogo,
    superficies,
    estilos,
    combinar,
    objetivos,
  ] = await Promise.all([
    getProdIaDisenoPrompPorSubmodulo(ASISTENTE_IA_SUBMODULO_BUSCAR_CODIGO_IMAGEN),
    getProdIaDisenoPrompPorSubmodulo(
      ASISTENTE_IA_SUBMODULO_BUSCAR_COLOR_IMAGEN_LEGACY,
    ),
    getProdIaDisenoPrompPorSubmodulo(ASISTENTE_IA_SUBMODULO_DISENAR_COLORES),
    listarProdIaDisenoPromps(),
    listarProdIaDisenoCatalogoNombre("sup_pintar"),
    listarProdIaDisenoCatalogoNombre("estilos"),
    listarProdIaDisenoCatalogoNombre("combinar"),
    listarProdIaDisenoCatalogoNombre("objetivo"),
  ]);

  const rowBuscar = rowNuevo ?? rowLegacy;
  const defaultsBuscar = getDefaultConfigBuscarColorImagen();
  const defaultsDisenar = getDefaultConfigDisenarColores();

  const configBuscarCodigo = rowBuscar
    ? {
        submodulo: rowBuscar.submodulo,
        promp: rowBuscar.promp,
        urlRedireccion: rowBuscar.urlRedireccion,
      }
    : defaultsBuscar;

  const configDisenarColores = rowDisenar
    ? {
        submodulo: rowDisenar.submodulo,
        promp: rowDisenar.promp,
        urlRedireccion: rowDisenar.urlRedireccion,
      }
    : defaultsDisenar;

  return (
    <AsistenteIaBuscarColorImagenPageClient
      configBuscarCodigo={configBuscarCodigo}
      configDisenarColores={configDisenarColores}
      catalogoInicial={catalogo}
      catalogosDiseno={{ superficies, estilos, combinar, objetivos }}
      esEditor={rol === "editor"}
    />
  );
}
