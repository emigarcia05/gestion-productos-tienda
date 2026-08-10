"use client";

import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";

/**
 * Módulo **Pedido A Fábrica** (pilar sidebar Administración).
 * Contenido de negocio pendiente (antes placeholder Est. Para Compra).
 */
export default function PedidoAFabricaPageClient() {
  return (
    <ClassicFilteredTableLayout
      title="PEDIDO A FÁBRICA"
      subtitle="Pedido A Fábrica"
      contentWidth="full"
    >
      <div className="flex min-h-[12rem] flex-1 items-center justify-center rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Este módulo está en preparación. Pronto vas a poder gestionar el pedido
          a fábrica.
        </p>
      </div>
    </ClassicFilteredTableLayout>
  );
}
