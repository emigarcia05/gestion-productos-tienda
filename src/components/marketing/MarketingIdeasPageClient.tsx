"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CatalogoFinderColumn from "@/components/shared/catalogo-finder/CatalogoFinderColumn";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import CatalogoFinderRow from "@/components/shared/catalogo-finder/CatalogoFinderRow";
import CrearEditarMktIdeaDetalleModal from "@/components/marketing/CrearEditarMktIdeaDetalleModal";
import CrearEditarMktIdeaSeccionModal from "@/components/marketing/CrearEditarMktIdeaSeccionModal";
import EliminarMktIdeaModal from "@/components/marketing/EliminarMktIdeaModal";
import VerMktIdeaDetalleModal from "@/components/marketing/VerMktIdeaDetalleModal";
import VerMktIdeaSeccionModal from "@/components/marketing/VerMktIdeaSeccionModal";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import type { MktIdeaDetalleItem, MktIdeaSeccionItem } from "@/lib/mktPublicacionesIdeas";

interface Props {
  jerarquia: MktIdeaSeccionItem[];
  redes: MktCatalogoNombreItem[];
  tipos: MktCatalogoNombreItem[];
  contenidos: MktCatalogoNombreItem[];
  esEditor: boolean;
}

type ModalSeccion =
  | { open: false }
  | {
      open: true;
      modo: "crear" | "editar";
      id?: string;
      nombreInicial?: string;
      resumenInicial?: string;
    };

type ModalVerSeccion =
  | { open: false }
  | { open: true; nombre: string; resumen: string };

type ModalDetalle =
  | { open: false }
  | {
      open: true;
      modo: "crear" | "editar";
      seccionId: string;
      seccionNombre: string;
      id?: string;
      tituloIdeaInicial?: string;
      detalleInicial?: string;
      redIdsIniciales?: string[];
      tipoPublicacionIdsIniciales?: string[];
      tipoContenidoIdInicial?: string;
      usadaInicial?: boolean;
    };

type ModalVerDetalle =
  | { open: false }
  | {
      open: true;
      seccionNombre: string;
      tituloIdea: string;
      detalle: string;
      redesNombres: string[];
      tiposPublicacionNombres: string[];
      tipoContenidoNombre: string;
      usada: boolean;
    };

type ModalEliminar =
  | { open: false }
  | { open: true; kind: "seccion" | "detalle"; id: string; label: string };

export default function MarketingIdeasPageClient({
  jerarquia,
  redes,
  tipos,
  contenidos,
  esEditor,
}: Props) {
  const router = useRouter();
  const [selectedSeccionId, setSelectedSeccionId] = useState<string | null>(null);
  const [modalSeccion, setModalSeccion] = useState<ModalSeccion>({ open: false });
  const [modalVerSeccion, setModalVerSeccion] = useState<ModalVerSeccion>({ open: false });
  const [modalDetalle, setModalDetalle] = useState<ModalDetalle>({ open: false });
  const [modalVerDetalle, setModalVerDetalle] = useState<ModalVerDetalle>({ open: false });
  const [modalEliminar, setModalEliminar] = useState<ModalEliminar>({ open: false });

  const seccionSeleccionada = useMemo(
    () => jerarquia.find((s) => s.id === selectedSeccionId) ?? null,
    [jerarquia, selectedSeccionId]
  );

  const detalles: MktIdeaDetalleItem[] = seccionSeleccionada?.detalles ?? [];

  function refresh() {
    router.refresh();
  }

  return (
    <>
      <ClassicFilteredTableLayout title="Marketing" subtitle="Ideas" contentWidth="full">
        <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <CatalogoFinderColumn
            titulo="Secciones"
            subtitulo={`${jerarquia.length} sección(es)`}
            mostrarNuevo={esEditor}
            onNuevo={() => setModalSeccion({ open: true, modo: "crear" })}
          >
            {jerarquia.length === 0 ? (
              <CatalogoFinderEmpty mensaje="No hay secciones. Usá + para crear la primera." />
            ) : (
              jerarquia.map((seccion) => (
                <CatalogoFinderRow
                  key={seccion.id}
                  nombre={seccion.nombre}
                  meta={
                    seccion.resumen
                      ? seccion.resumen
                      : `${seccion.detalles.length} detalle(s)`
                  }
                  terceraLinea={
                    seccion.resumen ? `${seccion.detalles.length} detalle(s)` : undefined
                  }
                  selected={seccion.id === selectedSeccionId}
                  onClick={() => setSelectedSeccionId(seccion.id)}
                  mostrarAcciones={esEditor}
                  onVer={() =>
                    setModalVerSeccion({
                      open: true,
                      nombre: seccion.nombre,
                      resumen: seccion.resumen,
                    })
                  }
                  onEditar={() =>
                    setModalSeccion({
                      open: true,
                      modo: "editar",
                      id: seccion.id,
                      nombreInicial: seccion.nombre,
                      resumenInicial: seccion.resumen,
                    })
                  }
                  onEliminar={() =>
                    setModalEliminar({
                      open: true,
                      kind: "seccion",
                      id: seccion.id,
                      label: seccion.nombre,
                    })
                  }
                />
              ))
            )}
          </CatalogoFinderColumn>

          <CatalogoFinderColumn
            titulo="Detalle"
            subtitulo={
              seccionSeleccionada ? seccionSeleccionada.nombre : "Seleccioná una sección"
            }
            mostrarNuevo={esEditor && Boolean(seccionSeleccionada)}
            deshabilitada={!seccionSeleccionada}
            onNuevo={() => {
              if (!seccionSeleccionada) return;
              setModalDetalle({
                open: true,
                modo: "crear",
                seccionId: seccionSeleccionada.id,
                seccionNombre: seccionSeleccionada.nombre,
              });
            }}
          >
            {!seccionSeleccionada ? (
              <CatalogoFinderEmpty mensaje="Seleccioná una sección para ver sus detalles." />
            ) : detalles.length === 0 ? (
              <CatalogoFinderEmpty mensaje="No hay detalles. Usá + para crear el primero." />
            ) : (
              detalles.map((item) => (
                <CatalogoFinderRow
                  key={item.id}
                  nombre={item.tituloIdea || item.detalle}
                  meta={`${item.redesNombres.join(" · ") || "—"} · ${item.tiposPublicacionNombres.join(" · ") || "—"} · ${item.tipoContenidoNombre}`}
                  terceraLinea={item.usada ? "USADA: SI" : "USADA: NO"}
                  selected={false}
                  mostrarAcciones={esEditor}
                  onVer={() =>
                    setModalVerDetalle({
                      open: true,
                      seccionNombre: seccionSeleccionada.nombre,
                      tituloIdea: item.tituloIdea,
                      detalle: item.detalle,
                      redesNombres: item.redesNombres,
                      tiposPublicacionNombres: item.tiposPublicacionNombres,
                      tipoContenidoNombre: item.tipoContenidoNombre,
                      usada: item.usada,
                    })
                  }
                  onEditar={() =>
                    setModalDetalle({
                      open: true,
                      modo: "editar",
                      seccionId: item.seccionId,
                      seccionNombre: seccionSeleccionada.nombre,
                      id: item.id,
                      tituloIdeaInicial: item.tituloIdea,
                      detalleInicial: item.detalle,
                      redIdsIniciales: item.redIds,
                      tipoPublicacionIdsIniciales: item.tipoPublicacionIds,
                      tipoContenidoIdInicial: item.tipoContenidoId,
                      usadaInicial: item.usada,
                    })
                  }
                  onEliminar={() =>
                    setModalEliminar({
                      open: true,
                      kind: "detalle",
                      id: item.id,
                      label: item.tituloIdea || item.detalle.slice(0, 80),
                    })
                  }
                />
              ))
            )}
          </CatalogoFinderColumn>
        </div>
      </ClassicFilteredTableLayout>

      <CrearEditarMktIdeaSeccionModal
        open={modalSeccion.open}
        onOpenChange={(o) => !o && setModalSeccion({ open: false })}
        modo={modalSeccion.open ? modalSeccion.modo : "crear"}
        id={modalSeccion.open ? modalSeccion.id : undefined}
        nombreInicial={modalSeccion.open ? modalSeccion.nombreInicial : undefined}
        resumenInicial={modalSeccion.open ? modalSeccion.resumenInicial : undefined}
        onSuccess={refresh}
      />

      <VerMktIdeaSeccionModal
        open={modalVerSeccion.open}
        onOpenChange={(o) => !o && setModalVerSeccion({ open: false })}
        nombre={modalVerSeccion.open ? modalVerSeccion.nombre : ""}
        resumen={modalVerSeccion.open ? modalVerSeccion.resumen : ""}
      />

      <CrearEditarMktIdeaDetalleModal
        open={modalDetalle.open}
        onOpenChange={(o) => !o && setModalDetalle({ open: false })}
        modo={modalDetalle.open ? modalDetalle.modo : "crear"}
        seccionId={modalDetalle.open ? modalDetalle.seccionId : ""}
        seccionNombre={modalDetalle.open ? modalDetalle.seccionNombre : ""}
        redes={redes}
        tipos={tipos}
        contenidos={contenidos}
        id={modalDetalle.open ? modalDetalle.id : undefined}
        tituloIdeaInicial={modalDetalle.open ? modalDetalle.tituloIdeaInicial : undefined}
        detalleInicial={modalDetalle.open ? modalDetalle.detalleInicial : undefined}
        redIdsIniciales={modalDetalle.open ? modalDetalle.redIdsIniciales : undefined}
        tipoPublicacionIdsIniciales={
          modalDetalle.open ? modalDetalle.tipoPublicacionIdsIniciales : undefined
        }
        tipoContenidoIdInicial={modalDetalle.open ? modalDetalle.tipoContenidoIdInicial : undefined}
        usadaInicial={modalDetalle.open ? modalDetalle.usadaInicial : undefined}
        onSuccess={refresh}
      />

      <VerMktIdeaDetalleModal
        open={modalVerDetalle.open}
        onOpenChange={(o) => !o && setModalVerDetalle({ open: false })}
        seccionNombre={modalVerDetalle.open ? modalVerDetalle.seccionNombre : ""}
        tituloIdea={modalVerDetalle.open ? modalVerDetalle.tituloIdea : ""}
        detalle={modalVerDetalle.open ? modalVerDetalle.detalle : ""}
        redesNombres={modalVerDetalle.open ? modalVerDetalle.redesNombres : []}
        tiposPublicacionNombres={
          modalVerDetalle.open ? modalVerDetalle.tiposPublicacionNombres : []
        }
        tipoContenidoNombre={modalVerDetalle.open ? modalVerDetalle.tipoContenidoNombre : ""}
        usada={modalVerDetalle.open ? modalVerDetalle.usada : false}
      />

      <EliminarMktIdeaModal
        open={modalEliminar.open}
        onOpenChange={(o) => !o && setModalEliminar({ open: false })}
        kind={modalEliminar.open ? modalEliminar.kind : "seccion"}
        id={modalEliminar.open ? modalEliminar.id : null}
        label={modalEliminar.open ? modalEliminar.label : null}
        onSuccess={() => {
          if (modalEliminar.open && modalEliminar.kind === "seccion") {
            setSelectedSeccionId((prev) => (prev === modalEliminar.id ? null : prev));
          }
          refresh();
        }}
      />
    </>
  );
}
