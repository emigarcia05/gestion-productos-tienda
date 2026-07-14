"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CrearMktPublicacionModal from "@/components/marketing/CrearMktPublicacionModal";
import GestionarMktCatalogoNombreModal from "@/components/marketing/GestionarMktCatalogoNombreModal";
import MktCalendarioPublicacionesGrid from "@/components/marketing/MktCalendarioPublicacionesGrid";
import { Button } from "@/components/ui/button";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";

interface Props {
  redesIniciales: MktCatalogoNombreItem[];
  tiposIniciales: MktCatalogoNombreItem[];
  contenidosIniciales: MktCatalogoNombreItem[];
  publicaciones: MktPublicacionCalendarioItem[];
  esEditor: boolean;
}

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
  const [modalNueva, setModalNueva] = useState<{ open: false } | { open: true; fechaIso: string }>({
    open: false,
  });

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

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
        <MktCalendarioPublicacionesGrid
          publicaciones={publicaciones}
          esEditor={esEditor}
          onNuevoEnDia={(fechaIso) => setModalNueva({ open: true, fechaIso })}
        />
      </ClassicFilteredTableLayout>

      <CrearMktPublicacionModal
        open={modalNueva.open}
        onOpenChange={(o) => !o && setModalNueva({ open: false })}
        fechaIso={modalNueva.open ? modalNueva.fechaIso : ""}
        redes={redesIniciales}
        tipos={tiposIniciales}
        contenidos={contenidosIniciales}
        onSuccess={refresh}
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
