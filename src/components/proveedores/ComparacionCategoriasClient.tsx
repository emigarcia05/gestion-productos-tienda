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
import { Plus, Pencil, UserPlus, Check, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtPrecio } from "@/lib/format";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosComparacionCategorias from "@/components/proveedores/comparacion-categorias/FiltrosComparacionCategorias";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";
import type { ProductoEnCategoria } from "@/services/categoriasComparacion.service";
import type { Rol } from "@/lib/permisos";
import { PERMISOS, puede } from "@/lib/permisos";
import { getProductosPorPresentacionAction } from "@/actions/comparacionCategorias";
import GestionCategoriasModal from "@/components/proveedores/comparacion-categorias/GestionCategoriasModal";
import EditarCostoObjetivoModal from "@/components/proveedores/comparacion-categorias/EditarCostoObjetivoModal";
import AsignarProductosModal from "@/components/proveedores/comparacion-categorias/AsignarProductosModal";

interface Props {
  arbolInicial: CategoriaComparacionTree[];
  rol: Rol;
  marcas: string[];
  marcaInicial: string;
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
  marcas,
  marcaInicial,
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
  const [costoCompraObjetivo, setCostoCompraObjetivo] = useState<number | null>(null);
  const [labelCompleto, setLabelCompleto] = useState("");
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalGestion, setModalGestion] = useState(false);
  const [modalCostoObjetivo, setModalCostoObjetivo] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [selectedProductoId, setSelectedProductoId] = useState<string | null>(null);

  const puedeEditar = puede(rol, PERMISOS.comparacionCategorias.editar);

  const loadProductos = useCallback(async (presentacionId: string) => {
    setSelectedPresentacionId(presentacionId);
    setSelectedProductoId(null);
    setLoadingProductos(true);
    try {
      const res = await getProductosPorPresentacionAction(presentacionId);
      if (res.ok && "productos" in res) {
        setProductos(res.productos);
        setCostoCompraObjetivo(res.costoCompraObjetivo ?? null);
        setLabelCompleto(res.labelCompleto ?? "");
      } else {
        setProductos([]);
        setCostoCompraObjetivo(null);
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

  const onCostoObjetivoSaved = useCallback((valor: number | null) => {
    setCostoCompraObjetivo(valor);
    setModalCostoObjetivo(false);
    router.refresh();
  }, [router]);

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

  const productoReferencia = useMemo(
    () => productos.find((p) => p.id === selectedProductoId) ?? null,
    [productos, selectedProductoId]
  );

  const filters = (
    <FiltrosComparacionCategorias
      marcas={marcas}
      arbol={arbol}
      marcaActual={marcaInicial}
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
        subtitle="Comp. por Categorías"
        actions={acciones}
        filters={filters}
      >
        <div className="flex-1 min-h-0 flex py-3">
          <Card className="flex-1 flex flex-col min-h-0 min-w-0">
          <CardHeader className="py-3 flex flex-row items-center justify-between gap-2 flex-wrap">
            <div>
              {selectedPresentacionId ? (
                <>
                  <h2 className="text-sm font-bold text-foreground">{labelCompleto || "Cargando…"}</h2>
                  {costoCompraObjetivo != null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Costo compra objetivo: ${fmtPrecio(costoCompraObjetivo)}
                      {puedeEditar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 ml-1 text-xs"
                          onClick={() => setModalCostoObjetivo(true)}
                        >
                          <Pencil className="h-3 w-3 mr-0.5" />
                          Editar
                        </Button>
                      )}
                    </p>
                  )}
                  {costoCompraObjetivo == null && puedeEditar && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 h-8 text-xs"
                      onClick={() => setModalCostoObjetivo(true)}
                    >
                      Definir costo compra objetivo
                    </Button>
                  )}
                </>
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
          <CardContent className="flex-1 overflow-auto py-0 pb-3">
            {loadingProductos ? (
              <p className="text-sm text-muted-foreground py-4">Cargando productos…</p>
            ) : !selectedPresentacionId ? (
              <p className="text-sm text-muted-foreground py-4">
                Elegí Marca, Categoría, Subcategoría y Presentación en los filtros para ver los productos y comparar con el costo objetivo.
              </p>
            ) : productos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No hay productos asignados a esta categoría. Usá «Asignar productos» para agregar.
              </p>
            ) : (
              <Table variant="compact" className="tabla-comparacion-cat tabla-gestion-compacta">
                <colgroup>
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "55%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-center">
                      <span className="selector-cuadro selector-cuadro--selected" aria-hidden>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </TableHead>
                    <TableHead>PROVEEDOR</TableHead>
                    <TableHead>MARCA</TableHead>
                    <TableHead>DESCRIPCION</TableHead>
                    <TableHead>PX FINAL COMPRA</TableHead>
                    <TableHead>VARIACION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((p) => {
                    const selected = selectedProductoId === p.id;
                    // Con producto seleccionado: base = px del producto referencia; sin selección: base = Costo Compra Objetivo
                    const basePx =
                      productoReferencia?.pxCompraFinal ?? costoCompraObjetivo ?? null;
                    const pct =
                      basePx != null &&
                      basePx !== 0 &&
                      p.pxCompraFinal != null
                        ? Math.round(((p.pxCompraFinal - basePx) / basePx) * 100)
                        : null;
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
                              "selector-cuadro",
                              selected && "selector-cuadro--selected"
                            )}
                            aria-label={selected ? "Deseleccionar fila" : "Seleccionar fila"}
                          >
                            {selected ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : null}
                          </button>
                        </TableCell>
                        <TableCell className="celda-datos celda-mono">{p.proveedorPrefijo ?? "—"}</TableCell>
                        <TableCell className="celda-datos">{p.marca ?? "—"}</TableCell>
                        <TableCell className="celda-datos min-w-0 truncate">{p.descripcionProveedor}</TableCell>
                        <TableCell className="celda-datos celda-numero">
                          {p.pxCompraFinal != null ? `$${fmtPrecio(p.pxCompraFinal)}` : "—"}
                        </TableCell>
                        <TableCell className="celda-datos celda-numero">
                          {pct != null ? (
                            <span
                              className={cn(
                                pct > 0 && "variacion-costo--positiva",
                                pct < 0 && "variacion-costo--negativa",
                                pct === 0 && "variacion-costo--neutra"
                              )}
                            >
                              <span className="inline-flex items-center gap-1">
                                {pct > 0 && (
                                  <ArrowUpRight className="h-3.5 w-3.5 variacion-costo-icon--positiva" />
                                )}
                                {pct < 0 && (
                                  <ArrowDownRight className="h-3.5 w-3.5 variacion-costo-icon--negativa" />
                                )}
                                <span>{`${pct > 0 ? "+" : ""}${pct}%`}</span>
                              </span>
                            </span>
                          ) : (
                            "—"
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
            <EditarCostoObjetivoModal
              open={modalCostoObjetivo}
              onOpenChange={setModalCostoObjetivo}
              presentacionId={selectedPresentacionId}
              valorActual={costoCompraObjetivo}
              labelCompleto={labelCompleto}
              onSaved={onCostoObjetivoSaved}
            />
          )}
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
