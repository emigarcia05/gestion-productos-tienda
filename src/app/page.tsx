import { Package, TrendingUp, AlertTriangle, Upload } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const recentProducts = [
  { id: "1", name: "Camiseta Básica", category: "Ropa", price: 19.99, stock: 142, sku: "CAM-001" },
  { id: "2", name: "Zapatillas Runner", category: "Calzado", price: 89.99, stock: 23, sku: "ZAP-002" },
  { id: "3", name: "Mochila Urban", category: "Accesorios", price: 45.0, stock: 0, sku: "MOC-003" },
  { id: "4", name: "Gorra Snapback", category: "Accesorios", price: 24.99, stock: 67, sku: "GOR-004" },
  { id: "5", name: "Pantalón Cargo", category: "Ropa", price: 59.99, stock: 8, sku: "PAN-005" },
];

function getStockBadge(stock: number) {
  if (stock === 0)
    return <Badge variant="destructive">Sin stock</Badge>;
  if (stock < 10)
    return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Stock bajo</Badge>;
  return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">En stock</Badge>;
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Resumen general de tu inventario
            </p>
          </div>
          <Button asChild>
            <Link href="/importar" className="gap-2">
              <Upload className="h-4 w-4" />
              Importar datos
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Productos"
            value="1,284"
            description="En catálogo activo"
            icon={Package}
            trend={{ value: 12, label: "vs. mes anterior" }}
          />
          <StatsCard
            title="Valor de Inventario"
            value="$48,320"
            description="Precio de costo total"
            icon={TrendingUp}
            trend={{ value: 4.5, label: "vs. mes anterior" }}
          />
          <StatsCard
            title="Sin Stock"
            value="23"
            description="Productos agotados"
            icon={AlertTriangle}
            trend={{ value: -2, label: "vs. mes anterior" }}
          />
          <StatsCard
            title="Importaciones"
            value="8"
            description="Este mes"
            icon={Upload}
          />
        </div>

        {/* Recent Products Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Productos recientes</CardTitle>
              <CardDescription>Últimos productos actualizados</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/productos">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Producto</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">SKU</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Categoría</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Precio</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Stock</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-3 font-medium">{product.name}</td>
                      <td className="py-3 px-3 text-muted-foreground font-mono text-xs">
                        {product.sku}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{product.category}</td>
                      <td className="py-3 px-3 text-right">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        {product.stock}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {getStockBadge(product.stock)}
                      </td>
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
