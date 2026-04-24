import { getEnviarPedidoData, getEnviarPedidoTablaData } from "@/actions/pedidos";
import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosEnviarPedido from "@/components/pedidos/FiltrosEnviarPedido";
import GenerarPedidoToolbarButton from "@/components/pedidos/GenerarPedidoToolbarButton";
import {
  parseTiposParam,
  type SucursalPedido,
  type TipoPedido,
} from "@/lib/pedidos";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MENSAJE_SIN_ITEMS_GLOBAL = "No hay ítems con cantidad a pedir.";
const MENSAJE_SIN_ITEMS_FILTRADO =
  "No hay ítems para generar el pedido con los filtros seleccionados.";

interface Props {
  searchParams: Promise<{
    sucursal?: string;
    proveedor?: string;
    tipo?: string;
    q?: string;
  }>;
}

export default async function EnviarPedidoPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/gestion-productos/proveedores");

  const { sucursal = "", proveedor = "", tipo = "", q = "" } = await searchParams;
  const sucursalesPedido = await prisma.sucursal.findMany({
    where: { pedido: true, codigo: { in: ["guaymallen", "maipu"] } },
    select: { codigo: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  const sucursalesDisponibles = sucursalesPedido.map((s) => ({
    value: s.codigo as SucursalPedido,
    label: s.nombre.toUpperCase(),
  }));
  const codigosHabilitados = new Set(sucursalesPedido.map((s) => s.codigo));
  const sucursalValida: SucursalPedido | "" =
    (sucursal === "maipu" || sucursal === "guaymallen") && codigosHabilitados.has(sucursal)
      ? (sucursal as SucursalPedido)
      : "";
  const tiposValidos: TipoPedido[] = parseTiposParam(tipo);
  const qNorm = q.trim();

  const hayFiltroActivo =
    !!sucursalValida || !!proveedor.trim() || tiposValidos.length > 0 || !!qNorm;

  const [datosIniciales, tablaData] = await Promise.all([
    getEnviarPedidoData(),
    getEnviarPedidoTablaData({
      sucursal: sucursalValida,
      proveedor,
      tipos: tiposValidos,
      q: qNorm,
    }),
  ]);

  const { proveedores } = datosIniciales;
  const { items: itemsTabla } = tablaData;

  const filters = (
    <FiltrosEnviarPedido
      sucursal={sucursalValida}
      proveedor={proveedor}
      tipos={tiposValidos}
      proveedores={proveedores}
      sucursales={sucursalesDisponibles}
      q={qNorm}
    />
  );

  const actions = (
    <GenerarPedidoToolbarButton
      proveedores={proveedores}
      defaultSucursal={sucursalValida}
      defaultProveedor={proveedor}
      defaultTipos={tiposValidos}
      modulo="enviar"
    />
  );

  return (
    <ClassicFilteredTableLayout
      title="Pedido Mercadería"
      subtitle="Generar Pedido"
      actions={actions}
      filters={filters}
    >
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <Card className="min-h-0 flex flex-col rounded-xl border-border bg-card overflow-hidden gap-0 py-0 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <CardContent className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
            <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
              <Table variant="compact" scrollX={false}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[12%]">TIPO PEDIDO</TableHead>
                    <TableHead className="w-[12%]">SUCURSAL</TableHead>
                    <TableHead className="w-[18%] min-w-0">PROVEEDOR</TableHead>
                    <TableHead className="w-[48%] min-w-0">DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[10%]">CANT. PEDIR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsTabla.length === 0 ? (
                    <EmptyTableRow
                      colSpan={5}
                      message={
                        hayFiltroActivo ? MENSAJE_SIN_ITEMS_FILTRADO : MENSAJE_SIN_ITEMS_GLOBAL
                      }
                    />
                  ) : (
                    itemsTabla.map((item, idx) => (
                      <TableRow
                        key={idx}
                        className={cn("hover:bg-transparent", idx % 2 === 1 && "bg-muted/30")}
                      >
                        <TableCell className="celda-datos w-[12%] text-center">
                          {item.tipoPedido || ""}
                        </TableCell>
                        <TableCell className="celda-datos w-[12%] text-center">
                          {(item.sucursal || "").toUpperCase()}
                        </TableCell>
                        <TableCell className="celda-datos w-[18%] min-w-0 text-center text-xs">
                          <span className="line-clamp-2" title={item.proveedor || undefined}>
                            {item.proveedor || ""}
                          </span>
                        </TableCell>
                        <TableCell className="celda-datos w-[48%] min-w-0 text-foreground">
                          {item.descripcion || ""}
                        </TableCell>
                        <TableCell className="celda-datos celda-numero text-right w-[10%]">
                          {item.cantPedir.toLocaleString("es-AR")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClassicFilteredTableLayout>
  );
}
