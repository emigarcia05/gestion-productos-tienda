import { redirect } from "next/navigation";
import { getTiendaPageData } from "@/actions/tienda";
import CompProveedoresPageClient from "@/components/tienda/CompProveedoresPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    q?: string;
    rubro?: string;
    subRubro?: string;
    marca?: string;
    proveedor?: string;
    vinculado?: string;
    pagina?: string;
  }>;
}

export default async function TiendaPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) redirect("/gestion-productos/tienda/control-stock");

  const sp = await searchParams;
  const {
    q = "",
    rubro = "",
    subRubro = "",
    marca = "",
    proveedor = "",
    pagina = "1",
  } = sp;
  const vRaw = sp.vinculado ?? "";
  const vLower = vRaw.toLowerCase();
  const vinculado = vLower === "no" || vLower === "si" ? vLower : "";

  const { items, total, totalPaginas, proveedores, marcas, rubros, subRubros } =
    await getTiendaPageData({
      q,
      rubro,
      subRubro,
      marca,
      proveedor,
      vinculado: vinculado || undefined,
      pagina,
    });
  const hasFiltros = !!(q || rubro || subRubro || marca || proveedor || vinculado);
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  return (
    <CompProveedoresPageClient
      items={items}
      total={total}
      totalPaginas={totalPaginas}
      proveedores={proveedores}
      marcas={marcas}
      rubros={rubros}
      subRubros={subRubros}
      rol={rol}
      hasFiltros={hasFiltros}
      q={q}
      rubro={rubro}
      subRubro={subRubro}
      marca={marca}
      proveedor={proveedor}
      vinculado={vinculado}
      paginaNum={paginaNum}
    />
  );
}
