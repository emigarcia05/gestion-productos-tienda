"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CrearEnvioWizardModal from "@/components/envios/CrearEnvioWizardModal";
import { Button } from "@/components/ui/button";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import type { ClienteItem, EnviosDireccionItem } from "@/lib/envios";

interface Props {
  clientesCatalogo: ClienteItem[];
  direcciones: EnviosDireccionItem[];
}

export default function CrearEnvioPageClient({ clientesCatalogo, direcciones }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(true);

  function refresh() {
    router.refresh();
  }

  return (
    <>
      <ClassicFilteredTableLayout
        title="Envios"
        subtitle="Crear Envío"
        actions={
          <Button type="button" className="h-10 gap-2 px-4" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Nuevo Envío
          </Button>
        }
      >
        <div className="flex h-full min-h-0 items-center justify-center" />
      </ClassicFilteredTableLayout>

      <CrearEnvioWizardModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        clientesCatalogo={clientesCatalogo}
        direcciones={direcciones}
        onCatalogoChanged={refresh}
        onSuccess={() => {
          router.push(GP_ROUTES.envios.programados);
        }}
      />
    </>
  );
}
