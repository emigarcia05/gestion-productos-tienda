"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cva, type VariantProps } from "class-variance-authority";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AppModal from "@/components/shared/AppModal";
import { cn } from "@/lib/utils";
import {
  MAIN_APP_AREAS,
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

const areaStatusVariants = cva("text-xs leading-tight", {
  variants: {
    context: {
      sidebar: "text-sidebar-foreground/75",
      modal: "text-muted-foreground",
    },
  },
  defaultVariants: {
    context: "modal",
  },
});

type AreaTitleContext = NonNullable<VariantProps<typeof areaTitleVariants>["context"]>;

export interface SidebarMainAppAreaProps {
  /** Dónde aplicar tokens de texto (sidebar vs modal). */
  labelContext?: AreaTitleContext;
}

export default function SidebarMainAppArea({ labelContext = "sidebar" }: SidebarMainAppAreaProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const currentId = getMainAppAreaIdFromPathname(pathname);
  const current = getMainAppAreaById(currentId);

  function navigateToArea(id: MainAppAreaId) {
    const area = getMainAppAreaById(id);
    router.push(area.href);
    setOpen(false);
  }

  return (
    <>
      <div className="flex flex-col items-center gap-2 w-full min-w-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "rounded-lg p-0 border-0 bg-transparent w-full max-w-[45%]",
            "flex justify-center items-center",
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

        <div className="flex flex-col items-center text-center gap-0.5 px-1 w-full" role="status" aria-live="polite">
          <span
            className={cn(areaTitleVariants({ context: labelContext }), "tracking-tight")}
          >
            {current.label}
          </span>
          <span className={areaStatusVariants({ context: labelContext })}>
            {current.statusLabel}
          </span>
        </div>
      </div>

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
            <p className="text-sm text-muted-foreground mb-1">
              Elegí en qué área querés trabajar. Vas a la página principal de esa sección.
            </p>
            {MAIN_APP_AREAS.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => navigateToArea(area.id)}
                className={cn(areaOptionVariants({ current: area.id === currentId }))}
              >
                <span className={cn(areaTitleVariants({ context: "modal" }), "block")}>
                  {area.label}
                </span>
                <span className={cn(areaStatusVariants({ context: "modal" }), "block mt-0.5")}>
                  {area.statusLabel}
                </span>
              </button>
            ))}
          </div>
        </AppModal>
      </Dialog>
    </>
  );
}
