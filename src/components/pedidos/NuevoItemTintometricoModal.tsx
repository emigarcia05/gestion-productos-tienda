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
import { Plus } from "lucide-react";
import type { ProveedorTintometrico, BaseTintometricaRow } from "@/services/tintometrico.service";
import SeleccionarBaseTintometricaModal from "@/components/pedidos/SeleccionarBaseTintometricaModal";
import { cn } from "@/lib/utils";

export type NuevoItemTintometricoDraft = {
  proveedorId: string;
  codTintometrico: string;
  base: BaseTintometricaRow;
  cantidad: number;
};

export default function NuevoItemTintometricoModal({
  open,
  onOpenChange,
  proveedores,
  onAgregar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proveedores: ProveedorTintometrico[];
  onAgregar: (draft: NuevoItemTintometricoDraft) => void;
}) {
  const [sucursal, setSucursal] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [codTintometrico, setCodTintometrico] = useState("");
  const [baseModalOpen, setBaseModalOpen] = useState(false);
  const [bases, setBases] = useState<BaseTintometricaRow[]>([]);
  const [cantPorBaseId, setCantPorBaseId] = useState<Record<string, string>>({});

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
  const tieneCantidadValida = Object.keys(cantidadesValidasPorBase).length > 0;
  const puedeAgregar =
    !!sucursal && !!proveedorId && codValido && bases.length > 0 && tieneCantidadValida;

  function handleAgregar() {
    if (!puedeAgregar) return;
    const codigo = codTintometrico.trim();
    for (const b of bases) {
      const cant = cantidadesValidasPorBase[b.id];
      if (!cant || cant <= 0) continue;
      onAgregar({
        proveedorId,
        codTintometrico: codigo,
        base: b,
        cantidad: cant,
      });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Nuevo Ítem Tintométrico"
        scrollBody={false}
        className="sm:max-w-2xl"
        bodyClassName="flex flex-col gap-4"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAgregar} disabled={!puedeAgregar}>
              Agregar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Sucursal</span>
            <Select value={sucursal} onValueChange={setSucursal}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Seleccionar Sucursal" />
              </SelectTrigger>
              <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                <SelectItem value="guaymallen">Guaymallén</SelectItem>
                <SelectItem value="maipu">Maipú</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Proveedor</span>
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

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Cod. Tintométricos</span>
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

          {codValido && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Seleccione La Base</span>
              <div className="flex items-center gap-2">
                <Input
                  value={
                    bases.length === 0
                      ? ""
                      : bases.map((b) => b.descripcionTienda).join(" / ")
                  }
                  readOnly
                  className={cn("h-10", bases.length === 0 && "text-muted-foreground")}
                  placeholder="Seleccionar Base..."
                />
              </div>
            </div>
          )}

          {bases.length > 0 && codValido && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Detalle Del Ítem</span>
              <Table variant="compact" className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[6rem]">CANT</TableHead>
                    <TableHead>DESCRIPCIÓN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bases.map((b) => {
                    const descripcion =
                      b.descripcionTienda && codValido
                        ? `${b.descripcionTienda} Cod. ${codTintometrico.trim()}`
                        : b.descripcionTienda;
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
                            className="h-8 w-20 text-right"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="celda-datos text-xs">
                          {descripcion}
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

