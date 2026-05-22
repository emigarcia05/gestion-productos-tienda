import { redirect } from "next/navigation";
import { getCxPxTiendaPageData } from "@/actions/cxPxTienda";
import CxPxTiendaPageClient from "@/components/cx-px-tienda/CxPxTiendaPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    q?: string;
    rubro?: string;
    subRubro?: string;
    marca?: string;
    pagina?: string;
  }>;
}

export default async function CxPxTiendaPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const sp = await searchParams;
  const { q = "", rubro = "", subRubro = "", marca = "", pagina = "1" } = sp;

  const { items, total, totalPaginas, marcas, rubros, subRubros } = await getCxPxTiendaPageData({
    q,
    rubro,
    subRubro,
    marca,
    pagina,
  });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  return (
    <CxPxTiendaPageClient
      items={items}
      total={total}
      totalPaginas={totalPaginas}
      marcas={marcas}
      rubros={rubros}
      subRubros={subRubros}
      q={q}
      rubro={rubro}
      subRubro={subRubro}
      marca={marca}
      paginaNum={paginaNum}
    />
  );
}
