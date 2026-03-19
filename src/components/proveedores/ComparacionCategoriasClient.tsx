"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, UserPlus, ArrowUp, ArrowDown, Loader2, Trash2 } from "lucide-react";
import { fmtPrecio, fmtPctEntero } from "@/lib/format";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosComparacionCategorias, {
  type ProveedorOption,
} from "@/components/proveedores/comparacion-categorias/FiltrosComparacionCategorias";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";
import type { ProductoEnCategoria } from "@/services/categoriasComparacion.service";
import type { Rol } from "@/lib/permisos";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  getProductosPorPresentacionAction,
  actualizarDtoExtraComparacionAction,
  quitarAsignacionPresentacionAction,
} from "@/actions/comparacionCategorias";
import GestionCategoriasModal from "@/components/proveedores/comparacion-categorias/GestionCategoriasModal";
import AsignarProductosModal from "@/components/proveedores/comparacion-categorias/AsignarProductosModal";
import { toast } from "sonner";

interface Props {
  arbolInicial: CategoriaComparacionTree[];
  rol: Rol;
  proveedores: ProveedorOption[];
  proveedorInicial: string;
  categoriaIdInicial: string;
  subcategoriaIdInicial: string;
  presentacionIdInicial: string;
  qInicial: string;
}

function countPresentaciones(arb: CategoriaComparacionTree[]): number {
  return arb.reduce(
    (acc, c) =>
      acc + c.subcategorias.reduce((s, sub) => s + sub.presentaciones.length, 0),
    0
  );
}

export default function ComparacionCategoriasClient({
  arbolInicial,
  rol,
  proveedores,
  proveedorInicial,
  categoriaIdInicial,
  subcategoriaIdInicial,
  presentacionIdInicial,
  qInicial,
}: Props) {
  const router = useRouter();
  const [arbol, setArbol] = useState(arbolInicial);
  useEffect(() => {
    setArbol(arbolInicial);
  }, [arbolInicial]);
  const [selectedPresentacionId, setSelectedPresentacionId] = useState<string | null>(
    presentacionIdInicial || null
  );
  const [productos, setProductos] = useState<ProductoEnCategoria[]>([]);
  const [labelCompleto, setLabelCompleto] = useState("");
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalGestion, setModalGestion] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [dtoEspecial, setDtoEspecial] = useState<Record<string, string>>({});
  const [savingDtoExtra, setSavingDtoExtra] = useState<Record<string, boolean>>({});
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);

  const puedeEditar = puede(rol, PERMISOS.comparacionCategorias.editar);

  function pxConDto(pxOriginal: number | null, dtoStr: string): number | null {
    if (pxOriginal == null || pxOriginal <= 0) return null;
    const n = parseInt(dtoStr.trim(), 10);
    if (Number.isNaN(n) || n < 0 || n > 99) return pxOriginal;
    return pxOriginal * (1 - n / 100);
  }

  const pxMinEfectivo = useMemo(() => {
    const valores = productos
      .map((p) => {
        const dtoStr = dtoEspecial[p.id] ?? "";
        const pxOriginal = p.pxCompraFinal;
        const pxConDescuento = pxConDto(pxOriginal, dtoStr);
        const pxEfectivo = pxConDescuento ?? pxOriginal;
        return pxEfectivo;
      })
      .filter((n): n is number => n != null && n > 0);

    if (valores.length === 0) return null;
    return Math.min(...valores);
  }, [productos, dtoEspecial]);

  const loadProductos = useCallback(async (presentacionId: string) => {
    setSelectedPresentacionId(presentacionId);
    setDtoEspecial({});
    setSelectedCompareIds([]);
    setLoadingProductos(true);
    try {
      const res = await getProductosPorPresentacionAction(presentacionId);
      if (res.ok && res.data) {
        setProductos(res.data.productos);
        setLabelCompleto(res.data.labelCompleto ?? "");
        setDtoEspecial(
          res.data.productos.reduce<Record<string, string>>((acc, pr) => {
            acc[pr.id] = pr.dtoExtraComparacion != null ? String(pr.dtoExtraComparacion) : "";
            return acc;
          }, {})
        );
      } else {
        setProductos([]);
        setLabelCompleto("");
      }
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  const guardarDtoExtra = useCallback(
    async (listaPrecioProveedorId: string, draft: string) => {
      if (savingDtoExtra[listaPrecioProveedorId]) return;

      const prev = productos.find((p) => p.id === listaPrecioProveedorId);
      const dtoPrev = prev?.dtoExtraComparacion ?? null;

      const trimmed = draft.trim();
      const dtoExtra = trimmed === "" ? null : parseInt(trimmed, 10);
      if (dtoExtra !== null && (Number.isNaN(dtoExtra) || dtoExtra < 0 || dtoExtra > 99)) {
        setDtoEspecial((prevMap) => ({
          ...prevMap,
          [listaPrecioProveedorId]: dtoPrev != null ? String(dtoPrev) : "",
        }));
        return;
      }

      if (dtoPrev === dtoExtra) return;

      setSavingDtoExtra((prevMap) => ({ ...prevMap, [listaPrecioProveedorId]: true }));
      try {
        const res = await actualizarDtoExtraComparacionAction(listaPrecioProveedorId, dtoExtra);
        if (!res.ok) {
          toast.error(res.error ?? "Error al guardar DTO extra.");
          setDtoEspecial((prevMap) => ({
            ...prevMap,
            [listaPrecioProveedorId]: dtoPrev != null ? String(dtoPrev) : "",
          }));
          return;
        }

        // Mantener UI consistente.
        setProductos((prevList) =>
          prevList.map((p) =>
            p.id === listaPrecioProveedorId ? { ...p, dtoExtraComparacion: dtoExtra } : p
          )
        );
      } finally {
        setSavingDtoExtra((prevMap) => ({ ...prevMap, [listaPrecioProveedorId]: false }));
      }
    },
    [productos, savingDtoExtra]
  );

  useEffect(() => {
    if (presentacionIdInicial) {
      loadProductos(presentacionIdInicial);
    }
  }, [presentacionIdInicial, loadProductos]);

  const refreshArbol = useCallback(() => {
    router.refresh();
  }, [router]);

  const onAsignarSuccess = useCallback(() => {
    setModalAsignar(false);
    if (selectedPresentacionId) loadProductos(selectedPresentacionId);
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
        setSelectedCompareIds((prev) => prev.filter((id) => id !== itemId));
        setDtoEspecial((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      } finally {
        setRemovingItemId(null);
      }
    },
    [removingItemId, selectedPresentacionId]
  );

  const toggleCompareSelection = useCallback((itemId: string) => {
    setSelectedCompareIds((prev) => {
      if (prev.includes(itemId)) return prev.filter((id) => id !== itemId);
      if (prev.length >= 2) return prev;
      return [...prev, itemId];
    });
  }, []);

  const acciones = puedeEditar ? (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="default"
        size="default"
        className="btn-primario-gestion gap-2"
        onClick={() => setModalGestion(true)}
      >
        <Plus className="h-4 w-4" />
        Gestionar Categorías
      </Button>
    </div>
  ) : undefined;

  const totalPresentaciones = useMemo(() => countPresentaciones(arbol), [arbol]);

  const filters = (
    <FiltrosComparacionCategorias
      proveedores={proveedores}
      arbol={arbol}
      proveedorActual={proveedorInicial}
      categoriaIdActual={categoriaIdInicial}
      subcategoriaIdActual={subcategoriaIdInicial}
      presentacionIdActual={presentacionIdInicial}
      qActual={qInicial}
      totalPresentaciones={totalPresentaciones}
    />
  );

  return (
    <>
      <ClassicFilteredTableLayout
        title="Lista Proveedores"
        subtitle="Comp. Por Cat."
        actions={acciones}
        filters={filters}
      >
        <div className="flex-1 min-h-0 flex py-3">
          <Card className="flex-1 flex flex-col min-h-0 min-w-0 gap-0 pt-0">
          <CardHeader className="py-3 flex flex-row items-center justify-between gap-2 flex-wrap px-6">
            <div>
              {selectedPresentacionId ? (
                <h2 className="text-sm font-bold text-foreground">{labelCompleto || "Cargando…"}</h2>
              ) : (
                <h2 className="text-sm font-bold text-muted-foreground">
                  Seleccioná una presentación con los filtros (Marca, Categoría, Subcategoría, Presentación)
                </h2>
              )}
            </div>
            {selectedPresentacionId && puedeEditar && (
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
            )}
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden py-0 pb-3 px-0">
            {loadingProductos ? (
              <p className="text-sm text-muted-foreground py-4">Cargando productos…</p>
            ) : !selectedPresentacionId ? (
              <p className="text-sm text-muted-foreground py-4">
                Elegí Marca, Categoría, Subcategoría y Presentación en los filtros para ver los productos de la lista.
              </p>
            ) : productos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No hay productos asignados a esta categoría. Usá «Asignar productos» para agregar.
              </p>
            ) : (
              <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
                <Table variant="compact" scrollX={false} className="tabla-comparacion-cat">
                  <colgroup>
                    <col className="w-[2%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[50%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    {puedeEditar && <col className="w-[4%]" />}
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-center w-[6%]">SEL.</TableHead>
                      <TableHead>PROVEEDOR</TableHead>
                      <TableHead>MARCA</TableHead>
                      <TableHead>DESCRIPCION</TableHead>
                      <TableHead className="text-center">DTO. EXTRA</TableHead>
                      <TableHead>PX. FINAL COMPRA</TableHead>
                      <TableHead className="text-center">VARIACIÓN</TableHead>
                      {puedeEditar && (
                        <TableHead className="text-center">
                          <Trash2 className="h-4 w-4 mx-auto text-foreground" aria-hidden />
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productos.map((p) => {
                      const isSelectedForCompare = selectedCompareIds.includes(p.id);
                      const dtoStr = dtoEspecial[p.id] ?? "";
                      const pxOriginal = p.pxCompraFinal;
                      const pxConDescuento = pxConDto(pxOriginal, dtoStr);
                      const pxEfectivo = pxConDescuento ?? pxOriginal;

                      return (
                        <TableRow
                          key={p.id}
                          className="hover:bg-transparent"
                        >
                          <TableCell className="celda-datos text-center">
                            <input
                              type="checkbox"
                              checked={isSelectedForCompare}
                              onChange={() => toggleCompareSelection(p.id)}
                              disabled={
                                !isSelectedForCompare &&
                                selectedCompareIds.length >= 2
                              }
                              className="h-4 w-4 accent-primary cursor-pointer"
                              aria-label={`Seleccionar ${p.descripcionProveedor} para comparar`}
                            />
                          </TableCell>
                          <TableCell className="celda-datos celda-mono">{p.proveedorPrefijo ?? "—"}</TableCell>
                          <TableCell className="celda-datos">{p.marca ?? "—"}</TableCell>
                          <TableCell className="celda-datos min-w-0 truncate">{p.descripcionProveedor}</TableCell>
                          <TableCell className="celda-datos p-1">
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={2}
                                placeholder="%"
                                value={dtoStr}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                                  setDtoEspecial((prev) => ({ ...prev, [p.id]: v }));
                                }}
                                onBlur={() => guardarDtoExtra(p.id, dtoStr)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                                }}
                                className="h-8 w-14 text-center text-sm tabular-nums"
                                disabled={savingDtoExtra[p.id] ?? false}
                              />
                              <span className="text-muted-foreground text-xs shrink-0">%</span>
                              {savingDtoExtra[p.id] ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="celda-datos celda-numero">
                            {pxEfectivo != null ? `$${fmtPrecio(pxEfectivo)}` : "—"}
                          </TableCell>
                          <TableCell className="celda-datos text-center">
                            {(() => {
                              // Solo mostrar variación en filas con casilla marcada.
                              if (!isSelectedForCompare) return "";

                              if (selectedCompareIds.length === 2) {
                                const [idA, idB] = selectedCompareIds;
                                const rowA = productos.find((pr) => pr.id === idA);
                                const rowB = productos.find((pr) => pr.id === idB);
                                if (!rowA || !rowB) return "";

                                const dtoA = dtoEspecial[rowA.id] ?? "";
                                const dtoB = dtoEspecial[rowB.id] ?? "";
                                const pxA = (pxConDto(rowA.pxCompraFinal, dtoA) ?? rowA.pxCompraFinal) as number | null;
                                const pxB = (pxConDto(rowB.pxCompraFinal, dtoB) ?? rowB.pxCompraFinal) as number | null;
                                if (pxA == null || pxB == null || pxA <= 0 || pxB <= 0) return "";

                                // Comparación entre los 2 seleccionados: base = menor precio.
                                const base = Math.min(pxA, pxB);
                                if (base <= 0) return "";
                                const precioActual = p.id === idA ? pxA : pxB;
                                const pct = ((precioActual - base) / base) * 100;

                                return (
                                  <span className="inline-flex items-center justify-center gap-1 text-foreground font-semibold text-sm tabular-nums">
                                    {pct > 0 && (
                                      <ArrowUp className="h-3.5 w-3.5 variacion-costo-icon--positiva shrink-0" />
                                    )}
                                    {pct < 0 && (
                                      <ArrowDown className="h-3.5 w-3.5 variacion-costo-icon--negativa shrink-0" />
                                    )}
                                    <span>{fmtPctEntero(pct)}</span>
                                  </span>
                                );
                              }

                              // Si hay solo 1 seleccionado, mostrar variación vs mínimo para esa fila.
                              if (pxEfectivo == null || pxEfectivo <= 0 || pxMinEfectivo == null || pxMinEfectivo <= 0) {
                                return "";
                              }
                              const pct = ((pxEfectivo - pxMinEfectivo) / pxMinEfectivo) * 100;
                              return (
                                <span className="inline-flex items-center justify-center gap-1 text-foreground font-semibold text-sm tabular-nums">
                                  {pct > 0 && (
                                    <ArrowUp className="h-3.5 w-3.5 variacion-costo-icon--positiva shrink-0" />
                                  )}
                                  {pct < 0 && (
                                    <ArrowDown className="h-3.5 w-3.5 variacion-costo-icon--negativa shrink-0" />
                                  )}
                                  <span>{fmtPctEntero(pct)}</span>
                                </span>
                              );
                            })()}
                          </TableCell>
                          {puedeEditar && (
                            <TableCell className="celda-datos text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-foreground hover:text-destructive"
                                onClick={() => handleQuitarFila(p.id)}
                                disabled={removingItemId === p.id}
                                title="Quitar fila"
                              >
                                {removingItemId === p.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </ClassicFilteredTableLayout>

      {puedeEditar && (
        <>
          <GestionCategoriasModal
            open={modalGestion}
            onOpenChange={setModalGestion}
            arbol={arbol}
            onSuccess={refreshArbol}
          />
          {selectedPresentacionId && (
            <AsignarProductosModal
              open={modalAsignar}
              onOpenChange={setModalAsignar}
              presentacionId={selectedPresentacionId}
              onSuccess={onAsignarSuccess}
            />
          )}
        </>
      )}
    </>
  );
}
