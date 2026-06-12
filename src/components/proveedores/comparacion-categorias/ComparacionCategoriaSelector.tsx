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
  puedeEditarReferencia: boolean;
  quitarReferenciaPendingId: string | null;
  onSelectCategoria: (id: string) => void;
  onSelectSubcategoria: (id: string) => void;
  onSelectPresentacion: (id: string) => void;
  onSelectReferenciaActiva: (refCompId: string) => void;
  onAgregarReferencia: () => void;
  onQuitarReferencia: (refCompId: string) => void;
}

const noop = () => {};

export default function ComparacionCategoriaSelector({
  arbol,
  selectedCategoriaId,
  selectedSubcategoriaId,
  selectedPresentacionId,
  loadingReferencia,
  referenciasCompetencia,
  referenciaActivaId,
  puedeEditarReferencia,
  quitarReferenciaPendingId,
  onSelectCategoria,
  onSelectSubcategoria,
  onSelectPresentacion,
  onSelectReferenciaActiva,
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
      <CatalogoFinderColumn titulo="CATEGORÍA" mostrarNuevo={false}>
        {arbol.length === 0 ? (
          <CatalogoFinderEmpty mensaje="No hay categorías. Creá combinaciones en Categorias." />
        ) : (
          arbol.map((categoria) => (
            <CatalogoFinderRow
              key={categoria.id}
              nombre={categoria.nombre}
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
