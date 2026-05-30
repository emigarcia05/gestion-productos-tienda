"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { guardarUrlVinculoCompetenciaAction } from "@/actions/competenciaPrecios";
import RelevamientoUltimoMensaje from "@/components/precios-competencia/RelevamientoUltimoMensaje";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codTienda: string;
  descripcion: string | null;
  competencias: CompetenciaParaCliente[];
  vinculosPorCompetencia: Record<string, DatoVinculoCompetenciaCliente>;
  puedeEditar: boolean;
  onGuardado: () => void;
}

type FilaUrl = {
  competenciaId: string;
  nombre: string;
  url: string;
  tipoPagina: string;
  reglaDefault: string;
  reglas: { id: string; nombre: string }[];
  urlBloqueadaPorPxSugerido: boolean;
};

export default function AsociarUrlsCompetenciaModal({
  open,
  onOpenChange,
  codTienda,
  descripcion,
  competencias,
  vinculosPorCompetencia,
  puedeEditar,
  onGuardado,
}: Props) {
  const [filas, setFilas] = useState<FilaUrl[]>([]);
  const [saving, setSaving] = useState(false);

  const filasIniciales = useMemo((): FilaUrl[] => {
    return competencias.map((c) => {
      const v = vinculosPorCompetencia[c.id];
      const reglas = (c.configExtraccion?.reglas ?? []).map((r) => ({
        id: r.id,
        nombre: r.nombre,
      }));
      const reglaDefault =
        c.configExtraccion?.reglaDefaultId?.trim() || reglas[0]?.id || "";
      return {
        competenciaId: c.id,
        nombre: c.nombre,
        url: v?.urlProducto ?? "",
        tipoPagina: v?.tipoPagina ?? reglaDefault,
        reglaDefault,
        reglas,
        urlBloqueadaPorPxSugerido: v?.urlBloqueadaPorPxSugerido ?? false,
      };
    });
  }, [competencias, vinculosPorCompetencia]);

  const filasInicialesPorId = useMemo(() => {
    const m = new Map<string, FilaUrl>();
    for (const f of filasIniciales) m.set(f.competenciaId, f);
    return m;
  }, [filasIniciales]);

  function filaTieneCambios(f: FilaUrl): boolean {
    if (f.urlBloqueadaPorPxSugerido) return false;
    const ini = filasInicialesPorId.get(f.competenciaId);
    if (!ini) return true;
    const urlIni = ini.url.trim();
    const urlActual = f.url.trim();
    if (urlIni !== urlActual) return true;
    if (f.reglas.length > 0 && f.tipoPagina !== ini.tipoPagina) return true;
    return false;
  }

  useEffect(() => {
    if (!open) return;
    setFilas(filasIniciales);
  }, [open, filasIniciales]);

  const handleGuardar = async () => {
    if (!puedeEditar) return;
    const filasAGuardar = filas.filter(filaTieneCambios);
    if (filasAGuardar.length === 0) {
      toast.message("No hay cambios para guardar.");
      return;
    }
    setSaving(true);
    try {
      for (const f of filasAGuardar) {
        const result = await guardarUrlVinculoCompetenciaAction({
          codTienda,
          competenciaId: f.competenciaId,
          urlProducto: f.url.trim() || undefined,
          tipoPagina: f.reglas.length > 0 ? f.tipoPagina || f.reglaDefault : undefined,
        });
        if (!result.ok) {
          toast.error(`${f.nombre}: ${result.error}`);
          return;
        }
      }
      toast.success("URLs guardadas. Ejecutá Comparar Precios para relevar precios.");
      onOpenChange(false);
      onGuardado();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="lg"
        title="Asociar URLs"
        actions={
          puedeEditar ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="button" variant="default" disabled={saving} onClick={() => void handleGuardar()}>
                Guardar
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{codTienda}</span>
            {descripcion ? ` — ${descripcion}` : null}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Si falla <span className="font-medium text-foreground">un producto</span>, revisá la URL de ese ítem.
            Si fallan <span className="font-medium text-foreground">casi todos</span> los productos del mismo competidor,
            revisá <span className="font-medium text-foreground">Configuracion Competidor</span> (selectores, regex, tipo de
            página). El último mensaje de cada comparación aparece abajo (podés copiarlo para depurar acá o con una IA).
          </p>
          {competencias.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay competidores registrados.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {filas.map((f, index) => {
                const urlBloqueada = f.urlBloqueadaPorPxSugerido;
                return (
                <li
                  key={f.competenciaId}
                  className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3 items-center border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="flex min-h-full w-full items-center justify-center text-center text-sm font-semibold text-foreground">
                    {f.nombre}
                  </span>
                  <div
                    className={cn(
                      "min-w-0",
                      urlBloqueada
                        ? "flex min-h-full w-full items-center justify-center"
                        : "flex flex-col gap-2"
                    )}
                  >
                    {urlBloqueada ? (
                      <p className="text-sm font-medium text-foreground text-center">
                        Px Sugerido
                      </p>
                    ) : (
                      <>
                        {f.reglas.length > 0 ? (
                          <div>
                            <select
                              className="input-filtro-unificado w-full"
                              value={f.tipoPagina}
                              disabled={!puedeEditar || saving}
                              aria-label={`Tipo de página — ${f.nombre}`}
                              onChange={(e) =>
                                setFilas((prev) =>
                                  prev.map((row, i) =>
                                    i === index ? { ...row, tipoPagina: e.target.value } : row
                                  )
                                )
                              }
                            >
                              {f.reglas.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                        <div>
                          <div className="relative w-full min-w-0">
                            <Input
                              value={f.url}
                              disabled={!puedeEditar || saving}
                              aria-label={`URL del producto — ${f.nombre}`}
                              onChange={(e) =>
                                setFilas((prev) =>
                                  prev.map((row, i) =>
                                    i === index ? { ...row, url: e.target.value } : row
                                  )
                                )
                              }
                              placeholder="https://..."
                              className={cn(puedeEditar && "pr-10")}
                            />
                            {puedeEditar ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={saving || !f.url.trim()}
                                className={cn(
                                  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
                                  "absolute right-0 top-0 !h-9 !w-9 shrink-0 !p-0",
                                )}
                                aria-label={`Borrar URL de ${f.nombre}`}
                                title="Borrar URL"
                                onClick={() =>
                                  setFilas((prev) =>
                                    prev.map((row, i) =>
                                      i === index ? { ...row, url: "" } : row
                                    )
                                  )
                                }
                              >
                                <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <RelevamientoUltimoMensaje
                          vinculo={vinculosPorCompetencia[f.competenciaId]}
                          tieneUrlEnEdicion={!!f.url.trim()}
                        />
                      </>
                    )}
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
