import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getControlStock, type Sucursal } from "@/actions/stock";
import StockPageWithActions from "@/components/stock/StockPageWithActions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    sucursal?: string;
    q?: string;
    marca?: string;
    rubro?: string;
    soloNegativo?: string;
    orden?: string;
    pagina?: string;
  }>;
}

export default async function StockPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) redirect("/proveedores");

  const {
    sucursal,
    q = "",
    marca = "",
    rubro = "",
    soloNegativo = "",
    orden = "tiempoSinControl",
    pagina = "1",
  } = await searchParams;

  const sucursalValida: Sucursal | null =
    sucursal === "guaymallen" || sucursal === "maipu" ? sucursal : null;

  const soloNegativoBool = soloNegativo === "true";

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const data = sucursalValida
    ? await getControlStock(sucursalValida, {
        q,
        marca,
        rubro,
        soloNegativo: soloNegativoBool,
        orden,
        pagina: paginaNum,
      })
    : { items: [], total: 0, totalPaginas: 0, marcas: [], rubros: [] };

  return (
    <StockPageWithActions
      data={data}
      sucursalValida={sucursalValida}
      q={q}
      marca={marca}
      rubro={rubro}
      soloNegativo={soloNegativoBool}
      orden={orden}
      paginaNum={paginaNum}
      paramsPagina={{ sucursal: sucursalValida ?? "", q, marca, rubro, soloNegativo, orden }}
    />
  );
}

