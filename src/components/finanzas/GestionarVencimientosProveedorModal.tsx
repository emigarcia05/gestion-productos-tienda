"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { actualizarPlazosPagosMercaderiaAction } from "@/actions/controlComprobantes";
import AppModal from "@/components/shared/AppModal";
import {
  EmptyTableRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ProveedorMercaderiaPlazosFila } from "@/services/proveedor.service";

function buildPlazosMap(proveedores: ProveedorMercaderiaPlazosFila[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const p of proveedores) {
    initial[p.id] = p.plazosPagos ?? "";
  }
  return initial;
}

export default function GestionarVencimientosProveedorModal({
  onClose,
  proveedores,
}: {
  onClose: () => void;
  proveedores: ProveedorMercaderiaPlazosFila[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [plazosPorId, setPlazosPorId] = useState(() => buildPlazosMap(proveedores));

  function onGuardar() {
    startTransition(async () => {
      const items = proveedores.map((p) => ({
        id: p.id,
        plazosPagos: plazosPorId[p.id] ?? "",
      }));
      const res = await actualizarPlazosPagosMercaderiaAction({ items });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Plazos de pago actualizados.");
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <AppModal
        title="Gestionar Venc."
        size="lg"
        scrollBody
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={onGuardar} disabled={isPending}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="contenedor-tabla-gestion max-h-[min(28rem,60vh)] overflow-y-auto rounded-md border border-border">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[45%] min-w-[12rem]">PROVEEDOR</TableHead>
                <TableHead className="w-[55%] min-w-[14rem]">PLAZOS PAGO (DÍAS)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedores.length === 0 ? (
                <EmptyTableRow colSpan={2} message="Sin proveedores de mercadería." />
              ) : (
                proveedores.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="celda-datos text-left font-medium">{p.nombre}</TableCell>
                    <TableCell className="celda-datos">
                      <Input
                        value={plazosPorId[p.id] ?? ""}
                        onChange={(e) =>
                          setPlazosPorId((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        placeholder="EJ: 30, 60 O 90, 120, 150"
                        disabled={isPending}
                        className="h-9"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </AppModal>
    </Dialog>
  );
}
