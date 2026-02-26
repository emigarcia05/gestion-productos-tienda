import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getControlStock, type Sucursal } from "@/actions/stock";
import StockPageWithActions from "@/components/stock/StockPageWithActions";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ sucursal?: string; q?: string; marca?: string; rubro?: string; subRubro?: string }>;
}

export default async function StockPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) redirect("/proveedores");

  const { sucursal = "guaymallen", q = "", marca = "", rubro = "", subRubro = "" } = await searchParams;
  const sucursalValida: Sucursal = sucursal === "maipu" ? "maipu" : "guaymallen";

  const data = await getControlStock(sucursalValida);

  return (
    <StockPageWithActions
      data={data}
      sucursalValida={sucursalValida}
      q={q}
      marca={marca}
      rubro={rubro}
      subRubro={subRubro}
    />
  );
}
