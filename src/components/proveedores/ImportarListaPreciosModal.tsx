"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileText,
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
import { type MapeoColumnasListaPrecios } from "@/actions/importar";
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

type CampoDestinoListaPrecios =
  | "codigoExterno"
  | "codProdProv"
  | "descripcion"
  | "precioLista"
  | "precioVentaSugerido"
  | "ignorar";

const CAMPOS: { value: CampoDestinoListaPrecios; label: string; required: boolean }[] = [
  { value: "codProdProv", label: "Cod. Proveedor", required: true },          // cod_prod_proveedor
  { value: "descripcion", label: "Descripcion Proveedor", required: false },
  { value: "precioLista", label: "Px Lista Proveedor", required: true },
  { value: "precioVentaSugerido", label: "Px Venta Sugerido", required: false },
  { value: "ignorar", label: "Ignorar / (sin asignar)", required: false },
];

export default function ImportarListaPreciosModal({ proveedores }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [proveedorId, setProveedorId] = useState("");
  const [tieneEncabezados, setTieneEncabezados] = useState(true);
  const [precioEnDolares, setPrecioEnDolares] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [encabezados, setEncabezados] = useState<string[] | null>(null);
  const [filasCrudas, setFilasCrudas] = useState<string[][]>([]);
  const [mapeo, setMapeo] = useState<MapeoColumnasListaPrecios>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setSending(false);
    setProveedorId("");
    setTieneEncabezados(true);
    setPrecioEnDolares(false);
    setIsDragging(false);
    setFileName(null);
    setEncabezados(null);
    setFilasCrudas([]);
    setMapeo({});
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

  async function handleImport() {
    if (!proveedorId) {
      toast.error("Selecciona un proveedor.");
      return;
    }
    if (!camposRequeridosMapeados) {
      toast.error("Asigná todos los campos requeridos.");
      return;
    }
    if (sending) return;

    setSending(true);
    fetch("/api/import-lista-precios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proveedorId,
        filasCrudas,
        mapeo,
        precioEnDolares,
      }),
    }).catch(() => {});

    setOpen(false);
    resetForm();
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
        className="sm:max-w-3xl"
        bodyClassName="max-w-full min-w-0"
        title="Importar lista de precios"
        actions={
          <>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            {filasCrudas.length > 0 && (
              <Button
                onClick={handleImport}
                disabled={!camposRequeridosMapeados || !proveedorId || sending}
                className="gap-2 min-w-[130px]"
              >
                <ArrowRight className="h-4 w-4" /> Importar {filasCrudas.length} filas
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-3 pt-2 min-w-0 overflow-hidden">
            {/* Fila 0: Proveedor */}
            <div className="space-y-1.5">
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

            {/* Tres filas: mismo tipo/tamaño/color de texto; botones en la misma columna alineados */}
            <div className="grid grid-cols-[1fr_10rem] gap-x-4 gap-y-3 items-center">
              {/* Fila 1: Adjuntar / Modificar archivo */}
              <span className="text-sm font-medium text-muted-foreground min-w-0 truncate">
                {fileName ? "Modificar archivo" : "Adjuntar un archivo"}
              </span>
              <div className="flex gap-2 w-full min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (fileName) {
                      setFileName(null);
                      setEncabezados(null);
                      setFilasCrudas([]);
                      setMapeo({});
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                >
                  {fileName ? "Modificar archivo" : "Adjuntar archivo"}
                </button>
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

              {/* Fila 2: Los datos tienen encabezados — SÍ / NO */}
              <span className="text-sm font-medium text-muted-foreground min-w-0 truncate">Los datos tienen encabezados</span>
              <div className="flex gap-2 w-full min-w-0">
                <button
                  type="button"
                  onClick={() => setTieneEncabezados(true)}
                  className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tieneEncabezados ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  SÍ
                </button>
                <button
                  type="button"
                  onClick={() => setTieneEncabezados(false)}
                  className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    !tieneEncabezados ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  NO
                </button>
              </div>

              {/* Fila 3: Precio en dólares — SÍ / NO */}
              <span className="text-sm font-medium text-muted-foreground min-w-0 truncate">Precio en dólares</span>
              <div className="flex gap-2 w-full min-w-0">
                <button
                  type="button"
                  onClick={() => setPrecioEnDolares(true)}
                  className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    precioEnDolares ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  SÍ
                </button>
                <button
                  type="button"
                  onClick={() => setPrecioEnDolares(false)}
                  className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    !precioEnDolares ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            {/* Zona de arrastre cuando no hay archivo (opcional, para drag & drop) */}
            {!fileName && (
              <div
                className={`rounded-lg border-2 border-dashed transition-colors flex items-center justify-center gap-2 py-4 px-3 ${
                  isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              >
                <span className="text-sm text-muted-foreground">O arrastrá un archivo .csv aquí</span>
              </div>
            )}
            {fileName && (
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-3 py-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{fileName}</span>
                <span className="text-xs text-muted-foreground shrink-0">({filasCrudas.length} filas)</span>
              </div>
            )}

            {/* Cuando hay archivo: 2 columnas — Valor de la primera fila | Opciones para mapear */}
            {fileName && colLabels.length > 0 && (
              <>
                <div className="rounded-lg border border-border/50 overflow-hidden bg-white max-h-[220px] overflow-y-auto w-full min-w-0">
                  <Table variant="compact" className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="py-2 px-3 text-xs w-[45%]">Primera fila</TableHead>
                        <TableHead className="py-2 px-3 text-xs w-[55%]">Mapear a</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {colLabels.map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-2 px-3 font-mono text-xs truncate">
                            {(encabezados ?? filaEjemplo)?.[i] ?? <span className="text-slate-400 italic">—</span>}
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
                                className="w-full appearance-none rounded border border-input bg-background px-2 py-1.5 pr-6 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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
      </AppModal>
    </Dialog>
  );
}
