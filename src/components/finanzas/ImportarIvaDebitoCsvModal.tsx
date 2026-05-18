"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { importarFinBalIvaDebCsvAction } from "@/actions/finBalIvaDeb";
import { parsearTxtIvaDebitoAfip } from "@/lib/finBalIvaDebTxt";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BADGE_SUCCESS_TINT_CLASS } from "@/lib/ui-classes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mes: number;
  anio: number;
}

const MESES: Record<number, string> = {
  1: "ENERO",
  2: "FEBRERO",
  3: "MARZO",
  4: "ABRIL",
  5: "MAYO",
  6: "JUNIO",
  7: "JULIO",
  8: "AGOSTO",
  9: "SEPTIEMBRE",
  10: "OCTUBRE",
  11: "NOVIEMBRE",
  12: "DICIEMBRE",
};

export default function ImportarIvaDebitoCsvModal({ open, onOpenChange, mes, anio }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorParseo, setErrorParseo] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    cantidad: number;
    totalIva: number;
    erroresFila: number;
  } | null>(null);

  const etiquetaMes = MESES[mes] ?? String(mes);

  const puedeImportar =
    !!archivo && preview != null && preview.cantidad > 0 && preview.totalIva > 0 && !guardando;

  useEffect(() => {
    if (!open) return;
    setArchivo(null);
    setPreview(null);
    setErrorParseo(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [open]);

  function analizarTexto(raw: string) {
    const parsed = parsearTxtIvaDebitoAfip(raw, { mes, anio });
    if (!parsed.ok) {
      setPreview(null);
      setErrorParseo(parsed.error);
      return;
    }
    setErrorParseo(null);
    setPreview({
      cantidad: parsed.filas.length,
      totalIva: parsed.totalIva,
      erroresFila: parsed.erroresFila,
    });
  }

  async function handleImportar() {
    if (!archivo || !puedeImportar) return;
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
      const n = d.insertados + d.actualizados;
      let msg = `Importación lista: ${n} alícuota(s) · IVA débito $${fmtPrecio(d.totalIva)} (${etiquetaMes} ${anio}).`;
      if (d.insertados > 0 || d.actualizados > 0) {
        msg += ` ${d.insertados} creado(s) · ${d.actualizados} actualización(es).`;
      }
      if (d.ignoradasInvalidas > 0) {
        msg += ` ${d.ignoradasInvalidas} línea(s) omitida(s).`;
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
      setPreview(null);
      setErrorParseo(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".txt")) {
      toast.error("Solo se permiten archivos .txt");
      setArchivo(null);
      setPreview(null);
      setErrorParseo(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setArchivo(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = (e.target?.result as string) ?? "";
      analizarTexto(raw);
    };
    reader.onerror = () => {
      toast.error("No se pudo leer el archivo.");
      setArchivo(null);
      setPreview(null);
      setErrorParseo(null);
    };
    reader.readAsText(f, "UTF-8");
  }

  const resumenClase = useMemo(() => {
    if (!preview) return "";
    return "border-border/50 bg-card/30";
  }, [preview]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (guardando && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Importar IVA Débito (Alícuotas)"
        size="md"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={guardando}
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              disabled={!puedeImportar}
              onClick={() => void handleImportar()}
            >
              Importar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-muted-foreground">
            Período: <span className="font-medium text-foreground">{etiquetaMes} {anio}</span>.
            Subí el TXT de <strong className="font-medium text-foreground">alícuotas</strong> del Libro
            IVA Digital (62 caracteres por línea). El IVA débito se toma del archivo; la aplicación no
            lo calcula.
          </p>

          <div className="space-y-2">
            <input
              ref={inputRef}
              id="fin-bal-iva-deb-archivo"
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              aria-label="Archivo de alícuotas IVA débito TXT"
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
              {archivo ? archivo.name : "Seleccionar archivo .txt de alícuotas"}
            </Button>
          </div>

          {errorParseo && (
            <p className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              {errorParseo}
            </p>
          )}

          {archivo && preview && (
            <div className={cn("rounded-lg border px-3 py-3 space-y-2", resumenClase)}>
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                <span className="truncate font-medium">{archivo.name}</span>
              </div>

              <dl className="grid grid-cols-1 gap-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Alícuotas</dt>
                  <dd className="tabular-nums font-medium">{preview.cantidad}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">IVA débito total</dt>
                  <dd className="tabular-nums font-semibold text-primary">
                    ${fmtPrecio(preview.totalIva)}
                  </dd>
                </div>
              </dl>

              {preview.erroresFila > 0 && (
                <p className="text-xs text-muted-foreground">
                  {preview.erroresFila} línea(s) ignorada(s) por formato inválido.
                </p>
              )}

              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                  BADGE_SUCCESS_TINT_CLASS,
                )}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden />
                {etiquetaMes} {anio}
              </span>
            </div>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
