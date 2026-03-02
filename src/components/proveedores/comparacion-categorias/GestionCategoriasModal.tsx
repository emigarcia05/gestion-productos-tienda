"use client";

import { useState } from "react";
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
  createCategoriaAction,
  createSubcategoriaAction,
  createPresentacionAction,
  updateCategoriaAction,
  updateSubcategoriaAction,
  updatePresentacionAction,
  deleteCategoriaAction,
  deleteSubcategoriaAction,
  deletePresentacionAction,
} from "@/actions/comparacionCategorias";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";

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
    } finally {
      setPending(false);
    }
  };

  const subcategoriasFlat = arbol.flatMap((c) =>
    c.subcategorias.map((s) => ({ ...s, categoriaNombre: c.nombre }))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-app max-w-md">
        <DialogHeader className="modal-app__header">
          <DialogTitle className="modal-app__title">Gestionar categorías</DialogTitle>
        </DialogHeader>

        {/* Tabs y formularios dentro del body, sin líneas superiores/inferiores */}
        <div className="modal-app__body px-6 py-4">
          <div className="flex gap-2 border-b border-border pb-2 mb-4">
            <Button
              type="button"
              variant={tab === "categoria" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTab("categoria")}
            >
              Categoría
            </Button>
            <Button
              type="button"
              variant={tab === "subcategoria" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTab("subcategoria")}
            >
              Subcategoría
            </Button>
            <Button
              type="button"
              variant={tab === "presentacion" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTab("presentacion")}
            >
              Presentación
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
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
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
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
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

        <p className="px-6 pb-6 text-xs text-muted-foreground">
          Para editar o eliminar categorías, subcategorías o presentaciones podés hacerlo desde una futura pantalla de administración o ampliando este modal.
        </p>
      </DialogContent>
    </Dialog>
  );
}
