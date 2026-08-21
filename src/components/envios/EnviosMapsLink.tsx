"use client";

import { MapPin } from "lucide-react";
import { CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS, TABLE_ROW_ACTION_ICON_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export default function EnviosMapsLink({ url }: { url: string }) {
  const href = url.trim();
  if (href === "") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center",
          CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS,
          "pointer-events-none opacity-50"
        )}
        title="Ver en Maps"
        aria-label="Ver en Maps"
        aria-disabled="true"
      >
        <MapPin className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Ver en Maps"
      aria-label="Ver en Maps"
      className={cn(
        "inline-flex items-center justify-center",
        CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <MapPin className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
    </a>
  );
}
