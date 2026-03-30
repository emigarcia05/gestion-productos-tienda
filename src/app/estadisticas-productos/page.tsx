import SectionHeader from "@/components/SectionHeader";

export default function EstadisticasProductosPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SectionHeader titulo="Estadísticas Productos" subtitulo="A construir" />
      <div className="flex-1 overflow-auto p-4">
        <p className="text-sm text-muted-foreground">
          Esta área está en desarrollo. Pronto vas a ver métricas y reportes de productos.
        </p>
      </div>
    </div>
  );
}
