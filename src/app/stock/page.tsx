import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getControlStock, type Sucursal } from "@/actions/stock";
import SectionHeader from "@/components/SectionHeader";
import TablaStock from "@/components/stock/TablaStock";
import StockPageSyncGate from "@/components/stock/StockPageSyncGate";

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
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader titulo="Control Stock" />
      <StockPageSyncGate>
        <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-3 pt-3">
          <TablaStock
            data={data}
            sucursalActual={sucursalValida}
            qActual={q}
            marcaActual={marca}
            rubroActual={rubro}
            subRubroActual={subRubro}
          />
        </div>
      </StockPageSyncGate>
    </div>
  );
}
