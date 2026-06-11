"use client";

import { useState, useCallback, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { fmtPrecio } from "@/lib/format";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import ComparacionCategoriaSelector from "@/components/proveedores/comparacion-categorias/ComparacionCategoriaSelector";
import CeldaDifPct from "@/components/shared/CeldaDifPct";
import { TableEmptyState } from "@/components/shared/TableEmptyState";
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

function calcVariacionPct(costo: number | null, base: number | null): number | null {
  if (costo == null || costo <= 0 || base == null || base <= 0) return null;
  return ((costo - base) / base) * 100;
}

export default function ComparacionCategoriasClient({ arbolInicial, rol }: Props) {
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);
  const [selectedSubcategoriaId, setSelectedSubcategoriaId] = useState<string | null>(null);
  const [selectedPresentacionId, setSelectedPresentacionId] = useState<string | null>(null);
  const [productos, setProductos] = useState<ProductoEnCategoria[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [baseItemId, setBaseItemId] = useState<string | null>(null);

  const puedeEditar = puede(rol, PERMISOS.comparacionCategorias.editar);

  const costoBase = useMemo(() => {
    if (!baseItemId) return null;
    const base = productos.find((p) => p.id === baseItemId);
    const px = base?.pxCompraFinalSinIva;
    return px != null && px > 0 ? px : null;
  }, [baseItemId, productos]);

  const loadProductos = useCallback(async (presentacionId: string) => {
    setLoadingProductos(true);
    try {
      const res = await getProductosPorPresentacionAction(presentacionId);
      if (res.ok && res.data) {
        setProductos(res.data.productos);
        setBaseItemId(null);
      } else {
        setProductos([]);
        setBaseItemId(null);
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
    setBaseItemId(null);
  }, []);

  const handleSelectSubcategoria = useCallback((id: string) => {
    setSelectedSubcategoriaId(id);
    setSelectedPresentacionId(null);
    setProductos([]);
    setBaseItemId(null);
  }, []);

  const handleSelectPresentacion = useCallback(
    (id: string) => {
      setSelectedPresentacionId(id);
      setBaseItemId(null);
      void loadProductos(id);
    },
    [loadProductos]
  );

  const toggleBaseItem = useCallback((itemId: string) => {
    setBaseItemId((prev) => (prev === itemId ? null : itemId));
  }, []);

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
        setBaseItemId((prev) => (prev === itemId ? null : prev));
      } finally {
        setRemovingItemId(null);
      }
    },
    [removingItemId, selectedPresentacionId]
  );

  const columnasTabla = puedeEditar ? 6 : 5;

  return (
    <>
      <ClassicFilteredTableLayout
        title="Lista Proveedores"
        subtitle="Comparacion"
        contentWidth="full"
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
              ) : (
                <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
                  <Table variant="compact" scrollX={false}>
                    <colgroup>
                      <col className="w-[5%]" />
                      <col className="w-[10%]" />
                      <col className={puedeEditar ? "w-[52%]" : "w-[60%]"} />
                      <col className="w-[13%]" />
                      <col className="w-[12%]" />
                      {puedeEditar && <col className="w-[8%]" />}
                    </colgroup>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-center">TILDE</TableHead>
                        <TableHead className="text-center">PROVEEDOR</TableHead>
                        <TableHead>DESCRIPCIÓN</TableHead>
                        <TableHead className="text-right">COSTO</TableHead>
                        <TableHead className="text-center">VAR</TableHead>
                        {puedeEditar && (
                          <TableHead className="text-center p-0 align-middle">
                            <div className="flex h-full min-h-0 w-full items-center justify-center p-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
                                  "!size-7 max-h-7 min-h-7 min-w-7 shrink-0 !p-0"
                                )}
                                onClick={() => setModalAsignar(true)}
                                title="Asignar productos"
                                aria-label="Asignar productos a esta categoría"
                              >
                                <Plus className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                              </Button>
                            </div>
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productos.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={columnasTabla} className="p-0">
                            <TableEmptyState
                              message="No hay productos asignados. Usá el botón + del encabezado para agregar ítems de lista de precios."
                              placement="panel"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        productos.map((p) => {
                          const esBase = baseItemId === p.id;
                          const variacionPct =
                            baseItemId == null
                              ? null
                              : esBase
                                ? 0
                                : calcVariacionPct(p.pxCompraFinalSinIva, costoBase);

                          return (
                            <TableRow key={p.id} className="hover:bg-transparent">
                              <TableCell className="celda-datos text-center">
                                <label className="inline-flex cursor-pointer items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={esBase}
                                    onChange={() => toggleBaseItem(p.id)}
                                    className="h-4 w-4 rounded border-input accent-primary"
                                    aria-label={`Usar ${p.descripcionProveedor} como base de comparación`}
                                  />
                                </label>
                              </TableCell>
                              <TableCell className="celda-datos text-center">
                                {p.proveedorPrefijo ? (
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {p.proveedorPrefijo}
                                  </Badge>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="celda-datos min-w-0 truncate">
                                {p.descripcionProveedor}
                              </TableCell>
                              <TableCell className="celda-datos celda-numero text-right">
                                {p.pxCompraFinalSinIva != null
                                  ? `$${fmtPrecio(p.pxCompraFinalSinIva)}`
                                  : "—"}
                              </TableCell>
                              <TableCell className="celda-datos text-center">
                                {variacionPct != null ? (
                                  <CeldaDifPct pct={variacionPct} />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
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
                          );
                        })
                      )}
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
