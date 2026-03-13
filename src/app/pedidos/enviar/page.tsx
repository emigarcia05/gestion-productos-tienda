import { getEnviarPedidoData } from "@/actions/pedidos";
import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosEnviarPedido from "@/components/pedidos/FiltrosEnviarPedido";
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

export const dynamic = "force-dynamic";

const COLUMNS = 1;
const MENSAJE_SIN_DATOS = "Seleccioná filtros para cargar datos.";

interface Props {
  searchParams: Promise<{
    sucursal?: string;
    proveedor?: string;
    tipo?: string;
  }>;
}

export default async function EnviarPedidoPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");

  const { sucursal = "", proveedor = "", tipo = "" } = await searchParams;
  const sucursalValida: SucursalPedido | "" =
    sucursal === "maipu" ? "maipu" : sucursal === "guaymallen" ? "guaymallen" : "";
  const tiposValidos: TipoPedido[] = parseTiposParam(tipo);

  const { proveedores } = await getEnviarPedidoData();

  const filters = (
    <FiltrosEnviarPedido
      sucursal={sucursalValida}
      proveedor={proveedor}
      tipos={tiposValidos}
      proveedores={proveedores}
    />
  );

  return (
    <ClassicFilteredTableLayout
      title="Pedido Mercadería"
      subtitle="Enviar Pedido"
      filters={filters}
    >
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <Card className="min-h-0 flex flex-col rounded-xl border-border bg-card overflow-hidden gap-0 py-0 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <CardContent className="flex-1 min-h-0 overflow-x-auto overflow-y-visible p-0">
            <div className="w-full">
              <Table variant="compact" scrollX={false}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>TABLA DE ENVÍO (PRÓXIMAMENTE)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <EmptyTableRow colSpan={COLUMNS} message={MENSAJE_SIN_DATOS} />
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClassicFilteredTableLayout>
  );
}
