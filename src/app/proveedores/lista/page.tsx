import Link from "next/link";
import { getProveedores } from "@/actions/proveedores";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import CrearProveedorModal from "@/components/proveedores/CrearProveedorModal";

export const dynamic = "force-dynamic";

export default async function ListaProveedoresPage() {
  const [proveedores, rol] = await Promise.all([getProveedores(), getRol()]);
  const p = PERMISOS.proveedores;

  const actions =
    puede(rol, p.acciones.nuevoProveedor) ? (
      <div className="flex gap-2">
        <CrearProveedorModal />
      </div>
    ) : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ClassicFilteredTableLayout title="Proveedores" subtitle="Proveedores" actions={actions}>
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x no-scrollbar flex-1 min-h-0">
            <Table variant="compact" scrollX={false}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-0">Proveedor</TableHead>
                  <TableHead className="w-24">Prefijo</TableHead>
                  <TableHead className="w-28">Cant. Productos</TableHead>
                  <TableHead className="w-36">Cant. Productos Provistos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.map((prov) => (
                  <TableRow key={prov.id}>
                    <TableCell className="celda-datos min-w-0">
                      <Link href={`/proveedores/${prov.id}`} className="text-primary hover:underline truncate block">
                        {prov.nombre}
                      </Link>
                    </TableCell>
                    <TableCell className="celda-datos celda-mono whitespace-nowrap">{prov.prefijo}</TableCell>
                    <TableCell className="celda-datos celda-numero">{prov.cantProductos.toLocaleString()}</TableCell>
                    <TableCell className="celda-datos celda-numero">{prov.cantProductosProvistos.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </ClassicFilteredTableLayout>
    </div>
  );
}
