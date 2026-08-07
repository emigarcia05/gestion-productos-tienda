"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export interface SidebarMainAppAreaProps {
  /** Clases en el contenedor del logo. */
  className?: string;
}

/**
 * Logo decorativo del pie de la slidenav.
 * La navegación entre módulos vive en `SidebarAreaSwitcher`.
 */
export default function SidebarMainAppArea({ className }: SidebarMainAppAreaProps) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col items-center", className)}>
      <div
        className={cn(
          "flex w-full max-w-[45%] flex-col items-center justify-center rounded-lg p-0",
          "cursor-default select-none"
        )}
        aria-hidden
      >
        <Image
          src="/logo_tiendacolor.png"
          alt=""
          width={200}
          height={100}
          className="h-auto w-full object-contain"
        />
      </div>
    </div>
  );
}
