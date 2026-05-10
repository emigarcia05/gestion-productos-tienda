"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { importarFinBalIvaDebCsvAction } from "@/actions/finBalIvaDeb";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mes: number;
  anio: number;
}

export default function ImportarIvaDebitoCsvModal({ open, onOpenChange, mes, anio }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setArchivo(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [open]);

  async function handleImportar() {
    if (!archivo || guardando) return;
    setGuardando(true);
    try {
      const fd = new FormData();
      fd.set("mes", String(mes));
      fd.set("anio", String(anio));
      fd.set("archivo", archivo);
      const r = await importarFinBalIvaDebCsvAction(fd);
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo importar.");
        return;
      }
      const d = r.data;
      const emitidosPeriodo = d.insertados + d.actualizados;
      let msg = `Importación lista: ${emitidosPeriodo} comprobante(s) emitidos en el período · ${d.insertados} creado(s) · ${d.actualizados} actualización(es).`;
      const extras: string[] = [];
      if (d.ignoradasOtroMes > 0) {
        extras.push(`${d.ignoradasOtroMes} omitido(s) (otro mes)`);
      }
      if (d.ignoradasInvalidas > 0) {
        extras.push(`${d.ignoradasInvalidas} fila(s) inválida(s)`);
      }
      if (extras.length > 0) {
        msg += ` ${extras.join(" · ")}.`;
      }
      toast.success(msg);
      onOpenChange(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  function onPickFile(f: File | null) {
    if (!f) {
      setArchivo(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Solo se permiten archivos .csv");
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setArchivo(f);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (guardando && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Importar Comprobantes Fiscales Emitidos"
        size="md"
        className="max-w-md"
        actions={
          <>
            <Button type="button" variant="outline" disabled={guardando} onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button type="button" disabled={!archivo || guardando} onClick={() => void handleImportar()}>
              Importar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm">
          <div className="space-y-2">
            <input
              ref={inputRef}
              id="fin-bal-iva-deb-csv"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              aria-label="CSV comprobantes fiscales emitidos"
              disabled={guardando}
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={guardando}
              onClick={() => inputRef.current?.click()}
            >
              {archivo ? archivo.name : "Seleccionar archivo .csv"}
            </Button>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
