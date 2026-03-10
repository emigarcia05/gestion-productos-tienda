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
    subRubro?: string;
    soloNegativo?: string;
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
    subRubro = "",
    soloNegativo = "",
  } = await searchParams;

  const sucursalValida: Sucursal | null =
    sucursal === "guaymallen" || sucursal === "maipu" ? sucursal : null;

  const soloNegativoBool = soloNegativo === "true";

  const data = sucursalValida
    ? await getControlStock(sucursalValida, {
        q,
        marca,
        rubro,
        subRubro,
        soloNegativo: soloNegativoBool,
      })
    : { items: [], marcas: [], rubros: [], subRubros: [] };

  return (
    <StockPageWithActions
      data={data}
      sucursalValida={sucursalValida}
      q={q}
      marca={marca}
      rubro={rubro}
      subRubro={subRubro}
      soloNegativo={soloNegativoBool}
    />
  );
}

