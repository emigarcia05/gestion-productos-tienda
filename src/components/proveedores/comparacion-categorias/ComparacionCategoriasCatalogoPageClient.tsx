"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CatalogoFinderColumn from "@/components/shared/catalogo-finder/CatalogoFinderColumn";
import CatalogoFinderRow from "@/components/shared/catalogo-finder/CatalogoFinderRow";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import CrearEditarComparacionCategoriaModal, {
  type NivelComparacionCategoria,
} from "@/components/proveedores/comparacion-categorias/CrearEditarComparacionCategoriaModal";
import EliminarComparacionCategoriaModal from "@/components/proveedores/comparacion-categorias/EliminarComparacionCategoriaModal";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";
import { fmtPrecio } from "@/lib/format";
import {
  COMP_CATEGORIAS_CONTENT_WIDTH,
  COMP_CATEGORIAS_PAGE_CONTENT_CLASS,
} from "@/lib/comparacionCategoriasLayout";

interface Props {
  arbolInicial: CategoriaComparacionTree[];
  esEditor: boolean;
}

type ModalCrearEditarState =
  | { open: false }
  | {
      open: true;
      nivel: NivelComparacionCategoria;
      modo: "crear" | "editar";
      id?: string;
      nombreInicial?: string;
      parentId?: string;
      parentNombre?: string;
    };

type ModalEliminarState =
  | { open: false }
  | {
      open: true;
      nivel: NivelComparacionCategoria;
      id: string;
      nombre: string;
    };

export default function ComparacionCategoriasCatalogoPageClient({
  arbolInicial,
  esEditor,
}: Props) {
  const router = useRouter();
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);
  const [selectedSubcategoriaId, setSelectedSubcategoriaId] = useState<string | null>(null);
  const [selectedPresentacionId, setSelectedPresentacionId] = useState<string | null>(null);
  const [crearEditar, setCrearEditar] = useState<ModalCrearEditarState>({ open: false });
  const [eliminar, setEliminar] = useState<ModalEliminarState>({ open: false });

  const categoriaSeleccionada = useMemo(
    () => arbolInicial.find((c) => c.id === selectedCategoriaId) ?? null,
    [arbolInicial, selectedCategoriaId]
  );

  const subcategoriaSeleccionada = useMemo(
    () => categoriaSeleccionada?.subcategorias.find((s) => s.id === selectedSubcategoriaId) ?? null,
    [categoriaSeleccionada, selectedSubcategoriaId]
  );

  function handleSelectCategoria(id: string) {
    setSelectedCategoriaId(id);
    setSelectedSubcategoriaId(null);
    setSelectedPresentacionId(null);
  }

  function handleSelectSubcategoria(id: string) {
    setSelectedSubcategoriaId(id);
    setSelectedPresentacionId(null);
  }

  function handleSelectPresentacion(id: string) {
    setSelectedPresentacionId(id);
  }

  function onSuccessRefresh() {
    router.refresh();
  }

  return (
    <ClassicFilteredTableLayout
      title="Lista Proveedores"
      subtitle="Categorias"
      contentWidth={COMP_CATEGORIAS_CONTENT_WIDTH}
      contentClassName={COMP_CATEGORIAS_PAGE_CONTENT_CLASS}
    >
      <div className="flex-1 min-h-0 w-full overflow-hidden py-4">
        <div className="grid h-full min-h-0 grid-cols-3 gap-3">
          <CatalogoFinderColumn
            titulo="CATEGORÍA"
            subtitulo={`${arbolInicial.length} registro${arbolInicial.length === 1 ? "" : "s"}`}
            mostrarNuevo={esEditor}
            onNuevo={() =>
              setCrearEditar({ open: true, nivel: "categoria", modo: "crear" })
            }
          >
            {arbolInicial.length === 0 ? (
              <CatalogoFinderEmpty mensaje="No hay categorías cargadas." />
            ) : (
              arbolInicial.map((categoria) => (
                <CatalogoFinderRow
                  key={categoria.id}
                  nombre={categoria.nombre}
                  selected={categoria.id === selectedCategoriaId}
                  onClick={() => handleSelectCategoria(categoria.id)}
                  mostrarAcciones={esEditor}
                  onEditar={() =>
                    setCrearEditar({
                      open: true,
                      nivel: "categoria",
                      modo: "editar",
                      id: categoria.id,
                      nombreInicial: categoria.nombre,
                    })
                  }
                  onEliminar={() =>
                    setEliminar({
                      open: true,
                      nivel: "categoria",
                      id: categoria.id,
                      nombre: categoria.nombre,
                    })
                  }
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
            mostrarNuevo={esEditor && categoriaSeleccionada !== null}
            onNuevo={() =>
              categoriaSeleccionada &&
              setCrearEditar({
                open: true,
                nivel: "subcategoria",
                modo: "crear",
                parentId: categoriaSeleccionada.id,
                parentNombre: categoriaSeleccionada.nombre,
              })
            }
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
                  onClick={() => handleSelectSubcategoria(subcategoria.id)}
                  mostrarAcciones={esEditor}
                  onEditar={() =>
                    setCrearEditar({
                      open: true,
                      nivel: "subcategoria",
                      modo: "editar",
                      id: subcategoria.id,
                      nombreInicial: subcategoria.nombre,
                      parentId: categoriaSeleccionada.id,
                      parentNombre: categoriaSeleccionada.nombre,
                    })
                  }
                  onEliminar={() =>
                    setEliminar({
                      open: true,
                      nivel: "subcategoria",
                      id: subcategoria.id,
                      nombre: subcategoria.nombre,
                    })
                  }
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
            mostrarNuevo={esEditor && subcategoriaSeleccionada !== null}
            onNuevo={() =>
              subcategoriaSeleccionada &&
              setCrearEditar({
                open: true,
                nivel: "presentacion",
                modo: "crear",
                parentId: subcategoriaSeleccionada.id,
                parentNombre: subcategoriaSeleccionada.nombre,
              })
            }
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
                  meta={
                    presentacion.referenciasCompetencia.length > 0
                      ? presentacion.referenciasCompetencia.length === 1
                        ? `Ref. ${presentacion.referenciasCompetencia[0].competenciaNombre}${
                            presentacion.referenciasCompetencia[0].pxMostrar != null
                              ? ` · $${fmtPrecio(presentacion.referenciasCompetencia[0].pxMostrar)}`
                              : ""
                          }`
                        : `${presentacion.referenciasCompetencia.length} refs. competencia`
                      : presentacion.costoCompraObjetivo != null
                        ? `Objetivo ${fmtPrecio(presentacion.costoCompraObjetivo)}`
                        : undefined
                  }
                  selected={presentacion.id === selectedPresentacionId}
                  onClick={() => handleSelectPresentacion(presentacion.id)}
                  mostrarAcciones={esEditor}
                  onEditar={() =>
                    setCrearEditar({
                      open: true,
                      nivel: "presentacion",
                      modo: "editar",
                      id: presentacion.id,
                      nombreInicial: presentacion.nombre,
                      parentId: subcategoriaSeleccionada.id,
                      parentNombre: subcategoriaSeleccionada.nombre,
                    })
                  }
                  onEliminar={() =>
                    setEliminar({
                      open: true,
                      nivel: "presentacion",
                      id: presentacion.id,
                      nombre: presentacion.nombre,
                    })
                  }
                />
              ))
            )}
          </CatalogoFinderColumn>
        </div>
      </div>

      {crearEditar.open && (
        <CrearEditarComparacionCategoriaModal
          open={crearEditar.open}
          onOpenChange={(next) => !next && setCrearEditar({ open: false })}
          nivel={crearEditar.nivel}
          modo={crearEditar.modo}
          id={crearEditar.id}
          nombreInicial={crearEditar.nombreInicial}
          parentId={crearEditar.parentId}
          parentNombre={crearEditar.parentNombre}
          onSuccess={onSuccessRefresh}
        />
      )}

      {eliminar.open && (
        <EliminarComparacionCategoriaModal
          open={eliminar.open}
          onOpenChange={(next) => !next && setEliminar({ open: false })}
          nivel={eliminar.nivel}
          id={eliminar.id}
          nombre={eliminar.nombre}
          onSuccess={onSuccessRefresh}
        />
      )}
    </ClassicFilteredTableLayout>
  );
}
