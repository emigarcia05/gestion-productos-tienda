import { redirect } from "next/navigation";
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
    pagina?: string;
  }>;
}

export default async function PxListasPreciosPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const sp = await searchParams;
  const {
    q = "",
    rubro = "",
    marca = "",
    subRubro = "",
    pagina = "1",
  } = sp;

  const {
    items,
    total,
    totalPaginas,
    listas,
    marcas,
    rubros,
    subRubros,
  } = await getPxListasPreciosPageData({
    q,
    rubro,
    marca,
    subRubro,
    pagina,
  });

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  return (
    <PxListasPreciosPageClient
      items={items}
      total={total}
      totalPaginas={totalPaginas}
      listas={listas}
      marcas={marcas}
      rubros={rubros}
      subRubros={subRubros}
      rol={rol}
      q={q}
      rubro={rubro}
      marca={marca}
      subRubro={subRubro}
      paginaNum={paginaNum}
    />
  );
}
