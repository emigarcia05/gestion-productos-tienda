"use client";

import { useMemo, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FilterBar, { FilterRowSelection } from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ProveedorTintometrico } from "@/services/tintometrico.service";
import NuevoItemTintometricoModal, {
  type NuevoItemTintometricoDraft,
} from "@/components/pedidos/NuevoItemTintometricoModal";

type ItemTintometrico = NuevoItemTintometricoDraft & {
  key: string;
};

export default function PedidoTintometricoPageClient({
  proveedores,
}: {
  proveedores: ProveedorTintometrico[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [items, setItems] = useState<ItemTintometrico[]>([]);

  const proveedoresById = useMemo(() => {
    const map = new Map<string, ProveedorTintometrico>();
    for (const p of proveedores) map.set(p.id, p);
    return map;
  }, [proveedores]);

  function agregarItem(draft: NuevoItemTintometricoDraft) {
    const key = `${draft.proveedorId}:${draft.codTintometrico}:${draft.base.id}`;
    setItems((prev) => {
      if (prev.some((p) => p.key === key)) return prev;
      return [...prev, { ...draft, key }];
    });
  }

  function borrarItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const filters = (
    <FilterBar className="filtros-contenedor-tienda bg-card">
      <FilterRowSelection className="justify-center">
        <Button
          type="button"
          variant="default"
          size="lg"
          onClick={() => setModalOpen(true)}
          aria-label="Agregar Ítem"
          title="Agregar Ítem"
          className="h-10 min-h-10 px-8"
        >
          <Plus className="h-4 w-4" />
          <span>Agregar Ítem</span>
        </Button>
      </FilterRowSelection>
    </FilterBar>
  );

  return (
    <ClassicFilteredTableLayout
      title="Pedido Mercadería"
      subtitle="Pedido Tintométrico"
      filters={filters}
    >
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <Card className="min-h-0 flex flex-col rounded-xl border-border bg-card overflow-hidden gap-0 py-0 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <CardContent className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
            <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
              <Table variant="compact" className="tabla-gestion-compacta w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[12rem]">PROVEEDOR</TableHead>
                    <TableHead className="w-[6rem] text-right">CANT</TableHead>
                    <TableHead className="w-[12rem]">CÓD. TINTOMÉTRICO</TableHead>
                    <TableHead className="w-[10rem]">CÓD. TIENDA</TableHead>
                    <TableHead>DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[4rem] text-right">ACC.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground text-sm py-10 text-center">
                        Sin Ítems. Presioná “+” Para Agregar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((i) => {
                      const prov = proveedoresById.get(i.proveedorId);
                      return (
                        <TableRow key={i.key}>
                          <TableCell className="celda-datos text-xs">
                            {(prov?.nombre ?? "").trim()}
                          </TableCell>
                      <TableCell className="celda-datos text-xs text-right tabular-nums">
                        {i.cantidad.toLocaleString()}
                      </TableCell>
                      <TableCell className="celda-datos text-xs tabular-nums">
                            {i.codTintometrico}
                          </TableCell>
                          <TableCell className="celda-datos text-xs tabular-nums">
                            {i.base.codTienda}
                          </TableCell>
                          <TableCell className="celda-datos text-xs">
                            {i.base.descripcionTienda}
                          </TableCell>
                          <TableCell className="celda-datos text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => borrarItem(i.key)}
                              className={cn("text-foreground hover:text-destructive")}
                              aria-label="Borrar Ítem"
                              title="Borrar Ítem"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <NuevoItemTintometricoModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          proveedores={proveedores}
          onAgregar={agregarItem}
        />
      </div>
    </ClassicFilteredTableLayout>
  );
}

