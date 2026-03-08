"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Upload, FileText, Loader2, CheckCircle2,
  AlertCircle, X, ChevronDown, ArrowRight, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
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
  { value: "codProdProv",          label: "Cod. Producto Proveedor",  required: true },
  { value: "descripcion",          label: "Descripción",              required: true },
  { value: "precioLista",          label: "Px Lista Proveedor",       required: true },
  { value: "precioVentaSugerido",  label: "Px Venta Sugerido",        required: false },
  { value: "ignorar",              label: "Ignorar columna",          required: false },
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
        setResult(res);
        setStep("result");
        if (res.errores.length === 0) {
          toast.success("Importación completada.");
        } else {
          toast.warning(`Importación con ${res.errores.length} advertencia(s).`);
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

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar productos</DialogTitle>
        </DialogHeader>

        {/* ── PASO 1: Subir archivo ── */}
        {step === "upload" && (
          <div className="space-y-5 pt-2">
            {/* Selector de proveedor */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Proveedor</label>
              <div className="relative">
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  disabled={!!proveedorPreseleccionado}
                  className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>[{p.prefijo}] {p.nombre}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              {proveedorSeleccionado && (
                <p className="text-xs text-muted-foreground">
                  Prefijo del código externo:{" "}
                  <code className="bg-muted px-1 rounded">{proveedorSeleccionado.prefijo}-</code>
                </p>
              )}
            </div>

            {/* Toggle encabezados */}
            <button
              type="button"
              onClick={() => setTieneEncabezados((v) => !v)}
              className="flex items-center gap-3 w-full rounded-lg border border-border/50 bg-card/30 px-4 py-3 text-sm hover:bg-card/60 transition-colors"
            >
              <div className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${tieneEncabezados ? "bg-primary" : "bg-muted"}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${tieneEncabezados ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <div className="text-left">
                <p className="font-medium">El archivo tiene encabezados</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tieneEncabezados
                    ? "La primera fila se omitirá y se usará como nombre de columnas"
                    : "Todas las filas se tratarán como datos"}
                </p>
              </div>
            </button>

            {/* Zona drag & drop */}
            <div
              className={`rounded-lg border-2 border-dashed transition-colors cursor-pointer ${isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"}`}
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

            <div className="rounded-lg border border-border/50 overflow-hidden bg-white">
              <Table variant="compact">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-2 px-3 text-xs w-1/3">Columna del archivo</TableHead>
                    <TableHead className="py-2 px-3 text-xs w-1/3">Ejemplo</TableHead>
                    <TableHead className="py-2 px-3 text-xs w-1/3">Asignar a</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colLabels.map((label, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-2.5 px-3 font-mono text-xs truncate max-w-[150px]">
                        {label}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-xs truncate max-w-[150px]">
                        {filaEjemplo[i] ?? <span className="text-slate-400 italic">—</span>}
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <div className="relative">
                          <select
                            value={mapeo[i] ?? "ignorar"}
                            onChange={(e) => setMapeo((prev) => ({ ...prev, [i]: e.target.value as CampoDestino }))}
                            className="w-full appearance-none rounded border border-input bg-background px-2 py-1 pr-6 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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

            {/* Estado de campos requeridos */}
            <div className="flex flex-wrap gap-2">
              {CAMPOS.filter((c) => c.required).map((c) => {
                const asignado = Object.values(mapeo).includes(c.value);
                return (
                  <Badge key={c.value} className={asignado
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
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
                  : <><ArrowRight className="h-4 w-4" /> Importar {filasCrudas.length} filas</>
                }
              </Button>
            </div>
          </div>
        )}

        {/* ── PASO 3: Resultado ── */}
        {step === "result" && (
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <ResultStat label="Creados"      value={result?.creados ?? 0}      color="emerald" />
              <ResultStat label="Actualizados" value={result?.actualizados ?? 0} color="blue" />
              <ResultStat label="Eliminados"   value={result?.eliminados ?? 0}   color="amber" />
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
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                Importación completada sin errores.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>Nueva importación</Button>
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultStat({ label, value, color }: { label: string; value: number; color: "emerald" | "blue" | "amber" }) {
  const colorMap = {
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    blue:    "bg-blue-500/10 text-blue-500 border-blue-500/20",
    amber:   "bg-amber-500/10 text-amber-500 border-amber-500/20",
  };
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 text-center space-y-1">
      <p className="text-2xl font-bold">{value}</p>
      <Badge className={`text-xs ${colorMap[color]}`}>{label}</Badge>
    </div>
  );
}
