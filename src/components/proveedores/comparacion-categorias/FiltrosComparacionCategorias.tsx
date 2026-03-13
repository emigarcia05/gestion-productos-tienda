"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
  FilterRowSelection,
  FilterRowSearch,
  FilaFiltrosDesplegables,
  FILTER_SELECT_WRAPPER_CLASS,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import { cn } from "@/lib/utils";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";

export type ProveedorOption = { id: string; nombre: string };

interface Props {
  proveedores: ProveedorOption[];
  arbol: CategoriaComparacionTree[];
  proveedorActual: string;
  categoriaIdActual: string;
  subcategoriaIdActual: string;
  presentacionIdActual: string;
  qActual: string;
  totalPresentaciones: number;
}

export default function FiltrosComparacionCategorias({
  proveedores,
  arbol,
  proveedorActual,
  categoriaIdActual,
  subcategoriaIdActual,
  presentacionIdActual,
  qActual,
  totalPresentaciones,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState(qActual);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(qActual);
  }, [qActual]);

  const categoriaSeleccionada = arbol.find((c) => c.id === categoriaIdActual);
  const subcategoriasOpciones = categoriaSeleccionada?.subcategorias ?? [];
  const subcategoriaSeleccionada = subcategoriasOpciones.find((s) => s.id === subcategoriaIdActual);
  const presentacionesOpciones = subcategoriaSeleccionada?.presentaciones ?? [];

  const hayFiltros = !!(
    proveedorActual ||
    categoriaIdActual ||
    subcategoriaIdActual ||
    presentacionIdActual ||
    q
  );

  function buildParams(updates: {
    proveedor?: string;
    categoriaId?: string;
    subcategoriaId?: string;
    presentacionId?: string;
    q?: string;
  }): URLSearchParams {
    const p = new URLSearchParams();
    const prov = updates.proveedor !== undefined ? updates.proveedor : proveedorActual;
    const catId = updates.categoriaId !== undefined ? updates.categoriaId : categoriaIdActual;
    const subId = updates.subcategoriaId !== undefined ? updates.subcategoriaId : subcategoriaIdActual;
    const preId = updates.presentacionId !== undefined ? updates.presentacionId : presentacionIdActual;
    const qVal = updates.q !== undefined ? updates.q : q;
    if (prov) p.set("proveedor", prov);
    if (catId) p.set("categoriaId", catId);
    if (subId) p.set("subcategoriaId", subId);
    if (preId) p.set("presentacionId", preId);
    if (qVal) p.set("q", qVal);
    return p;
  }

  function navigate(updates: {
    proveedor?: string;
    categoriaId?: string;
    subcategoriaId?: string;
    presentacionId?: string;
    q?: string;
  }) {
    const p = buildParams(updates);
    const query = p.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ q: value });
    }, 400);
  }

  function handleProveedor(value: string) {
    navigate({
      proveedor: value || "",
      categoriaId: "",
      subcategoriaId: "",
      presentacionId: "",
    });
  }

  function handleCategoria(value: string) {
    navigate({
      categoriaId: value || "",
      subcategoriaId: "",
      presentacionId: "",
    });
  }

  function handleSubcategoria(value: string) {
    navigate({ subcategoriaId: value || "", presentacionId: "" });
  }

  function handlePresentacion(value: string) {
    navigate({ presentacionId: value || "" });
  }

  function limpiarFiltros() {
    setQ("");
    router.push(pathname);
  }

  return (
    <FilterBar className="filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={proveedorActual || "none"}
              onValueChange={(v) => handleProveedor(v === "none" ? "" : v)}
            >
              <SelectTrigger id="filtro-cc-proveedor" className="input-filtro-unificado">
                <SelectValue placeholder="PROVEEDOR" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">PROVEEDOR</SelectItem>
                {proveedores.map((pr) => (
                  <SelectItem key={pr.id} value={pr.id}>
                    {pr.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={categoriaIdActual || "none"}
              onValueChange={(v) => handleCategoria(v === "none" ? "" : v)}
            >
              <SelectTrigger id="filtro-cc-categoria" className="input-filtro-unificado">
                <SelectValue placeholder="CATEGORÍA" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">CATEGORÍA</SelectItem>
                {arbol.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={subcategoriaIdActual || "none"}
              onValueChange={(v) => handleSubcategoria(v === "none" ? "" : v)}
              disabled={!categoriaIdActual}
            >
              <SelectTrigger id="filtro-cc-subcategoria" className="input-filtro-unificado">
                <SelectValue placeholder="SUBCATEGORÍA" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">SUBCATEGORÍA</SelectItem>
                {subcategoriasOpciones.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={presentacionIdActual || "none"}
              onValueChange={(v) => handlePresentacion(v === "none" ? "" : v)}
              disabled={!subcategoriaIdActual}
            >
              <SelectTrigger id="filtro-cc-presentacion" className="input-filtro-unificado">
                <SelectValue placeholder="PRESENTACIÓN" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">PRESENTACIÓN</SelectItem>
                {presentacionesOpciones.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Slot 5 vacío según docs/COMPONENTES_ESTILOS.md */}
        </FilaFiltrosDesplegables>
      </FilterRowSelection>
      <div className="flex items-center gap-3">
        <FilterRowSearch className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary pointer-events-none" />
            <Input
              id="filtro-cc-busqueda"
              value={q}
              onChange={(e) => handleQ(e.target.value)}
              placeholder="Buscar por descripción o código..."
              className="input-filtro-unificado pl-9 pr-8"
            />
            {q && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
        <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
          {totalPresentaciones.toLocaleString("es-AR")} presentación
          {totalPresentaciones !== 1 ? "es" : ""}
        </span>
      </div>
    </FilterBar>
  );
}
