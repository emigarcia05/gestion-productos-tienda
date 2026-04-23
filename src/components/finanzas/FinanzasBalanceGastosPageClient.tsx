"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
  FILTER_COUNT_CLASS,
  FILTER_INLINE_ACTION_SLOT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  FilaFiltrosDesplegables,
  FilterRowSelection,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaGastos, { type BalanceGastoMensualFila } from "@/components/finanzas/TablaGastos";
import EditarMontoFinBalGastoMensualModal from "@/components/finanzas/EditarMontoFinBalGastoMensualModal";
import EliminarFinBalGastoMensualModal from "@/components/finanzas/EliminarFinBalGastoMensualModal";
import GastoUnicoBalanceModal from "@/components/finanzas/GastoUnicoBalanceModal";
import RegistrarPagoFinBalGastoMensualModal from "@/components/finanzas/RegistrarPagoFinBalGastoMensualModal";
import { cargarFinBalGastoMensualMesAction } from "@/actions/finBalGastoMensualBalance";
import type { PeriodosImputacionesDisponibles } from "@/services/finBalGastoMensualBalance.service";
import { cn } from "@/lib/utils";

const MESES_CALENDARIO: { valor: number; etiqueta: string }[] = [
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

interface Props {
  filas: BalanceGastoMensualFila[];
  esEditor: boolean;
  mes: number;
  anio: number;
  /** Años y meses presentes en `fin_bal_gasto_mensual` (el servidor ya alineó URL vs DB). */
  periodosOpciones: PeriodosImputacionesDisponibles;
}

export default function FinanzasBalanceGastosPageClient({
  filas,
  esEditor,
  mes,
  anio,
  periodosOpciones,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const [filtRubro, setFiltRubro] = useState("");
  const [filtGasto, setFiltGasto] = useState("");
  const [filtSucursal, setFiltSucursal] = useState("");
  const [filtProveedor, setFiltProveedor] = useState("");
  /** "" = todos; "no" = solo filas con devengado pendiente &gt; 0 (equivalente a “no saldado” en devengado). */
  const [filtPagado, setFiltPagado] = useState("");

  const [filaEditar, setFilaEditar] = useState<BalanceGastoMensualFila | null>(null);
  const [filaPagar, setFilaPagar] = useState<BalanceGastoMensualFila | null>(null);
  const [eliminar, setEliminar] = useState<{ id: string; etiqueta: string } | null>(null);
  const [gastoUnicoOpen, setGastoUnicoOpen] = useState(false);

  const rubrosOpciones = useMemo(
    () => [...new Set(filas.map((f) => f.rubroNombre))].sort((a, b) => a.localeCompare(b, "es")),
    [filas]
  );

  const gastosOpciones = useMemo(() => {
    const base = filtRubro ? filas.filter((f) => f.rubroNombre === filtRubro) : filas;
    return [...new Set(base.map((f) => f.gastoNombre))].sort((a, b) => a.localeCompare(b, "es"));
  }, [filas, filtRubro]);

  const sucursalesOpciones = useMemo(
    () => [...new Set(filas.map((f) => f.sucursalNombre))].sort((a, b) => a.localeCompare(b, "es")),
    [filas]
  );

  const proveedoresOpciones = useMemo(
    () => [...new Set(filas.map((f) => f.proveedorNombre))].sort((a, b) => a.localeCompare(b, "es")),
    [filas]
  );

  useEffect(() => {
    if (!filtGasto) return;
    if (!gastosOpciones.includes(filtGasto)) setFiltGasto("");
  }, [filtRubro, gastosOpciones, filtGasto]);

  const filasFiltradas = useMemo(() => {
    let out = filas;
    if (filtRubro) out = out.filter((f) => f.rubroNombre === filtRubro);
    if (filtGasto) out = out.filter((f) => f.gastoNombre === filtGasto);
    if (filtSucursal) out = out.filter((f) => f.sucursalNombre === filtSucursal);
    if (filtProveedor) out = out.filter((f) => f.proveedorNombre === filtProveedor);
    if (filtPagado === "no") out = out.filter((f) => f.montoDevengadoPendiente > 0);
    return out;
  }, [filas, filtRubro, filtGasto, filtSucursal, filtProveedor, filtPagado]);

  const mesesEtiquetadosEnDb = useMemo(() => {
    const meses = periodosOpciones.mesesPorAnio[String(anio)] ?? [];
    return MESES_CALENDARIO.filter((m) => meses.includes(m.valor));
  }, [periodosOpciones, anio]);

  /** Periodo: siempre `mes` + `anio` (URL / servidor); opciones acotadas a la BD. */
  function navegarPeriodo(nuevoMes: number, nuevoAnio: number) {
    const q = new URLSearchParams();
    q.set("mes", String(nuevoMes));
    q.set("anio", String(nuevoAnio));
    router.replace(`${pathname}?${q.toString()}`);
    router.refresh();
  }

  function onCambioAnio(nuevoAnioStr: string) {
    const nuevoAnio = parseInt(nuevoAnioStr, 10);
    const meses = periodosOpciones.mesesPorAnio[String(nuevoAnio)] ?? [];
    const nuevoMes =
      meses.includes(mes) ? mes : meses.length > 0 ? meses[meses.length - 1] : mes;
    navegarPeriodo(nuevoMes, nuevoAnio);
  }

  function limpiarFiltros() {
    setFiltRubro("");
    setFiltGasto("");
    setFiltSucursal("");
    setFiltProveedor("");
    setFiltPagado("");
  }

  async function handleCargarMes() {
    setLoading(true);
    try {
      const res = await cargarFinBalGastoMensualMesAction({ mes, anio });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo cargar el mes.");
        return;
      }
      const { creados, yaExistentes } = res.data;
      if (creados > 0) {
        toast.success(
          creados === 1
            ? "Se cargó 1 imputación del mes."
            : `Se cargaron ${creados} imputaciones del mes.`
        );
      } else if (yaExistentes > 0) {
        toast.info("Las imputaciones del mes ya estaban cargadas.");
      } else {
        toast.info("No hay gastos mensuales en el catálogo para cargar.");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const emptyMessage =
    filas.length > 0 && filasFiltradas.length === 0
      ? "Ningún gasto coincide con los filtros seleccionados."
      : undefined;

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <ClassicFilteredTableLayout
        title="Balance"
        subtitle="Gastos"
        contentWidth="full"
        actions={
          esEditor ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void handleCargarMes()}
                disabled={loading}
                className="h-10 px-4 gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                )}
                Cargar Mes
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setGastoUnicoOpen(true)}
                disabled={loading}
                className="h-10 px-4 gap-2"
              >
                <Receipt className="h-4 w-4 shrink-0" aria-hidden />
                Gasto Único
              </Button>
            </div>
          ) : undefined
        }
        filters={
          <FilterBar className="filtros-contenedor-tienda bg-card">
            <FilterRowSelection className="w-full min-w-0">
              <FilaFiltrosDesplegables>
                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select value={filtRubro || "none"} onValueChange={(v) => setFiltRubro(v === "none" ? "" : v)}>
                    <SelectTrigger className="input-filtro-unificado">
                      <SelectValue placeholder="RUBRO" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value="none">RUBRO</SelectItem>
                      {rubrosOpciones.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select value={filtGasto || "none"} onValueChange={(v) => setFiltGasto(v === "none" ? "" : v)}>
                    <SelectTrigger className="input-filtro-unificado">
                      <SelectValue placeholder="GASTO" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value="none">GASTO</SelectItem>
                      {gastosOpciones.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select
                    value={filtSucursal || "none"}
                    onValueChange={(v) => setFiltSucursal(v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="input-filtro-unificado">
                      <SelectValue placeholder="SUCURSAL" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value="none">SUCURSAL</SelectItem>
                      {sucursalesOpciones.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select
                    value={filtProveedor || "none"}
                    onValueChange={(v) => setFiltProveedor(v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="input-filtro-unificado">
                      <SelectValue placeholder="PROVEEDOR" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value="none">PROVEEDOR</SelectItem>
                      {proveedoresOpciones.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select value={filtPagado || "none"} onValueChange={(v) => setFiltPagado(v === "none" ? "" : v)}>
                    <SelectTrigger className="input-filtro-unificado">
                      <SelectValue placeholder="PAGADO" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value="none">PAGADO</SelectItem>
                      <SelectItem value="no">PENDIENTE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>

            <FilterRowSelection className="w-full min-w-0">
              <FilaFiltrosDesplegables>
                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select value={String(anio)} onValueChange={onCambioAnio}>
                    <SelectTrigger className="input-filtro-unificado" aria-label="Año del periodo">
                      <SelectValue placeholder="AÑO" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      {periodosOpciones.anios.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select
                    value={String(mes)}
                    onValueChange={(v) => navegarPeriodo(parseInt(v, 10), anio)}
                  >
                    <SelectTrigger className="input-filtro-unificado" aria-label="Mes del periodo">
                      <SelectValue placeholder="MES" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      {mesesEtiquetadosEnDb.map((m) => (
                        <SelectItem key={m.valor} value={String(m.valor)}>
                          {m.etiqueta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={cn(FILTER_INLINE_ACTION_SLOT_CLASS, "col-span-3 gap-2")}>
                  <span className={FILTER_COUNT_CLASS}>
                    {filasFiltradas.length.toLocaleString("es-AR")} GASTO
                    {filasFiltradas.length === 1 ? "" : "S"}
                  </span>
                  <LimpiarFiltrosButton onClick={limpiarFiltros} />
                </div>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>
          </FilterBar>
        }
      >
        <TablaGastos
          filas={filasFiltradas}
          emptyMessage={emptyMessage}
          esEditor={esEditor}
          onEditarMonto={(f) => setFilaEditar(f)}
          onPagar={(f) => setFilaPagar(f)}
          onEliminar={(f) =>
            setEliminar({
              id: f.id,
              etiqueta: `${f.gastoNombre} · ${f.proveedorNombre}`,
            })
          }
        />
      </ClassicFilteredTableLayout>

      <EditarMontoFinBalGastoMensualModal
        open={filaEditar !== null}
        onOpenChange={(next) => !next && setFilaEditar(null)}
        fila={filaEditar}
        mes={mes}
        anio={anio}
        onSuccess={() => router.refresh()}
      />

      <RegistrarPagoFinBalGastoMensualModal
        open={filaPagar !== null}
        onOpenChange={(next) => !next && setFilaPagar(null)}
        fila={filaPagar}
        onSuccess={() => router.refresh()}
      />

      <EliminarFinBalGastoMensualModal
        open={eliminar !== null}
        onOpenChange={(next) => !next && setEliminar(null)}
        id={eliminar?.id ?? null}
        etiqueta={eliminar?.etiqueta ?? null}
        onSuccess={() => router.refresh()}
      />

      <GastoUnicoBalanceModal
        open={gastoUnicoOpen}
        onOpenChange={setGastoUnicoOpen}
        mes={mes}
        anio={anio}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
