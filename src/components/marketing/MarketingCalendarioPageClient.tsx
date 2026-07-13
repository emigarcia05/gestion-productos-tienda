"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import GestionarMktCatalogoNombreModal from "@/components/marketing/GestionarMktCatalogoNombreModal";
import { Button } from "@/components/ui/button";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";

interface Props {
  redesIniciales: MktCatalogoNombreItem[];
  tiposIniciales: MktCatalogoNombreItem[];
  esEditor: boolean;
}

export default function MarketingCalendarioPageClient({
  redesIniciales,
  tiposIniciales,
  esEditor,
}: Props) {
  const router = useRouter();
  const [openRedes, setOpenRedes] = useState(false);
  const [openTipos, setOpenTipos] = useState(false);

  const refreshCatalogos = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      <ClassicFilteredTableLayout
        title="Marketing"
        subtitle="Calendario De Publicaciones"
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
            </div>
          ) : null
        }
      >
        <div className="flex flex-1 items-center justify-center px-4 py-12 text-sm text-muted-foreground">
          Módulo En Construcción.
        </div>
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
    </>
  );
}
