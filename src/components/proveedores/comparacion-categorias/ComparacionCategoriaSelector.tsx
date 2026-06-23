"use client";

import { useMemo } from "react";
import CatalogoFinderColumn from "@/components/shared/catalogo-finder/CatalogoFinderColumn";
import CatalogoFinderRow from "@/components/shared/catalogo-finder/CatalogoFinderRow";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import type {
  CategoriaComparacionTree,
  ReferenciaCompetenciaPresentacion,
} from "@/services/categoriasComparacion.service";
import { COMP_CATEGORIAS_SELECTOR_GRID_CLASS } from "@/lib/comparacionCategoriasLayout";
import ComparacionReferenciaCompetenciaColumn from "@/components/proveedores/comparacion-categorias/ComparacionReferenciaCompetenciaColumn";

interface Props {
  arbol: CategoriaComparacionTree[];
  selectedCategoriaId: string | null;
  selectedSubcategoriaId: string | null;
  selectedPresentacionId: string | null;
  loadingReferencia: boolean;
  referenciasCompetencia: ReferenciaCompetenciaPresentacion[];
  referenciaActivaId: string | null;
  puedeEditarCatalogo: boolean;
  puedeEditarReferencia: boolean;
  quitarReferenciaPendingId: string | null;
  onSelectCategoria: (id: string) => void;
  onSelectSubcategoria: (id: string) => void;
  onSelectPresentacion: (id: string) => void;
  onSelectReferenciaActiva: (refCompId: string) => void;
  onNuevoCategoria: () => void;
  onNuevoSubcategoria: () => void;
  onNuevoPresentacion: () => void;
  onEditarCategoria: (id: string, nombre: string) => void;
  onEliminarCategoria: (id: string, nombre: string) => void;
  onEditarSubcategoria: (id: string, nombre: string) => void;
  onEliminarSubcategoria: (id: string, nombre: string) => void;
  onEditarPresentacion: (id: string, nombre: string) => void;
  onEliminarPresentacion: (id: string, nombre: string) => void;
  onAgregarReferencia: () => void;
  onQuitarReferencia: (refCompId: string) => void;
}

export default function ComparacionCategoriaSelector({
  arbol,
  selectedCategoriaId,
  selectedSubcategoriaId,
  selectedPresentacionId,
  loadingReferencia,
  referenciasCompetencia,
  referenciaActivaId,
  puedeEditarCatalogo,
  puedeEditarReferencia,
  quitarReferenciaPendingId,
  onSelectCategoria,
  onSelectSubcategoria,
  onSelectPresentacion,
  onSelectReferenciaActiva,
  onNuevoCategoria,
  onNuevoSubcategoria,
  onNuevoPresentacion,
  onEditarCategoria,
  onEliminarCategoria,
  onEditarSubcategoria,
  onEliminarSubcategoria,
  onEditarPresentacion,
  onEliminarPresentacion,
  onAgregarReferencia,
  onQuitarReferencia,
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
        mostrarNuevo={puedeEditarCatalogo}
        onNuevo={onNuevoCategoria}
      >
        {arbol.length === 0 ? (
          <CatalogoFinderEmpty mensaje="No hay categorías. Usá + para crear una." />
        ) : (
          arbol.map((categoria) => (
            <CatalogoFinderRow
              key={categoria.id}
              nombre={categoria.nombre}
              selected={categoria.id === selectedCategoriaId}
              onClick={() => onSelectCategoria(categoria.id)}
              mostrarAcciones={puedeEditarCatalogo}
              onEditar={() => onEditarCategoria(categoria.id, categoria.nombre)}
              onEliminar={() => onEliminarCategoria(categoria.id, categoria.nombre)}
            />
          ))
        )}
      </CatalogoFinderColumn>

      <CatalogoFinderColumn
        titulo="SUBCATEGORÍA"
        mostrarNuevo={puedeEditarCatalogo && categoriaSeleccionada !== null}
        onNuevo={onNuevoSubcategoria}
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
              selected={subcategoria.id === selectedSubcategoriaId}
              onClick={() => onSelectSubcategoria(subcategoria.id)}
              mostrarAcciones={puedeEditarCatalogo}
              onEditar={() => onEditarSubcategoria(subcategoria.id, subcategoria.nombre)}
              onEliminar={() => onEliminarSubcategoria(subcategoria.id, subcategoria.nombre)}
            />
          ))
        )}
      </CatalogoFinderColumn>

      <CatalogoFinderColumn
        titulo="PRESENTACIÓN"
        mostrarNuevo={puedeEditarCatalogo && subcategoriaSeleccionada !== null}
        onNuevo={onNuevoPresentacion}
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
              mostrarAcciones={puedeEditarCatalogo}
              onEditar={() => onEditarPresentacion(presentacion.id, presentacion.nombre)}
              onEliminar={() => onEliminarPresentacion(presentacion.id, presentacion.nombre)}
            />
          ))
        )}
      </CatalogoFinderColumn>

      <ComparacionReferenciaCompetenciaColumn
        presentacionSeleccionada={selectedPresentacionId != null}
        loading={loadingReferencia}
        referenciasCompetencia={referenciasCompetencia}
        referenciaActivaId={referenciaActivaId}
        puedeEditar={puedeEditarReferencia}
        quitarPendingId={quitarReferenciaPendingId}
        onSelectReferenciaActiva={onSelectReferenciaActiva}
        onAgregarReferencia={onAgregarReferencia}
        onQuitarReferencia={onQuitarReferencia}
      />
    </div>
  );
}
