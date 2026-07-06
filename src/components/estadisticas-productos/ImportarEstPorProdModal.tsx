"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { importarEstPorProdAction } from "@/actions/estPorProd";
import { leerEstPorProdDesdeArchivo } from "@/lib/parseEstPorProdExcelClient";
import type { SucursalConDepositoOption } from "@/services/estPorProd.service";

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
  const [lineasParseadas, setLineasParseadas] = useState<
    { codTienda: string; vtasEnUn: number }[]
  >([]);
  const [erroresParseo, setErroresParseo] = useState<string[]>([]);
  const [leyendoArchivo, setLeyendoArchivo] = useState(false);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMes(defaultMes);
    setAnio(defaultAnio);
    setSucursalId(sucursales[0]?.id ?? "");
    setArchivoNombre(null);
    setLineasParseadas([]);
    setErroresParseo([]);
  }, [open, defaultMes, defaultAnio, sucursales]);

  const procesarArchivo = useCallback(async (file: File) => {
    setLeyendoArchivo(true);
    setArchivoNombre(file.name);
    try {
      const r = await leerEstPorProdDesdeArchivo(file);
      setLineasParseadas(r.lineas);
      setErroresParseo(r.errores);
      if (r.lineas.length === 0 && r.errores.length > 0) {
        toast.error(r.errores[0] ?? "No se pudo leer la planilla.");
      }
    } catch {
      setLineasParseadas([]);
      setErroresParseo(["No se pudo leer el archivo."]);
      toast.error("No se pudo leer el archivo.");
    } finally {
      setLeyendoArchivo(false);
    }
  }, []);

  const puedeImportar =
    !importando &&
    !leyendoArchivo &&
    sucursalId !== "" &&
    lineasParseadas.length > 0 &&
    mes >= 1 &&
    mes <= 12;

  async function handleImportar() {
    if (!puedeImportar) return;
    setImportando(true);
    try {
      const r = await importarEstPorProdAction({
        mes,
        anio,
        sucursalId,
        lineas: lineasParseadas,
      });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo importar.");
        return;
      }
      const { importados, omitidosCodTiendaInexistente, codigosOmitidos } = r.data;
      let msg =
        importados === 1
          ? "1 producto importado."
          : `${importados.toLocaleString("es-AR")} productos importados.`;
      if (omitidosCodTiendaInexistente > 0) {
        const muestra = codigosOmitidos.slice(0, 5).join(", ");
        msg += ` ${omitidosCodTiendaInexistente.toLocaleString("es-AR")} fila(s) omitida(s) (cód. tienda inexistente${muestra ? `: ${muestra}` : ""}).`;
      }
      toast.success(msg);
      onOpenChange(false);
      router.refresh();
    } finally {
      setImportando(false);
    }
  }

  const busy = importando || leyendoArchivo;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Importar Estadísticas Por Producto"
        size="md"
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
            <Button type="button" disabled={!puedeImportar} onClick={() => void handleImportar()}>
              {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-xs text-muted-foreground">
            Planilla con columnas <strong className="text-foreground">COD_TIENDA</strong> y{" "}
            <strong className="text-foreground">VTAS_EN_UN</strong> (.xlsx, .xls o .csv). Los códigos
            deben existir en el catálogo tienda.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="est-por-prod-import-mes">Mes</Label>
              <Select
                value={String(mes)}
                onValueChange={(v) => setMes(Number(v))}
                disabled={busy}
              >
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
              <Select
                value={String(anio)}
                onValueChange={(v) => setAnio(Number(v))}
                disabled={busy}
              >
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

          <div className="space-y-2">
            <Label>Archivo</Label>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void procesarArchivo(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="default"
              className="w-full gap-2"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {leyendoArchivo ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {archivoNombre ? "Cambiar Archivo" : "Seleccionar Archivo"}
            </Button>
            {archivoNombre ? (
              <p className="text-xs text-muted-foreground truncate" title={archivoNombre}>
                {archivoNombre}
                {lineasParseadas.length > 0
                  ? ` — ${lineasParseadas.length.toLocaleString("es-AR")} fila(s) válida(s)`
                  : ""}
              </p>
            ) : null}
            {erroresParseo.length > 0 ? (
              <ul className="max-h-24 overflow-y-auto text-xs text-muted-foreground list-disc pl-4">
                {erroresParseo.slice(0, 8).map((err) => (
                  <li key={err}>{err}</li>
                ))}
                {erroresParseo.length > 8 ? (
                  <li>… y {erroresParseo.length - 8} aviso(s) más.</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
