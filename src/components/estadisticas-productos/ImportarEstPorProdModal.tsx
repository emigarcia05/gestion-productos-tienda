"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalSiNoChoice from "@/components/shared/ModalSiNoChoice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  verificarEstPorProdPeriodoAction,
} from "@/actions/estPorProd";
import {
  type CampoDestinoEstPorProd,
  type MapeoColumnasEstPorProd,
  leerFilasCrudasEstPorProdArchivo,
  lineasDesdeMapeoEstPorProd,
  mapeoPorDefectoEstPorProd,
  separarEncabezadosYFilasEstPorProd,
} from "@/lib/parseEstPorProdExcelClient";
import type { ImportarEstPorProdResultado } from "@/lib/estPorProdTypes";
import { cn } from "@/lib/utils";
import { etiquetaPeriodoEstPorProd } from "@/lib/estPorProdPeriodo";
import { BADGE_SUCCESS_TINT_CLASS } from "@/lib/ui-classes";
import type { SucursalConDepositoOption } from "@/lib/estPorProdTypes";

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

const ANIO_MIN = 2026;
const ANIO_MAX = 2046;
const ANIOS = Array.from({ length: ANIO_MAX - ANIO_MIN + 1 }, (_, i) => ANIO_MIN + i);

const CAMPOS_MAPEO: { value: CampoDestinoEstPorProd; label: string; required: boolean }[] = [
  { value: "codTienda", label: "COD. TIENDA", required: true },
  { value: "vtasEnUn", label: "VTAS. EN UN.", required: true },
  { value: "ignorar", label: "IGNORAR / (SIN ASIGNAR)", required: false },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sucursales: SucursalConDepositoOption[];
  defaultMes: number;
  defaultAnio: number;
}

export default function ImportarEstPorProdModal({
  open,
  onOpenChange,
  sucursales,
  defaultMes,
  defaultAnio,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mes, setMes] = useState(defaultMes);
  const [anio, setAnio] = useState(defaultAnio);
  const [sucursalId, setSucursalId] = useState(sucursales[0]?.id ?? "");
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [tieneEncabezados, setTieneEncabezados] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [todasLasFilas, setTodasLasFilas] = useState<unknown[][]>([]);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [filasCrudas, setFilasCrudas] = useState<unknown[][]>([]);
  const [mapeo, setMapeo] = useState<MapeoColumnasEstPorProd>({});
  const [leyendoArchivo, setLeyendoArchivo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [confirmReemplazoOpen, setConfirmReemplazoOpen] = useState(false);

  function resetArchivo() {
    setArchivoNombre(null);
    setTodasLasFilas([]);
    setEncabezados([]);
    setFilasCrudas([]);
    setMapeo({});
  }

  useEffect(() => {
    if (!open) return;
    setMes(defaultMes);
    setAnio(defaultAnio);
    setSucursalId(sucursales[0]?.id ?? "");
    setTieneEncabezados(true);
    setIsDragging(false);
    setConfirmReemplazoOpen(false);
    resetArchivo();
  }, [open, defaultMes, defaultAnio, sucursales]);

  useEffect(() => {
    if (todasLasFilas.length === 0) {
      setEncabezados([]);
      setFilasCrudas([]);
      setMapeo({});
      return;
    }
    const { encabezados: enc, filasCrudas: filas } = separarEncabezadosYFilasEstPorProd(
      todasLasFilas,
      tieneEncabezados
    );
    setEncabezados(enc);
    setFilasCrudas(filas);
    setMapeo(mapeoPorDefectoEstPorProd(enc));
  }, [todasLasFilas, tieneEncabezados]);

  const { lineas: lineasParseadas, filasOmitidas } = useMemo(
    () => lineasDesdeMapeoEstPorProd(filasCrudas, mapeo),
    [filasCrudas, mapeo]
  );

  const camposRequeridosMapeados = CAMPOS_MAPEO.filter((c) => c.required).every((c) =>
    Object.values(mapeo).includes(c.value)
  );

  const procesarArchivo = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase();
    if (![".xlsx", ".xls", ".csv"].some((e) => ext.endsWith(e))) {
      toast.error("Solo se aceptan archivos .xlsx, .xls o .csv.");
      return;
    }
    setLeyendoArchivo(true);
    try {
      const filas = await leerFilasCrudasEstPorProdArchivo(file);
      if (filas.length === 0) {
        toast.error("La planilla está vacía.");
        resetArchivo();
        return;
      }
      setArchivoNombre(file.name);
      setTodasLasFilas(filas);
    } catch {
      resetArchivo();
      toast.error("No se pudo leer el archivo.");
    } finally {
      setLeyendoArchivo(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void procesarArchivo(file);
    },
    [procesarArchivo]
  );

  const puedeImportar =
    !importando &&
    !leyendoArchivo &&
    sucursalId !== "" &&
    lineasParseadas.length > 0 &&
    camposRequeridosMapeados &&
    mes >= 1 &&
    mes <= 12;

  const nombreSucursalSeleccionada =
    sucursales.find((s) => s.id === sucursalId)?.nombre ?? "Sucursal";
  const etiquetaPeriodoSeleccionado = etiquetaPeriodoEstPorProd(
    nombreSucursalSeleccionada,
    mes,
    anio
  );

  async function ejecutarImportar(reemplazarPeriodo: boolean) {
    setImportando(true);
    try {
      const res = await fetch("/api/import-est-por-prod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mes,
          anio,
          sucursalId,
          lineas: lineasParseadas,
          reemplazarPeriodo,
        }),
      });

      let payload: {
        ok?: boolean;
        error?: string;
        data?: ImportarEstPorProdResultado;
      } | null = null;
      try {
        payload = (await res.json()) as {
          ok?: boolean;
          error?: string;
          data?: ImportarEstPorProdResultado;
        };
      } catch {
        payload = null;
      }

      if (!res.ok || !payload?.ok || !payload.data) {
        toast.error(
          payload?.error ??
            (res.status === 413
              ? "La planilla es demasiado grande para importar de una vez."
              : "No se pudo importar la planilla.")
        );
        return;
      }

      const { importados, omitidosCodTiendaInexistente, codigosOmitidos, reemplazados } =
        payload.data;
      let msg =
        importados === 1
          ? "1 producto importado."
          : `${importados.toLocaleString("es-AR")} productos importados.`;
      if (reemplazados > 0) {
        msg += ` Se reemplazaron ${reemplazados.toLocaleString("es-AR")} registro(s) anteriores.`;
      }
      if (filasOmitidas > 0) {
        msg += ` ${filasOmitidas.toLocaleString("es-AR")} fila(s) omitida(s) por datos inválidos en la planilla.`;
      }
      if (omitidosCodTiendaInexistente > 0) {
        const muestra = codigosOmitidos.slice(0, 5).join(", ");
        msg += ` ${omitidosCodTiendaInexistente.toLocaleString("es-AR")} fila(s) omitida(s) (cód. tienda inexistente${muestra ? `: ${muestra}` : ""}).`;
      }
      if (importados === 0) {
        toast.error(
          omitidosCodTiendaInexistente > 0
            ? "Ningún código de la planilla coincide con productos en el catálogo tienda."
            : "No se importó ningún registro."
        );
        return;
      }
      toast.success(msg);
      setConfirmReemplazoOpen(false);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("No se pudo importar la planilla.", {
        description: "Revisá la conexión e intentá de nuevo.",
      });
    } finally {
      setImportando(false);
    }
  }

  async function handleImportar() {
    if (!puedeImportar) return;
    if (!camposRequeridosMapeados) {
      toast.error("Asigná todos los campos requeridos.");
      return;
    }
    setImportando(true);
    try {
      const verificacion = await verificarEstPorProdPeriodoAction({ mes, anio, sucursalId });
      if (!verificacion.ok) {
        toast.error(verificacion.error ?? "No se pudo verificar el periodo.");
        return;
      }
      if (verificacion.data.existe) {
        setConfirmReemplazoOpen(true);
        return;
      }
      await ejecutarImportar(false);
    } catch {
      toast.error("No se pudo verificar el periodo.");
    } finally {
      setImportando(false);
    }
  }

  function handleReemplazoNo() {
    setConfirmReemplazoOpen(false);
    onOpenChange(false);
  }

  function handleReemplazoSi() {
    void ejecutarImportar(true);
  }

  const busy = importando || leyendoArchivo;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if ((busy || confirmReemplazoOpen) && !next) return;
          onOpenChange(next);
        }}
      >
      <AppModal
        title="Importar Estadísticas Por Producto"
        size="xl"
        className="max-w-3xl"
        bodyClassName="max-w-full min-w-0"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={importando}
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            {archivoNombre && lineasParseadas.length > 0 ? (
              <Button type="button" disabled={!puedeImportar} onClick={() => void handleImportar()}>
                {importando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Importar ${lineasParseadas.length.toLocaleString("es-AR")} Filas`
                )}
              </Button>
            ) : (
              <Button type="button" disabled={!puedeImportar} onClick={() => void handleImportar()}>
                {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar"}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4 pt-2 min-w-0 overflow-hidden text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="est-por-prod-import-mes">Mes</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))} disabled={busy}>
                <SelectTrigger id="est-por-prod-import-mes" className="input-filtro-unificado w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro max-h-60"
                >
                  {MESES.map((m) => (
                    <SelectItem key={m.valor} value={String(m.valor)}>
                      {m.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="est-por-prod-import-anio">Año</Label>
              <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))} disabled={busy}>
                <SelectTrigger id="est-por-prod-import-anio" className="input-filtro-unificado w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro max-h-60"
                >
                  {ANIOS.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="est-por-prod-import-sucursal">Sucursal</Label>
            {sucursales.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No hay sucursales con depósito configurado en la base de datos.
              </p>
            ) : (
              <Select value={sucursalId} onValueChange={setSucursalId} disabled={busy}>
                <SelectTrigger
                  id="est-por-prod-import-sucursal"
                  className="input-filtro-unificado w-full"
                >
                  <SelectValue placeholder="SUCURSAL" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-[1fr_10rem] gap-x-4 gap-y-3 items-center">
            <span className="text-sm font-medium text-foreground min-w-0 truncate">
              {archivoNombre ? "MODIFICAR ARCHIVO" : "ADJUNTAR UN ARCHIVO"}
            </span>
            <div className="flex w-full min-w-0">
              <Button
                type="button"
                variant="default"
                size="default"
                className="min-w-0 flex-1 gap-2"
                disabled={busy}
                onClick={() => {
                  if (archivoNombre) {
                    resetArchivo();
                  } else {
                    inputRef.current?.click();
                  }
                }}
              >
                {leyendoArchivo ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {archivoNombre ? "Modificar Archivo" : "Adjuntar Archivo"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void procesarArchivo(file);
                  e.target.value = "";
                }}
              />
            </div>

            <span className="text-sm font-medium text-foreground min-w-0 truncate">
              LOS DATOS TIENEN ENCABEZADOS
            </span>
            <ModalSiNoChoice
              value={tieneEncabezados}
              onChange={setTieneEncabezados}
              disabled={busy || !archivoNombre}
            />
          </div>

          {!archivoNombre ? (
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
              <span className="text-sm text-muted-foreground">
                O arrastrá un archivo .xlsx, .xls o .csv aquí
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-3 py-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              <span className="text-sm truncate">{archivoNombre}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                ({filasCrudas.length.toLocaleString("es-AR")} filas)
              </span>
            </div>
          )}

          {archivoNombre && encabezados.length > 0 ? (
            <>
              <div className="rounded-lg border border-border/50 overflow-hidden bg-card max-h-[220px] overflow-y-auto w-full min-w-0">
                <Table variant="compact" className="table-fixed w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[45%]">PRIMERA FILA</TableHead>
                      <TableHead className="w-[55%]">MAPEAR A</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {encabezados.map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="celda-datos celda-mono truncate">
                          {encabezados[i] ? (
                            encabezados[i]
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="celda-datos">
                          <div className="relative">
                            <select
                              value={mapeo[i] ?? "ignorar"}
                              onChange={(e) =>
                                setMapeo((prev) => ({
                                  ...prev,
                                  [i]: e.target.value as CampoDestinoEstPorProd,
                                }))
                              }
                              disabled={busy}
                              className="w-full appearance-none rounded border border-input bg-background px-2 py-1.5 pr-6 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {CAMPOS_MAPEO.map((c) => (
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
                {CAMPOS_MAPEO.filter((c) => c.required).map((c) => {
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
                        <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" aria-hidden />
                      )}
                      {c.label}
                    </Badge>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </AppModal>
      </Dialog>

      <Dialog
        open={confirmReemplazoOpen}
        onOpenChange={(next) => {
          if (importando && !next) return;
          if (!next) setConfirmReemplazoOpen(false);
        }}
      >
        <AppModal
          title="Datos Existentes"
          size="sm"
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                disabled={importando}
                onClick={handleReemplazoNo}
              >
                No
              </Button>
              <Button type="button" disabled={importando} onClick={handleReemplazoSi}>
                {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí"}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-foreground">Ya existe datos para</p>
            <p className="font-semibold text-foreground">{etiquetaPeriodoSeleccionado}</p>
            <p className="text-foreground">
              ¿Desea eliminar los datos anteriores y escribir estos nuevos datos?
            </p>
          </div>
        </AppModal>
      </Dialog>
    </>
  );
}
