"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  importarListaPreciosProveedor,
  type ImportResult,
  type MapeoColumnasListaPrecios,
} from "@/actions/importar";
import { parsearCSVCrudo } from "@/lib/parsearImport";

interface Proveedor {
  id: string;
  nombre: string;
  codigoUnico: string;
  prefijo: string;
}

interface Props {
  proveedores: Proveedor[];
}

type Step = "import" | "result";

type CampoDestinoListaPrecios =
  | "codigoExterno"
  | "codProdProv"
  | "descripcion"
  | "precioLista"
  | "precioVentaSugerido"
  | "ignorar";

const CAMPOS: { value: CampoDestinoListaPrecios; label: string; required: boolean }[] = [
  { value: "codProdProv", label: "Cod. Proveedor", required: true },          // cod_prod_proveedor
  { value: "descripcion", label: "Descripcion", required: false },            // descripcion_proveedor (opcional)
  { value: "precioLista", label: "Px. Lista", required: true },               // px_lista_proveedor
  { value: "precioVentaSugerido", label: "Px. Sugerido", required: false },   // px_vta_sugerido
  { value: "ignorar", label: "Ignorar / (sin asignar)", required: false },
];

export default function ImportarListaPreciosModal({ proveedores }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("import");
  const [proveedorId, setProveedorId] = useState("");
  const [tieneEncabezados, setTieneEncabezados] = useState(true);
  const [precioEnDolares, setPrecioEnDolares] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [encabezados, setEncabezados] = useState<string[] | null>(null);
  const [filasCrudas, setFilasCrudas] = useState<string[][]>([]);
  const [mapeo, setMapeo] = useState<MapeoColumnasListaPrecios>({});

  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setStep("import");
    setProveedorId("");
    setTieneEncabezados(true);
    setPrecioEnDolares(false);
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

  const loadFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast.error("Solo se aceptan archivos .csv");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const raw = (e.target?.result as string) ?? "";
        try {
          const { encabezados: enc, filas } = parsearCSVCrudo(raw, tieneEncabezados);
          setEncabezados(enc);
          setFilasCrudas(filas);
          const inicialMapeo: MapeoColumnasListaPrecios = {};
          const cols = enc ?? (filas[0] ? filas[0].map((_, i) => String(i)) : []);
          cols.forEach((_, i) => {
            inicialMapeo[i] = "ignorar";
          });
          setMapeo(inicialMapeo);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Error al leer el archivo.");
          setFileName(null);
        }
      };
      reader.readAsText(file, "UTF-8");
    },
    [tieneEncabezados]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile]
  );

  const camposRequeridosMapeados = CAMPOS.filter((c) => c.required).every((c) =>
    Object.values(mapeo).includes(c.value)
  );

  function handleImport() {
    if (!proveedorId) {
      toast.error("Selecciona un proveedor.");
      return;
    }
    if (!camposRequeridosMapeados) {
      toast.error("Asigná todos los campos requeridos.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await importarListaPreciosProveedor(proveedorId, filasCrudas, mapeo, precioEnDolares);
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
      <DialogTrigger asChild>
        <Button variant="default" size="default" className="btn-primario-gestion">
          <Upload className="h-4 w-4" />
          Importar Lista Precios
        </Button>
      </DialogTrigger>

      <AppModal
        title={
          <>
            <span>Importar lista de precios</span>
            <div className="flex items-center gap-1.5 ml-auto">
              <div className={`h-2 w-2 rounded-full ${step === "import" ? "bg-primary" : "bg-muted"}`} />
              <div className="h-px w-4 bg-border" />
              <div className={`h-2 w-2 rounded-full ${step === "result" ? "bg-primary" : "bg-muted"}`} />
            </div>
          </>
        }
        actions={
          step === "import" ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              {filasCrudas.length > 0 && (
                <Button
                  onClick={handleImport}
                  disabled={pending || !camposRequeridosMapeados || !proveedorId}
                  className="gap-2 min-w-[130px]"
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Importando...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" /> Importar {filasCrudas.length} filas
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={resetForm}>
                Nueva importación
              </Button>
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </>
          )
        }
      >
        {step === "import" && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5 min-w-[180px]">
                <label className="text-sm font-medium text-muted-foreground">Proveedor</label>
                <div className="relative">
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="input-filtro-unificado w-full appearance-none pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 border-primary"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.prefijo}] {p.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTieneEncabezados(true)}
                    className={`min-w-[3rem] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tieneEncabezados ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    Encabezados SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => setTieneEncabezados(false)}
                    className={`min-w-[3rem] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      !tieneEncabezados ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    NO
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrecioEnDolares(true)}
                    className={`min-w-[3rem] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      precioEnDolares ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    USD SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrecioEnDolares(false)}
                    className={`min-w-[3rem] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      !precioEnDolares ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            </div>

            {!fileName ? (
              <div
                className={`rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                  isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center py-6">
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra un CSV o <span className="text-foreground underline">haz clic</span>
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) loadFile(f);
                  }}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{fileName}</span>
                    <span className="text-xs text-muted-foreground">({filasCrudas.length} filas)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    onClick={() => {
                      setFileName(null);
                      setEncabezados(null);
                      setFilasCrudas([]);
                      setMapeo({});
                    }}
                  >
                    Cambiar archivo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Asigná cada columna a su campo. <span className="text-destructive">*</span> obligatorios.
                </p>
                <div className="rounded-lg border border-border/50 overflow-hidden bg-white max-h-[280px] overflow-y-auto">
                  <Table variant="compact">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-2 px-3 text-xs w-1/3">Columna</TableHead>
                        <TableHead className="py-2 px-3 text-xs w-1/3">Ejemplo</TableHead>
                        <TableHead className="py-2 px-3 text-xs w-1/3">Asignar a</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {colLabels.map((label, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-2 px-3 font-mono text-xs truncate max-w-[120px]">
                            {label}
                          </TableCell>
                          <TableCell className="py-2 px-3 text-xs truncate max-w-[120px]">
                            {filaEjemplo[i] ?? <span className="text-slate-400 italic">—</span>}
                          </TableCell>
                          <TableCell className="py-2 px-3">
                            <div className="relative">
                              <select
                                value={mapeo[i] ?? "ignorar"}
                                onChange={(e) =>
                                  setMapeo((prev) => ({
                                    ...prev,
                                    [i]: e.target.value as CampoDestinoListaPrecios,
                                  }))
                                }
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
                <div className="flex flex-wrap gap-2">
                  {CAMPOS.filter((c) => c.required).map((c) => {
                    const asignado = Object.values(mapeo).includes(c.value);
                    return (
                      <Badge
                        key={c.value}
                        className={
                          asignado
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                      >
                        {asignado ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                        {c.label}
                      </Badge>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <ResultStat label="Creados" value={result.creados} color="emerald" />
              <ResultStat label="Actualizados" value={result.actualizados} color="blue" />
              <ResultStat label="Eliminados" value={result.eliminados} color="amber" />
            </div>

            {result.errores.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
                <p className="text-sm font-medium flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {result.errores.length} advertencia(s)
                </p>
                <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errores.map((err, i) => (
                    <li key={i} className="text-xs text-muted-foreground font-mono">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.errores.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                Importación completada sin errores.
              </div>
            )}
          </div>
        )}
      </AppModal>
    </Dialog>
  );
}

function ResultStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "blue" | "amber";
}) {
  const colorMap = {
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  };
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4 text-center space-y-1">
      <p className="text-2xl font-bold">{value}</p>
      <Badge className={`text-xs ${colorMap[color]}`}>{label}</Badge>
    </div>
  );
}
