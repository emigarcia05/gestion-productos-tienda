"use client";

import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";

/**
 * Placeholder del submódulo **Est. Para Compra** (sidebar MEDIACIONES).
 * Contenido de negocio pendiente.
 */
export default function EstParaCompraPageClient() {
  return (
    <ClassicFilteredTableLayout
      title="ESTADÍSTICAS PRODUCTOS"
      subtitle="Est. Para Compra"
      contentWidth="full"
    >
      <div className="flex min-h-[12rem] flex-1 items-center justify-center rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Este módulo está en preparación. Pronto vas a poder ver las estadísticas
          orientadas a compra.
        </p>
      </div>
    </ClassicFilteredTableLayout>
  );
}
