import { redirect } from "next/navigation";
import { getPxListasPageData } from "@/actions/pxListas";
import { esOrdenMarcacionPxListas } from "@/lib/pxListasFiltros";
import type { OrdenMarcacionPxListas } from "@/lib/pxListasFiltros";
import PxListasPageClient from "@/components/px-listas/PxListasPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    q?: string;
    rubro?: string;
    marca?: string;
    detPrecio?: string;
    ordenMarcacion?: string;
    pagina?: string;
  }>;
}

export default async function PxListasPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const sp = await searchParams;
  const {
    q = "",
    rubro = "",
    marca = "",
    detPrecio = "",
    ordenMarcacion: ordenMarcacionRaw = "",
    pagina = "1",
  } = sp;

  const ordenMarcacion: OrdenMarcacionPxListas = esOrdenMarcacionPxListas(ordenMarcacionRaw)
    ? ordenMarcacionRaw
    : "";

  const { items, total, totalPaginas, marcas, rubros, competidores, competencias } =
    await getPxListasPageData({
      q,
      rubro,
      marca,
      detPrecio,
      ordenMarcacion,
      pagina,
    });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  return (
    <PxListasPageClient
      items={items}
      total={total}
      totalPaginas={totalPaginas}
      marcas={marcas}
      rubros={rubros}
      competidores={competidores}
      competencias={competencias}
      rol={rol}
      q={q}
      rubro={rubro}
      marca={marca}
      detPrecio={detPrecio}
      ordenMarcacion={ordenMarcacion}
      paginaNum={paginaNum}
    />
  );
}
