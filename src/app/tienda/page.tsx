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
    mejorPrecio?: string;
    pagina?: string;
  }>;
}

export default async function TiendaPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) redirect("/gestion-productos/tienda/control-stock");

  const {
    q = "",
    rubro = "",
    subRubro = "",
    marca = "",
    proveedor = "",
    mejorPrecio = "",
    pagina = "1",
  } = await searchParams;

  const { items, total, totalPaginas, proveedores, marcas, rubros, subRubros } =
    await getTiendaPageData({
      q,
      rubro,
      subRubro,
      marca,
      proveedor,
      mejorPrecio,
      pagina,
    });
  const hasFiltros = !!(q || rubro || subRubro || marca || proveedor || mejorPrecio);
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
      mejorPrecio={mejorPrecio}
      paginaNum={paginaNum}
    />
  );
}
