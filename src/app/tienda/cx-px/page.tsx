import { redirect } from "next/navigation";
import { getCxPxTiendaPageData } from "@/actions/cxPxTienda";
import CxPxTiendaPageClient from "@/components/cx-px-tienda/CxPxTiendaPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    q?: string;
    marca?: string;
    vincCosto?: string;
    costoProv?: string;
    pxLista?: string;
    marcacionOrden?: string;
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
    marca = "",
    vincCosto = "",
    costoProv = "",
    pxLista = "",
    marcacionOrden = "",
    pagina = "1",
  } = sp;

  const { items, total, totalPaginas, marcas, proveedores, competencias } =
    await getCxPxTiendaPageData({
      q,
      marca,
      vincCosto,
      costoProv,
      pxLista,
      marcacionOrden,
      pagina,
    });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  return (
    <CxPxTiendaPageClient
      items={items}
      total={total}
      totalPaginas={totalPaginas}
      marcas={marcas}
      rol={rol}
      q={q}
      marca={marca}
      vincCosto={vincCosto}
      costoProv={costoProv}
      pxLista={pxLista}
      marcacionOrden={marcacionOrden}
      proveedores={proveedores}
      competencias={competencias}
      paginaNum={paginaNum}
    />
  );
}
