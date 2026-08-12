"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRight, AlertTriangle, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  registrarControlTransfDepositosAction,
  type Sucursal,
  type TransfDepositosData,
} from "@/actions/stock";
import {
  TableEmptyState,
  tableEmptyStateContainerVariants,
  tableEmptyStateMessageVariants,
} from "@/components/shared/TableEmptyState";
import { cn } from "@/lib/utils";
import {
  ICON_WARNING_INTERACTIVE_CLASS,
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { formatDdMmHhMmArgentina } from "@/lib/fechaArgentina";
import { TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS } from "@/lib/transfDepositosControl";

const SUCURSAL_LABEL: Record<Sucursal, string> = {
  guaymallen: "GUAYMALLÉN",
  maipu: "MAIPÚ",
};

const PCT_DESC = 46;
const PCT_ORIGEN = 18;
const PCT_DESTINO = 14;
const PCT_CONTROL = 12;
const PCT_ACCIONES = 10;

interface Props {
  data: TransfDepositosData;
  origen: Sucursal | null;
  destino: Sucursal | null;
}

/**
 * Grilla **Trans. Depósitos**:
 * DESCRIPCIÓN · {origen} (input+flecha) · {destino} · CONTROL (Check) · ACCIONES.
 */
export default function TablaTransfDepositos({ data, origen, destino }: Props) {
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [confirmados, setConfirmados] = useState<Record<string, boolean>>({});
  const [pendienteForzar, setPendienteForzar] = useState<Record<string, boolean>>(
    {}
  );
  const [controles, setControles] = useState(data.controlesRecientes);
  const [isPending, startTransition] = useTransition();

  const idsKey = data.items.map((i) => i.id).join("|");
  useEffect(() => {
    queueMicrotask(() => {
      setCantidades((prev) => {
        const next: Record<string, string> = {};
        for (const item of data.items) {
          if (prev[item.id] !== undefined) next[item.id] = prev[item.id];
        }
        return next;
      });
      setControles(data.controlesRecientes);
    });
  }, [idsKey, data.items, data.controlesRecientes]);

  const origenSeleccionado = origen !== null;
  const destinoSeleccionado = destino !== null;
  const origenLabel = origen ? SUCURSAL_LABEL[origen] : "—";
  const destinoLabel = destino ? SUCURSAL_LABEL[destino] : "—";

  const controlesPorClave = useMemo(() => {
    const map = new Map<string, { cantidad: number; createdAtIso: string }>();
    for (const c of controles) {
      const key = `${c.codTienda}|${c.cantidad}`;
      if (!map.has(key)) {
        map.set(key, { cantidad: c.cantidad, createdAtIso: c.createdAtIso });
      }
    }
    return map;
  }, [controles]);

  function handleCantidad(id: string, raw: string) {
    const limpio = raw.replace(/[^\d]/g, "");
    setCantidades((prev) => ({ ...prev, [id]: limpio }));
    setPendienteForzar((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function limpiarFila(id: string) {
    setCantidades((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPendienteForzar((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function marcarControl(itemId: string, forzar: boolean) {
    if (!origen || !destino) return;
    const raw = cantidades[itemId] ?? "";
    const cantidad = Number(raw);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      toast.error("Ingresá una cantidad válida.");
      return;
    }

    startTransition(async () => {
      const res = await registrarControlTransfDepositosAction({
        codTienda: itemId,
        origen,
        destino,
        cantidad,
        forzar,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if ("requiereConfirmacion" in res.data) {
        const cuando = formatDdMmHhMmArgentina(
          new Date(res.data.ultimoCreatedAtIso)
        );
        toast.warning(
          `Ya hay una transferencia igual (${cuando}). Volvé a marcar CONTROL para confirmar.`,
          { duration: 6000 }
        );
        setPendienteForzar((prev) => ({ ...prev, [itemId]: true }));
        return;
      }
      const registrado = res.data;
      setConfirmados((prev) => ({ ...prev, [itemId]: true }));
      setPendienteForzar((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setControles((prev) => [
        {
          codTienda: itemId,
          cantidad,
          createdAtIso: registrado.createdAtIso,
        },
        ...prev,
      ]);
      if (registrado.eraDuplicado) {
        toast.success("Control registrado (duplicado confirmado).");
      } else {
        toast.success("Control registrado.");
      }
    });
  }

  if (!origenSeleccionado) {
    return (
      <TableEmptyState
        placement="blockedPanel"
        textSize="sm"
        maxWidth="full"
        message="Seleccioná sucursal origen y destino (distintas) para transferir."
      />
    );
  }

  return (
    <Table variant="compact">
      <colgroup>
        <col style={{ width: `${PCT_DESC}%` }} />
        <col style={{ width: `${PCT_ORIGEN}%` }} />
        <col style={{ width: `${PCT_DESTINO}%` }} />
        <col style={{ width: `${PCT_CONTROL}%` }} />
        <col style={{ width: `${PCT_ACCIONES}%` }} />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-0 align-middle">DESCRIPCIÓN</TableHead>
          <TableHead className="text-center align-middle">
            {origenLabel}
          </TableHead>
          <TableHead className="text-center align-middle">
            {destinoLabel}
          </TableHead>
          <TableHead
            className="text-center align-middle"
            aria-label="Control de transferencia"
          >
            <div className="flex w-full items-center justify-center">
              <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
            </div>
          </TableHead>
          <TableHead className="text-center align-middle">ACCIONES</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={5}
              className={cn(
                tableEmptyStateContainerVariants({
                  placement: "tableCellTall",
                  textSize: "xs",
                })
              )}
            >
              <span
                className={tableEmptyStateMessageVariants({
                  maxWidth: "full",
                })}
              >
                Sin resultados
              </span>
            </TableCell>
          </TableRow>
        )}
        {data.items.map((item) => {
          const cantidad = cantidades[item.id] ?? "";
          const tieneCantidad = cantidad !== "";
          const cantidadNum = Number(cantidad);
          const dup =
            tieneCantidad && Number.isFinite(cantidadNum)
              ? controlesPorClave.get(`${item.id}|${cantidadNum}`)
              : undefined;
          const confirmado = !!confirmados[item.id];
          const forzar = !!pendienteForzar[item.id];

          return (
            <TableRow key={item.id}>
              <TableCell className="celda-datos min-w-0 overflow-hidden">
                {item.descripcion}
              </TableCell>
              <TableCell className="celda-datos celda-datos--flush-right">
                <div className="flex w-full items-center justify-end gap-1 pr-1">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={cantidad}
                    onChange={(e) => handleCantidad(item.id, e.target.value)}
                    className="h-6 w-14 shrink-0 self-center text-center text-sm font-normal tabular-nums"
                    aria-label={`Cantidad a transferir desde ${origenLabel}`}
                    disabled={!destinoSeleccionado}
                  />
                  <span
                    className={cn(
                      "inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground",
                      !tieneCantidad && "invisible"
                    )}
                    aria-hidden={!tieneCantidad}
                  >
                    <ArrowRight
                      className={TABLE_ROW_ACTION_ICON_CLASS}
                      aria-hidden
                    />
                  </span>
                </div>
              </TableCell>
              <TableCell className="celda-datos celda-datos--flush-left text-left tabular-nums">
                <span className="pl-1">
                  {!destinoSeleccionado || !tieneCantidad ? "—" : cantidad}
                </span>
              </TableCell>
              <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                  {dup ? (
                    <span
                      className={ICON_WARNING_INTERACTIVE_CLASS}
                      title={`Transferencia igual en los últimos ${TRANSF_DEPOSITOS_VENTANA_DUPLICADO_DIAS} días (${formatDdMmHhMmArgentina(new Date(dup.createdAtIso))})`}
                    >
                      <AlertTriangle
                        className={TABLE_ROW_ACTION_ICON_CLASS}
                        aria-hidden
                      />
                      <span className="sr-only">Duplicado reciente</span>
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
                      confirmado && "ring-2 ring-primary ring-offset-1"
                    )}
                    aria-label={
                      forzar
                        ? "Confirmar transferencia duplicada"
                        : "Marcar control de transferencia"
                    }
                    title={
                      forzar
                        ? "Confirmar duplicado"
                        : "Marcar control"
                    }
                    aria-pressed={confirmado}
                    disabled={
                      !destinoSeleccionado ||
                      !tieneCantidad ||
                      isPending ||
                      confirmado
                    }
                    onClick={() => marcarControl(item.id, forzar)}
                  >
                    <Check
                      className={TABLE_ROW_ACTION_ICON_CLASS}
                      aria-hidden
                    />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                    aria-label="Limpiar cantidad"
                    title="Limpiar cantidad"
                    disabled={!tieneCantidad || isPending}
                    onClick={() => limpiarFila(item.id)}
                  >
                    <Trash2
                      className={TABLE_ROW_ACTION_ICON_CLASS}
                      aria-hidden
                    />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
