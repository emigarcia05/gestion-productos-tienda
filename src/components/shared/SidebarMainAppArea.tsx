"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Boxes, Landmark, Megaphone, type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AppModal from "@/components/shared/AppModal";
import { cn } from "@/lib/utils";
import {
  MAIN_APP_AREAS,
  areaLabelMayusculas,
  getMainAppAreaById,
  getMainAppAreaIdFromPathname,
  type MainAppAreaId,
} from "@/lib/main-app-areas";

const areaOptionVariants = cva(
  "w-full rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
  {
    variants: {
      current: {
        true: "border-sidebar-indicator bg-sidebar-accent/40 text-sidebar-foreground",
        false:
          "border-border bg-card text-foreground hover:bg-muted/80",
      },
    },
    defaultVariants: {
      current: false,
    },
  }
);

const areaTitleVariants = cva("text-sm font-semibold leading-tight", {
  variants: {
    context: {
      sidebar: "text-sidebar-foreground",
      modal: "text-foreground",
    },
  },
  defaultVariants: {
    context: "modal",
  },
});

type AreaTitleContext = NonNullable<VariantProps<typeof areaTitleVariants>["context"]>;

const areaIcons: Record<MainAppAreaId, LucideIcon> = {
  "gestion-productos": Boxes,
  finanzas: Landmark,
  "estadisticas-productos": BarChart3,
  marketing: Megaphone,
};

export interface SidebarMainAppAreaProps {
  /** Clases en el contenedor del bloque área + logo (p. ej. espaciado respecto de reglas). */
  className?: string;
  /** Dónde aplicar tokens de texto (sidebar vs modal). */
  labelContext?: AreaTitleContext;
  /** Mostrar logo clickeable (abre modal de áreas). */
  showLogo?: boolean;
  /** Mostrar nombre del área actual. */
  showLabel?: boolean;
  /**
   * Si es `false` (rol simple), el modal del logo solo lista **Gestión Productos**.
   * Finanzas, Estadísticas Productos y Marketing quedan reservados para `editor`.
   * @default true (compatibilidad; el layout pasa `rol === "editor"`).
   */
  esEditor?: boolean;
}

export default function SidebarMainAppArea({
  className,
  labelContext = "sidebar",
  showLogo = true,
  showLabel = true,
  esEditor = true,
}: SidebarMainAppAreaProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const currentId = getMainAppAreaIdFromPathname(pathname);
  const current = getMainAppAreaById(currentId);

  /** Solo editor puede cambiar de macro-área (Finanzas / Estadísticas). */
  const logoAbreSelector = esEditor;

  function navigateToArea(id: MainAppAreaId) {
    const area = getMainAppAreaById(id);
    router.push(area.href);
    setOpen(false);
  }

  return (
    <>
      <div className={cn("flex flex-col items-center gap-2 w-full min-w-0", className)}>
        {showLabel && showLogo ? (
          <div
            className="w-full min-w-0 shrink-0 px-1 text-center"
            role="status"
            aria-live="polite"
          >
            <span
              className={cn(
                areaTitleVariants({ context: labelContext }),
                "tracking-tight block w-full text-center",
                labelContext === "sidebar" && "text-[13px] leading-none whitespace-nowrap"
              )}
            >
              {areaLabelMayusculas(current.label)}
            </span>
          </div>
        ) : null}
        {showLogo ? (
          logoAbreSelector ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "rounded-lg p-0 border-0 bg-transparent w-full max-w-[45%]",
                "flex flex-col items-center justify-center",
                "transition-opacity hover:opacity-90",
                "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              )}
              aria-label="Elegir Área De La Aplicación"
            >
              <Image
                src="/logo_tiendacolor.png"
                alt=""
                width={200}
                height={100}
                className="w-full h-auto object-contain pointer-events-none"
              />
            </button>
          ) : (
            <div
              className={cn(
                "rounded-lg p-0 w-full max-w-[45%]",
                "flex flex-col items-center justify-center",
                "cursor-default select-none"
              )}
              aria-hidden
            >
              <Image
                src="/logo_tiendacolor.png"
                alt=""
                width={200}
                height={100}
                className="w-full h-auto object-contain"
              />
            </div>
          )
        ) : null}

        {showLabel && !showLogo ? (
          <div className="flex flex-col items-center justify-center text-center px-1 w-full" role="status" aria-live="polite">
            <span
              className={cn(
                areaTitleVariants({ context: labelContext }),
                "tracking-tight block w-full text-center pb-0.5",
                labelContext === "sidebar" && "text-[13px] leading-none whitespace-nowrap"
              )}
            >
              {areaLabelMayusculas(current.label)}
            </span>
          </div>
        ) : null}
      </div>

      {logoAbreSelector ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <AppModal
            size="sm"
            title="Áreas De La Aplicación"
            padding="sm"
            actions={
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            }
          >
            <div className="flex flex-col gap-2 w-full min-w-0">
              {MAIN_APP_AREAS.map((area) => {
                const Icon = areaIcons[area.id];
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => navigateToArea(area.id)}
                    className={cn(areaOptionVariants({ current: area.id === currentId }))}
                  >
                    <span className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          area.id === currentId ? "text-foreground" : "text-muted-foreground"
                        )}
                        aria-hidden="true"
                      />
                      <span className={cn(areaTitleVariants({ context: "modal" }), "block")}>
                        {areaLabelMayusculas(area.label)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </AppModal>
        </Dialog>
      ) : null}
    </>
  );
}
