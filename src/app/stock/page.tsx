import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getControlStock, type Sucursal } from "@/actions/stock";
import StockPageWithActions from "@/components/stock/StockPageWithActions";
import { getProveedoresMercaderia } from "@/actions/proveedores";

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
  if (!puede(rol, PERMISOS.stock.acceso)) redirect(GP_ROUTES.analisisPrecios.listaProveedores.listaPrecios);
  const esEditor = rol === "editor";

  const {
    sucursal,
    q = "",
    marca = "",
    rubro = "",
    soloNegativo = "",
    orden = "",
    pagina = "1",
  } = await searchParams;

  const ordenNormalizado =
    orden === "tiempoSinControl" ? "segunTiempoControl" : orden;

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
        orden: ordenNormalizado,
        pagina: paginaNum,
      })
    : { items: [], total: 0, totalPaginas: 0, marcas: [], rubros: [] };
  const proveedores = esEditor ? await getProveedoresMercaderia() : [];

  return (
    <StockPageWithActions
      data={data}
      esEditor={esEditor}
      proveedores={proveedores}
      sucursalValida={sucursalValida}
      q={q}
      marca={marca}
      rubro={rubro}
      soloNegativo={soloNegativoBool}
      orden={ordenNormalizado}
      paginaNum={paginaNum}
      paramsPagina={{ sucursal: sucursalValida ?? "", q, marca, rubro, soloNegativo, orden: ordenNormalizado }}
    />
  );
}

