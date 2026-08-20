"use client";

import { useState } from "react";
import { FileText, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  etiquetaDireccionEnvio,
  etiquetaHorarioEnvio,
  nombreDestinatarioEnvio,
  telefonoEnvio,
  type EnviosFinalListItem,
} from "@/lib/envios";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import { cn } from "@/lib/utils";

interface Props {
  envios: EnviosFinalListItem[];
}

export default function EnviosConductorPageClient({ envios }: Props) {
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 justify-center">
      <div className="flex h-full w-[24rem] min-h-0 flex-col gap-3 p-4">
        <h1 className="text-center text-sm font-semibold uppercase tracking-wide text-foreground">
          CONDUCTOR
        </h1>
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
