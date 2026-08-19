"use client";

import { Phone } from "lucide-react";
import { CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS, TABLE_ROW_ACTION_ICON_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export default function EnviosTelLink({ cel }: { cel: string }) {
  const texto = cel.trim();
  if (texto === "") return null;
  const href = `tel:${texto.replace(/\s+/g, "")}`;
  return (
    <a
      href={href}
      title={texto}
      aria-label={`Llamar ${texto}`}
      className={cn(
        "inline-flex items-center justify-center",
        CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Phone className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
    </a>
  );
}
