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
import { calcMargenSegunPxReferencia } from "@/lib/calculos";
import { fmtPrecio } from "@/lib/format";
import { fmtMargenPxListaTabla } from "@/lib/pxListasPreciosFormat";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import {
  COMP_CATEGORIAS_COMPARISON_STACK_CLASS,
  COMP_CATEGORIAS_CONTENT_WIDTH,
  COMP_CATEGORIAS_PAGE_CONTENT_CLASS,
  COMP_CATEGORIAS_SELECTOR_PANEL_CLASS,
  COMP_CATEGORIAS_TABLA_PANEL_CLASS,
} from "@/lib/comparacionCategoriasLayout";
import ComparacionCategoriaSelector from "@/components/proveedores/comparacion-categorias/ComparacionCategoriaSelector";
import CeldaDifPct from "@/components/shared/CeldaDifPct";
import { TableEmptyState } from "@/components/shared/TableEmptyState";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";
import type {
  ProductoEnCategoria,
  ReferenciaCompetenciaPresentacion,
} from "@/services/categoriasComparacion.service";
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
  quitarReferenciaCompetenciaAction,
} from "@/actions/comparacionCategorias";
import AsignarProductosModal from "@/components/proveedores/comparacion-categorias/AsignarProductosModal";
import ElegirReferenciaCompetenciaModal from "@/components/proveedores/comparacion-categorias/ElegirReferenciaCompetenciaModal";
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
  const [referenciaCompetencia, setReferenciaCompetencia] =
    useState<ReferenciaCompetenciaPresentacion | null>(null);
  const [labelCompleto, setLabelCompleto] = useState("");
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalReferencia, setModalReferencia] = useState(false);
  const [quitarReferenciaPending, setQuitarReferenciaPending] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [baseItemId, setBaseItemId] = useState<string | null>(null);

  const puedeEditar = puede(rol, PERMISOS.comparacionCategorias.editar);

  const precioBaseVar = useMemo(() => {
    if (baseItemId) {
      const base = productos.find((p) => p.id === baseItemId);
      const px = base?.pxCompraFinalSinIva;
      return px != null && px > 0 ? px : null;
    }
    const pxRef = referenciaCompetencia?.pxMostrar;
    return pxRef != null && pxRef > 0 ? pxRef : null;
  }, [baseItemId, productos, referenciaCompetencia]);

  const hayBaseVar = baseItemId != null || referenciaCompetencia?.pxMostrar != null;

  const loadProductos = useCallback(async (presentacionId: string) => {
    setLoadingProductos(true);
    try {
      const res = await getProductosPorPresentacionAction(presentacionId);
      if (res.ok && res.data) {
        setProductos(res.data.productos);
        setReferenciaCompetencia(res.data.referenciaCompetencia);
        setLabelCompleto(res.data.labelCompleto);
        setBaseItemId(null);
      } else {
        setProductos([]);
        setReferenciaCompetencia(null);
        setLabelCompleto("");
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
    setReferenciaCompetencia(null);
    setLabelCompleto("");
    setBaseItemId(null);
  }, []);

  const handleSelectSubcategoria = useCallback((id: string) => {
    setSelectedSubcategoriaId(id);
    setSelectedPresentacionId(null);
    setProductos([]);
    setReferenciaCompetencia(null);
    setLabelCompleto("");
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

  const onReferenciaSuccess = useCallback(() => {
    setModalReferencia(false);
    if (selectedPresentacionId) void loadProductos(selectedPresentacionId);
  }, [selectedPresentacionId, loadProductos]);

  const handleQuitarReferencia = useCallback(async () => {
    if (!selectedPresentacionId || quitarReferenciaPending) return;
    setQuitarReferenciaPending(true);
    try {
      const res = await quitarReferenciaCompetenciaAction(selectedPresentacionId);
      if (!res.ok) {
        toast.error(res.error ?? "Error al quitar la referencia.");
        return;
      }
      setReferenciaCompetencia(null);
      toast.success("Referencia de competencia quitada.");
    } finally {
      setQuitarReferenciaPending(false);
    }
  }, [quitarReferenciaPending, selectedPresentacionId]);

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

  const pxReferenciaMargen = referenciaCompetencia?.pxMostrar ?? null;

  const columnasTabla = puedeEditar ? 7 : 6;

  return (
    <>
      <ClassicFilteredTableLayout
        title="Lista Proveedores"
        subtitle="Comparacion"
        contentWidth={COMP_CATEGORIAS_CONTENT_WIDTH}
        contentClassName={COMP_CATEGORIAS_PAGE_CONTENT_CLASS}
      >
        <div className={COMP_CATEGORIAS_COMPARISON_STACK_CLASS}>
          <div className={COMP_CATEGORIAS_SELECTOR_PANEL_CLASS}>
            <ComparacionCategoriaSelector
              arbol={arbolInicial}
              selectedCategoriaId={selectedCategoriaId}
              selectedSubcategoriaId={selectedSubcategoriaId}
              selectedPresentacionId={selectedPresentacionId}
              loadingReferencia={loadingProductos}
              referenciaCompetencia={referenciaCompetencia}
              puedeEditarReferencia={puedeEditar}
              quitarReferenciaPending={quitarReferenciaPending}
              onSelectCategoria={handleSelectCategoria}
              onSelectSubcategoria={handleSelectSubcategoria}
              onSelectPresentacion={handleSelectPresentacion}
              onElegirReferencia={() => setModalReferencia(true)}
              onQuitarReferencia={() => void handleQuitarReferencia()}
            />
          </div>

          <Card className={cn("flex flex-col gap-0 pt-0", COMP_CATEGORIAS_TABLA_PANEL_CLASS)}>
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
                      <col className={puedeEditar ? "w-[41%]" : "w-[48%]"} />
                      <col className="w-[12%]" />
                      <col className="w-[10%]" />
                      <col className="w-[14%]" />
                      {puedeEditar && <col className="w-[8%]" />}
                    </colgroup>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-center">TILDE</TableHead>
                        <TableHead className="text-center">PROVEEDOR</TableHead>
                        <TableHead>DESCRIPCIÓN</TableHead>
                        <TableHead className="text-right">COSTO</TableHead>
                        <TableHead className="text-center">VAR</TableHead>
                        <TableHead className="text-center tabla-bloque-secundario-head-divider">
                          MARGEN (SEGÚN PX REFERENCIA)
                        </TableHead>
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
                          const esBaseTilde = baseItemId === p.id;
                          const variacionPct = !hayBaseVar
                            ? null
                            : esBaseTilde
                              ? 0
                              : calcVariacionPct(p.pxCompraFinalSinIva, precioBaseVar);
                          const margenPxReferencia = calcMargenSegunPxReferencia(
                            pxReferenciaMargen,
                            p.pxCompraFinalSinIva
                          );

                          return (
                            <TableRow key={p.id} className="hover:bg-transparent">
                              <TableCell className="celda-datos text-center">
                                <label className="inline-flex cursor-pointer items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={esBaseTilde}
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
                              <TableCell className="celda-datos text-center tabular-nums tabla-bloque-secundario-cell-divider">
                                {margenPxReferencia != null ? (
                                  fmtMargenPxListaTabla(margenPxReferencia)
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
        <>
          <AsignarProductosModal
            open={modalAsignar}
            onOpenChange={setModalAsignar}
            presentacionId={selectedPresentacionId}
            onSuccess={onAsignarSuccess}
          />
          <ElegirReferenciaCompetenciaModal
            open={modalReferencia}
            onOpenChange={setModalReferencia}
            presentacionId={selectedPresentacionId}
            labelCompleto={labelCompleto}
            onSuccess={onReferenciaSuccess}
          />
        </>
      )}
    </>
  );
}
