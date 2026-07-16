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
      toast.success("Datos Actualizados correctamente");
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
