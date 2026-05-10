"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { importarFinBalIvaDebCsvAction } from "@/actions/finBalIvaDeb";

const MESES: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "ENERO" },
  { valor: 2, etiqueta: "FEBRERO" },
  { valor: 3, etiqueta: "MARZO" },
  { valor: 4, etiqueta: "ABRIL" },
  { valor: 5, etiqueta: "MAYO" },
  { valor: 6, etiqueta: "JUNIO" },
  { valor: 7, etiqueta: "JULIO" },
  { valor: 8, etiqueta: "AGOSTO" },
  { valor: 9, etiqueta: "SEPTIEMBRE" },
  { valor: 10, etiqueta: "OCTUBRE" },
  { valor: 11, etiqueta: "NOVIEMBRE" },
  { valor: 12, etiqueta: "DICIEMBRE" },
];

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

  const etiquetaMes = MESES.find((m) => m.valor === mes)?.etiqueta ?? String(mes);

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
      const partes = [
        `${d.insertados} nuevo(s)`,
        `${d.actualizados} actualizado(s)`,
      ];
      if (d.ignoradasOtroMes > 0) {
        partes.push(`${d.ignoradasOtroMes} ignorado(s) (otro mes)`);
      }
      if (d.ignoradasInvalidas > 0) {
        partes.push(`${d.ignoradasInvalidas} fila(s) inválida(s) en el archivo`);
      }
      toast.success(`Importación lista: ${partes.join(" · ")}.`);
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
        title="Importar comprobantes (IVA débito)"
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
          <p className="text-muted-foreground">
            Período: <span className="font-medium text-foreground">{etiquetaMes}</span>{" "}
            <span className="tabular-nums">{anio}</span>
            . Solo se graban filas cuya fecha de emisión cae en ese mes; el resto se omite.
          </p>
          <div className="space-y-2">
            <Label htmlFor="fin-bal-iva-deb-csv">Archivo CSV (export AFIP, separador «;»)</Label>
            <input
              ref={inputRef}
              id="fin-bal-iva-deb-csv"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
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
