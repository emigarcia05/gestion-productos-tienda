import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import UploadZone from "@/components/UploadZone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

const importHistory = [
  { id: "1", filename: "productos_enero.csv", status: "success", rows: 245, imported: 243, errors: 2, date: "22 Feb 2026" },
  { id: "2", filename: "catalogo_invierno.xlsx", status: "success", rows: 120, imported: 120, errors: 0, date: "18 Feb 2026" },
  { id: "3", filename: "stock_update.csv", status: "error", rows: 80, imported: 0, errors: 80, date: "15 Feb 2026" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return (
        <Badge className="gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" />
          Completado
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Pendiente
        </Badge>
      );
  }
}

export default async function ImportarPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.importar.acceso)) {
    redirect("/");
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar datos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sube archivos CSV o Excel para actualizar tu inventario masivamente
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Upload Zone */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Subir archivo</CardTitle>
                <CardDescription>
                  El archivo debe contener columnas: nombre, precio, stock, categoría, sku
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadZone />
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Formato esperado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Columnas requeridas en tu archivo:
                </p>
                <div className="space-y-1.5">
                  {[
                    { col: "nombre", req: true },
                    { col: "precio", req: true },
                    { col: "stock", req: true },
                    { col: "sku", req: false },
                    { col: "categoria", req: false },
                    { col: "descripcion", req: false },
                  ].map(({ col, req }) => (
                    <div key={col} className="flex items-center justify-between">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {col}
                      </code>
                      <Badge
                        variant={req ? "default" : "secondary"}
                        className="text-xs h-5"
                      >
                        {req ? "Requerido" : "Opcional"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Import History */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Historial de importaciones</CardTitle>
            <CardDescription>Últimas importaciones realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="tabla-gestion-compacta">
                <thead>
                  <tr className="border-b border-slate-200/80">
                    <th className="!text-left">Archivo</th>
                    <th>Filas</th>
                    <th>Importados</th>
                    <th>Errores</th>
                    <th className="!text-left">Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="!text-left">
                        <span className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                          {item.filename}
                        </span>
                      </td>
                      <td>{item.rows}</td>
                      <td className="text-emerald-600 font-semibold">{item.imported}</td>
                      <td className="text-destructive font-semibold">{item.errors}</td>
                      <td className="text-slate-600 text-xs">{item.date}</td>
                      <td>{getStatusBadge(item.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
