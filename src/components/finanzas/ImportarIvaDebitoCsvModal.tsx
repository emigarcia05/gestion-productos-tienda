"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ChevronDown, FileText } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importarFinBalIvaDebCsvAction } from "@/actions/finBalIvaDeb";
import { mapeoAutomaticoIvaDebAfip, type MapeoColumnasIvaDeb } from "@/lib/finBalIvaDebCsv";
import { parsearCSVCrudo } from "@/lib/parsearImport";
import type { CampoDestinoIvaDeb } from "@/lib/validations/finBalIvaDebImport";
import { cn } from "@/lib/utils";
import { BADGE_SUCCESS_TINT_CLASS } from "@/lib/ui-classes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mes: number;
  anio: number;
}

const CAMPOS: { value: CampoDestinoIvaDeb; label: string; required: boolean }[] = [
  { value: "fechaEmision", label: "FECHA EMISIÓN", required: true },
  { value: "denominacionReceptor", label: "DENOMINACIÓN RECEPTOR", required: true },
  { value: "impTotal", label: "IMP. TOTAL", required: true },
  { value: "tipoComprobante", label: "TIPO COMPROBANTE", required: false },
  { value: "puntoVenta", label: "PUNTO DE VENTA", required: false },
  { value: "numeroDesde", label: "NÚMERO DESDE", required: false },
  { value: "numeroHasta", label: "NÚMERO HASTA", required: false },
  { value: "codAutorizacion", label: "CÓD. AUTORIZACIÓN", required: false },
  { value: "nroDocReceptor", label: "NRO. DOC. RECEPTOR", required: false },
  { value: "ignorar", label: "IGNORAR COLUMNA", required: false },
];

const EXTENSIONES = /\.(csv|txt)$/i;

export default function ImportarIvaDebitoCsvModal({ open, onOpenChange, mes, anio }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [textoArchivo, setTextoArchivo] = useState<string | null>(null);
  const [tieneEncabezados, setTieneEncabezados] = useState(true);
  const [encabezados, setEncabezados] = useState<string[] | null>(null);
  const [filasCrudas, setFilasCrudas] = useState<string[][]>([]);
  const [mapeo, setMapeo] = useState<MapeoColumnasIvaDeb>({});
  const [guardando, setGuardando] = useState(false);

  const reprocesarTexto = useCallback((raw: string, conEncabezados: boolean) => {
    const { encabezados: enc, filas } = parsearCSVCrudo(raw, conEncabezados);
    setEncabezados(enc);
    setFilasCrudas(filas);
    const numCols = enc?.length ?? filas[0]?.length ?? 0;
    const inicial: MapeoColumnasIvaDeb = {};
    if (enc && enc.length > 0) {
      Object.assign(inicial, mapeoAutomaticoIvaDebAfip(enc));
    } else {
      for (let i = 0; i < numCols; i++) inicial[i] = "ignorar";
    }
    setMapeo(inicial);
  }, []);

  useEffect(() => {
    if (!open) return;
    setArchivo(null);
    setTextoArchivo(null);
    setTieneEncabezados(true);
    setEncabezados(null);
    setFilasCrudas([]);
    setMapeo({});
    if (inputRef.current) inputRef.current.value = "";
  }, [open]);

  useEffect(() => {
    if (!textoArchivo) return;
    try {
      reprocesarTexto(textoArchivo, tieneEncabezados);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al leer el archivo.");
      setArchivo(null);
      setTextoArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [tieneEncabezados, textoArchivo, reprocesarTexto]);

  const camposRequeridosMapeados = CAMPOS.filter((c) => c.required).every((c) =>
    Object.values(mapeo).includes(c.value)
  );

  async function handleImportar() {
    if (!archivo || !camposRequeridosMapeados || guardando) return;
    setGuardando(true);
    try {
      const fd = new FormData();
      fd.set("mes", String(mes));
      fd.set("anio", String(anio));
      fd.set("archivo", archivo);
      fd.set("tieneEncabezados", tieneEncabezados ? "true" : "false");
      fd.set("mapeo", JSON.stringify(mapeo));
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
      setTextoArchivo(null);
      return;
    }
    if (!EXTENSIONES.test(f.name)) {
      toast.error("Solo se permiten archivos .csv o .txt");
      setArchivo(null);
      setTextoArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setArchivo(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = (e.target?.result as string) ?? "";
      setTextoArchivo(raw);
    };
    reader.onerror = () => {
      toast.error("No se pudo leer el archivo.");
      setArchivo(null);
      setTextoArchivo(null);
    };
    reader.readAsText(f, "UTF-8");
  }

  const colLabels =
    encabezados ?? filasCrudas[0]?.map((_, i) => `Columna ${i + 1}`) ?? [];
  const filaEjemplo = filasCrudas[0] ?? [];

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
        size="lg"
        className="max-w-2xl"
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
              disabled={!archivo || !camposRequeridosMapeados || guardando}
              onClick={() => void handleImportar()}
            >
              Importar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm">
          <div className="space-y-2">
            <input
              ref={inputRef}
              id="fin-bal-iva-deb-archivo"
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              aria-label="Archivo comprobantes fiscales emitidos"
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
              {archivo ? archivo.name : "Seleccionar archivo .csv o .txt"}
            </Button>
          </div>

          {archivo && (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-3 py-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{archivo.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({filasCrudas.length} fila{filasCrudas.length !== 1 ? "s" : ""})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground">
                  LOS DATOS TIENEN ENCABEZADOS
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTieneEncabezados(true)}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      tieneEncabezados
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                    )}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => setTieneEncabezados(false)}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      !tieneEncabezados
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                    )}
                  >
                    NO
                  </button>
                </div>
              </div>

              {colLabels.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Asigná cada columna del archivo a los datos del comprobante. El separador
                    (punto y coma, coma o tabulador) se detecta automáticamente.
                  </p>
                  <div className="rounded-lg border border-border/50 overflow-hidden bg-card max-h-[240px] overflow-y-auto w-full min-w-0">
                    <Table variant="compact" className="table-fixed w-full">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="py-2 px-3 text-xs w-[45%]">COLUMNA</TableHead>
                          <TableHead className="py-2 px-3 text-xs w-[55%]">MAPEAR A</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {colLabels.map((label, i) => (
                          <TableRow key={i}>
                            <TableCell className="py-2 px-3 font-mono text-xs truncate">
                              {label?.trim() ? label : (filaEjemplo[i] ?? "—")}
                            </TableCell>
                            <TableCell className="py-2 px-3">
                              <div className="relative">
                                <select
                                  value={mapeo[i] ?? "ignorar"}
                                  onChange={(e) =>
                                    setMapeo((prev) => ({
                                      ...prev,
                                      [i]: e.target.value as CampoDestinoIvaDeb,
                                    }))
                                  }
                                  className="w-full appearance-none rounded border border-input bg-background px-2 py-1.5 pr-6 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                  disabled={guardando}
                                >
                                  {CAMPOS.map((c) => (
                                    <option key={c.value} value={c.value}>
                                      {c.required ? `${c.label} *` : c.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CAMPOS.filter((c) => c.required).map((c) => {
                      const asignado = Object.values(mapeo).includes(c.value);
                      return (
                        <Badge
                          key={c.value}
                          className={
                            asignado
                              ? BADGE_SUCCESS_TINT_CLASS
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }
                        >
                          {asignado ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {c.label}
                        </Badge>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
