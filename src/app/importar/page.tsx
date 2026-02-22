import Navbar from "@/components/Navbar";
import UploadZone from "@/components/UploadZone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, CheckCircle2, AlertCircle, Clock } from "lucide-react";

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

export default function ImportarPage() {
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Archivo</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Filas</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Importados</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Errores</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Fecha</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-3 font-medium flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        {item.filename}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">{item.rows}</td>
                      <td className="py-3 px-3 text-right text-emerald-500">{item.imported}</td>
                      <td className="py-3 px-3 text-right text-destructive">{item.errors}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{item.date}</td>
                      <td className="py-3 px-3 text-right">{getStatusBadge(item.status)}</td>
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
