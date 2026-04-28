"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  EmptyTableRow,
} from "@/components/ui/table";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import { fmtPrecio } from "@/lib/format";
import {
  crearFinBalVtasAction,
  eliminarFinBalVtasAction,
} from "@/actions/finBalVtas";
import type { FinBalVtasItem, SucursalGeneraBalanceOption } from "@/services/finBalVtas.service";

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
  filas: FinBalVtasItem[];
  sucursales: SucursalGeneraBalanceOption[];
  esEditor: boolean;
  defaultMes: number;
  defaultAnio: number;
}

function fmtMontoEntero(n: number) {
  return `$${fmtPrecio(n)}`;
}

function fmtFecha(d: Date | string) {
  return new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function etiquetaMes(mes: number): string {
  return MESES.find((m) => m.valor === mes)?.etiqueta ?? String(mes);
}

export default function FinBalVtasPageClient({
  filas,
  sucursales,
  esEditor,
  defaultMes,
  defaultAnio,
}: Props) {
  const router = useRouter();
  const [sucursalId, setSucursalId] = useState("");
  const [mes, setMes] = useState(defaultMes);
  const [anio, setAnio] = useState(defaultAnio);
  const [montoStr, setMontoStr] = useState("");
  const [saving, setSaving] = useState(false);

  const montoNum = useMemo(() => {
    const t = montoStr.trim().replace(/\./g, "").replace(",", ".");
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) && Number.isInteger(n) ? n : null;
  }, [montoStr]);

  const puedeGuardar = useMemo(() => {
    if (!esEditor || !sucursalId || saving) return false;
    if (montoNum == null || montoNum < 0) return false;
    if (mes < 1 || mes > 12) return false;
    if (anio < ANIO_MIN || anio > ANIO_MAX) return false;
    return true;
  }, [esEditor, sucursalId, montoNum, mes, anio, saving]);

  async function handleGuardar() {
    if (!puedeGuardar || montoNum == null) return;
    setSaving(true);
    try {
      const r = await crearFinBalVtasAction({
        sucursalId,
        mes,
        anio,
        monto: montoNum,
      });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Registro guardado.");
      setMontoStr("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar(id: string) {
    if (!esEditor) return;
    if (!window.confirm("¿Eliminar este registro de ventas de balance?")) return;
    const r = await eliminarFinBalVtasAction({ id });
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo eliminar.");
      return;
    }
    toast.success("Registro eliminado.");
    router.refresh();
  }

  return (
    <ClassicFilteredTableLayout
      title="FINANZAS"
      subtitle="Balance · Ventas (fin_bal_vtas)"
    >
      <div className="space-y-6">
        {esEditor ? (
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Nueva carga
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Sucursal
                </span>
                <Select
                  value={sucursalId || undefined}
                  onValueChange={setSucursalId}
                  disabled={saving || sucursales.length === 0}
                >
                  <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start">
                    {sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Mes
                </span>
                <Select
                  value={String(mes)}
                  onValueChange={(v) => setMes(Number(v))}
                  disabled={saving}
                >
                  <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start" className="max-h-60">
                    {MESES.map((m) => (
                      <SelectItem key={m.valor} value={String(m.valor)}>
                        {m.etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Año
                </span>
                <Select
                  value={String(anio)}
                  onValueChange={(v) => setAnio(Number(v))}
                  disabled={saving}
                >
                  <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start" className="max-h-60">
                    {ANIOS.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Monto (entero)
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={montoStr}
                  onChange={(e) => setMontoStr(e.target.value)}
                  disabled={saving}
                  placeholder="Ej. 1500000"
                />
              </label>
              <Button type="button" disabled={!puedeGuardar} onClick={handleGuardar}>
                Guardar
              </Button>
            </div>
            {sucursales.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                No hay sucursales con <strong>genera_balance</strong> en true. Configurá al menos una en
                la base de datos.
              </p>
            )}
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            Activá el modo editor para cargar o eliminar registros.
          </p>
        )}

        <section className="rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/50 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Registros</h2>
          </div>
          <div className="contenedor-tabla-gestion no-scroll-x min-h-0">
            <Table variant="compact" scrollX={false} className="tabla-gestion-compacta w-full table-fixed">
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: esEditor ? "24%" : "36%" }} />
                {esEditor ? <col style={{ width: "12%" }} /> : null}
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>PERIODO</TableHead>
                  <TableHead>SUCURSAL</TableHead>
                  <TableHead>MONTO</TableHead>
                  <TableHead>ALTA</TableHead>
                  {esEditor ? <TableHead>ACCIONES</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.length === 0 ? (
                  <EmptyTableRow
                    colSpan={esEditor ? 5 : 4}
                    message="No hay cargas registradas."
                  />
                ) : (
                  filas.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="celda-datos font-medium">
                        {etiquetaMes(f.mes)} {f.anio}
                      </TableCell>
                      <TableCell className="celda-datos">{f.sucursal.nombre}</TableCell>
                      <TableCell className="celda-datos tabular-nums">{fmtMontoEntero(f.monto)}</TableCell>
                      <TableCell className="celda-datos text-muted-foreground">
                        {fmtFecha(f.createdAt)}
                      </TableCell>
                      {esEditor ? (
                        <TableCell className="celda-datos">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => void handleEliminar(f.id)}
                          >
                            Eliminar
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </ClassicFilteredTableLayout>
  );
}
