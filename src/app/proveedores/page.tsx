import Link from "next/link";
import { Building2, Package, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import CrearProveedorModal from "@/components/proveedores/CrearProveedorModal";
import EditarProveedorModal from "@/components/proveedores/EditarProveedorModal";
import EliminarProveedorBtn from "@/components/proveedores/EliminarProveedorBtn";
import ImportarModal from "@/components/proveedores/ImportarModal";
import { getProveedores } from "@/actions/proveedores";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const proveedores = await getProveedores();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {proveedores.length} proveedor{proveedores.length !== 1 ? "es" : ""} registrado
              {proveedores.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ImportarModal proveedores={proveedores} />
            <CrearProveedorModal />
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Lista */}
        {proveedores.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3">
            {proveedores.map((prov) => (
              <Card
                key={prov.id}
                className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors group"
              >
                <CardContent className="flex items-center gap-4 py-4 px-5">
                  {/* Icono */}
                  <div className="rounded-lg bg-muted p-2.5 shrink-0">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/proveedores/${prov.id}`}
                        className="font-semibold hover:underline underline-offset-2 truncate"
                      >
                        {prov.nombre}
                      </Link>
                      <Badge variant="secondary" className="font-mono text-xs shrink-0">
                        {prov.codigoUnico}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {prov._count.productos} producto
                      {prov._count.productos !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 shrink-0">
                    <EditarProveedorModal proveedor={{ id: prov.id, nombre: prov.nombre }} />
                    <EliminarProveedorBtn id={prov.id} nombre={prov.nombre} />
                    <Link
                      href={`/proveedores/${prov.id}`}
                      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
      <div className="rounded-full bg-muted p-5">
        <Building2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="font-medium">No hay proveedores aún</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Crea tu primer proveedor para comenzar a gestionar productos.
      </p>
    </div>
  );
}
