"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { FileText, Upload, Download, Loader2, ChevronDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { descargarExcelListaPreciosPdfMatriz } from "@/lib/exportListaPreciosPdfMatrizExcelClient";
import type { FilaPdfMatrizNormalizadaDto } from "@/lib/validations/parseListaPreciosPdfMatriz";
import { PAGINA_INICIO_PDF_MATRIZ_DEFAULT } from "@/lib/validations/parseListaPreciosPdfMatriz";

interface Proveedor {
  id: string;
  nombre: string;
  prefijo: string;
}

interface Props {
  proveedores: Proveedor[];
}

type Estado = "idle" | "config" | "procesando" | "preview" | "error";

function fmtPrecio(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ConvertirPdfListaPreciosModal({ proveedores }: Props) {
  const [open, setOpen] = useState(false);
  const [estado, setEstado] = useState<Estado>("idle");
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [paginaInicio, setPaginaInicio] = useState(String(PAGINA_INICIO_PDF_MATRIZ_DEFAULT));
  const [filasIgnorar, setFilasIgnorar] = useState("0");
  const [proveedorId, setProveedorId] = useState("");
  const [filas, setFilas] = useState<FilaPdfMatrizNormalizadaDto[]>([]);
  const [advertencias, setAdvertencias] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setEstado("idle");
    setArchivoPendiente(null);
    setFileName(null);
    setFilas([]);
    setAdvertencias([]);
    setErrorMsg(null);
    setPaginaInicio(String(PAGINA_INICIO_PDF_MATRIZ_DEFAULT));
    setFilasIgnorar("0");
  }, []);

  const handleClose = useCallback(
    (next: boolean) => {
      if (!next) resetForm();
      setOpen(next);
    },
    [resetForm]
  );

  const seleccionarArchivo = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Solo se aceptan archivos PDF.");
      return;
    }
    setArchivoPendiente(file);
    setFileName(file.name);
    setFilas([]);
    setAdvertencias([]);
    setErrorMsg(null);
    setEstado("config");
  }, []);

  const procesarPdf = useCallback(async () => {
    if (!archivoPendiente) return;

    const pagina = Number.parseInt(paginaInicio, 10);
    if (!Number.isFinite(pagina) || pagina < 1) {
      toast.error("Ingresá una página de inicio válida (≥ 1).");
      return;
    }

    const ignorar = Number.parseInt(filasIgnorar, 10);
    if (!Number.isFinite(ignorar) || ignorar < 0) {
      toast.error("Ingresá cuántas filas ignorar (número ≥ 0).");
      return;
    }

    setEstado("procesando");
    setErrorMsg(null);
    setFilas([]);
    setAdvertencias([]);

    const formData = new FormData();
    formData.append("file", archivoPendiente);
    formData.append("paginaInicio", String(pagina));
    formData.append("filasIgnorar", String(ignorar));

    try {
      const res = await fetch("/api/parse-lista-precios-pdf", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        filas?: FilaPdfMatrizNormalizadaDto[];
        meta?: { advertencias?: string[] };
      };

      if (!res.ok || !data.ok) {
        const msg = data.error ?? "No se pudo procesar el PDF.";
        setErrorMsg(msg);
        setEstado("error");
        toast.error(msg);
        return;
      }

      const filasResult = data.filas ?? [];
      setFilas(filasResult);
      setAdvertencias(data.meta?.advertencias ?? []);
      setEstado("preview");

      if (filasResult.length === 0) {
        toast.warning("El PDF no produjo ítems con precio. Revisá página y filas a ignorar.");
      } else {
        toast.success(`${filasResult.length} ítem(s) listos para exportar.`);
      }
    } catch {
      const msg = "Error de conexión al procesar el PDF.";
      setErrorMsg(msg);
      setEstado("error");
      toast.error(msg);
    }
  }, [archivoPendiente, paginaInicio, filasIgnorar]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) seleccionarArchivo(file);
    },
    [seleccionarArchivo]
  );

  const prefijoProveedor = proveedores.find((p) => p.id === proveedorId)?.prefijo;

  function handleDescargarExcel() {
    if (filas.length === 0) return;
    descargarExcelListaPreciosPdfMatriz(filas, { prefijoProveedor });
    toast.success("Excel descargado.");
  }

  const enConfig = estado === "config" && !!archivoPendiente;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="default" className="gap-2">
          <FileText className="h-4 w-4" />
          Convertir PDF a Excel
        </Button>
      </DialogTrigger>

      <AppModal
        className="max-w-3xl"
        bodyClassName="max-w-full min-w-0"
        title="Convertir PDF a Excel"
        actions={
          <>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            {enConfig && (
              <Button onClick={() => void procesarPdf()} className="gap-2 min-w-[150px]">
                <ArrowRight className="h-4 w-4" />
                Iniciar Conversión
              </Button>
            )}
            {filas.length > 0 && (
              <Button onClick={handleDescargarExcel} className="gap-2 min-w-[150px]">
                <Download className="h-4 w-4" />
                Descargar Excel
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-3 pt-2 min-w-0 overflow-hidden" aria-busy={estado === "procesando"}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">PROVEEDOR (NOM. ARCHIVO)</label>
            <div className="relative">
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                disabled={estado === "procesando"}
                className="input-filtro-unificado w-full appearance-none pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring border-primary disabled:opacity-50"
              >
                <option value="">SIN PROVEEDOR…</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.prefijo}] {p.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {enConfig && (
            <div className="rounded-lg border border-primary/30 bg-muted/30 p-3 space-y-3">
              <p className="text-sm font-medium text-foreground">
                Antes de convertir, indicá qué omitir del PDF
              </p>
              <p className="text-xs text-muted-foreground">
                Filas a ignorar: líneas del extracto (títulos, encabezados repetidos) al inicio de cada
                página procesada. Desde página: salta el índice al comienzo del documento.
              </p>
              <div className="grid grid-cols-[1fr_8rem] gap-x-4 gap-y-3 items-center">
                <span className="text-sm font-medium text-foreground">FILAS A IGNORAR</span>
                <input
                  type="number"
                  min={0}
                  value={filasIgnorar}
                  onChange={(e) => setFilasIgnorar(e.target.value)}
                  className="input-filtro-unificado w-full text-sm focus:outline-none focus:ring-2 focus:ring-ring border-primary tabular-nums"
                  aria-label="Cantidad de filas a ignorar al inicio del extracto"
                />
                <span className="text-sm font-medium text-foreground">DESDE PÁGINA</span>
                <input
                  type="number"
                  min={1}
                  value={paginaInicio}
                  onChange={(e) => setPaginaInicio(e.target.value)}
                  className="input-filtro-unificado w-full text-sm focus:outline-none focus:ring-2 focus:ring-ring border-primary tabular-nums"
                />
              </div>
              {fileName && (
                <p className="text-xs text-muted-foreground truncate">
                  Archivo: {fileName}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-[1fr_10rem] gap-x-4 gap-y-3 items-center">
            <span className="text-sm font-medium text-foreground min-w-0 truncate">
              {fileName ? "CAMBIAR PDF" : "ADJUNTAR PDF"}
            </span>
            <div className="flex gap-2 w-full min-w-0">
              <button
                type="button"
                disabled={estado === "procesando"}
                onClick={() => {
                  if (fileName) {
                    resetForm();
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-muted/60 text-muted-foreground border border-border hover:bg-muted disabled:opacity-50"
              >
                {fileName ? "CAMBIAR PDF" : "ADJUNTAR PDF"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) seleccionarArchivo(f);
                }}
              />
            </div>
          </div>

          {!fileName && (
            <div
              className={cn(
                "rounded-lg border-2 border-dashed transition-colors flex items-center justify-center gap-2 py-4 px-3",
                isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                Arrastrá un PDF; luego indicá las filas a ignorar
              </span>
            </div>
          )}

          {estado === "procesando" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2" role="status">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Procesando PDF…
            </div>
          )}

          {errorMsg && (
            <p className="text-sm text-destructive" role="alert">
              {errorMsg}
            </p>
          )}

          {advertencias.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              {advertencias.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}

          {filas.length > 0 && (
            <div className="space-y-2 min-h-0">
              <p className="text-sm font-medium text-foreground">
                {filas.length} ÍTEM(S) — VISTA PREVIA
              </p>
              <div className="contenedor-tabla-gestion max-h-[min(24rem,50vh)] overflow-y-auto overflow-x-hidden border border-border rounded-lg">
                <Table scrollX={false}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70%]">DESCRIPCIÓN</TableHead>
                      <TableHead className="w-[30%]">PX. LISTA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((f, i) => (
                      <TableRow key={`${f.descripcionExport}-${i}`}>
                        <TableCell className="celda-datos">{f.descripcionExport}</TableCell>
                        <TableCell className="celda-datos tabular-nums">{fmtPrecio(f.precio)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
