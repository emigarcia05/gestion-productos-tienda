import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getReposicionData, type SucursalReposicion } from "@/actions/reposicion";
import ReposicionPageClient from "@/components/pedidos/ReposicionPageClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    sucursal?: string;
    q?: string;
    marca?: string;
    rubro?: string;
    subRubro?: string;
    pagina?: string;
  }>;
}

export default async function PedidoReposicionPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");

  const {
    sucursal,
    q = "",
    marca = "",
    rubro = "",
    subRubro = "",
    pagina = "1",
  } = await searchParams;

  const sucursalValida: SucursalReposicion | null =
    sucursal === "guaymallen" || sucursal === "maipu" ? sucursal : null;

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  const data = sucursalValida
    ? await getReposicionData(sucursalValida, {
        q,
        marca,
        rubro,
        subRubro,
        pagina: paginaNum,
      })
    : {
        items: [],
        total: 0,
        totalPaginas: 1,
        marcas: [],
        rubros: [],
        subRubros: [],
      };

  const paramsPagina: Record<string, string> = {
    sucursal: sucursalValida ?? "",
    q,
    marca,
    rubro,
    subRubro,
  };

  return (
    <ReposicionPageClient
      data={data}
      sucursalValida={sucursalValida}
      q={q}
      marca={marca}
      rubro={rubro}
      subRubro={subRubro}
      paginaNum={paginaNum}
      paramsPagina={paramsPagina}
    />
  );
}
