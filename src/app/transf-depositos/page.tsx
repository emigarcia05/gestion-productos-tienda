import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getControlStock, type Sucursal } from "@/actions/stock";
import TransfDepositosPageClient from "@/components/stock/TransfDepositosPageClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    sucursal?: string;
    origen?: string;
    destino?: string;
    q?: string;
    marca?: string;
    rubro?: string;
    pagina?: string;
  }>;
}

function parseSucursal(raw: string | undefined): Sucursal | null {
  return raw === "guaymallen" || raw === "maipu" ? raw : null;
}

export default async function TransfDepositosPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const {
    sucursal,
    origen,
    destino,
    q = "",
    marca = "",
    rubro = "",
    pagina = "1",
  } = await searchParams;

  const sucursalValida = parseSucursal(sucursal);
  const origenValido = parseSucursal(origen);
  const destinoValido = parseSucursal(destino);
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  const data = sucursalValida
    ? await getControlStock(sucursalValida, {
        q,
        marca,
        rubro,
        pagina: paginaNum,
      })
    : { items: [], total: 0, totalPaginas: 0, marcas: [], rubros: [] };

  return (
    <TransfDepositosPageClient
      data={data}
      sucursalValida={sucursalValida}
      origen={origenValido}
      destino={destinoValido}
      q={q}
      marca={marca}
      rubro={rubro}
    />
  );
}
