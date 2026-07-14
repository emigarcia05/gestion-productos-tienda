"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import GestionarMktCatalogoNombreModal from "@/components/marketing/GestionarMktCatalogoNombreModal";
import GestionarMktTipoPublicacionesModal from "@/components/marketing/GestionarMktTipoPublicacionesModal";
import MktCalendarioPublicacionesGrid from "@/components/marketing/MktCalendarioPublicacionesGrid";
import { Button } from "@/components/ui/button";
import type {
  MktCatalogoNombreItem,
  MktPublicacionTipoItem,
} from "@/lib/mktPublicacionesCatalogo";

interface Props {
  redesIniciales: MktCatalogoNombreItem[];
  tiposIniciales: MktPublicacionTipoItem[];
  contenidosIniciales: MktCatalogoNombreItem[];
  esEditor: boolean;
}

export default function MarketingCalendarioPageClient({
  redesIniciales,
  tiposIniciales,
  contenidosIniciales,
  esEditor,
}: Props) {
  const router = useRouter();
  const [openRedes, setOpenRedes] = useState(false);
  const [openTipos, setOpenTipos] = useState(false);
  const [openContenidos, setOpenContenidos] = useState(false);

  const refreshCatalogos = useCallback(() => {
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
        <MktCalendarioPublicacionesGrid />
      </ClassicFilteredTableLayout>

      <GestionarMktCatalogoNombreModal
        open={openRedes}
        onOpenChange={setOpenRedes}
        kind="red"
        itemsIniciales={redesIniciales}
        esEditor={esEditor}
        onCatalogoChanged={refreshCatalogos}
      />
      <GestionarMktTipoPublicacionesModal
        open={openTipos}
        onOpenChange={setOpenTipos}
        itemsIniciales={tiposIniciales}
        contenidosIniciales={contenidosIniciales}
        esEditor={esEditor}
        onCatalogoChanged={refreshCatalogos}
      />
      <GestionarMktCatalogoNombreModal
        open={openContenidos}
        onOpenChange={setOpenContenidos}
        kind="contenido"
        itemsIniciales={contenidosIniciales}
        esEditor={esEditor}
        onCatalogoChanged={refreshCatalogos}
      />
    </>
  );
}
