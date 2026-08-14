"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Upload, FileText, Loader2, CheckCircle2,
  AlertCircle, X, ArrowRight, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importarProductos, type ImportResult, type MapeoColumnas } from "@/actions/importar";
import { parsearCSVCrudo } from "@/lib/parsearImport";
import { cn } from "@/lib/utils";
import {
  BADGE_SUCCESS_TINT_CLASS,
  IMPORT_STAT_BADGE_CLASSES,
  TEXT_SUCCESS_CLASS,
} from "@/lib/ui-classes";
import ModalSiNoChoice from "@/components/shared/ModalSiNoChoice";

const SELECT_NONE = "none";

interface Proveedor {
  id: string;
  nombre: string;
  codigoUnico: string;
  prefijo: string;
}

interface Props {
  proveedores: Proveedor[];
  proveedorPreseleccionado?: string;
}

type Step = "upload" | "mapear" | "result";

type CampoDestino = "codProdProv" | "descripcion" | "precioLista" | "precioVentaSugerido" | "ignorar";

const CAMPOS: { value: CampoDestino; label: string; required: boolean }[] = [
  { value: "codProdProv",          label: "COD. PRODUCTO PROVEEDOR",  required: true },
  { value: "descripcion",          label: "DESCRIPCIÓN",              required: true },
  { value: "precioLista",          label: "PX. LISTA PROVEEDOR",       required: true },
  { value: "precioVentaSugerido",  label: "PX. VENTA SUGERIDO",        required: false },
  { value: "ignorar",              label: "IGNORAR COLUMNA",          required: false },
];

export default function ImportarModal({ proveedores, proveedorPreseleccionado }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [proveedorId, setProveedorId] = useState(proveedorPreseleccionado ?? "");
  const [tieneEncabezados, setTieneEncabezados] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Datos parseados del CSV
  const [encabezados, setEncabezados] = useState<string[] | null>(null);
  const [filasCrudas, setFilasCrudas] = useState<string[][]>([]);
  const [mapeo, setMapeo] = useState<MapeoColumnas>({});

  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setStep("upload");
    setProveedorId(proveedorPreseleccionado ?? "");
    setTieneEncabezados(true);
    setIsDragging(false);
    setFileName(null);
    setEncabezados(null);
    setFilasCrudas([]);
    setMapeo({});
    setResult(null);
  }

  function handleClose(val: boolean) {
    if (!val) resetForm();
    setOpen(val);
  }

  const loadFile = useCallback((file: File) => {
    if (!file.name.match(/\.csv$/i)) {
      toast.error("Solo se aceptan archivos CSV.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string ?? "";
      try {
        const { encabezados: enc, filas } = parsearCSVCrudo(raw, tieneEncabezados);
        setEncabezados(enc);
        setFilasCrudas(filas);

        // Mapeo inicial vacío
        const inicialMapeo: MapeoColumnas = {};
        const cols = enc ?? (filas[0] ? filas[0].map((_, i) => String(i)) : []);
        cols.forEach((_, i) => { inicialMapeo[i] = "ignorar"; });
        setMapeo(inicialMapeo);

        setStep("mapear");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al leer el archivo.");
        setFileName(null);
      }
    };
    reader.readAsText(file, "UTF-8");
  }, [tieneEncabezados]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const camposRequeridosMapeados = CAMPOS
    .filter((c) => c.required)
    .every((c) => Object.values(mapeo).includes(c.value));

  function handleImport() {
    if (!proveedorId) { toast.error("Selecciona un proveedor."); return; }
    if (!camposRequeridosMapeados) { toast.error("Asigná todos los campos requeridos."); return; }

    startTransition(async () => {
      try {
        const res = await importarProductos(proveedorId, filasCrudas, mapeo);
        if (!res.ok) {
          toast.error(res.error ?? "Error al importar.");
          return;
        }
        const data = res.data;
        setResult(data);
        setStep("result");
        if (data.errores.length === 0) {
          toast.success("Importación completada.");
        } else {
          toast.warning(`Importación con ${data.errores.length} advertencia(s).`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al importar.");
      }
    });
  }

  const proveedorSeleccionado = proveedores.find((p) => p.id === proveedorId);
  const colLabels = encabezados ?? filasCrudas[0]?.map((_, i) => `Columna ${i + 1}`) ?? [];
  const filaEjemplo = filasCrudas[0] ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="default" size="default" className="btn-primario-gestion gap-2">
              <Upload className="h-4 w-4" />
              Importar Lista
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Importar productos desde CSV</TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Productos</DialogTitle>
        </DialogHeader>

        {/* ── PASO 1: Subir archivo ── */}
        {step === "upload" && (
          <div className="space-y-5 pt-2">
            {/* Selector de proveedor */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">PROVEEDOR</label>
              <Select
                value={proveedorId || SELECT_NONE}
                onValueChange={(v) => setProveedorId(v === SELECT_NONE ? "" : v)}
                disabled={!!proveedorPreseleccionado}
              >
                <SelectTrigger className={cn("w-full")}>
                  <SelectValue placeholder="SELECCIONAR PROVEEDOR..." />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start">
                  <SelectItem value={SELECT_NONE}>SELECCIONAR PROVEEDOR...</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      [{p.prefijo}] {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {proveedorSeleccionado && (
                <p className="text-xs text-muted-foreground">
                  Prefijo del código externo:{" "}
                  <code className="bg-muted px-1 rounded">{proveedorSeleccionado.prefijo}-</code>
                </p>
              )}
            </div>

            {/* Encabezados */}
            <div className="grid grid-cols-[1fr_10rem] gap-x-4 gap-y-3 items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">EL ARCHIVO TIENE ENCABEZADOS</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tieneEncabezados
                    ? "La primera fila se omitirá y se usará como nombre de columnas"
                    : "Todas las filas se tratarán como datos"}
                </p>
              </div>
              <ModalSiNoChoice value={tieneEncabezados} onChange={setTieneEncabezados} />
            </div>

            {/* Zona drag & drop */}
            <div
              className={cn("rounded-lg border-2 border-dashed transition-colors cursor-pointer", isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-border")}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {fileName ? (
                <div className="flex items-center gap-3 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{fileName}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    onClick={() => { setFileName(null); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Upload className="h-7 w-7 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra un archivo CSV o{" "}
                    <span className="text-foreground underline underline-offset-2">haz clic</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Solo archivos .CSV</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* ── PASO 2: Mapear columnas ── */}
        {step === "mapear" && (
          <div className="space-y-5 pt-2">
            <p className="text-sm text-muted-foreground">
              Asigná cada columna del archivo a su campo correspondiente.
              Los campos marcados con <span className="text-destructive">*</span> son obligatorios.
            </p>

            <div className="rounded-lg border border-border/50 overflow-hidden bg-card">
              <Table variant="compact">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-2 px-3 text-xs w-1/3">COL. ARCHIVO</TableHead>
                    <TableHead className="py-2 px-3 text-xs w-1/3">EJEMPLO</TableHead>
                    <TableHead className="py-2 px-3 text-xs w-1/3">ASIGNAR A</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colLabels.map((label, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-2.5 px-3 font-mono text-xs truncate max-w-[150px]">
                        {label}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-xs truncate max-w-[150px]">
                        {filaEjemplo[i] ?? <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <Select
                          value={mapeo[i] ?? "ignorar"}
                          onValueChange={(v) =>
                            setMapeo((prev) => ({ ...prev, [i]: v as CampoDestino }))
                          }
                        >
                          <SelectTrigger className={cn("h-8 w-full text-xs")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            side="bottom"
                            align="start"
                            className="select-content-filtro"
                          >
                            {CAMPOS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.required ? `${c.label} *` : c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Estado de campos requeridos */}
            <div className="flex flex-wrap gap-2">
              {CAMPOS.filter((c) => c.required).map((c) => {
                const asignado = Object.values(mapeo).includes(c.value);
                return (
                  <Badge key={c.value} className={asignado
                    ? BADGE_SUCCESS_TINT_CLASS
                    : "bg-destructive/10 text-destructive border-destructive/20"
                  }>
                    {asignado ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                    {c.label}
                  </Badge>
                );
              })}
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
              <Button
                onClick={handleImport}
                disabled={pending || !camposRequeridosMapeados || !proveedorId}
                className="gap-2 min-w-[130px]"
              >
                {pending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
                  : <><ArrowRight className="h-4 w-4" /> Importar {filasCrudas.length} Filas</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* ── PASO 3: Resultado ── */}
        {step === "result" && (
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <ResultStat label="CREADOS"      value={result?.creados ?? 0}      variant="created" />
              <ResultStat label="ACTUALIZADOS" value={result?.actualizados ?? 0} variant="updated" />
              <ResultStat label="ELIMINADOS"   value={result?.eliminados ?? 0}   variant="removed" />
            </div>

            {result && result.errores.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
                <p className="text-sm font-medium flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {result.errores.length} advertencia(s)
                </p>
                <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errores.map((err, i) => (
                    <li key={i} className="text-xs text-muted-foreground font-mono">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {result?.errores.length === 0 && (
              <div className={cn("flex items-center gap-2 text-sm", TEXT_SUCCESS_CLASS)}>
                <CheckCircle2 className="h-4 w-4" />
                Importación completada sin errores.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>Nueva Importación</Button>
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultStat({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: keyof typeof IMPORT_STAT_BADGE_CLASSES;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 text-center space-y-1">
      <p className="text-2xl font-bold">{value}</p>
      <Badge className={cn("text-xs", IMPORT_STAT_BADGE_CLASSES[variant])}>{label}</Badge>
    </div>
  );
}
