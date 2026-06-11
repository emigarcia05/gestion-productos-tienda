"use client";

import { useMemo } from "react";
import CatalogoFinderColumn from "@/components/shared/catalogo-finder/CatalogoFinderColumn";
import CatalogoFinderRow from "@/components/shared/catalogo-finder/CatalogoFinderRow";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";
import { COMP_CATEGORIAS_SELECTOR_GRID_CLASS } from "@/lib/comparacionCategoriasLayout";

interface Props {
  arbol: CategoriaComparacionTree[];
  selectedCategoriaId: string | null;
  selectedSubcategoriaId: string | null;
  selectedPresentacionId: string | null;
  onSelectCategoria: (id: string) => void;
  onSelectSubcategoria: (id: string) => void;
  onSelectPresentacion: (id: string) => void;
}

const noop = () => {};

export default function ComparacionCategoriaSelector({
  arbol,
  selectedCategoriaId,
  selectedSubcategoriaId,
  selectedPresentacionId,
  onSelectCategoria,
  onSelectSubcategoria,
  onSelectPresentacion,
}: Props) {
  const categoriaSeleccionada = useMemo(
    () => arbol.find((c) => c.id === selectedCategoriaId) ?? null,
    [arbol, selectedCategoriaId]
  );

  const subcategoriaSeleccionada = useMemo(
    () => categoriaSeleccionada?.subcategorias.find((s) => s.id === selectedSubcategoriaId) ?? null,
    [categoriaSeleccionada, selectedSubcategoriaId]
  );

  return (
    <div className={COMP_CATEGORIAS_SELECTOR_GRID_CLASS}>
      <CatalogoFinderColumn
        titulo="CATEGORÍA"
        subtitulo={`${arbol.length} registro${arbol.length === 1 ? "" : "s"}`}
        mostrarNuevo={false}
      >
        {arbol.length === 0 ? (
          <CatalogoFinderEmpty mensaje="No hay categorías. Creá combinaciones en Categorias." />
        ) : (
          arbol.map((categoria) => (
            <CatalogoFinderRow
              key={categoria.id}
              nombre={categoria.nombre}
              meta={`${categoria.subcategorias.length} subcategoría${
                categoria.subcategorias.length === 1 ? "" : "s"
              }`}
              selected={categoria.id === selectedCategoriaId}
              onClick={() => onSelectCategoria(categoria.id)}
              mostrarAcciones={false}
              onEditar={noop}
              onEliminar={noop}
            />
          ))
        )}
      </CatalogoFinderColumn>

      <CatalogoFinderColumn
        titulo="SUBCATEGORÍA"
        subtitulo={
          categoriaSeleccionada
            ? `${categoriaSeleccionada.subcategorias.length} en ${categoriaSeleccionada.nombre}`
            : "Seleccioná una categoría"
        }
        mostrarNuevo={false}
        deshabilitada={categoriaSeleccionada === null}
      >
        {!categoriaSeleccionada ? (
          <CatalogoFinderEmpty mensaje="Seleccioná una categoría para ver sus subcategorías." />
        ) : categoriaSeleccionada.subcategorias.length === 0 ? (
          <CatalogoFinderEmpty mensaje="Esta categoría aún no tiene subcategorías." />
        ) : (
          categoriaSeleccionada.subcategorias.map((subcategoria) => (
            <CatalogoFinderRow
              key={subcategoria.id}
              nombre={subcategoria.nombre}
              meta={`${subcategoria.presentaciones.length} presentación${
                subcategoria.presentaciones.length === 1 ? "" : "es"
              }`}
              selected={subcategoria.id === selectedSubcategoriaId}
              onClick={() => onSelectSubcategoria(subcategoria.id)}
              mostrarAcciones={false}
              onEditar={noop}
              onEliminar={noop}
            />
          ))
        )}
      </CatalogoFinderColumn>

      <CatalogoFinderColumn
        titulo="PRESENTACIÓN"
        subtitulo={
          subcategoriaSeleccionada
            ? `${subcategoriaSeleccionada.presentaciones.length} en ${subcategoriaSeleccionada.nombre}`
            : "Seleccioná una subcategoría"
        }
        mostrarNuevo={false}
        deshabilitada={subcategoriaSeleccionada === null}
      >
        {!subcategoriaSeleccionada ? (
          <CatalogoFinderEmpty mensaje="Seleccioná una subcategoría para ver sus presentaciones." />
        ) : subcategoriaSeleccionada.presentaciones.length === 0 ? (
          <CatalogoFinderEmpty mensaje="Esta subcategoría aún no tiene presentaciones." />
        ) : (
          subcategoriaSeleccionada.presentaciones.map((presentacion) => (
            <CatalogoFinderRow
              key={presentacion.id}
              nombre={presentacion.nombre}
              selected={presentacion.id === selectedPresentacionId}
              onClick={() => onSelectPresentacion(presentacion.id)}
              mostrarAcciones={false}
              onEditar={noop}
              onEliminar={noop}
            />
          ))
        )}
      </CatalogoFinderColumn>
    </div>
  );
}
