import Link from "next/link";
import { getProveedores } from "@/actions/proveedores";
import SectionHeader from "@/components/SectionHeader";
import ProveedoresSubmoduleToolbar from "@/components/proveedores/ProveedoresSubmoduleToolbar";
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
      <SectionHeader
        titulo="Lista Proveedores"
        descripcion="Listado de proveedores. Entrá a cada uno para ver productos y precios."
        actions={acciones}
        submoduleToolbar={<ProveedoresSubmoduleToolbar activo="lista" />}
      />

      <Separator className="bg-slate-200/60" />

      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        <Card className="h-full flex flex-col rounded-xl border-slate-200 bg-white overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <CardContent className="flex-1 min-h-0 overflow-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200/60 hover:bg-transparent">
                  <TableHead className="bg-slate-50/50 text-slate-900 font-bold">Proveedor</TableHead>
                  <TableHead className="bg-slate-50/50 text-slate-900 font-bold">Sufijo</TableHead>
                  <TableHead className="bg-slate-50/50 text-slate-900 font-bold">Código</TableHead>
                  <TableHead className="bg-slate-50/50 text-slate-900 font-bold text-right">Productos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.map((prov) => (
                  <TableRow
                    key={prov.id}
                    className="border-slate-200/60 hover:bg-slate-50/80 transition-colors duration-150"
                  >
                    <TableCell className="font-medium text-slate-900">
                      <Link href={`/proveedores/${prov.id}`} className="text-primary hover:underline">
                        {prov.nombre}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-600">{prov.sufijo}</TableCell>
                    <TableCell className="text-slate-600 font-mono text-xs">{prov.codigoUnico}</TableCell>
                    <TableCell className="text-right text-slate-600">{prov._count.productos}</TableCell>
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
