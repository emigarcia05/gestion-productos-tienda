import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { getTiendaPageData } from "@/actions/tienda";
import CompProveedoresPageClient from "@/components/tienda/CompProveedoresPageClient";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    q?: string;
    rubro?: string;
    cxCompra?: string;
    marca?: string;
    proveedor?: string;
    vinculado?: string;
    pagina?: string;
  }>;
}

export default async function TiendaPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);

  const sp = await searchParams;
  const {
    q = "",
    rubro = "",
    cxCompra = "",
    marca = "",
    proveedor = "",
    pagina = "1",
  } = sp;
  const vRaw = sp.vinculado ?? "";
  const vLower = vRaw.toLowerCase();
  const vinculado = vLower === "no" || vLower === "si" ? vLower : "";

  const { items, total, totalPaginas, proveedores, proveedoresCxCompra, marcas, rubros } =
    await getTiendaPageData({
      q,
      rubro,
      cxCompra,
      marca,
      proveedor,
      vinculado: vinculado || undefined,
      pagina,
    });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  return (
    <CompProveedoresPageClient
      items={items}
      total={total}
      totalPaginas={totalPaginas}
      proveedores={proveedores}
      marcas={marcas}
      rubros={rubros}
      proveedoresCxCompra={proveedoresCxCompra}
      rol={rol}
      q={q}
      rubro={rubro}
      cxCompra={cxCompra}
      marca={marca}
      proveedor={proveedor}
      vinculado={vinculado}
      paginaNum={paginaNum}
    />
  );
}
