"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import ImportarEstPorProdModal from "@/components/estadisticas-productos/ImportarEstPorProdModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { eliminarEstPorProdPorPeriodoAction } from "@/actions/estPorProd";
import {
  etiquetaPeriodoCortoEstPorProd,
  listarPeriodosCargaEstPorProd,
} from "@/lib/estPorProdPeriodo";
import type {
  EstPorProdCeldaCarga,
  SucursalConDepositoOption,
} from "@/lib/estPorProdTypes";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  sucursales: SucursalConDepositoOption[];
  celdas: EstPorProdCeldaCarga[];
  esEditor: boolean;
  mesActual: number;
  anioActual: number;
}

type CeldaTarget = {
  sucursalId: string;
  mes: number;
  anio: number;
};

function celdaKey(sucursalId: string, mes: number, anio: number): string {
  return `${sucursalId}|${anio}|${mes}`;
}

export default function EstPorProdPageClient({
  sucursales,
  celdas,
  esEditor,
  mesActual,
  anioActual,
}: Props) {
  const router = useRouter();
  const [importTarget, setImportTarget] = useState<CeldaTarget | null>(null);
  const [borrandoKey, setBorrandoKey] = useState<string | null>(null);

  const periodos = useMemo(
    () => listarPeriodosCargaEstPorProd({ mes: mesActual, anio: anioActual }),
    [mesActual, anioActual]
  );

  const cantidadPorCelda = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of celdas) {
      map.set(celdaKey(c.sucursalId, c.mes, c.anio), c.cantidad);
    }
    return map;
  }, [celdas]);

  async function handleEliminarPeriodo(target: CeldaTarget, etiqueta: string) {
    if (!esEditor) return;
    const key = celdaKey(target.sucursalId, target.mes, target.anio);
    if (
      !window.confirm(
        `¿Eliminar todo el periodo de ${etiqueta}? Se borrarán todos los productos de esa sucursal en ese mes/año. Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setBorrandoKey(key);
    try {
      const r = await eliminarEstPorProdPorPeriodoAction(target);
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo eliminar el periodo.");
        return;
      }
      toast.success(
        r.data.eliminados === 0
          ? "Periodo sin datos (nada que borrar)."
          : `Periodo eliminado (${r.data.eliminados.toLocaleString("es-AR")} producto(s)).`
      );
      router.refresh();
    } finally {
      setBorrandoKey(null);
    }
  }

  const colSpan = Math.max(1, sucursales.length + 1);

  return (
    <>
      <ClassicFilteredTableLayout
        title="ESTADÍSTICAS PRODUCTOS"
        subtitle="Carga de Datos"
        contentWidth="full"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <section className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[14%] sticky left-0 z-30 bg-primary">
                      PERIODO
                    </TableHead>
                    {sucursales.map((s) => (
                      <TableHead key={s.id} className="min-w-[8.5rem] text-center">
                        {s.nombre}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sucursales.length === 0 ? (
                    <EmptyTableRow
                      colSpan={colSpan}
                      message="No hay sucursales con depósito configurado."
                    />
                  ) : periodos.length === 0 ? (
                    <EmptyTableRow
                      colSpan={colSpan}
                      message="No hay periodos para mostrar."
                    />
                  ) : (
                    periodos.map((p) => {
                      const etiquetaPeriodo = etiquetaPeriodoCortoEstPorProd(
                        p.mes,
                        p.anio
                      ).toLocaleUpperCase("es-AR");
                      return (
                        <TableRow key={`${p.anio}-${p.mes}`}>
                          <TableCell className="celda-datos sticky left-0 z-10 bg-card font-medium">
                            {etiquetaPeriodo}
                          </TableCell>
                          {sucursales.map((s) => {
                            const key = celdaKey(s.id, p.mes, p.anio);
                            const cantidad = cantidadPorCelda.get(key) ?? 0;
                            const tieneDatos = cantidad > 0;
                            const target: CeldaTarget = {
                              sucursalId: s.id,
                              mes: p.mes,
                              anio: p.anio,
                            };
                            const etiquetaCelda = `${s.nombre} · ${etiquetaPeriodo}`;
                            return (
                              <TableCell
                                key={key}
                                className="celda-datos celda-datos--accion-relleno-fila"
                              >
                                {esEditor ? (
                                  <div
                                    className={cn(
                                      TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS
                                    )}
                                  >
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                      aria-label={`Subir datos ${etiquetaCelda}`}
                                      title="Subir datos"
                                      onClick={() => setImportTarget(target)}
                                    >
                                      <FileUp
                                        className={TABLE_ROW_ACTION_ICON_CLASS}
                                        aria-hidden
                                      />
                                    </Button>
                                    {tieneDatos ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                        aria-label={`Borrar datos ${etiquetaCelda}`}
                                        title={`Borrar datos (${cantidad.toLocaleString("es-AR")})`}
                                        disabled={borrandoKey === key}
                                        onClick={() =>
                                          void handleEliminarPeriodo(
                                            target,
                                            etiquetaCelda
                                          )
                                        }
                                      >
                                        <Trash2
                                          className={TABLE_ROW_ACTION_ICON_CLASS}
                                          aria-hidden
                                        />
                                      </Button>
                                    ) : null}
                                  </div>
                                ) : tieneDatos ? (
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    {cantidad.toLocaleString("es-AR")}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </ClassicFilteredTableLayout>

      {importTarget ? (
        <ImportarEstPorProdModal
          open
          onOpenChange={(open) => {
            if (!open) setImportTarget(null);
          }}
          sucursales={sucursales}
          defaultMes={importTarget.mes}
          defaultAnio={importTarget.anio}
          lockedMes={importTarget.mes}
          lockedAnio={importTarget.anio}
          lockedSucursalId={importTarget.sucursalId}
        />
      ) : null}
    </>
  );
}
