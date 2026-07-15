"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import MktRedSocialIcon from "@/components/marketing/MktRedSocialIcon";
import { Button } from "@/components/ui/button";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fechaIso: string;
  publicaciones: MktPublicacionCalendarioItem[];
  esEditor: boolean;
  onCrearNueva: () => void;
  onEditar: (item: MktPublicacionCalendarioItem) => void;
  onEliminar: (item: MktPublicacionCalendarioItem) => void;
}

export default function MktPublicacionesDiaModal({
  open,
  onOpenChange,
  fechaIso,
  publicaciones,
  esEditor,
  onCrearNueva,
  onEditar,
  onEliminar,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={`Publicaciones Del Día — ${fechaIso ? formatIsoYmdDdMmYyyyArgentina(fechaIso) : ""}`}
        size="lg"
        className="max-w-2xl"
        scrollBody
        hideBodyScrollbars
        actions={
          <div className="flex w-full justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {esEditor ? (
            <Button
              type="button"
              variant="default"
              className="h-10 w-full gap-2"
              onClick={onCrearNueva}
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              Crear Nueva Publicación
            </Button>
          ) : null}

          {publicaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay publicaciones para este día.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {publicaciones.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-3"
                >
                  <span
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
                    title={item.redNombre}
                    aria-label={item.redNombre}
                  >
                    <MktRedSocialIcon redNombre={item.redNombre} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                    <p className="line-clamp-2 text-sm font-medium text-foreground" title={item.publicacion}>
                      {item.publicacion}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.tipoContenidoNombre}
                      {item.contenidoCreado ? " · CONTENIDO CREADO: SI" : " · CONTENIDO CREADO: NO"}
                    </p>
                  </div>
                  {esEditor ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS, "!h-8 !w-8 !p-1")}
                        title="Editar"
                        aria-label="Editar publicación"
                        onClick={() => onEditar(item)}
                      >
                        <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS, "!h-8 !w-8 !p-1")}
                        title="Eliminar"
                        aria-label="Eliminar publicación"
                        onClick={() => onEliminar(item)}
                      >
                        <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
