"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import GestionarMktCatalogoNombreModal from "@/components/marketing/GestionarMktCatalogoNombreModal";
import MktCalendarioPublicacionesGrid from "@/components/marketing/MktCalendarioPublicacionesGrid";
import { Button } from "@/components/ui/button";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";

interface Props {
  redesIniciales: MktCatalogoNombreItem[];
  tiposIniciales: MktCatalogoNombreItem[];
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
                Gestionar Publicaciones
              </Button>
              <Button
                type="button"
                variant="default"
                className="h-10 gap-2 px-4"
                onClick={() => setOpenContenidos(true)}
              >
                <Settings2 className="size-4 shrink-0" aria-hidden />
                Gestionar Contenido
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
      <GestionarMktCatalogoNombreModal
        open={openTipos}
        onOpenChange={setOpenTipos}
        kind="tipo"
        itemsIniciales={tiposIniciales}
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
