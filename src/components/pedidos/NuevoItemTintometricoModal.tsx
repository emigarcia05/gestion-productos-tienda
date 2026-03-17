"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import type { ProveedorTintometrico, BaseTintometricaRow } from "@/services/tintometrico.service";
import SeleccionarBaseTintometricaModal from "@/components/pedidos/SeleccionarBaseTintometricaModal";
import { cn } from "@/lib/utils";

export type NuevoItemTintometricoDraft = {
  proveedorId: string;
  codTintometrico: string;
  base: BaseTintometricaRow;
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
  const firstProveedorId = proveedores[0]?.id ?? "";
  const [proveedorId, setProveedorId] = useState(firstProveedorId);
  const [codTintometrico, setCodTintometrico] = useState("");
  const [baseModalOpen, setBaseModalOpen] = useState(false);
  const [base, setBase] = useState<BaseTintometricaRow | null>(null);

  useEffect(() => {
    if (!open) return;
    setProveedorId(firstProveedorId);
    setCodTintometrico("");
    setBase(null);
  }, [open, firstProveedorId]);

  const proveedorSeleccionado = useMemo(
    () => proveedores.find((p) => p.id === proveedorId) ?? null,
    [proveedores, proveedorId]
  );

  const codValido = codTintometrico.trim().length > 0;
  const puedeAgregar = !!proveedorId && codValido && base != null;

  function handleAgregar() {
    if (!puedeAgregar || !base) return;
    onAgregar({
      proveedorId,
      codTintometrico: codTintometrico.trim(),
      base,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Nuevo Ítem Tintométrico"
        scrollBody={false}
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
            <span className="text-xs text-muted-foreground">Proveedor</span>
            <Tabs value={proveedorId} onValueChange={setProveedorId} className="w-full">
              <TabsList className="w-full justify-start">
                {proveedores.map((p) => (
                  <TabsTrigger key={p.id} value={p.id}>
                    {p.nombre}
                  </TabsTrigger>
                ))}
              </TabsList>

              {proveedores.map((p) => (
                <TabsContent key={p.id} value={p.id} className="hidden">
                  {p.nombre}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Cod. Tintométricos</span>
            <Input
              value={codTintometrico}
              onChange={(e) => setCodTintometrico(e.target.value)}
              disabled={!proveedorSeleccionado}
              className="h-10"
              placeholder="Ingresar Código..."
            />
          </div>

          {codValido && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Seleccione La Base</span>
              <div className="flex items-center gap-2">
                <Input
                  value={base?.descripcionTienda ?? ""}
                  readOnly
                  className={cn("h-10", !base && "text-muted-foreground")}
                  placeholder="Seleccionar Base..."
                />
                <Button
                  type="button"
                  variant="primaryIcon"
                  size="icon-lg"
                  onClick={() => setBaseModalOpen(true)}
                  aria-label="Seleccionar Base"
                  title="Seleccionar Base"
                  className="h-10 min-h-10 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <SeleccionarBaseTintometricaModal
          open={baseModalOpen}
          onOpenChange={setBaseModalOpen}
          onSeleccionar={(row) => {
            setBase(row);
            setBaseModalOpen(false);
          }}
        />
      </AppModal>
    </Dialog>
  );
}

