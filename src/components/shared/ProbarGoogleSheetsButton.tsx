"use client";

import { useState } from "react";
import { Sheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { probarConexionGoogleSheetsAction } from "@/actions/googleSheets";
import { cn } from "@/lib/utils";

/** Botón temporal de probe: valida service account + permisos del Sheet (A1). */
export default function ProbarGoogleSheetsButton({
  className,
}: {
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      const res = await probarConexionGoogleSheetsAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo conectar con Google Sheets.");
        return;
      }
      toast.success(`Google Sheets OK: ${res.data.spreadsheetTitle}`, {
        description: "Se escribió una marca de prueba en A1.",
        action: {
          label: "Abrir",
          onClick: () => window.open(res.data.url, "_blank", "noopener,noreferrer"),
        },
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("h-10 gap-2 px-4", className)}
      disabled={pending}
      onClick={() => void handleClick()}
    >
      <Sheet className="size-4 shrink-0" aria-hidden />
      {pending ? "Probando…" : "Probar Google Sheets"}
    </Button>
  );
}
