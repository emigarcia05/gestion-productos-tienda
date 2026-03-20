import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { redirect } from "next/navigation";
import * as pedidosHistoriaService from "@/services/pedidosHistoria.service";
import HistorialPedidosPageClient from "@/components/pedidos/HistorialPedidosPageClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    pagina?: string;
  }>;
}

export default async function HistorialPedidosPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");

  const { pagina = "1" } = await searchParams;
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  const res = await pedidosHistoriaService.listarPedidosHistoria({
    pagina: paginaNum,
  });

  if (!res.success) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <HistorialPedidosPageClient items={[]} total={0} totalPaginas={1} paginaNum={paginaNum} />
      </div>
    );
  }

  const items = res.data.items.map((it) => ({
    ...it,
    generadoAt: it.generadoAt.toISOString(),
    registradoAt: it.registradoAt ? it.registradoAt.toISOString() : null,
  }));

  return (
    <HistorialPedidosPageClient
      items={items}
      total={res.data.total}
      totalPaginas={res.data.totalPaginas}
      paginaNum={res.data.paginaActual}
    />
  );
}
