import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { getPxListasPreciosPageData } from "@/actions/pxListasPrecios";
import PxListasPreciosPageClient from "@/components/px-listas-precios/PxListasPreciosPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    q?: string;
    rubro?: string;
    marca?: string;
    subRubro?: string;
    actualizar?: string;
    pagina?: string;
  }>;
}

export default async function PxListasPreciosPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);
  }

  const sp = await searchParams;
  const {
    q = "",
    rubro = "",
    marca = "",
    subRubro = "",
    actualizar = "",
    pagina = "1",
  } = sp;

  const {
    items,
    total,
    totalPaginas,
    listas,
    categoriasMc,
    idListaGeneral,
    marcas,
    rubros,
    subRubros,
  } = await getPxListasPreciosPageData({
    q,
    rubro,
    marca,
    subRubro,
    actualizar,
    pagina,
  });

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  return (
    <PxListasPreciosPageClient
      items={items}
      total={total}
      totalPaginas={totalPaginas}
      listas={listas}
      categoriasMc={categoriasMc}
      idListaGeneral={idListaGeneral}
      marcas={marcas}
      rubros={rubros}
      subRubros={subRubros}
      rol={rol}
      q={q}
      rubro={rubro}
      marca={marca}
      subRubro={subRubro}
      actualizar={actualizar}
      paginaNum={paginaNum}
    />
  );
}
