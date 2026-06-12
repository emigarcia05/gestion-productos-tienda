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
import {
  calcCostoComparacion,
  calcDifPctPxManualVsReferencia,
  calcMargenSegunPxReferencia,
} from "@/lib/calculos";
import { fmtPrecio } from "@/lib/format";
import { fmtMargenComparacionPct } from "@/lib/comparacionCategoriasFormat";
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
import CeldaDtoExtraComparacion from "@/components/proveedores/comparacion-categorias/CeldaDtoExtraComparacion";
import CeldaPxManualComparacion from "@/components/proveedores/comparacion-categorias/CeldaPxManualComparacion";
import { toast } from "sonner";

interface Props {
  arbolInicial: CategoriaComparacionTree[];
  rol: Rol;
}

function calcVariacionPct(costo: number | null, base: number | null): number | null {
  if (costo == null || costo <= 0 || base == null || base <= 0) return null;
  return ((costo - base) / base) * 100;
}

function resolveDtoExtraVivo(
  codExt: string,
  guardado: number | null,
  draft: Record<string, number | null>
): number | null {
  if (Object.prototype.hasOwnProperty.call(draft, codExt)) {
    return draft[codExt];
  }
  return guardado;
}

function resolveCostoComparacionVivo(
  producto: ProductoEnCategoria,
  dtoExtraDraft: Record<string, number | null>
): number | null {
  const dtoExtra = resolveDtoExtraVivo(
    producto.codExt,
    producto.dtoExtraComparacion,
    dtoExtraDraft
  );
  return calcCostoComparacion(producto.datosCosto, dtoExtra);
}

/** Base VAR: tilde manual o, si no hay, el costo más bajo entre los productos comparados. */
function resolveCostoBaseVar(
  productos: ProductoEnCategoria[],
  baseItemId: string | null,
  dtoExtraDraft: Record<string, number | null>
): { costoBase: number | null; baseIdEfectivo: string | null } {
  if (baseItemId) {
    const manual = productos.find((p) => p.id === baseItemId);
    const px = manual ? resolveCostoComparacionVivo(manual, dtoExtraDraft) : null;
    if (px != null && px > 0) {
      return { costoBase: px, baseIdEfectivo: baseItemId };
    }
  }

  let baseIdEfectivo: string | null = null;
  let costoBase: number | null = null;
  for (const p of productos) {
    const px = resolveCostoComparacionVivo(p, dtoExtraDraft);
    if (px == null || px <= 0) continue;
    if (costoBase == null || px < costoBase) {
      costoBase = px;
      baseIdEfectivo = p.id;
    }
  }
  return { costoBase, baseIdEfectivo };
}

export default function ComparacionCategoriasClient({ arbolInicial, rol }: Props) {
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);
  const [selectedSubcategoriaId, setSelectedSubcategoriaId] = useState<string | null>(null);
  const [selectedPresentacionId, setSelectedPresentacionId] = useState<string | null>(null);
  const [productos, setProductos] = useState<ProductoEnCategoria[]>([]);
  const [referenciasCompetencia, setReferenciasCompetencia] = useState<
    ReferenciaCompetenciaPresentacion[]
  >([]);
  const [referenciaActivaId, setReferenciaActivaId] = useState<string | null>(null);
  const [labelCompleto, setLabelCompleto] = useState("");
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalReferencia, setModalReferencia] = useState(false);
  const [quitarReferenciaPendingId, setQuitarReferenciaPendingId] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [baseItemId, setBaseItemId] = useState<string | null>(null);
  const [pxManualDraft, setPxManualDraft] = useState<Record<string, number | null>>({});
  const [dtoExtraDraft, setDtoExtraDraft] = useState<Record<string, number | null>>({});

  const puedeEditar = puede(rol, PERMISOS.comparacionCategorias.editar);

  const { costoBase: costoBaseVar, baseIdEfectivo: baseIdEfectivoVar } = useMemo(
    () => resolveCostoBaseVar(productos, baseItemId, dtoExtraDraft),
    [productos, baseItemId, dtoExtraDraft]
  );

  const hayBaseVar = costoBaseVar != null;

  const loadProductos = useCallback(async (presentacionId: string) => {
    setLoadingProductos(true);
    try {
      const res = await getProductosPorPresentacionAction(presentacionId);
      if (res.ok && res.data) {
        setProductos(res.data.productos);
        setReferenciasCompetencia(res.data.referenciasCompetencia);
        setReferenciaActivaId((prev) => {
          const refs = res.data.referenciasCompetencia;
          if (refs.length === 0) return null;
          if (prev && refs.some((r) => r.id === prev)) return prev;
          return refs[0]?.id ?? null;
        });
        setLabelCompleto(res.data.labelCompleto);
        setBaseItemId(null);
        setPxManualDraft({});
        setDtoExtraDraft({});
      } else {
        setProductos([]);
        setReferenciasCompetencia([]);
        setReferenciaActivaId(null);
        setLabelCompleto("");
        setBaseItemId(null);
        setPxManualDraft({});
        setDtoExtraDraft({});
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
    setReferenciasCompetencia([]);
    setReferenciaActivaId(null);
    setLabelCompleto("");
    setBaseItemId(null);
    setPxManualDraft({});
    setDtoExtraDraft({});
  }, []);

  const handleSelectSubcategoria = useCallback((id: string) => {
    setSelectedSubcategoriaId(id);
    setSelectedPresentacionId(null);
    setProductos([]);
    setReferenciasCompetencia([]);
    setReferenciaActivaId(null);
    setLabelCompleto("");
    setBaseItemId(null);
    setPxManualDraft({});
    setDtoExtraDraft({});
  }, []);

  const handleSelectPresentacion = useCallback(
    (id: string) => {
      setSelectedPresentacionId(id);
      setBaseItemId(null);
      setPxManualDraft({});
      setDtoExtraDraft({});
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

  const handleQuitarReferencia = useCallback(
    async (refCompId: string) => {
      if (quitarReferenciaPendingId != null) return;
      setQuitarReferenciaPendingId(refCompId);
      try {
        const res = await quitarReferenciaCompetenciaAction(refCompId);
        if (!res.ok) {
          toast.error(res.error ?? "Error al quitar la referencia.");
          return;
        }
        setReferenciasCompetencia((prev) => {
          const next = prev.filter((r) => r.id !== refCompId);
          setReferenciaActivaId((activa) => {
            if (activa !== refCompId) return activa;
            return next[0]?.id ?? null;
          });
          return next;
        });
        toast.success("Referencia de competencia quitada.");
      } finally {
        setQuitarReferenciaPendingId(null);
      }
    },
    [quitarReferenciaPendingId]
  );

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

  const referenciaActiva = useMemo(
    () => referenciasCompetencia.find((r) => r.id === referenciaActivaId) ?? null,
    [referenciasCompetencia, referenciaActivaId]
  );

  const pxReferenciaMargen = referenciaActiva?.pxMostrar ?? null;

  const columnasTabla = puedeEditar ? 11 : 10;

  const resolvePxManualVivo = useCallback(
    (codExt: string, guardado: number | null): number | null => {
      if (Object.prototype.hasOwnProperty.call(pxManualDraft, codExt)) {
        return pxManualDraft[codExt];
      }
      return guardado;
    },
    [pxManualDraft]
  );

  const handlePxManualDraft = useCallback((codExt: string, pxManual: number | null) => {
    setPxManualDraft((prev) => ({ ...prev, [codExt]: pxManual }));
  }, []);

  const handlePxManualDraftEnd = useCallback((codExt: string) => {
    setPxManualDraft((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, codExt)) return prev;
      const next = { ...prev };
      delete next[codExt];
      return next;
    });
  }, []);

  const handlePxManualSaved = useCallback((codExt: string, pxManual: number | null) => {
    setProductos((prev) =>
      prev.map((p) => (p.codExt === codExt ? { ...p, pxManualComparacion: pxManual } : p))
    );
    handlePxManualDraftEnd(codExt);
  }, [handlePxManualDraftEnd]);

  const handleDtoExtraDraft = useCallback((codExt: string, dtoExtra: number | null) => {
    setDtoExtraDraft((prev) => ({ ...prev, [codExt]: dtoExtra }));
  }, []);

  const handleDtoExtraDraftEnd = useCallback((codExt: string) => {
    setDtoExtraDraft((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, codExt)) return prev;
      const next = { ...prev };
      delete next[codExt];
      return next;
    });
  }, []);

  const handleDtoExtraSaved = useCallback(
    (codExt: string, dtoExtra: number | null) => {
      setProductos((prev) =>
        prev.map((p) => {
          if (p.codExt !== codExt) return p;
          const pxCompraFinalSinIva = calcCostoComparacion(p.datosCosto, dtoExtra);
          return { ...p, dtoExtraComparacion: dtoExtra, pxCompraFinalSinIva };
        })
      );
      handleDtoExtraDraftEnd(codExt);
    },
    [handleDtoExtraDraftEnd]
  );

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
              referenciasCompetencia={referenciasCompetencia}
              referenciaActivaId={referenciaActivaId}
              puedeEditarReferencia={puedeEditar}
              quitarReferenciaPendingId={quitarReferenciaPendingId}
              onSelectCategoria={handleSelectCategoria}
              onSelectSubcategoria={handleSelectSubcategoria}
              onSelectPresentacion={handleSelectPresentacion}
              onSelectReferenciaActiva={setReferenciaActivaId}
              onAgregarReferencia={() => setModalReferencia(true)}
              onQuitarReferencia={(refCompId) => void handleQuitarReferencia(refCompId)}
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
                  <Table variant="compact" scrollX>
                    <colgroup>
                      <col className="w-[3%]" />
                      <col className="w-[7%]" />
                      <col className={puedeEditar ? "w-[12%]" : "w-[14%]"} />
                      <col className="w-[6%]" />
                      <col className="w-[8%]" />
                      <col className="w-[7%]" />
                      <col className="w-[9%]" />
                      <col className="w-[8%]" />
                      <col className="w-[8%]" />
                      <col className="w-[9%]" />
                      {puedeEditar && <col className="w-[8%]" />}
                    </colgroup>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-center">TILDE</TableHead>
                        <TableHead className="text-center">PROVEEDOR</TableHead>
                        <TableHead>DESCRIPCIÓN</TableHead>
                        <TableHead className="text-center">DTO. EXTRA</TableHead>
                        <TableHead className="text-right">COSTO</TableHead>
                        <TableHead className="text-center">VAR</TableHead>
                        <TableHead className="text-center tabla-bloque-secundario-head-divider">
                          MARGEN (SEGÚN PX REFERENCIA)
                        </TableHead>
                        <TableHead className="text-center tabla-bloque-secundario-head">
                          PX MANUAL
                        </TableHead>
                        <TableHead className="text-center tabla-bloque-secundario-head">
                          DIF C/ REF.
                        </TableHead>
                        <TableHead className="text-center tabla-bloque-secundario-head">
                          MARGEN (SEGÚN PX MANUAL)
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
                          const esBaseVar = p.id === baseIdEfectivoVar;
                          const costoVivo = resolveCostoComparacionVivo(p, dtoExtraDraft);
                          const variacionPct = !hayBaseVar
                            ? null
                            : esBaseVar
                              ? 0
                              : calcVariacionPct(costoVivo, costoBaseVar);
                          const margenPxReferencia = calcMargenSegunPxReferencia(
                            pxReferenciaMargen,
                            costoVivo
                          );
                          const pxManualGuardado = p.pxManualComparacion;
                          const pxManual = resolvePxManualVivo(p.codExt, pxManualGuardado);
                          const difManualVsRef = calcDifPctPxManualVsReferencia(
                            pxManual,
                            pxReferenciaMargen
                          );
                          const margenPxManual = calcMargenSegunPxReferencia(
                            pxManual,
                            costoVivo
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
                              <TableCell className="celda-datos text-center">
                                <CeldaDtoExtraComparacion
                                  codExt={p.codExt}
                                  dtoExtra={p.dtoExtraComparacion}
                                  puedeEditar={puedeEditar}
                                  onDraftChange={(valor) => handleDtoExtraDraft(p.codExt, valor)}
                                  onDraftEnd={() => handleDtoExtraDraftEnd(p.codExt)}
                                  onSaved={(valor) => handleDtoExtraSaved(p.codExt, valor)}
                                />
                              </TableCell>
                              <TableCell className="celda-datos celda-numero text-right">
                                {costoVivo != null ? `$${fmtPrecio(costoVivo)}` : "—"}
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
                                  fmtMargenComparacionPct(margenPxReferencia)
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="celda-datos text-center tabla-bloque-secundario-cell">
                                <CeldaPxManualComparacion
                                  codExt={p.codExt}
                                  pxManual={pxManualGuardado}
                                  puedeEditar={puedeEditar}
                                  onDraftChange={(valor) => handlePxManualDraft(p.codExt, valor)}
                                  onDraftEnd={() => handlePxManualDraftEnd(p.codExt)}
                                  onSaved={(valor) => handlePxManualSaved(p.codExt, valor)}
                                />
                              </TableCell>
                              <TableCell className="celda-datos text-center tabla-bloque-secundario-cell">
                                {difManualVsRef != null ? (
                                  <CeldaDifPct pct={difManualVsRef} />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="celda-datos text-center tabular-nums tabla-bloque-secundario-cell">
                                {margenPxManual != null ? (
                                  fmtMargenComparacionPct(margenPxManual)
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
