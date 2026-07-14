"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CrearEditarMktPublicacionModal from "@/components/marketing/CrearEditarMktPublicacionModal";
import EliminarMktPublicacionModal from "@/components/marketing/EliminarMktPublicacionModal";
import GestionarMktCatalogoNombreModal from "@/components/marketing/GestionarMktCatalogoNombreModal";
import MktCalendarioPublicacionesGrid from "@/components/marketing/MktCalendarioPublicacionesGrid";
import MktPublicacionesCuadroMando from "@/components/marketing/MktPublicacionesCuadroMando";
import MktPublicacionesDiaModal from "@/components/marketing/MktPublicacionesDiaModal";
import { Button } from "@/components/ui/button";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import {
  mesAnioActualArgentina,
  type MktCalendarioMesAnio,
} from "@/lib/mktCalendarioPublicaciones";
import {
  calcularCuadroMandoPublicaciones,
  filtrarPublicacionesPorMesAnio,
} from "@/lib/mktPublicacionesEstadisticas";

interface Props {
  redesIniciales: MktCatalogoNombreItem[];
  tiposIniciales: MktCatalogoNombreItem[];
  contenidosIniciales: MktCatalogoNombreItem[];
  publicaciones: MktPublicacionCalendarioItem[];
  esEditor: boolean;
}

type ModalForm =
  | { open: false }
  | {
      open: true;
      modo: "crear" | "editar";
      fechaIso: string;
      item?: MktPublicacionCalendarioItem;
    };

type ModalDia = { open: false } | { open: true; fechaIso: string };

type ModalEliminar =
  | { open: false }
  | { open: true; id: string; label: string };

export default function MarketingCalendarioPageClient({
  redesIniciales,
  tiposIniciales,
  contenidosIniciales,
  publicaciones,
  esEditor,
}: Props) {
  const router = useRouter();
  const [openRedes, setOpenRedes] = useState(false);
  const [openTipos, setOpenTipos] = useState(false);
  const [openContenidos, setOpenContenidos] = useState(false);
  const [mesVista, setMesVista] = useState<MktCalendarioMesAnio>(() => mesAnioActualArgentina());
  const [modalDia, setModalDia] = useState<ModalDia>({ open: false });
  const [modalForm, setModalForm] = useState<ModalForm>({ open: false });
  const [modalEliminar, setModalEliminar] = useState<ModalEliminar>({ open: false });

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const publicacionesMes = useMemo(
    () => filtrarPublicacionesPorMesAnio(publicaciones, mesVista.mes, mesVista.anio),
    [publicaciones, mesVista]
  );

  const stats = useMemo(
    () =>
      calcularCuadroMandoPublicaciones(publicacionesMes, redesIniciales, tiposIniciales),
    [publicacionesMes, redesIniciales, tiposIniciales]
  );

  const publicacionesDelDia = useMemo(() => {
    if (!modalDia.open) return [];
    return publicaciones.filter((p) => p.fechaIso === modalDia.fechaIso);
  }, [modalDia, publicaciones]);

  function handleSeleccionarDia(fechaIso: string) {
    const hay = publicaciones.some((p) => p.fechaIso === fechaIso);
    if (!hay) {
      if (!esEditor) return;
      setModalForm({ open: true, modo: "crear", fechaIso });
      return;
    }
    setModalDia({ open: true, fechaIso });
  }

  return (
    <>
      <ClassicFilteredTableLayout
        title="Marketing"
        subtitle="Calendario De Publicaciones"
        contentWidth="full"
        actions={
          esEditor ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                className="h-10 gap-2 px-4"
                onClick={() => setOpenRedes(true)}
              >
                <Settings2 className="size-4 shrink-0" aria-hidden />
                Gestionar Redes
              </Button>
              <Button
                type="button"
                variant="default"
                className="h-10 gap-2 px-4"
                onClick={() => setOpenTipos(true)}
              >
                <Settings2 className="size-4 shrink-0" aria-hidden />
                Gestionar Tipo Publicaciones
              </Button>
              <Button
                type="button"
                variant="default"
                className="h-10 gap-2 px-4"
                onClick={() => setOpenContenidos(true)}
              >
                <Settings2 className="size-4 shrink-0" aria-hidden />
                Gestionar Tipo Contenido
              </Button>
            </div>
          ) : null
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <MktCalendarioPublicacionesGrid
            publicaciones={publicaciones}
            onSeleccionarDia={handleSeleccionarDia}
            mesVista={mesVista}
            onMesVistaChange={(next) => setMesVista(next)}
          />
          <MktPublicacionesCuadroMando stats={stats} />
        </div>
      </ClassicFilteredTableLayout>

      <MktPublicacionesDiaModal
        open={modalDia.open}
        onOpenChange={(o) => !o && setModalDia({ open: false })}
        fechaIso={modalDia.open ? modalDia.fechaIso : ""}
        publicaciones={publicacionesDelDia}
        esEditor={esEditor}
        onCrearNueva={() => {
          if (!modalDia.open) return;
          setModalForm({ open: true, modo: "crear", fechaIso: modalDia.fechaIso });
        }}
        onEditar={(item) => {
          setModalForm({
            open: true,
            modo: "editar",
            fechaIso: item.fechaIso,
            item,
          });
        }}
        onEliminar={(item) => {
          setModalEliminar({
            open: true,
            id: item.id,
            label: item.publicacion,
          });
        }}
      />

      <CrearEditarMktPublicacionModal
        open={modalForm.open}
        onOpenChange={(o) => !o && setModalForm({ open: false })}
        modo={modalForm.open ? modalForm.modo : "crear"}
        fechaIso={modalForm.open ? modalForm.fechaIso : ""}
        redes={redesIniciales}
        tipos={tiposIniciales}
        contenidos={contenidosIniciales}
        item={modalForm.open ? (modalForm.item ?? null) : null}
        onSuccess={refresh}
      />

      <EliminarMktPublicacionModal
        open={modalEliminar.open}
        onOpenChange={(o) => !o && setModalEliminar({ open: false })}
        id={modalEliminar.open ? modalEliminar.id : null}
        label={modalEliminar.open ? modalEliminar.label : null}
        onSuccess={() => {
          refresh();
          if (modalDia.open) {
            const restantes = publicaciones.filter(
              (p) => p.fechaIso === modalDia.fechaIso && p.id !== modalEliminar.id
            );
            if (restantes.length === 0) {
              setModalDia({ open: false });
            }
          }
        }}
      />

      <GestionarMktCatalogoNombreModal
        open={openRedes}
        onOpenChange={setOpenRedes}
        kind="red"
        itemsIniciales={redesIniciales}
        esEditor={esEditor}
        onCatalogoChanged={refresh}
      />
      <GestionarMktCatalogoNombreModal
        open={openTipos}
        onOpenChange={setOpenTipos}
        kind="tipo"
        itemsIniciales={tiposIniciales}
        esEditor={esEditor}
        onCatalogoChanged={refresh}
      />
      <GestionarMktCatalogoNombreModal
        open={openContenidos}
        onOpenChange={setOpenContenidos}
        kind="contenido"
        itemsIniciales={contenidosIniciales}
        esEditor={esEditor}
        onCatalogoChanged={refresh}
      />
    </>
  );
}
