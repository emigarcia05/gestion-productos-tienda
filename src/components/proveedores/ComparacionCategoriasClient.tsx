"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2, Trash2 } from "lucide-react";
import { fmtPrecio } from "@/lib/format";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import ComparacionCategoriaSelector from "@/components/proveedores/comparacion-categorias/ComparacionCategoriaSelector";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";
import type { ProductoEnCategoria } from "@/services/categoriasComparacion.service";
import type { Rol } from "@/lib/permisos";
import { PERMISOS, puede } from "@/lib/permisos";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import {
  getProductosPorPresentacionAction,
  quitarAsignacionPresentacionAction,
} from "@/actions/comparacionCategorias";
import AsignarProductosModal from "@/components/proveedores/comparacion-categorias/AsignarProductosModal";
import { toast } from "sonner";

interface Props {
  arbolInicial: CategoriaComparacionTree[];
  rol: Rol;
}

export default function ComparacionCategoriasClient({ arbolInicial, rol }: Props) {
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);
  const [selectedSubcategoriaId, setSelectedSubcategoriaId] = useState<string | null>(null);
  const [selectedPresentacionId, setSelectedPresentacionId] = useState<string | null>(null);
  const [productos, setProductos] = useState<ProductoEnCategoria[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const puedeEditar = puede(rol, PERMISOS.comparacionCategorias.editar);

  const loadProductos = useCallback(async (presentacionId: string) => {
    setLoadingProductos(true);
    try {
      const res = await getProductosPorPresentacionAction(presentacionId);
      if (res.ok && res.data) {
        setProductos(res.data.productos);
      } else {
        setProductos([]);
      }
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  const handleSelectCategoria = useCallback((id: string) => {
    setSelectedCategoriaId(id);
    setSelectedSubcategoriaId(null);
    setSelectedPresentacionId(null);
    setProductos([]);
  }, []);

  const handleSelectSubcategoria = useCallback((id: string) => {
    setSelectedSubcategoriaId(id);
    setSelectedPresentacionId(null);
    setProductos([]);
  }, []);

  const handleSelectPresentacion = useCallback(
    (id: string) => {
      setSelectedPresentacionId(id);
      void loadProductos(id);
    },
    [loadProductos]
  );

  const onAsignarSuccess = useCallback(() => {
    setModalAsignar(false);
    if (selectedPresentacionId) void loadProductos(selectedPresentacionId);
  }, [selectedPresentacionId, loadProductos]);

  const handleQuitarFila = useCallback(
    async (itemId: string) => {
      if (!selectedPresentacionId || removingItemId != null) return;
      setRemovingItemId(itemId);
      try {
        const res = await quitarAsignacionPresentacionAction([itemId]);
        if (!res.ok) {
          toast.error(res.error ?? "Error al quitar la fila.");
          return;
        }
        setProductos((prev) => prev.filter((p) => p.id !== itemId));
      } finally {
        setRemovingItemId(null);
      }
    },
    [removingItemId, selectedPresentacionId]
  );

  const acciones =
    puedeEditar && selectedPresentacionId ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 h-9"
        onClick={() => setModalAsignar(true)}
      >
        <UserPlus className="h-4 w-4" />
        Asignar productos
      </Button>
    ) : undefined;

  return (
    <>
      <ClassicFilteredTableLayout
        title="Lista Proveedores"
        subtitle="Comparacion"
        contentWidth="full"
        actions={acciones}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-3 py-3">
          <ComparacionCategoriaSelector
            arbol={arbolInicial}
            selectedCategoriaId={selectedCategoriaId}
            selectedSubcategoriaId={selectedSubcategoriaId}
            selectedPresentacionId={selectedPresentacionId}
            onSelectCategoria={handleSelectCategoria}
            onSelectSubcategoria={handleSelectSubcategoria}
            onSelectPresentacion={handleSelectPresentacion}
          />

          <Card className="flex min-h-0 flex-1 flex-col gap-0 pt-0 min-w-0">
            <CardContent className="flex-1 min-h-0 overflow-hidden py-0 pb-3 px-0">
              {loadingProductos ? (
                <p className="text-sm text-muted-foreground py-4 px-4">Cargando productos…</p>
              ) : !selectedPresentacionId ? (
                <p className="text-sm text-muted-foreground py-4 px-4">
                  Elegí Categoría, Subcategoría y Presentación para ver o asignar productos.
                </p>
              ) : productos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 px-4">
                  No hay productos asignados a esta comparación. Usá «Asignar productos» para
                  agregar ítems de lista de precios.
                </p>
              ) : (
                <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
                  <Table variant="compact" scrollX={false}>
                    <colgroup>
                      <col className="w-[70%]" />
                      <col className="w-[22%]" />
                      {puedeEditar && <col className="w-[8%]" />}
                    </colgroup>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>DESCRIPCIÓN</TableHead>
                        <TableHead className="text-right">PX COMPRA FINAL SIN IVA</TableHead>
                        {puedeEditar && (
                          <TableHead className="text-center">
                            <Trash2
                              className="h-4 w-4 mx-auto text-primary-foreground"
                              aria-hidden
                            />
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productos.map((p) => (
                        <TableRow key={p.id} className="hover:bg-transparent">
                          <TableCell className="celda-datos min-w-0 truncate">
                            {p.descripcionProveedor}
                          </TableCell>
                          <TableCell className="celda-datos celda-numero text-right">
                            {p.pxCompraFinalSinIva != null
                              ? `$${fmtPrecio(p.pxCompraFinalSinIva)}`
                              : "—"}
                          </TableCell>
                          {puedeEditar && (
                            <TableCell className="celda-datos celda-datos--accion-relleno-fila text-center">
                              <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                  onClick={() => handleQuitarFila(p.id)}
                                  disabled={removingItemId === p.id}
                                  title="Quitar producto"
                                >
                                  {removingItemId === p.id ? (
                                    <Loader2
                                      className={cn(TABLE_ROW_ACTION_ICON_CLASS, "animate-spin")}
                                      aria-hidden
                                    />
                                  ) : (
                                    <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ClassicFilteredTableLayout>

      {puedeEditar && selectedPresentacionId && (
        <AsignarProductosModal
          open={modalAsignar}
          onOpenChange={setModalAsignar}
          presentacionId={selectedPresentacionId}
          onSuccess={onAsignarSuccess}
        />
      )}
    </>
  );
}
