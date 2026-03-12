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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import {
  createCategoriaAction,
  createSubcategoriaAction,
  createPresentacionAction,
  updatePresentacionAction,
  deletePresentacionAction,
  getPresentacionesParaGestionAction,
} from "@/actions/comparacionCategorias";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";
import type { PresentacionParaGestion } from "@/services/categoriasComparacion.service";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import ElegirProductoReferenciaModal from "./ElegirProductoReferenciaModal";

/** Parsea string con $ y "." como miles (y "," como decimal) a número; devuelve "" si vacío o inválido. */
function parseCostoInput(value: string): string {
  const s = value.replace(/\$/g, "").replace(/\s/g, "").trim();
  if (s === "") return "";
  const commaIdx = s.lastIndexOf(",");
  if (commaIdx >= 0) {
    const intPart = s.slice(0, commaIdx).replace(/\./g, "");
    const decPart = s.slice(commaIdx + 1);
    const num = parseFloat(intPart + "." + decPart);
    if (Number.isNaN(num) || num < 0) return "";
    return String(num);
  }
  const num = parseFloat(s.replace(/\./g, ""));
  if (Number.isNaN(num) || num < 0) return "";
  return String(num);
}

/** Formatea el valor guardado para mostrar en el input: $ y punto como miles. */
function formatCostoDisplay(raw: string): string {
  if (raw === "" || raw == null) return "";
  const n = parseFloat(raw);
  if (Number.isNaN(n) || n < 0) return raw;
  return "$" + fmtPrecio(n);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arbol: CategoriaComparacionTree[];
  onSuccess: () => void;
}

type Tab = "categoria" | "subcategoria" | "presentacion";

export default function GestionCategoriasModal({ open, onOpenChange, arbol, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("categoria");
  const [pending, setPending] = useState(false);

  const [filas, setFilas] = useState<PresentacionParaGestion[]>([]);
  const [loadingTabla, setLoadingTabla] = useState(false);
  const [costosLocales, setCostosLocales] = useState<Record<string, string>>({});
  const [pendingCostoId, setPendingCostoId] = useState<string | null>(null);
  const [presentacionIdParaRef, setPresentacionIdParaRef] = useState<string | null>(null);
  const [labelCompletoParaRef, setLabelCompletoParaRef] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showCrearSection, setShowCrearSection] = useState(false);

  const cargarTabla = useCallback(async () => {
    const res = await getPresentacionesParaGestionAction();
    if (res.ok && res.data) {
      setFilas(res.data);
      const map: Record<string, string> = {};
      res.data.forEach((f) => {
        map[f.id] =
          f.costoCompraObjetivo != null ? String(f.costoCompraObjetivo) : "";
      });
      setCostosLocales(map);
    } else {
      setFilas([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setShowCrearSection(false);
    setLoadingTabla(true);
    cargarTabla().finally(() => setLoadingTabla(false));
  }, [open, cargarTabla]);

  const handleCostoBlur = async (presentacionId: string) => {
    const raw = costosLocales[presentacionId] ?? "";
    const num = raw.trim() === "" ? null : parseFloat(raw.replace(",", "."));
    if (raw.trim() !== "" && (Number.isNaN(num!) || num! < 0)) {
      toast.error("Ingresá un número válido mayor o igual a 0.");
      return;
    }
    setPendingCostoId(presentacionId);
    try {
      const res = await updatePresentacionAction(presentacionId, {
        costoCompraObjetivo: num,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar.");
        return;
      }
      toast.success("Costo objetivo actualizado.");
      await cargarTabla();
      onSuccess();
    } finally {
      setPendingCostoId(null);
    }
  };

  const setCostoLocal = (presentacionId: string, value: string) => {
    const parsed = parseCostoInput(value);
    setCostosLocales((prev) => ({ ...prev, [presentacionId]: parsed }));
  };

  const handleElegirProductoReferencia = async (presentacionId: string, pxCompraFinal: number) => {
    const res = await updatePresentacionAction(presentacionId, {
      costoCompraObjetivo: pxCompraFinal,
    });
    if (!res.ok) {
      toast.error(res.error ?? "Error al guardar.");
      return;
    }
    toast.success("Producto de referencia asignado.");
    setPresentacionIdParaRef(null);
    await cargarTabla();
    onSuccess();
  };

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
  const [ordenCategoria, setOrdenCategoria] = useState("0");

  // Form subcategoria
  const [categoriaId, setCategoriaId] = useState("");
  const [nombreSubcategoria, setNombreSubcategoria] = useState("");
  const [ordenSubcategoria, setOrdenSubcategoria] = useState("0");

  // Form presentacion
  const [subcategoriaId, setSubcategoriaId] = useState("");
  const [nombrePresentacion, setNombrePresentacion] = useState("");
  const [ordenPresentacion, setOrdenPresentacion] = useState("0");
  const [costoObjetivo, setCostoObjetivo] = useState("");

  const handleCreateCategoria = async () => {
    const nombre = nombreCategoria.trim();
    if (!nombre) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    setPending(true);
    try {
      const res = await createCategoriaAction(nombre, parseInt(ordenCategoria, 10) || 0);
      if (!res.ok) {
        toast.error(res.error ?? "Error al crear.");
        return;
      }
      toast.success("Categoría creada.");
      setNombreCategoria("");
      setOrdenCategoria("0");
      onSuccess();
      await cargarTabla();
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
      const res = await createSubcategoriaAction(
        categoriaId,
        nombre,
        parseInt(ordenSubcategoria, 10) || 0
      );
      if (!res.ok) {
        toast.error(res.error ?? "Error al crear.");
        return;
      }
      toast.success("Subcategoría creada.");
      setNombreSubcategoria("");
      setOrdenSubcategoria("0");
      setCategoriaId("");
      onSuccess();
      await cargarTabla();
    } finally {
      setPending(false);
    }
  };

  const handleCreatePresentacion = async () => {
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
      const costo = costoObjetivo.trim() ? parseFloat(costoObjetivo.replace(",", ".")) : undefined;
      const res = await createPresentacionAction(
        subcategoriaId,
        nombre,
        parseInt(ordenPresentacion, 10) || 0,
        costo ?? null
      );
      if (!res.ok) {
        toast.error(res.error ?? "Error al crear.");
        return;
      }
      toast.success("Presentación creada.");
      setNombrePresentacion("");
      setOrdenPresentacion("0");
      setCostoObjetivo("");
      setSubcategoriaId("");
      onSuccess();
      await cargarTabla();
    } finally {
      setPending(false);
    }
  };

  const subcategoriasFlat = arbol.flatMap((c) =>
    c.subcategorias.map((s) => ({ ...s, categoriaNombre: c.nombre }))
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-app max-w-[84rem] w-[calc(100%-2rem)] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="modal-app__header shrink-0">
          <DialogTitle className="modal-app__title">Gestionar categorías</DialogTitle>
        </DialogHeader>

        <div className="modal-app__body px-6 py-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Tabla de combinaciones + producto ref + costo objetivo */}
          <div className="shrink-0 mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-foreground">Combinaciones creadas</h3>
              {!showCrearSection && (
                <Button
                  type="button"
                  onClick={() => setShowCrearSection(true)}
                >
                  Crear nueva categoria
                </Button>
              )}
            </div>
            {loadingTabla ? (
              <p className="text-sm text-muted-foreground py-4">Cargando…</p>
            ) : filas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No hay presentaciones. Creá categoría, subcategoría y presentación abajo.
              </p>
            ) : (
              <div className="border rounded-md overflow-x-auto max-h-56 overflow-y-auto">
                <Table variant="compact">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="bg-primary text-primary-foreground font-bold min-w-[200px]">
                        Combinación (Categoría – Subcategoría – Presentación)
                      </TableHead>
                      <TableHead className="bg-primary text-primary-foreground font-bold min-w-[180px]">
                        Producto cx de referencia
                      </TableHead>
                      <TableHead className="bg-primary text-primary-foreground font-bold w-36">
                        Costo objetivo ($)
                      </TableHead>
                      <TableHead className="bg-primary text-primary-foreground font-bold w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((fila) => (
                      <TableRow key={fila.id}>
                        <TableCell className="py-2 text-sm align-top">
                          <span className="font-medium text-foreground" title={fila.labelCompleto}>
                            {fila.labelCompleto}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-sm align-top">
                          {fila.productoReferencia ? (
                            <span className="inline-flex flex-wrap items-center gap-1">
                              <Badge variant="secondary" className="font-mono text-xs">
                                {fila.productoReferencia.prefijo}
                              </Badge>
                              <span className="truncate max-w-[140px]" title={fila.productoReferencia.descripcionProveedor}>
                                {fila.productoReferencia.descripcionProveedor}
                              </span>
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => {
                                setPresentacionIdParaRef(fila.id);
                                setLabelCompletoParaRef(fila.labelCompleto);
                              }}
                              title="Elegir producto de referencia"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="py-1 align-top">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={formatCostoDisplay(costosLocales[fila.id] ?? "")}
                            onChange={(e) => setCostoLocal(fila.id, e.target.value)}
                            onBlur={() => handleCostoBlur(fila.id)}
                            disabled={pendingCostoId === fila.id}
                            placeholder="$0"
                            className="h-8 text-sm w-full text-center tabular-nums"
                          />
                        </TableCell>
                        <TableCell className="py-1 align-top w-12">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleEliminar(fila.id)}
                            disabled={pendingDeleteId === fila.id}
                            title="Eliminar combinación"
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

        <ElegirProductoReferenciaModal
          open={presentacionIdParaRef != null}
          onOpenChange={(open) => !open && setPresentacionIdParaRef(null)}
          presentacionId={presentacionIdParaRef ?? ""}
          labelCompleto={labelCompletoParaRef}
          onElegido={(px) => presentacionIdParaRef && handleElegirProductoReferencia(presentacionIdParaRef, px)}
        />

        <p className="px-6 pb-6 text-xs text-muted-foreground shrink-0">
          La tabla muestra cada combinación con su producto de referencia (si su precio coincide con el costo objetivo) y el costo objetivo editable. Creá categorías, subcategorías y presentaciones con el botón de arriba.
        </p>
      </DialogContent>
    </Dialog>

    {/* Segundo modal: Crear categoría / subcategoría / presentación */}
    <Dialog open={showCrearSection} onOpenChange={(v) => !v && setShowCrearSection(false)}>
      <DialogContent className="modal-app max-w-lg w-[calc(100%-2rem)] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="modal-app__header shrink-0">
          <DialogTitle className="modal-app__title">Crear nueva categoria</DialogTitle>
        </DialogHeader>
        <div className="modal-app__content flex-1 min-h-0 flex flex-col">
          <div className="modal-app__body flex flex-col flex-1 min-h-0 overflow-hidden px-6 pt-4 pb-0">
            <div className="flex gap-2 border-b border-border pb-2 mb-4">
              <Button
                type="button"
                variant={tab === "categoria" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTab("categoria")}
              >
                Crear categoría
              </Button>
              <Button
                type="button"
                variant={tab === "subcategoria" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTab("subcategoria")}
              >
                Crear subcategoría
              </Button>
              <Button
                type="button"
                variant={tab === "presentacion" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTab("presentacion")}
              >
                Crear presentación
              </Button>
            </div>

            {tab === "categoria" && (
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="nombre-cat">Nombre</Label>
                  <Input
                    id="nombre-cat"
                    value={nombreCategoria}
                    onChange={(e) => setNombreCategoria(e.target.value)}
                    placeholder="Ej. Látex"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orden-cat">Orden</Label>
                  <Input
                    id="orden-cat"
                    type="number"
                    min={0}
                    value={ordenCategoria}
                    onChange={(e) => setOrdenCategoria(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={handleCreateCategoria} disabled={pending}>
                  Crear categoría
                </Button>
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
                    <option value="">Seleccionar</option>
                    {arbol.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nombre-sub">Nombre</Label>
                  <Input
                    id="nombre-sub"
                    value={nombreSubcategoria}
                    onChange={(e) => setNombreSubcategoria(e.target.value)}
                    placeholder="Ej. Calidad Intermedia"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orden-sub">Orden</Label>
                  <Input
                    id="orden-sub"
                    type="number"
                    min={0}
                    value={ordenSubcategoria}
                    onChange={(e) => setOrdenSubcategoria(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={handleCreateSubcategoria} disabled={pending}>
                  Crear subcategoría
                </Button>
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
                    <option value="">Seleccionar</option>
                    {subcategoriasFlat.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.categoriaNombre} → {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nombre-pre">Nombre</Label>
                  <Input
                    id="nombre-pre"
                    value={nombrePresentacion}
                    onChange={(e) => setNombrePresentacion(e.target.value)}
                    placeholder="Ej. 20 Lts"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orden-pre">Orden</Label>
                  <Input
                    id="orden-pre"
                    type="number"
                    min={0}
                    value={ordenPresentacion}
                    onChange={(e) => setOrdenPresentacion(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="costo-pre">Costo compra objetivo (opcional)</Label>
                  <Input
                    id="costo-pre"
                    type="text"
                    inputMode="decimal"
                    value={costoObjetivo}
                    onChange={(e) => setCostoObjetivo(e.target.value)}
                    placeholder="Ej. 15000"
                  />
                </div>
                <Button type="button" onClick={handleCreatePresentacion} disabled={pending}>
                  Crear presentación
                </Button>
              </div>
            )}
          </div>
          <div className="modal-app__footer shrink-0 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCrearSection(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
