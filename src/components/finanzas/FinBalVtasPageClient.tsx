"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
  FiltroIndividualContainer,
  FilaFiltrosDesplegables,
  FilterRowSelection,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import { cn } from "@/lib/utils";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CrearFinBalVtasModal from "@/components/finanzas/CrearFinBalVtasModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { fmtPrecio } from "@/lib/format";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { eliminarFinBalVtasAction } from "@/actions/finBalVtas";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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

const FILTRO_TODOS = "none";

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
  const [filtMes, setFiltMes] = useState<string>(FILTRO_TODOS);
  const [filtAnio, setFiltAnio] = useState<string>(FILTRO_TODOS);
  const [filtSucursalId, setFiltSucursalId] = useState<string>(FILTRO_TODOS);
  const [modalNuevaCargaOpen, setModalNuevaCargaOpen] = useState(false);

  const filasFiltradas = useMemo(() => {
    let out = filas;
    if (filtMes !== FILTRO_TODOS) {
      const m = Number(filtMes);
      out = out.filter((f) => f.mes === m);
    }
    if (filtAnio !== FILTRO_TODOS) {
      const a = Number(filtAnio);
      out = out.filter((f) => f.anio === a);
    }
    if (filtSucursalId !== FILTRO_TODOS) {
      out = out.filter((f) => f.sucursalId === filtSucursalId);
    }
    return out;
  }, [filas, filtMes, filtAnio, filtSucursalId]);

  function limpiarFiltros() {
    setFiltMes(FILTRO_TODOS);
    setFiltAnio(FILTRO_TODOS);
    setFiltSucursalId(FILTRO_TODOS);
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

  const emptyMessage =
    filas.length > 0 && filasFiltradas.length === 0
      ? "Ningún registro coincide con los filtros seleccionados."
      : undefined;

  return (
    <>
      <ClassicFilteredTableLayout
        title="FINANZAS"
        subtitle="Balance · Ventas"
        contentWidth="full"
        actions={
          esEditor ? (
            <Button
              type="button"
              className="h-10 px-4 gap-2"
              onClick={() => setModalNuevaCargaOpen(true)}
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              Nueva Carga
            </Button>
          ) : undefined
        }
        filters={
          <FilterBar className="filtros-contenedor-tienda bg-card">
            <FilterRowSelection className="w-full min-w-0">
              <FilaFiltrosDesplegables>
                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={filtMes !== FILTRO_TODOS}
                  onLimpiar={() => setFiltMes(FILTRO_TODOS)}
                >
                  <Select value={filtMes} onValueChange={setFiltMes}>
                    <SelectTrigger className="input-filtro-unificado" aria-label="Mes">
                      <SelectValue placeholder="MES" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro max-h-60"
                    >
                      <SelectItem value={FILTRO_TODOS}>MES</SelectItem>
                      {MESES.map((m) => (
                        <SelectItem key={m.valor} value={String(m.valor)}>
                          {m.etiqueta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={filtAnio !== FILTRO_TODOS}
                  onLimpiar={() => setFiltAnio(FILTRO_TODOS)}
                >
                  <Select value={filtAnio} onValueChange={setFiltAnio}>
                    <SelectTrigger className="input-filtro-unificado" aria-label="Año">
                      <SelectValue placeholder="AÑO" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro max-h-60"
                    >
                      <SelectItem value={FILTRO_TODOS}>AÑO</SelectItem>
                      {ANIOS.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={filtSucursalId !== FILTRO_TODOS}
                  onLimpiar={() => setFiltSucursalId(FILTRO_TODOS)}
                >
                  <Select value={filtSucursalId} onValueChange={setFiltSucursalId}>
                    <SelectTrigger className="input-filtro-unificado" aria-label="Sucursal">
                      <SelectValue placeholder="SUCURSAL" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value={FILTRO_TODOS}>SUCURSAL</SelectItem>
                      {sucursales.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                <div className={cn(FILTER_INLINE_ACTION_SLOT_CLASS, "col-span-2 gap-2")}>
                  <span className={FILTER_COUNT_CLASS}>
                    {filasFiltradas.length.toLocaleString("es-AR")} REGISTRO
                    {filasFiltradas.length === 1 ? "" : "S"}
                  </span>
                  <LimpiarFiltrosButton onClick={limpiarFiltros} />
                </div>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>
          </FilterBar>
        }
      >
        <div className="space-y-6">
          {!esEditor ? (
            <p className="text-sm text-muted-foreground">
              Activá el modo editor para cargar o eliminar registros.
            </p>
          ) : null}

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
                  {filasFiltradas.length === 0 ? (
                    <EmptyTableRow
                      colSpan={esEditor ? 5 : 4}
                      message={emptyMessage ?? "No hay cargas registradas."}
                    />
                  ) : (
                    filasFiltradas.map((f) => (
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
                          <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                            <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                aria-label={`Eliminar ventas de balance — ${f.sucursal.nombre} ${etiquetaMes(f.mes)} ${f.anio}`}
                                title="Eliminar"
                                onClick={() => void handleEliminar(f.id)}
                              >
                                <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                              </Button>
                            </div>
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

      <CrearFinBalVtasModal
        open={modalNuevaCargaOpen}
        onOpenChange={setModalNuevaCargaOpen}
        sucursales={sucursales}
        defaultMes={defaultMes}
        defaultAnio={defaultAnio}
      />
    </>
  );
}
