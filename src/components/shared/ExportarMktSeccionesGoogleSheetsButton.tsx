"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportarMktGoogleSheetsAction } from "@/actions/googleSheets";
import { cn } from "@/lib/utils";

/** Exporta Marketing (todas las pestañas) al spreadsheet fijo de Google Sheets. */
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
      const res = await exportarMktGoogleSheetsAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo exportar a Google Sheets.");
        return;
      }
      const totalFilas = res.data.tabs.reduce((acc, t) => acc + t.filasDatos, 0);
      const nombresHojas = res.data.tabs.map((t) => t.sheetTitle).join(", ");
      toast.success(`Exportado (${totalFilas} fila(s) en ${res.data.tabs.length} hoja(s)).`, {
        description: nombresHojas,
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
      {pending ? "Exportando…" : "Exportar a Sheets"}
    </Button>
  );
}
