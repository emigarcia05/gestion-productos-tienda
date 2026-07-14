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
import type { MktIdeaDetalleItem, MktIdeaSeccionItem } from "@/lib/mktPublicacionesIdeas";

interface Props {
  jerarquia: MktIdeaSeccionItem[];
  esEditor: boolean;
}

type ModalSeccion =
  | { open: false }
  | { open: true; modo: "crear" | "editar"; id?: string; nombreInicial?: string };

type ModalDetalle =
  | { open: false }
  | {
      open: true;
      modo: "crear" | "editar";
      seccionId: string;
      seccionNombre: string;
      id?: string;
      detalleInicial?: string;
      usadaInicial?: boolean;
    };

type ModalEliminar =
  | { open: false }
  | { open: true; kind: "seccion" | "detalle"; id: string; label: string };

export default function MarketingIdeasPageClient({ jerarquia, esEditor }: Props) {
  const router = useRouter();
  const [selectedSeccionId, setSelectedSeccionId] = useState<string | null>(null);
  const [modalSeccion, setModalSeccion] = useState<ModalSeccion>({ open: false });
  const [modalDetalle, setModalDetalle] = useState<ModalDetalle>({ open: false });
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
            nuevoLado="start"
            onNuevo={() => setModalSeccion({ open: true, modo: "crear" })}
          >
            {jerarquia.length === 0 ? (
              <CatalogoFinderEmpty mensaje="No hay secciones. Usá + para crear la primera." />
            ) : (
              jerarquia.map((seccion) => (
                <CatalogoFinderRow
                  key={seccion.id}
                  nombre={seccion.nombre}
                  meta={`${seccion.detalles.length} detalle(s)`}
                  selected={seccion.id === selectedSeccionId}
                  onClick={() => setSelectedSeccionId(seccion.id)}
                  mostrarAcciones={esEditor}
                  onEditar={() =>
                    setModalSeccion({
                      open: true,
                      modo: "editar",
                      id: seccion.id,
                      nombreInicial: seccion.nombre,
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
              seccionSeleccionada
                ? seccionSeleccionada.nombre
                : "Seleccioná una sección"
            }
            mostrarNuevo={esEditor && Boolean(seccionSeleccionada)}
            nuevoLado="start"
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
                  nombre={item.detalle}
                  meta={item.usada ? "USADA: SI" : "USADA: NO"}
                  selected={false}
                  mostrarAcciones={esEditor}
                  onEditar={() =>
                    setModalDetalle({
                      open: true,
                      modo: "editar",
                      seccionId: item.seccionId,
                      seccionNombre: seccionSeleccionada.nombre,
                      id: item.id,
                      detalleInicial: item.detalle,
                      usadaInicial: item.usada,
                    })
                  }
                  onEliminar={() =>
                    setModalEliminar({
                      open: true,
                      kind: "detalle",
                      id: item.id,
                      label: item.detalle.slice(0, 80) + (item.detalle.length > 80 ? "…" : ""),
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
        onSuccess={refresh}
      />

      <CrearEditarMktIdeaDetalleModal
        open={modalDetalle.open}
        onOpenChange={(o) => !o && setModalDetalle({ open: false })}
        modo={modalDetalle.open ? modalDetalle.modo : "crear"}
        seccionId={modalDetalle.open ? modalDetalle.seccionId : ""}
        seccionNombre={modalDetalle.open ? modalDetalle.seccionNombre : ""}
        id={modalDetalle.open ? modalDetalle.id : undefined}
        detalleInicial={modalDetalle.open ? modalDetalle.detalleInicial : undefined}
        usadaInicial={modalDetalle.open ? modalDetalle.usadaInicial : undefined}
        onSuccess={refresh}
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
