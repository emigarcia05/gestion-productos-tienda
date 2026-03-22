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

export const dynamic = "force-dynamic";

const MENSAJE_SIN_FILTROS =
  "Cargá los 3 filtros (Sucursal, Proveedor y Tipo de pedido) para ver la tabla.";
const MENSAJE_SIN_ITEMS = "No hay ítems para generar el pedido con los filtros seleccionados.";

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
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");

  const { sucursal = "", proveedor = "", tipo = "", q = "" } = await searchParams;
  const sucursalValida: SucursalPedido | "" =
    sucursal === "maipu" ? "maipu" : sucursal === "guaymallen" ? "guaymallen" : "";
  const tiposValidos: TipoPedido[] = parseTiposParam(tipo);
  const qNorm = q.trim();

  const tienenLosTresFiltros =
    !!sucursalValida && !!proveedor && tiposValidos.length > 0;

  const [datosIniciales, tablaData] = await Promise.all([
    getEnviarPedidoData(),
    tienenLosTresFiltros
      ? getEnviarPedidoTablaData({
          sucursal: sucursalValida,
          proveedor,
          tipos: tiposValidos,
          q: qNorm,
        })
      : Promise.resolve({ items: [] }),
  ]);

  const { proveedores } = datosIniciales;
  const { items: itemsTabla } = tablaData;

  const filters = (
    <FiltrosEnviarPedido
      sucursal={sucursalValida}
      proveedor={proveedor}
      tipos={tiposValidos}
      proveedores={proveedores}
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
      triggerLabel="Generar Pedido"
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
                    <TableHead className="w-28">CANT. PEDIR</TableHead>
                    <TableHead className="min-w-0">DESCRIPCIÓN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!tienenLosTresFiltros ? (
                    <EmptyTableRow colSpan={2} message={MENSAJE_SIN_FILTROS} />
                  ) : itemsTabla.length === 0 ? (
                    <EmptyTableRow colSpan={2} message={MENSAJE_SIN_ITEMS} />
                  ) : (
                    itemsTabla.map((item, idx) => (
                      <TableRow
                        key={idx}
                        className={cn("hover:bg-transparent", idx % 2 === 1 && "bg-muted/30")}
                      >
                        <TableCell className="celda-datos celda-numero text-right w-28">
                          {item.cantPedir.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="celda-datos min-w-0 text-foreground">
                          {item.descripcion || ""}
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
