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
import type { MktIdeaDetalleItem, MktIdeaSeccionItem } from "@/lib/mktPublicacionesIdeas";

interface Props {
  jerarquia: MktIdeaSeccionItem[];
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
    };

type ModalVerDetalle =
  | { open: false }
  | {
      open: true;
      tituloIdea: string;
      detalle: string;
      usada: boolean;
    };

type ModalEliminar =
  | { open: false }
  | { open: true; kind: "seccion" | "detalle"; id: string; label: string };

export default function MarketingIdeasPageClient({
  jerarquia,
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
      <ClassicFilteredTableLayout title="Marketing" subtitle="Ideas Contenido" contentWidth="full">
        <div className="grid h-full min-h-0 flex-1 grid-cols-2 gap-3 px-8 pb-4">
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
                  nombre={item.tituloIdea || item.detalle || "SIN TÍTULO"}
                  meta={item.detalle.trim() || undefined}
                  terceraLinea={item.usada ? "USADA: SI" : "USADA: NO"}
                  selected={false}
                  mostrarAcciones={esEditor}
                  onVer={() =>
                    setModalVerDetalle({
                      open: true,
                      tituloIdea: item.tituloIdea,
                      detalle: item.detalle,
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
                    })
                  }
                  onEliminar={() =>
                    setModalEliminar({
                      open: true,
                      kind: "detalle",
                      id: item.id,
                      label: item.tituloIdea || item.detalle.slice(0, 80) || "Detalle",
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
        id={modalDetalle.open ? modalDetalle.id : undefined}
        tituloIdeaInicial={modalDetalle.open ? modalDetalle.tituloIdeaInicial : undefined}
        detalleInicial={modalDetalle.open ? modalDetalle.detalleInicial : undefined}
        onSuccess={refresh}
      />

      <VerMktIdeaDetalleModal
        open={modalVerDetalle.open}
        onOpenChange={(o) => !o && setModalVerDetalle({ open: false })}
        tituloIdea={modalVerDetalle.open ? modalVerDetalle.tituloIdea : ""}
        detalle={modalVerDetalle.open ? modalVerDetalle.detalle : ""}
        usada={modalVerDetalle.open ? modalVerDetalle.usada : false}
      />

      <EliminarMktIdeaModal
        open={modalEliminar.open}
        onOpenChange={(o) => !o && setModalEliminar({ open: false })}
        kind={modalEliminar.open ? modalEliminar.kind : "seccion"}
        id={modalEliminar.open ? modalEliminar.id : ""}
        label={modalEliminar.open ? modalEliminar.label : ""}
        onSuccess={refresh}
      />
    </>
  );
}
