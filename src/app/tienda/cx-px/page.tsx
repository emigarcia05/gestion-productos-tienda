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
    marca?: string;
    vincCosto?: string;
    costoProv?: string;
    pagina?: string;
  }>;
}

export default async function CxPxTiendaPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const sp = await searchParams;
  const {
    q = "",
    rubro = "",
    marca = "",
    vincCosto = "",
    costoProv = "",
    pagina = "1",
  } = sp;

  const { items, total, totalPaginas, marcas, rubros, proveedores } =
    await getCxPxTiendaPageData({
      q,
      rubro,
      marca,
      vincCosto,
      costoProv,
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
      rol={rol}
      q={q}
      rubro={rubro}
      marca={marca}
      vincCosto={vincCosto}
      costoProv={costoProv}
      proveedores={proveedores}
      paginaNum={paginaNum}
    />
  );
}
