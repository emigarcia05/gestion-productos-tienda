import Link from "next/link";
import { getProveedores } from "@/actions/proveedores";
import SectionHeader from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import CrearProveedorModal from "@/components/proveedores/CrearProveedorModal";

export const dynamic = "force-dynamic";

export default async function ListaProveedoresPage() {
  const [proveedores, rol] = await Promise.all([getProveedores(), getRol()]);
  const p = PERMISOS.proveedores;

  const acciones =
    puede(rol, p.acciones.nuevoProveedor) ? (
      <div className="flex gap-2">
        <CrearProveedorModal />
      </div>
    ) : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader titulo="Lista Proveedores" subtitulo="Listado de proveedores" actions={acciones} />

      <Separator className="bg-slate-200/60" />

      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        <Card className="card-contenedor-tabla h-full flex flex-col rounded-xl border-slate-200 bg-white overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <CardContent className="flex-1 min-h-0 overflow-auto p-0">
            <Table variant="compact">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Productos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.map((prov) => (
                  <TableRow key={prov.id}>
                    <TableCell>
                      <Link href={`/proveedores/${prov.id}`} className="text-primary hover:underline">
                        {prov.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>{prov.prefijo}</TableCell>
                    <TableCell className="font-mono text-xs">{prov.codigoUnico}</TableCell>
                    <TableCell>{prov._count.productosProveedor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
