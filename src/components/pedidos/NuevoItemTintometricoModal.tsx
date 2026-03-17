"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
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
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { upsertPedidoTintometricoItemsAction } from "@/actions/pedidos";
import type { ItemPedidoTintometricoPayload } from "@/services/pedidosEnvio.service";
import type {
  ProveedorTintometrico,
  BaseTintometricaRow,
  SucursalTintometrica,
} from "@/services/tintometrico.service";
import SeleccionarBaseTintometricaModal from "@/components/pedidos/SeleccionarBaseTintometricaModal";
import { cn } from "@/lib/utils";

export type NuevoItemTintometricoDraft = {
  sucursalCodigo: string;
  proveedorId: string;
  codTintometrico: string;
  base: BaseTintometricaRow;
  cantidad: number;
};

export default function NuevoItemTintometricoModal({
  open,
  onOpenChange,
  proveedores,
  sucursales,
  onAgregar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proveedores: ProveedorTintometrico[];
  sucursales: SucursalTintometrica[];
  onAgregar: (draft: NuevoItemTintometricoDraft) => void;
}) {
  const [sucursal, setSucursal] = useState<"" | "guaymallen" | "maipu">("");
  const [proveedorId, setProveedorId] = useState("");
  const [codTintometrico, setCodTintometrico] = useState("");
  const [baseModalOpen, setBaseModalOpen] = useState(false);
  const [bases, setBases] = useState<BaseTintometricaRow[]>([]);
  const [cantPorBaseId, setCantPorBaseId] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSucursal("");
    setProveedorId("");
    setCodTintometrico("");
    setBases([]);
    setCantPorBaseId({});
  }, [open]);

  const proveedorSeleccionado = useMemo(
    () => proveedores.find((p) => p.id === proveedorId) ?? null,
    [proveedores, proveedorId]
  );

  const cantidadesValidasPorBase: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = {};
    for (const b of bases) {
      const raw = cantPorBaseId[b.id];
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) {
        out[b.id] = Math.floor(n);
      }
    }
    return out;
  }, [bases, cantPorBaseId]);

  const codValido = codTintometrico.trim().length > 0;
  const tieneCantidadValida =
    bases.length > 0 && bases.every((b) => (cantidadesValidasPorBase[b.id] ?? 0) > 0);
  const puedeAgregar =
    !!sucursal && !!proveedorId && codValido && bases.length > 0 && tieneCantidadValida;

  async function handleAgregar() {
    if (!puedeAgregar || guardando) return;
    const codigo = codTintometrico.trim();
    const payload = bases
      .map((b) => {
        const cant = cantidadesValidasPorBase[b.id];
        if (!cant || cant <= 0) return null;
        const descripcionBase = (b.descripcionTienda ?? "").trim();
        const descripcion =
          descripcionBase && codigo
            ? `${descripcionBase} - COD. ${codigo}`.toUpperCase()
            : (descripcionBase || "").toUpperCase();
        return {
          sucursalCodigo: sucursal,
          proveedorId,
          codTienda: b.codTienda,
          cantidad: cant,
          descripcion,
          base: b,
        };
      })
      .filter(Boolean) as Array<{
        sucursalCodigo: "guaymallen" | "maipu";
        proveedorId: string;
        codTienda: string;
        cantidad: number;
        descripcion: string;
        base: BaseTintometricaRow;
      }>;

    if (payload.length === 0) return;

    setGuardando(true);
    try {
      const result = await upsertPedidoTintometricoItemsAction(
        payload.map(
          ({ sucursalCodigo, proveedorId, codTienda, cantidad, descripcion }) =>
            ({
              sucursalCodigo,
              proveedorId,
              codTienda,
              cantidad,
              descripcion,
            } as ItemPedidoTintometricoPayload)
        )
      );
      if (!result.ok) {
        toast.error(result.error ?? "Error al guardar ítems tintométricos.");
        return;
      }

      payload.forEach(({ sucursalCodigo, proveedorId, base, cantidad }) => {
        onAgregar({
          sucursalCodigo,
          proveedorId,
          codTintometrico: codigo,
          base,
          cantidad,
        });
      });
      toast.success(
        result.data.actualizados === 1
          ? "Se guardó 1 ítem tintométrico."
          : `Se guardaron ${result.data.actualizados} ítems tintométricos.`
      );
      onOpenChange(false);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Nuevo Ítem Tintométrico"
        scrollBody={false}
        className="sm:max-w-[46.2rem] max-h-[99vh]"
        bodyClassName="flex flex-col gap-4"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAgregar} disabled={!puedeAgregar || guardando}>
              Agregar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-foreground">Sucursal</span>
              <Select
                value={sucursal}
                onValueChange={(value) =>
                  setSucursal((value === "" ? "" : (value as "guaymallen" | "maipu")))
                }
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Seleccionar Sucursal" />
                </SelectTrigger>
                <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.codigo as "guaymallen" | "maipu"}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-foreground">Proveedor</span>
              <Select value={proveedorId} onValueChange={setProveedorId}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Seleccionar Proveedor" />
                </SelectTrigger>
                <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {`${p.prefijo} - ${p.nombre}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-foreground">Cod. Tintométricos</span>
            <div className="flex items-center gap-2">
              <Input
                value={codTintometrico}
                onChange={(e) => setCodTintometrico(e.target.value)}
                disabled={!proveedorSeleccionado}
                className="h-10"
                placeholder="Ingresar Código..."
              />
              <Button
                type="button"
                variant="primaryIcon"
                size="icon-lg"
                onClick={() => {
                  if (!proveedorSeleccionado || !codValido) return;
                  setBaseModalOpen(true);
                }}
                aria-label="Seleccionar Base"
                title="Seleccionar Base"
                className="h-10 min-h-10 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {bases.length > 0 && codValido && (
            <div className="flex flex-col gap-2">
              <Table variant="compact" className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[3.5rem] text-center">CANT</TableHead>
                    <TableHead>DESCRIPCIÓN</TableHead>
                    <TableHead className="w-[3rem]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bases.map((b) => {
                    const baseTexto = (b.descripcionTienda ?? "").trim();
                    const codigo = codTintometrico.trim();
                    const descripcion =
                      baseTexto && codigo
                        ? `${baseTexto} - COD. ${codigo}`.toUpperCase()
                        : (baseTexto || "").toUpperCase();
                    const valor = cantPorBaseId[b.id] ?? "";
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="celda-datos align-middle">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={valor}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCantPorBaseId((prev) => {
                                if (!value) {
                                  const next = { ...prev };
                                  delete next[b.id];
                                  return next;
                                }
                                const n = Number(value);
                                if (!Number.isFinite(n) || n <= 0) return prev;
                                return { ...prev, [b.id]: String(Math.floor(n)) };
                              });
                            }}
                            className="h-8 w-12 text-center"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="celda-datos text-xs">
                          {descripcion}
                        </TableCell>
                        <TableCell className="celda-datos text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setBases((prev) => prev.filter((x) => x.id !== b.id));
                              setCantPorBaseId((prev) => {
                                const next = { ...prev };
                                delete next[b.id];
                                return next;
                              });
                            }}
                            className="text-foreground hover:text-destructive"
                            aria-label="Borrar Ítem"
                            title="Borrar Ítem"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <SeleccionarBaseTintometricaModal
          open={baseModalOpen}
          onOpenChange={setBaseModalOpen}
          onSeleccionar={(rows) => {
            setBases((prev) => {
              const existingIds = new Set(prev.map((b) => b.id));
              const nuevos = rows.filter((r) => !existingIds.has(r.id));
              return nuevos.length > 0 ? [...prev, ...nuevos] : prev;
            });
            setBaseModalOpen(false);
          }}
        />
      </AppModal>
    </Dialog>
  );
}

