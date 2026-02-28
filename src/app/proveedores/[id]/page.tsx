import { notFound } from "next/navigation";
import { Package, Tag, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EditarProveedorModal from "@/components/proveedores/EditarProveedorModal";
import EliminarProveedorBtn from "@/components/proveedores/EliminarProveedorBtn";
import ImportarModal from "@/components/proveedores/ImportarModal";
import SectionHeader from "@/components/SectionHeader";
import { getProveedorById, getProveedores } from "@/actions/proveedores";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProveedorDetallePage({ params }: Props) {
  const { id } = await params;
  const [proveedor, todosProveedores, rol] = await Promise.all([
    getProveedorById(id),
    getProveedores(),
    getRol(),
  ]);

  if (!proveedor) notFound();

  const productos = proveedor.productosProveedor;
  const p = PERMISOS.proveedorDetalle;

  const totalLista = productos.reduce((s, prod) => s + prod.precioLista, 0);
  const totalVenta = productos.reduce((s, prod) => s + prod.precioVentaSugerido, 0);

  const acciones =
    puede(rol, p.acciones.importarLista) || puede(rol, p.acciones.editarProveedor) || puede(rol, p.acciones.eliminarProveedor) ? (
      <div className="flex gap-2">
        {puede(rol, p.acciones.importarLista) && (
          <ImportarModal
            proveedores={todosProveedores}
            proveedorPreseleccionado={proveedor.id}
          />
        )}
        {puede(rol, p.acciones.editarProveedor) && (
          <EditarProveedorModal proveedor={{ id: proveedor.id, nombre: proveedor.nombre, prefijo: proveedor.prefijo }} />
        )}
        {puede(rol, p.acciones.eliminarProveedor) && (
          <EliminarProveedorBtn id={proveedor.id} nombre={proveedor.nombre} redirectOnDelete />
        )}
      </div>
    ) : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <SectionHeader titulo={proveedor.nombre} subtitulo="Detalle del proveedor" actions={acciones} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Stats rápidas */}
        {productos.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <StatMini icon={Package} label="Productos" value={productos.length} />
            <StatMini
              icon={DollarSign}
              label="Precio lista promedio"
              value={`$${(totalLista / productos.length).toFixed(2)}`}
            />
            <StatMini
              icon={Tag}
              label="Precio venta promedio"
              value={`$${(totalVenta / productos.length).toFixed(2)}`}
            />
          </div>
        )}

        {/* Tabla de productos */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Productos del proveedor</CardTitle>
            <CardDescription>
              Código externo = <code className="bg-muted px-1 rounded text-xs">{proveedor.codigoUnico}</code>
              {" "}+ código del proveedor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <Package className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Sin productos. Usa &quot;Importar productos&quot; para cargar el catálogo.
                </p>
                <ImportarModal
                  proveedores={todosProveedores}
                  proveedorPreseleccionado={proveedor.id}
                />
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg border border-border/50">
                <Table variant="compact">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {puede(rol, p.tabla.codProdProv) && <TableHead className="py-2.5 px-3 text-xs">Cód. Proveedor</TableHead>}
                      {puede(rol, p.tabla.codExt) && <TableHead className="py-2.5 px-3 text-xs">Cód. Externo</TableHead>}
                      {puede(rol, p.tabla.descripcion) && <TableHead className="py-2.5 px-3 text-xs">Descripción</TableHead>}
                      {puede(rol, p.tabla.precioLista) && <TableHead className="py-2.5 px-3 text-xs">Px Lista</TableHead>}
                      {puede(rol, p.tabla.precioVentaSugerido) && <TableHead className="py-2.5 px-3 text-xs">Px Venta</TableHead>}
                      {puede(rol, p.tabla.margen) && <TableHead className="py-2.5 px-3 text-xs">Margen</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productos.map((prod) => {
                      const margen =
                        prod.precioLista > 0
                          ? (((prod.precioVentaSugerido - prod.precioLista) / prod.precioLista) * 100).toFixed(1)
                          : "—";
                      const margenNum = parseFloat(margen);

                      return (
                        <TableRow key={prod.id}>
                          {puede(rol, p.tabla.codProdProv) && (
                            <TableCell className="py-3 px-3 font-mono text-xs">{prod.codProdProv}</TableCell>
                          )}
                          {puede(rol, p.tabla.codExt) && (
                            <TableCell className="py-3 px-3 text-center">
                              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{prod.codigoExterno}</code>
                            </TableCell>
                          )}
                          {puede(rol, p.tabla.descripcion) && (
                            <TableCell className="py-3 px-3 max-w-xs truncate">{prod.descripcion}</TableCell>
                          )}
                          {puede(rol, p.tabla.precioLista) && (
                            <TableCell className="py-3 px-3 tabular-nums">${Math.round(prod.precioLista).toLocaleString("es-AR")}</TableCell>
                          )}
                          {puede(rol, p.tabla.precioVentaSugerido) && (
                            <TableCell className="py-3 px-3 tabular-nums">${Math.round(prod.precioVentaSugerido).toLocaleString("es-AR")}</TableCell>
                          )}
                          {puede(rol, p.tabla.margen) && (
                            <TableCell className="py-3 px-3 text-center">
                              {margen !== "—" ? (
                                <span className={margenNum >= 0 ? "text-emerald-600" : "text-destructive"}>
                                  {margenNum >= 0 ? "+" : ""}{margen}%
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="border-t border-border/50 bg-muted/20">
                      <TableCell
                        colSpan={
                          [p.tabla.codProdProv, p.tabla.codExt, p.tabla.descripcion].filter((c) => puede(rol, c)).length
                        }
                        className="py-2.5 px-3 text-center text-xs text-muted-foreground font-medium"
                      >
                        Total ({productos.length} productos)
                      </TableCell>
                      {puede(rol, p.tabla.precioLista) && (
                        <TableCell className="py-2.5 px-3 text-center text-sm font-semibold tabular-nums">
                          ${Math.round(totalLista).toLocaleString("es-AR")}
                        </TableCell>
                      )}
                      {puede(rol, p.tabla.precioVentaSugerido) && (
                        <TableCell className="py-2.5 px-3 text-center text-sm font-semibold tabular-nums">
                          ${Math.round(totalVenta).toLocaleString("es-AR")}
                        </TableCell>
                      )}
                      {puede(rol, p.tabla.margen) && <TableCell />}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatMini({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-4 px-4 text-center">
        <div className="rounded-md bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
