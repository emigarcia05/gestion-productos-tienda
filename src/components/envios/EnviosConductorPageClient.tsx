"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { marcarEnviosFinalEntregadoAction } from "@/actions/envios";
import EnviosConductorDireccionesModal from "@/components/envios/EnviosConductorDireccionesModal";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  etiquetaDireccionEnvio,
  etiquetaHorarioEnvio,
  nombreDestinatarioEnvio,
  telefonoEnvio,
  type ClienteItem,
  type EnviosDireccionItem,
  type EnviosFinalListItem,
} from "@/lib/envios";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import { cn } from "@/lib/utils";

interface Props {
  envios: EnviosFinalListItem[];
  clientes: ClienteItem[];
  direcciones: EnviosDireccionItem[];
}

export default function EnviosConductorPageClient({
  envios,
  clientes,
  direcciones,
}: Props) {
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [modalDireccionesOpen, setModalDireccionesOpen] = useState(false);
  const [modalEntregar, setModalEntregar] = useState<
    { open: false } | { open: true; id: string; label: string }
  >({ open: false });
  const [entregando, setEntregando] = useState(false);
  const router = useRouter();

  async function handleConfirmarEntrega() {
    if (!modalEntregar.open || entregando) return;
    setEntregando(true);
    try {
      const res = await marcarEnviosFinalEntregadoAction({ id: modalEntregar.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo marcar como entregado.");
        return;
      }
      toast.success("Envío marcado como entregado.");
      setModalEntregar({ open: false });
      setAbiertoId(null);
      router.refresh();
    } finally {
      setEntregando(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 justify-center">
      <div className="flex h-full w-[24rem] min-h-0 flex-col gap-3 p-4">
        <h1 className="text-center text-sm font-semibold uppercase tracking-wide text-foreground">
          CONDUCTOR
        </h1>
        <Button
          type="button"
          className="h-12 w-full"
          onClick={() => setModalDireccionesOpen(true)}
        >
          DIRECCIONES
        </Button>
        <EnviosConductorDireccionesModal
          open={modalDireccionesOpen}
          onOpenChange={setModalDireccionesOpen}
          clientes={clientes}
          direcciones={direcciones}
        />
        <Dialog
          open={modalEntregar.open}
          onOpenChange={(open) => {
            if (!open && !entregando) setModalEntregar({ open: false });
          }}
        >
          <AppModal
            title="Entregado"
            size="sm"
            actions={
              <div className={cn("flex w-full justify-end gap-2")}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={entregando}
                  onClick={() => setModalEntregar({ open: false })}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={entregando}
                  onClick={() => void handleConfirmarEntrega()}
                >
                  Entregar
                </Button>
              </div>
            }
          >
            <p className="text-sm text-foreground">
              ¿Confirmás la entrega
              {modalEntregar.open && modalEntregar.label !== ""
                ? ` a ${modalEntregar.label}`
                : ""}
              ?
            </p>
          </AppModal>
        </Dialog>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {envios.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              NO HAY ENVÍOS PENDIENTES.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {envios.map((item) => {
                const abierto = abiertoId === item.id;
                const maps = item.direccion.urlMaps.trim();
                const tel = telefonoEnvio(item);
                const telHref = tel !== "" ? `tel:${tel.replace(/\s+/g, "")}` : "";
                return (
                  <article
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-foreground">
                        {nombreDestinatarioEnvio(item)}
                      </p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatIsoYmdDdMmYyyyArgentina(item.fechaEnvioIso)}
                        {" · "}
                        {etiquetaHorarioEnvio(item.horaDesde, item.horaHasta)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="h-12 w-full"
                      variant={abierto ? "outline" : "default"}
                      aria-expanded={abierto}
                      onClick={() => setAbiertoId(abierto ? null : item.id)}
                    >
                      {abierto ? "Cerrar" : "Ver"}
                    </Button>
                    {abierto ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-foreground">
                          {etiquetaDireccionEnvio(item.direccion)}
                        </p>
                        {maps !== "" ? (
                          <Button asChild className="h-12 w-full">
                            <a
                              href={maps}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                              Maps
                            </a>
                          </Button>
                        ) : (
                          <Button type="button" className="h-12 w-full" disabled>
                            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                            Maps
                          </Button>
                        )}
                        {telHref !== "" ? (
                          <Button asChild className="h-12 w-full">
                            <a href={telHref}>
                              <Phone className="h-4 w-4 shrink-0" aria-hidden />
                              Llamar
                            </a>
                          </Button>
                        ) : (
                          <Button type="button" className="h-12 w-full" disabled>
                            <Phone className="h-4 w-4 shrink-0" aria-hidden />
                            Llamar
                          </Button>
                        )}
                        {item.tienePdf ? (
                          <Button asChild className="h-12 w-full">
                            <a
                              href={`/api/envios/${item.id}/comprobante`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FileText className="h-4 w-4 shrink-0" aria-hidden />
                              Pdf
                            </a>
                          </Button>
                        ) : (
                          <Button type="button" className="h-12 w-full" disabled>
                            <FileText className="h-4 w-4 shrink-0" aria-hidden />
                            Pdf
                          </Button>
                        )}
                        <Button
                          type="button"
                          className="h-12 w-full"
                          onClick={() =>
                            setModalEntregar({
                              open: true,
                              id: item.id,
                              label: nombreDestinatarioEnvio(item),
                            })
                          }
                        >
                          ENTREGADO
                        </Button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
