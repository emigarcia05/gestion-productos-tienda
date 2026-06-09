"use client";

import { useState } from "react";
import { toast } from "sonner";
import MensajeProceso from "@/components/shared/MensajeProceso";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { liberarActCxDuxTrabadoAction } from "@/actions/cxPxTienda";
import { useActCxDuxStatusPoll } from "@/hooks/useActCxDuxStatusPoll";

interface Props {
  pollEnabled: boolean;
}

export default function ActCxDuxProgresoBanner({ pollEnabled }: Props) {
  const { running, phase, processed, total } = useActCxDuxStatusPoll(pollEnabled);
  const [liberarModalOpen, setLiberarModalOpen] = useState(false);
  const [liberando, setLiberando] = useState(false);

  if (!running) return null;

  const mensaje =
    phase === "enviando" ? "ENVIANDO COSTOS DUX" : "ACTUALIZANDO COSTOS DUX";

  async function confirmarLiberarBloqueo() {
    setLiberando(true);
    try {
      const res = await liberarActCxDuxTrabadoAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo liberar el bloqueo.");
        return;
      }
      toast.success("Bloqueo Act. Cx. liberado. Podés reintentar.");
      setLiberarModalOpen(false);
    } catch {
      toast.error("No se pudo liberar el bloqueo.");
    } finally {
      setLiberando(false);
    }
  }

  return (
    <>
      <MensajeProceso
        mensaje={mensaje}
        detalle={total > 0 ? { procesados: processed, total } : "…"}
        className="shrink-0"
        onDoubleClick={() => setLiberarModalOpen(true)}
        doubleClickTitle="Doble Clic Para Liberar Bloqueo Act. Cx."
      />
      <Dialog
        open={liberarModalOpen}
        onOpenChange={(open) => {
          if (!open && liberando) return;
          setLiberarModalOpen(open);
        }}
      >
        <AppModal
          title="Liberar Bloqueo Act. Cx."
          size="sm"
          padding="sm"
          scrollBody={false}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                disabled={liberando}
                onClick={() => setLiberarModalOpen(false)}
              >
                No
              </Button>
              <Button
                type="button"
                disabled={liberando}
                onClick={() => void confirmarLiberarBloqueo()}
              >
                Sí, Liberar
              </Button>
            </>
          }
        >
          <p className="text-sm text-foreground">
            ¿Liberar el bloqueo de actualización de costos DUX? Usalo solo si el
            proceso quedó trabado (pestaña cerrada, error de red o timeout). Si
            DUX sigue procesando en segundo plano, revisá allí antes de reenviar.
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
