"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { listGlobalPersonalAction } from "@/actions/globalPersonal";
import type { GlobalPersonalItem } from "@/services/globalPersonal.service";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";

export type PersonalRecepcionSeleccion = Pick<
  GlobalPersonalItem,
  "idPersonal" | "nombrePersonal"
>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeleccionar: (item: PersonalRecepcionSeleccion) => void;
  /** Deshabilitar interacción mientras corre `registrarRecepcionCompraDuxAction`. */
  pending?: boolean;
}

export default function ElegirPersonalRecepcionModal({
  open,
  onOpenChange,
  onSeleccionar,
  pending = false,
}: Props) {
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [personal, setPersonal] = useState<GlobalPersonalItem[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const cargarLista = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const res = await listGlobalPersonalAction();
      if (!res.ok) {
        const line = res.error ?? "No se pudo cargar el personal.";
        setErrorCarga(line);
        toast.error(line);
        setPersonal([]);
        return;
      }
      const items = res.data ?? [];
      if (items.length === 0) {
        const line = "No hay personal registrado para registrar la compra.";
        setErrorCarga(line);
        toast.error(line);
      }
      setPersonal(items);
    } catch {
      const line = "Error inesperado al cargar el personal.";
      setErrorCarga(line);
      toast.error(line);
      setPersonal([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setBusqueda("");
      setPersonal([]);
      setErrorCarga(null);
      setCargando(false);
      return;
    }
    void cargarLista();
  }, [open, cargarLista]);

  const filas = useMemo(() => {
    const t = busqueda.trim().toLocaleUpperCase("es-AR");
    if (!t) return personal;
    return personal.filter((p) =>
      p.nombrePersonal.toLocaleUpperCase("es-AR").includes(t)
    );
  }, [personal, busqueda]);

  const interaccionBloqueada = cargando || pending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (!interaccionBloqueada ? onOpenChange(next) : undefined)}
    >
      <AppModal
        title="Elegir Personal"
        size="md"
        scrollBody
        actions={
          <div className="flex w-full justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={interaccionBloqueada}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            Elegí quién registra la compra en DUX.
          </p>
          <label className="flex flex-col gap-1">
            <ModalMicroLabel>Buscar</ModalMicroLabel>
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value.toLocaleUpperCase("es-AR"))}
              disabled={interaccionBloqueada || personal.length === 0}
              placeholder="BUSCAR POR NOMBRE…"
              aria-label="Buscar personal"
              className="h-9"
            />
          </label>
          <div className="contenedor-tabla-gestion max-h-[min(18rem,40vh)] min-h-[8rem] w-full min-w-0 overflow-hidden">
            <Table variant="compact" scrollX={false} className="table-fixed w-full">
              <colgroup>
                <col className="min-w-0" />
                <col className="w-[3.25rem]" />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-0">NOMBRE</TableHead>
                  <TableHead className="w-[3.25rem] text-center tabla-bloque-secundario-head-divider">
                    ACCIONES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="celda-datos text-center text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Cargando…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : errorCarga ? (
                  <EmptyTableRow colSpan={2} message={errorCarga} />
                ) : filas.length === 0 ? (
                  <EmptyTableRow
                    colSpan={2}
                    message={
                      personal.length === 0
                        ? "No hay personal disponible."
                        : "Ninguna persona coincide con la búsqueda."
                    }
                  />
                ) : (
                  filas.map((p) => (
                    <TableRow key={p.idPersonal}>
                      <TableCell className="celda-datos min-w-0" title={p.nombrePersonal}>
                        <span className="celda-destacado block truncate">{p.nombrePersonal}</span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider min-w-0"
                        )}
                      >
                        <div className={cn(TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS, "flex justify-center")}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={interaccionBloqueada}
                            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                            aria-label={`Seleccionar ${p.nombrePersonal}`}
                            title="Seleccionar"
                            onClick={() =>
                              onSeleccionar({
                                idPersonal: p.idPersonal,
                                nombrePersonal: p.nombrePersonal,
                              })
                            }
                          >
                            {pending ? (
                              <Loader2
                                className={cn(TABLE_ROW_ACTION_ICON_CLASS, "animate-spin")}
                                aria-hidden
                              />
                            ) : (
                              <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
