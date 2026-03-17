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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProveedorTintometrico, SucursalTintometrica } from "@/services/tintometrico.service";
import NuevoItemTintometricoModal, {
  type NuevoItemTintometricoDraft,
} from "@/components/pedidos/NuevoItemTintometricoModal";

type ItemTintometrico = NuevoItemTintometricoDraft & {
  key: string;
};

export default function PedidoTintometricoPageClient({
  proveedores,
  sucursales,
}: {
  proveedores: ProveedorTintometrico[];
  sucursales: SucursalTintometrica[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [items, setItems] = useState<ItemTintometrico[]>([]);
  const [filtroSucursal, setFiltroSucursal] = useState<string>("");
  const [filtroProveedor, setFiltroProveedor] = useState<string>("");

  const proveedoresById = useMemo(() => {
    const map = new Map<string, ProveedorTintometrico>();
    for (const p of proveedores) map.set(p.id, p);
    return map;
  }, [proveedores]);

  const sucursalPorCodigo = useMemo(() => {
    const map = new Map<string, SucursalTintometrica>();
    for (const s of sucursales) map.set(s.codigo, s);
    return map;
  }, [sucursales]);

  const itemsFiltrados = useMemo(
    () =>
      items.filter((i) => {
        if (filtroSucursal && i.sucursalCodigo !== filtroSucursal) return false;
        if (filtroProveedor && i.proveedorId !== filtroProveedor) return false;
        return true;
      }),
    [items, filtroSucursal, filtroProveedor]
  );

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
      {/* Fila 1: filtros de Sucursal y Proveedor */}
      <FilterRowSelection className="justify-center gap-6 flex-wrap">
        <div className="flex flex-col gap-1 min-w-[10rem]">
          <span className="text-xs text-foreground">Sucursal</span>
          <Select
            value={filtroSucursal}
            onValueChange={(value) => setFiltroSucursal(value === "todas" ? "" : value)}
          >
            <SelectTrigger className="h-10 w-[12rem]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent
              className="select-content-filtro"
              position="popper"
              side="bottom"
              align="start"
            >
              <SelectItem value="todas">TODAS</SelectItem>
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={s.codigo}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 min-w-[12rem]">
          <span className="text-xs text-foreground">Proveedor</span>
          <Select
            value={filtroProveedor}
            onValueChange={(value) => setFiltroProveedor(value === "todos" ? "" : value)}
          >
            <SelectTrigger className="h-10 w-[14rem]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent
              className="select-content-filtro"
              position="popper"
              side="bottom"
              align="start"
            >
              <SelectItem value="todos">TODOS</SelectItem>
              {proveedores.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {`${p.prefijo} - ${p.nombre}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterRowSelection>

      {/* Fila 2: botón + centrado */}
      <FilterRowSelection className="justify-center mt-2">
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
                    <TableHead className="w-[10%]">PROVEEDOR</TableHead>
                    <TableHead className="w-[10%]">SUCURSAL</TableHead>
                    <TableHead className="w-[8%] text-right">CANT.</TableHead>
                    <TableHead className="w-[64%]">DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[8%] text-right">
                      <Trash2 className="h-4 w-4 mx-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground text-sm py-10 text-center">
                        Sin Ítems. Presioná “+” Para Agregar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itemsFiltrados.map((i) => {
                      const prov = proveedoresById.get(i.proveedorId);
                      const suc = sucursalPorCodigo.get(i.sucursalCodigo);
                      return (
                        <TableRow key={i.key}>
                          <TableCell className="celda-datos text-xs">
                            {(prov?.prefijo ?? "").trim()}
                          </TableCell>
                          <TableCell className="celda-datos text-xs">
                            {(suc?.nombre ?? "").trim()}
                          </TableCell>
                      <TableCell className="celda-datos text-xs text-right tabular-nums">
                        {i.cantidad.toLocaleString()}
                      </TableCell>
                          <TableCell className="celda-datos text-xs">
                            {`${i.base.descripcionTienda ?? ""} - COD. ${i.codTintometrico}`.toUpperCase()}
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
          sucursales={sucursales}
          onAgregar={agregarItem}
        />
      </div>
    </ClassicFilteredTableLayout>
  );
}

