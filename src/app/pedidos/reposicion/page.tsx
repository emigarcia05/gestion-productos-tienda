import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getReposicionData, type SucursalReposicion } from "@/actions/reposicion";
import { getEnviarPedidoData } from "@/actions/pedidos";
import ReposicionPageClient from "@/components/pedidos/ReposicionPageClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    sucursal?: string;
    q?: string;
    marca?: string;
    rubro?: string;
    configurado?: string;
    pagina?: string;
    proveedor?: string;
  }>;
}

export default async function PedidoReposicionPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/gestion-productos/proveedores");

  const {
    sucursal,
    q = "",
    marca = "",
    rubro = "",
    configurado = "",
    pagina = "1",
    proveedor = "",
  } = await searchParams;

  const sucursalValida: SucursalReposicion | null =
    sucursal === "guaymallen" || sucursal === "maipu" ? sucursal : null;

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  const [data, { proveedores }] = await Promise.all([
    sucursalValida
      ? getReposicionData(sucursalValida, {
          q,
          marca,
          rubro,
          configurado: configurado === "si" ? "si" : "",
          pagina: paginaNum,
        })
      : Promise.resolve({
          items: [],
          total: 0,
          totalPaginas: 1,
          marcas: [],
          rubros: [],
          subRubros: [],
        }),
    getEnviarPedidoData(),
  ]);

  const paramsPagina: Record<string, string> = {
    sucursal: sucursalValida ?? "",
    q,
    marca,
    rubro,
    configurado: configurado === "si" ? "si" : "",
    proveedor,
  };

  return (
    <ReposicionPageClient
      data={data}
      proveedores={proveedores}
      sucursalValida={sucursalValida}
      q={q}
      marca={marca}
      rubro={rubro}
      configurado={configurado === "si" ? "si" : ""}
      proveedor={proveedor}
      paginaNum={paginaNum}
      paramsPagina={paramsPagina}
    />
  );
}
