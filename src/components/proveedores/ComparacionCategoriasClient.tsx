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
import { Plus, UserPlus, Check, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtPrecio, fmtPctEntero } from "@/lib/format";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosComparacionCategorias, {
  type ProveedorOption,
} from "@/components/proveedores/comparacion-categorias/FiltrosComparacionCategorias";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";
import type { ProductoEnCategoria } from "@/services/categoriasComparacion.service";
import type { Rol } from "@/lib/permisos";
import { PERMISOS, puede } from "@/lib/permisos";
import { getProductosPorPresentacionAction } from "@/actions/comparacionCategorias";
import GestionCategoriasModal from "@/components/proveedores/comparacion-categorias/GestionCategoriasModal";
import AsignarProductosModal from "@/components/proveedores/comparacion-categorias/AsignarProductosModal";

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
  const [selectedProductoId, setSelectedProductoId] = useState<string | null>(null);
  const [dtoEspecial, setDtoEspecial] = useState<Record<string, string>>({});

  const puedeEditar = puede(rol, PERMISOS.comparacionCategorias.editar);

  function pxConDto(pxOriginal: number | null, dtoStr: string): number | null {
    if (pxOriginal == null || pxOriginal <= 0) return null;
    const n = parseInt(dtoStr.trim(), 10);
    if (Number.isNaN(n) || n < 0 || n > 99) return pxOriginal;
    return pxOriginal * (1 - n / 100);
  }

  const productoReferencia = useMemo(
    () => (selectedProductoId ? productos.find((pr) => pr.id === selectedProductoId) : null),
    [productos, selectedProductoId]
  );
  const pxReferenciaOriginal = productoReferencia?.pxCompraFinal ?? null;
  const dtoRef = productoReferencia ? dtoEspecial[productoReferencia.id] ?? "" : "";
  const pxReferencia = useMemo(() => {
    if (pxReferenciaOriginal == null) return null;
    const conDto = pxConDto(pxReferenciaOriginal, dtoRef);
    return conDto != null ? conDto : pxReferenciaOriginal;
  }, [pxReferenciaOriginal, dtoRef]);

  function variacionVsReferencia(pxRow: number | null): { pct: number } | null {
    if (pxReferencia == null || pxReferencia <= 0 || pxRow == null) return null;
    const pct = ((pxRow - pxReferencia) / pxReferencia) * 100;
    return { pct };
  }

  const loadProductos = useCallback(async (presentacionId: string) => {
    setSelectedPresentacionId(presentacionId);
    setSelectedProductoId(null);
    setDtoEspecial({});
    setLoadingProductos(true);
    try {
      const res = await getProductosPorPresentacionAction(presentacionId);
      if (res.ok && res.data) {
        setProductos(res.data.productos);
        setLabelCompleto(res.data.labelCompleto ?? "");
      } else {
        setProductos([]);
        setLabelCompleto("");
      }
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  useEffect(() => {
    if (presentacionIdInicial) {
      loadProductos(presentacionIdInicial);
    }
  }, [presentacionIdInicial, loadProductos]);

  const refreshArbol = useCallback(() => {
    router.refresh();
  }, [router]);

  const onGestionClose = useCallback(() => {
    setModalGestion(false);
    router.refresh();
  }, [router]);

  const onAsignarSuccess = useCallback(() => {
    setModalAsignar(false);
    if (selectedPresentacionId) loadProductos(selectedPresentacionId);
  }, [selectedPresentacionId, loadProductos]);

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
          <CardContent className="flex-1 overflow-auto py-0 pb-3 px-0">
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
              <Table variant="compact" className="tabla-comparacion-cat tabla-gestion-compacta">
                <colgroup>
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "42%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-center w-[5%] p-1 align-middle" />
                    <TableHead>PROVEEDOR</TableHead>
                    <TableHead>MARCA</TableHead>
                    <TableHead>DESCRIPCION</TableHead>
                    <TableHead className="text-center">DTO. EXTRA</TableHead>
                    <TableHead>PX. FINAL COMPRA</TableHead>
                    <TableHead className="text-center">VARIACIÓN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((p) => {
                    const selected = selectedProductoId === p.id;
                    const dtoStr = dtoEspecial[p.id] ?? "";
                    const pxOriginal = p.pxCompraFinal;
                    const pxConDescuento = pxConDto(pxOriginal, dtoStr);
                    const pxEfectivo = pxConDescuento ?? pxOriginal;
                    const varData = variacionVsReferencia(pxEfectivo);
                    return (
                      <TableRow
                        key={p.id}
                        className={cn(selected && "bg-primary/10")}
                      >
                        <TableCell className="celda-datos w-[5%] p-1">
                          <button
                            type="button"
                            onClick={() => setSelectedProductoId(selected ? null : p.id)}
                            className={cn(
                              "selector-cuadro selector-cuadro--circle",
                              selected && "selector-cuadro--selected"
                            )}
                            aria-label={selected ? "Deseleccionar fila" : "Seleccionar fila"}
                          >
                            {selected ? (
                              <Check className="h-3.5 w-3.5 text-primary-foreground" />
                            ) : null}
                          </button>
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
                              className="h-8 w-14 text-center text-sm tabular-nums"
                            />
                            <span className="text-muted-foreground text-xs shrink-0">%</span>
                          </div>
                        </TableCell>
                        <TableCell className="celda-datos celda-numero">
                          {pxEfectivo != null ? `$${fmtPrecio(pxEfectivo)}` : "—"}
                        </TableCell>
                        <TableCell className="celda-datos text-center">
                          {varData == null ? (
                            "—"
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1 text-foreground font-semibold text-sm tabular-nums">
                              {varData.pct > 0 && (
                                <ArrowUp className="h-3.5 w-3.5 variacion-costo-icon--positiva shrink-0" />
                              )}
                              {varData.pct < 0 && (
                                <ArrowDown className="h-3.5 w-3.5 variacion-costo-icon--negativa shrink-0" />
                              )}
                              <span>{fmtPctEntero(varData.pct)}</span>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
