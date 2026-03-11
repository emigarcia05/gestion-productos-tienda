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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FolderOpen, Layers, Package, Plus, Pencil, UserPlus } from "lucide-react";
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

  const puedeEditar = puede(rol, PERMISOS.comparacionCategorias.editar);

  const loadProductos = useCallback(async (presentacionId: string) => {
    setSelectedPresentacionId(presentacionId);
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
        Gestionar categorías
      </Button>
    </div>
  ) : undefined;

  const totalPresentaciones = useMemo(() => countPresentaciones(arbol), [arbol]);

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
        subtitle="Comparacion Cat."
        actions={acciones}
        filters={filters}
      >
        <div className="flex-1 min-h-0 flex gap-4 py-3">
          {/* Panel izquierdo: árbol */}
          <Card className="w-80 shrink-0 flex flex-col min-h-0">
          <CardHeader className="py-3">
            <h2 className="text-sm font-bold text-foreground">Categorías</h2>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto py-0 pb-3">
            {arbol.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No hay categorías. {puedeEditar && "Usá «Gestionar categorías» para crear."}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {arbol.map((cat) => (
                  <li key={cat.id}>
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger className="flex items-center gap-1.5 w-full rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-muted">
                        <ChevronDown className="h-4 w-4 shrink-0 [.group:not([data-state=open])_&]:rotate-[-90deg]" />
                        <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{cat.nombre}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ul className="ml-4 mt-0.5 space-y-0.5">
                          {cat.subcategorias.map((sub) => (
                            <li key={sub.id}>
                              <Collapsible defaultOpen>
                                <CollapsibleTrigger className="flex items-center gap-1.5 w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                                  <ChevronRight className="h-3.5 w-3.5 shrink-0 [.group:not([data-state=open])_&]:rotate-[-90deg]" />
                                  <Layers className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{sub.nombre}</span>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <ul className="ml-4 mt-0.5 space-y-0.5">
                                    {sub.presentaciones.map((pre) => (
                                      <li key={pre.id}>
                                        <button
                                          type="button"
                                          onClick={() => loadProductos(pre.id)}
                                          className={cn(
                                            "flex items-center gap-1.5 w-full rounded-md px-2 py-1.5 text-left text-sm",
                                            selectedPresentacionId === pre.id
                                              ? "bg-primary/15 text-primary font-medium"
                                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                          )}
                                        >
                                          <Package className="h-3.5 w-3.5 shrink-0" />
                                          <span className="truncate">{pre.nombre}</span>
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </CollapsibleContent>
                              </Collapsible>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Panel derecho: productos de la categoría seleccionada */}
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
                  Seleccioná una categoría de comparación (Categoria - Subcategoria - Presentación)
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
                Elegí una presentación en el panel izquierdo para ver los productos y comparar con el costo objetivo.
              </p>
            ) : productos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No hay productos asignados a esta categoría. Usá «Asignar productos» para agregar.
              </p>
            ) : (
              <Table variant="compact">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-20">PROVEEDOR</TableHead>
                    <TableHead className="w-28">COD. EXT.</TableHead>
                    <TableHead className="min-w-0">DESCRIPCION</TableHead>
                    <TableHead className="w-28">PX COMPRA FINAL</TableHead>
                    <TableHead className="w-28">DIF. VS OBJETIVO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="celda-datos celda-mono">{p.proveedorPrefijo ?? "—"}</TableCell>
                      <TableCell className="celda-datos celda-mono whitespace-nowrap">{p.codExt}</TableCell>
                      <TableCell className="celda-datos min-w-0 truncate">{p.descripcionProveedor}</TableCell>
                      <TableCell className="celda-datos celda-numero">
                        {p.pxCompraFinal != null ? `$${fmtPrecio(p.pxCompraFinal)}` : "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "celda-datos celda-numero",
                          p.diferenciaVsObjetivo != null && p.diferenciaVsObjetivo > 0 && "text-destructive",
                          p.diferenciaVsObjetivo != null && p.diferenciaVsObjetivo <= 0 && p.diferenciaVsObjetivo < 0 && "text-green-600"
                        )}
                      >
                        {p.diferenciaVsObjetivo != null
                          ? `${p.diferenciaVsObjetivo >= 0 ? "+" : ""}$${fmtPrecio(p.diferenciaVsObjetivo)}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
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
