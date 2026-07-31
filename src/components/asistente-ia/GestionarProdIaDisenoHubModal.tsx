"use client";

import { useState, type ReactNode } from "react";
import { Layers, Paintbrush, Shuffle, Sun, Target, Lightbulb } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import GestionarProdIaDisenoCatalogoNombreModal from "@/components/asistente-ia/GestionarProdIaDisenoCatalogoNombreModal";
import type { ProdIaDisenoCatalogoKind } from "@/lib/prodIaDisenoCatalogos";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  esEditor: boolean;
  onCatalogoChanged?: () => void;
}

/** Orden y etiquetas = preguntas 1–6 de Diseñar Colores (`{n}. {titulo}`). */
const OPCIONES: {
  kind: ProdIaDisenoCatalogoKind;
  label: string;
  icon: ReactNode;
}[] = [
  {
    kind: "sup_pintar",
    label: "1. Superficie A Pintar",
    icon: <Paintbrush className="h-5 w-5 shrink-0" aria-hidden />,
  },
  {
    kind: "objetivo",
    label: "2. Objetivo De Diseño",
    icon: <Target className="h-5 w-5 shrink-0" aria-hidden />,
  },
  {
    kind: "estilos",
    label: "3. Estilo De Diseño",
    icon: <Layers className="h-5 w-5 shrink-0" aria-hidden />,
  },
  {
    kind: "luz_natural",
    label: "4. Luz Natural",
    icon: <Sun className="h-5 w-5 shrink-0" aria-hidden />,
  },
  {
    kind: "luz_artificial",
    label: "5. Luz Artificial",
    icon: <Lightbulb className="h-5 w-5 shrink-0" aria-hidden />,
  },
  {
    kind: "combinar",
    label: "6. Combinar",
    icon: <Shuffle className="h-5 w-5 shrink-0" aria-hidden />,
  },
];

export default function GestionarProdIaDisenoHubModal({
  open,
  onOpenChange,
  esEditor,
  onCatalogoChanged,
}: Props) {
  const [catalogoKind, setCatalogoKind] = useState<ProdIaDisenoCatalogoKind | null>(null);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setCatalogoKind(null);
          onOpenChange(next);
        }}
      >
        <AppModal
          title="Gestion Diseño"
          size="sm"
          actions={
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-2">
            {OPCIONES.map((opt) => (
              <Button
                key={opt.kind}
                type="button"
                variant="outline"
                className={cn(
                  "h-12 w-full justify-start gap-3 px-4 text-left font-semibold uppercase"
                )}
                onClick={() => setCatalogoKind(opt.kind)}
              >
                {opt.icon}
                {opt.label}
              </Button>
            ))}
          </div>
        </AppModal>
      </Dialog>

      {catalogoKind ? (
        <GestionarProdIaDisenoCatalogoNombreModal
          open={Boolean(catalogoKind)}
          onOpenChange={(next) => {
            if (!next) setCatalogoKind(null);
          }}
          kind={catalogoKind}
          esEditor={esEditor}
          onCatalogoChanged={onCatalogoChanged}
        />
      ) : null}
    </>
  );
}
