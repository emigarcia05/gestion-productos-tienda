"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import {
  createCategoriaAction,
  createSubcategoriaAction,
  createPresentacionAction,
  deletePresentacionAction,
  getPresentacionesParaGestionAction,
  getArbolCategoriasAction,
} from "@/actions/comparacionCategorias";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";
import type { PresentacionParaGestion } from "@/services/categoriasComparacion.service";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arbol: CategoriaComparacionTree[];
  onSuccess: () => void;
}

type Tab = "categoria" | "subcategoria" | "presentacion";

export default function GestionCategoriasModal({ open, onOpenChange, arbol, onSuccess }: Props) {
  const [arbolLocal, setArbolLocal] = useState<CategoriaComparacionTree[]>(arbol);
  const [tab, setTab] = useState<Tab>("categoria");
  const [pending, setPending] = useState(false);

  const [filas, setFilas] = useState<PresentacionParaGestion[]>([]);
  const [loadingTabla, setLoadingTabla] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showCrearSection, setShowCrearSection] = useState(false);
  const [presentacionId, setPresentacionId] = useState("");
  const [showCrearCamposModal, setShowCrearCamposModal] = useState(false);
  const [filtroCategoriaId, setFiltroCategoriaId] = useState("");
  const [filtroSubcategoriaId, setFiltroSubcategoriaId] = useState("");

  const cargarTabla = useCallback(async () => {
    const res = await getPresentacionesParaGestionAction();
    if (res.ok && res.data) {
      setFilas(res.data);
    } else {
      setFilas([]);
    }
  }, []);

  const recargarArbol = useCallback(async (): Promise<CategoriaComparacionTree[] | null> => {
    const res = await getArbolCategoriasAction();
    if (res.ok && res.data) {
      setArbolLocal(res.data);
      return res.data;
    }
    return null;
  }, []);

  useEffect(() => {
    setArbolLocal(arbol);
  }, [arbol]);

  useEffect(() => {
    if (!open) return;
    setShowCrearSection(false);
    setLoadingTabla(true);
    cargarTabla().finally(() => setLoadingTabla(false));
  }, [open, cargarTabla]);

  const handleEliminar = async (presentacionId: string) => {
    if (!confirm("¿Eliminar esta combinación (presentación)? Se quitará la asignación de productos a esta categoría.")) return;
    setPendingDeleteId(presentacionId);
    try {
      const res = await deletePresentacionAction(presentacionId);
      if (!res.ok) {
        toast.error(res.error ?? "Error al eliminar.");
        return;
      }
      toast.success("Combinación eliminada.");
      await cargarTabla();
      onSuccess();
    } finally {
      setPendingDeleteId(null);
    }
  };

  // Form categoria
  const [nombreCategoria, setNombreCategoria] = useState("");

  // Form subcategoria
  const [categoriaId, setCategoriaId] = useState("");
  const [nombreSubcategoria, setNombreSubcategoria] = useState("");

  // Form presentacion
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const [nombrePresentacion, setNombrePresentacion] = useState("");
  const [costoObjetivo, setCostoObjetivo] = useState("");

  const handleCreateCategoria = async () => {
    const nombre = nombreCategoria.trim();
    if (!nombre) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    setPending(true);
    try {
      const res = await createCategoriaAction(nombre);
      if (!res.ok) {
        toast.error(res.error ?? "Error al crear.");
        return;
      }
      toast.success("Categoría creada.");
      setNombreCategoria("");
      const actualizado = await recargarArbol();
      if (actualizado) {
        const encontrada = actualizado.find((c) => c.nombre === nombre);
        if (encontrada) {
          setCategoriaId(encontrada.id);
        }
      }
      onSuccess();
      await cargarTabla();
      setShowCrearCamposModal(false);
    } finally {
      setPending(false);
    }
  };

  const handleCreateSubcategoria = async () => {
    const nombre = nombreSubcategoria.trim();
    if (!nombre) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (!categoriaId) {
      toast.error("Elegí una categoría.");
      return;
    }
    setPending(true);
    try {
      const res = await createSubcategoriaAction(categoriaId, nombre);
      if (!res.ok) {
        toast.error(res.error ?? "Error al crear.");
        return;
      }
      toast.success("Subcategoría creada.");
      setNombreSubcategoria("");
      const actualizado = await recargarArbol();
      if (actualizado) {
        const cat = actualizado.find((c) => c.id === categoriaId);
        if (cat) {
          const sub = cat.subcategorias.find((s) => s.nombre === nombre);
          if (sub) {
            setSubcategoriaId(sub.id);
          }
        }
      }
      onSuccess();
      await cargarTabla();
      setShowCrearCamposModal(false);
    } finally {
      setPending(false);
    }
  };

  const handleCreatePresentacion = async (costoOverride?: number | null) => {
    const nombre = nombrePresentacion.trim();
    if (!nombre) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (!subcategoriaId) {
      toast.error("Elegí una subcategoría.");
      return;
    }
    setPending(true);
    try {
      const costo =
        costoOverride !== undefined
          ? costoOverride ?? null
          : costoObjetivo.trim()
            ? parseFloat(costoObjetivo.replace(",", ".")) ?? null
            : null;
      const res = await createPresentacionAction(subcategoriaId, nombre, costo);
      if (!res.ok) {
        toast.error(res.error ?? "Error al crear.");
        return;
      }
      toast.success("Presentación creada.");
      setNombrePresentacion("");
      setCostoObjetivo("");
      const actualizado = await recargarArbol();
      if (actualizado) {
        const sub = actualizado
          .flatMap((c) => c.subcategorias)
          .find((s) => s.id === subcategoriaId);
        const pres = sub?.presentaciones.find((p) => p.nombre === nombre);
        if (pres) {
          setPresentacionId(pres.id);
        }
      }
      onSuccess();
      await cargarTabla();
      setShowCrearCamposModal(false);
    } finally {
      setPending(false);
    }
  };

  const subcategoriasFlat = arbolLocal.flatMap((c) =>
    c.subcategorias.map((s) => ({ ...s, categoriaNombre: c.nombre }))
  );

  const categoriaFiltro = arbolLocal.find((c) => c.id === filtroCategoriaId) ?? null;
  const subcategoriasParaFiltro = categoriaFiltro?.subcategorias ?? [];
  const filasFiltradas = filas.filter((f) => {
    if (filtroCategoriaId && f.categoriaId !== filtroCategoriaId) return false;
    if (filtroSubcategoriaId && f.subcategoriaId !== filtroSubcategoriaId) return false;
    return true;
  });

  const categoriaSeleccionada = arbolLocal.find((c) => c.id === categoriaId) ?? null;
  const subcategoriasDeCategoria = categoriaSeleccionada?.subcategorias ?? [];
  const subcategoriaSeleccionada =
    subcategoriasDeCategoria.find((s) => s.id === subcategoriaId) ?? null;
  const presentacionesDeSubcategoria = subcategoriaSeleccionada?.presentaciones ?? [];

  const handleConfirmCombinacion = async () => {
    if (!categoriaId || !subcategoriaId || !presentacionId) return;
    setShowCrearSection(false);
    await cargarTabla();
    onSuccess();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-app max-w-[108rem] w-[calc(100%-2rem)] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="modal-app__header shrink-0">
          <DialogTitle className="modal-app__title">Gestionar Categorías</DialogTitle>
        </DialogHeader>

        <div className="modal-app__body px-6 py-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Botón Crear Nueva Categoria */}
          {!showCrearSection && (
            <div className="shrink-0 mb-4 flex justify-end">
              <Button
                type="button"
                onClick={() => setShowCrearSection(true)}
              >
                Crear Nueva Categoría
              </Button>
            </div>
          )}

          {/* Filtros */}
          <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="grid gap-1">
              <Label>Categoría</Label>
              <select
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
                value={filtroCategoriaId}
                onChange={(e) => {
                  setFiltroCategoriaId(e.target.value);
                  setFiltroSubcategoriaId("");
                }}
              >
                <option value="">TODAS</option>
                {arbolLocal.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label>Subcategoría</Label>
              <select
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
                value={filtroSubcategoriaId}
                onChange={(e) => setFiltroSubcategoriaId(e.target.value)}
                disabled={!filtroCategoriaId}
              >
                <option value="">TODAS</option>
                {subcategoriasParaFiltro.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de combinaciones */}
          <div className="shrink-0 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Combinaciones Creadas</h3>
            {loadingTabla ? (
              <p className="text-sm text-muted-foreground py-4">Cargando…</p>
            ) : filas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No hay presentaciones. Creá categoría, subcategoría y presentación con el botón de arriba.
              </p>
            ) : (
              <div className="border rounded-md overflow-x-auto max-h-56 overflow-y-auto">
                <Table variant="compact">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="bg-primary text-primary-foreground font-bold min-w-[200px]">
                        CATEGORÍAS
                      </TableHead>
                      <TableHead className="bg-primary text-primary-foreground font-bold w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasFiltradas.map((fila) => (
                      <TableRow key={fila.id}>
                        <TableCell className="py-2 text-sm align-top">
                          <span className="font-medium text-foreground" title={fila.labelCompleto}>
                            {fila.labelCompleto}
                          </span>
                        </TableCell>
                        <TableCell className="py-1 align-top w-12">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleEliminar(fila.id)}
                            disabled={pendingDeleteId === fila.id}
                            title="Eliminar Combinación"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <p className="px-6 pb-6 text-xs text-muted-foreground shrink-0">
          Filtrá por categoría y subcategoría. Creá categorías, subcategorías y presentaciones con el botón de arriba.
        </p>
      </DialogContent>
    </Dialog>

        {/* Segundo modal: Crear combinación con selects + botones (+) */}
        <Dialog open={showCrearSection} onOpenChange={(v) => !v && setShowCrearSection(false)}>
          <DialogContent className="modal-app max-w-lg w-[calc(100%-2rem)] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="modal-app__header shrink-0">
          <DialogTitle className="modal-app__title">Crear Nueva Categoría</DialogTitle>
            </DialogHeader>
            <div className="modal-app__content flex-1 min-h-0 flex flex-col">
              <div className="modal-app__body flex flex-col flex-1 min-h-0 overflow-hidden px-6 pt-4 pb-0">
                {/* Fila de selects: Categoría, Subcategoría, Presentación */}
                <div className="grid gap-4 pb-4 border-b border-border">
                  <div className="grid gap-1">
                    <Label>Categoría</Label>
                    <div className="flex gap-2">
                      <select
                        className={cn(
                          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        )}
                        value={categoriaId}
                        onChange={(e) => {
                          setCategoriaId(e.target.value);
                          setSubcategoriaId("");
                          setPresentacionId("");
                        }}
                      >
                        <option value="">SELECCIONAR</option>
                        {arbolLocal.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setTab("categoria");
                          setShowCrearCamposModal(true);
                        }}
                        title="Crear Nueva Categoría"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <Label>Subcategoría</Label>
                    <div className="flex gap-2">
                      <select
                        className={cn(
                          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        )}
                        value={subcategoriaId}
                        onChange={(e) => {
                          setSubcategoriaId(e.target.value);
                          setPresentacionId("");
                        }}
                        disabled={!categoriaId}
                      >
                        <option value="">SELECCIONAR</option>
                        {subcategoriasDeCategoria.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (!categoriaId) {
                            toast.error("Elegí una categoría primero.");
                            return;
                          }
                          setTab("subcategoria");
                          setShowCrearCamposModal(true);
                        }}
                        title="Crear Nueva Subcategoría"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <Label>Presentación</Label>
                    <div className="flex gap-2">
                      <select
                        className={cn(
                          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        )}
                        value={presentacionId}
                        onChange={(e) => setPresentacionId(e.target.value)}
                        disabled={!subcategoriaId}
                      >
                        <option value="">SELECCIONAR</option>
                        {presentacionesDeSubcategoria.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (!subcategoriaId) {
                            toast.error("Elegí una subcategoría primero.");
                            return;
                          }
                          setTab("presentacion");
                          setShowCrearCamposModal(true);
                        }}
                        title="Crear Nueva Presentación"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-app__footer shrink-0 justify-between">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmCombinacion}
                  disabled={!categoriaId || !subcategoriaId || !presentacionId}
                >
                  Crear Combinación
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCrearSection(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tercer modal: Crear Campos Categoria (abre al hacer click en + de cualquier desplegable) */}
        <Dialog open={showCrearCamposModal} onOpenChange={(v) => !v && setShowCrearCamposModal(false)}>
          <DialogContent className="modal-app max-w-lg w-[calc(100%-2rem)] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
            <DialogHeader className="modal-app__header shrink-0">
              <DialogTitle className="modal-app__title">Crear Campos Categoría</DialogTitle>
            </DialogHeader>
            <div className="modal-app__body flex flex-col flex-1 min-h-0 overflow-hidden px-6 pt-4 pb-6">
              <div className="flex gap-2 border-b border-border pb-2 mb-4">
                <Button
                  type="button"
                  variant={tab === "categoria" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTab("categoria")}
                >
                  Crear Categoría
                </Button>
                <Button
                  type="button"
                  variant={tab === "subcategoria" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTab("subcategoria")}
                >
                  Crear Subcategoría
                </Button>
                <Button
                  type="button"
                  variant={tab === "presentacion" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTab("presentacion")}
                >
                  Crear Presentación
                </Button>
              </div>

              {tab === "categoria" && (
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre-cat-campos">Nombre</Label>
                    <Input
                      id="nombre-cat-campos"
                      value={nombreCategoria}
                      onChange={(e) => setNombreCategoria(e.target.value)}
                      placeholder="Ej. Látex"
                    />
                  </div>
                </div>
              )}

              {tab === "subcategoria" && (
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Categoría</Label>
                    <select
                      className={cn(
                        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      )}
                      value={categoriaId}
                      onChange={(e) => setCategoriaId(e.target.value)}
                    >
                      <option value="">SELECCIONAR</option>
                      {arbolLocal.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nombre-sub-campos">Nombre</Label>
                    <Input
                      id="nombre-sub-campos"
                      value={nombreSubcategoria}
                      onChange={(e) => setNombreSubcategoria(e.target.value)}
                      placeholder="Ej. Calidad Intermedia"
                    />
                  </div>
                </div>
              )}

              {tab === "presentacion" && (
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Subcategoría</Label>
                    <select
                      className={cn(
                        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      )}
                      value={subcategoriaId}
                      onChange={(e) => setSubcategoriaId(e.target.value)}
                    >
                      <option value="">SELECCIONAR</option>
                      {subcategoriasFlat.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.categoriaNombre} → {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nombre-pre-campos">Nombre</Label>
                    <Input
                      id="nombre-pre-campos"
                      value={nombrePresentacion}
                      onChange={(e) => setNombrePresentacion(e.target.value)}
                      placeholder="Ej. 20 Lts"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCrearCamposModal(false)}
                >
                  Cerrar
                </Button>
                {tab === "categoria" && (
                  <Button type="button" onClick={handleCreateCategoria} disabled={pending}>
                    Crear Categoría
                  </Button>
                )}
                {tab === "subcategoria" && (
                  <Button
                    type="button"
                    onClick={handleCreateSubcategoria}
                    disabled={pending}
                  >
                    Crear Subcategoría
                  </Button>
                )}
                {tab === "presentacion" && (
                  <Button
                    type="button"
                    onClick={() => handleCreatePresentacion(null)}
                    disabled={pending}
                  >
                    Crear Presentación
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </>
  );
}
