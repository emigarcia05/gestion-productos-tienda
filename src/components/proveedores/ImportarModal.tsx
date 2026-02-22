"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Upload, FileText, Loader2, CheckCircle2,
  AlertCircle, X, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { importarProductos, type ImportResult } from "@/actions/importar";

interface Proveedor {
  id: string;
  nombre: string;
  codigoUnico: string;
  sufijo: string;
}

interface Props {
  proveedores: Proveedor[];
  proveedorPreseleccionado?: string;
}

type Step = "form" | "result";

export default function ImportarModal({ proveedores, proveedorPreseleccionado }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [proveedorId, setProveedorId] = useState(proveedorPreseleccionado ?? "");
  const [contenido, setContenido] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [tieneEncabezados, setTieneEncabezados] = useState(true);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setStep("form");
    setProveedorId(proveedorPreseleccionado ?? "");
    setContenido("");
    setFileName(null);
    setResult(null);
    setIsDragging(false);
    setTieneEncabezados(true);
  }

  function handleClose(val: boolean) {
    if (!val) resetForm();
    setOpen(val);
  }

  const loadFile = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|txt|json)$/i)) {
      toast.error("Solo se aceptan archivos CSV, TXT o JSON.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setContenido(e.target?.result as string ?? "");
    reader.readAsText(file, "UTF-8");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile]
  );

  function handleImport() {
    if (!proveedorId) { toast.error("Selecciona un proveedor."); return; }
    if (!contenido.trim()) { toast.error("El contenido está vacío."); return; }

    startTransition(async () => {
      try {
        const res = await importarProductos(proveedorId, contenido, tieneEncabezados);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Importar productos
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar productos</DialogTitle>
          <DialogDescription>
            Sube un CSV o JSON con las columnas:{" "}
            <code className="text-xs bg-muted px-1 rounded">COD PROD PROV</code>,{" "}
            <code className="text-xs bg-muted px-1 rounded">DESCRIPCION</code>,{" "}
            <code className="text-xs bg-muted px-1 rounded">PX LISTA PROVEEDOR</code>,{" "}
            <code className="text-xs bg-muted px-1 rounded">PX VENTA SUGERIDO</code>
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-5 pt-2">
            {/* Selector de proveedor */}
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <div className="relative">
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  disabled={!!proveedorPreseleccionado || pending}
                  className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sufijo}] {p.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              {proveedorSeleccionado && (
                <p className="text-xs text-muted-foreground">
                  Los productos se identificarán con el prefijo{" "}
                  <code className="bg-muted px-1 rounded">{proveedorSeleccionado.sufijo}-</code>
                </p>
              )}
            </div>

            {/* Zona drag & drop */}
            <div className="space-y-1.5">
              <Label>Archivo o contenido</Label>
              <div
                className={`relative rounded-lg border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              >
                {fileName ? (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm truncate">{fileName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => { setFileName(null); setContenido(""); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center py-6 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-7 w-7 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Arrastra un archivo o{" "}
                      <span className="text-foreground underline underline-offset-2">haz clic</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">CSV, TXT o JSON</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.json"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
                />
              </div>

              {/* Textarea para pegar contenido directamente */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={contenido}
                  onChange={(e) => {
                    setContenido(e.target.value);
                    if (e.target.value) setFileName(null);
                  }}
                  placeholder={"O pega el contenido CSV/JSON aquí...\n\nEjemplo CSV:\nCOD PROD PROV,DESCRIPCION,PX LISTA PROVEEDOR,PX VENTA SUGERIDO\nPRD001,Camiseta Básica,10.50,19.99"}
                  rows={6}
                  disabled={pending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
                />
              </div>
            </div>

            {/* Toggle encabezados */}
            <button
              type="button"
              onClick={() => setTieneEncabezados((v) => !v)}
              disabled={pending}
              className="flex items-center gap-3 w-full rounded-lg border border-border/50 bg-card/30 px-4 py-3 text-sm hover:bg-card/60 transition-colors disabled:opacity-50"
            >
              <div className={`relative h-5 w-9 rounded-full transition-colors ${tieneEncabezados ? "bg-primary" : "bg-muted"}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${tieneEncabezados ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="font-medium">El archivo tiene encabezados</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {tieneEncabezados
                  ? "La primera fila se usará para identificar columnas"
                  : "Se asumirá el orden: código, descripción, px lista, px venta"}
              </span>
            </button>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={pending || !proveedorId || !contenido.trim()}
                className="gap-2 min-w-[130px]"
              >
                {pending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Importar</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* ── Resultado ── */
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <ResultStat
                label="Creados"
                value={result?.creados ?? 0}
                color="emerald"
              />
              <ResultStat
                label="Actualizados"
                value={result?.actualizados ?? 0}
                color="blue"
              />
              <ResultStat
                label="Eliminados"
                value={result?.eliminados ?? 0}
                color="amber"
              />
            </div>

            {result && result.errores.length > 0 && (
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

            {result?.errores.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                Importación completada sin errores.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Nueva importación
              </Button>
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
