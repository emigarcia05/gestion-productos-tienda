"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportarMktSeccionesGoogleSheetsAction } from "@/actions/googleSheets";
import { cn } from "@/lib/utils";

/** Exporta mkt_publi_ideas_secciones → pestaña Secciones del spreadsheet fijo. */
export default function ExportarMktSeccionesGoogleSheetsButton({
  className,
}: {
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      const res = await exportarMktSeccionesGoogleSheetsAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo exportar Secciones.");
        return;
      }
      toast.success(`Secciones exportadas (${res.data.filasDatos} fila(s)).`, {
        description: `Pestaña «${res.data.sheetTitle}».`,
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
      variant="default"
      className={cn("h-10 gap-2 px-4", className)}
      disabled={pending}
      onClick={() => void handleClick()}
    >
      <Upload className="size-4 shrink-0" aria-hidden />
      {pending ? "Exportando…" : "Exportar Secciones"}
    </Button>
  );
}
