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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLAZOS_PAGO_DIAS_PERMITIDOS } from "@/lib/comprobanteCuotasPlazoPago";
import type { ProveedorMercaderiaPlazosFila } from "@/services/proveedor.service";

type PlanRow = {
  plazo1: string;
  plazo2: string;
  plazo3: string;
  plazo4: string;
};

function buildInitial(proveedores: ProveedorMercaderiaPlazosFila[]): Record<string, PlanRow> {
  const initial: Record<string, PlanRow> = {};
  for (const p of proveedores) {
    initial[p.id] = {
      plazo1: p.plazoPago1Dias != null ? String(p.plazoPago1Dias) : "30",
      plazo2: p.plazoPago2Dias != null ? String(p.plazoPago2Dias) : "",
      plazo3: p.plazoPago3Dias != null ? String(p.plazoPago3Dias) : "",
      plazo4: p.plazoPago4Dias != null ? String(p.plazoPago4Dias) : "",
    };
  }
  return initial;
}

function PlazoSelect({
  value,
  onChange,
  required,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(v === "none" ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger className="h-9 w-full min-w-[4.5rem]">
        <SelectValue placeholder={required ? "Oblig." : "—"} />
      </SelectTrigger>
      <SelectContent>
        {!required ? <SelectItem value="none">—</SelectItem> : null}
        {PLAZOS_PAGO_DIAS_PERMITIDOS.map((d) => (
          <SelectItem key={d} value={String(d)}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
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
  const [planes, setPlanes] = useState(() => buildInitial(proveedores));

  function setSlot(id: string, slot: keyof PlanRow, value: string) {
    setPlanes((prev) => ({
      ...prev,
      [id]: { ...prev[id]!, [slot]: value },
    }));
  }

  function onGuardar() {
    startTransition(async () => {
      const items = proveedores.map((p) => {
        const plan = planes[p.id] ?? { plazo1: "30", plazo2: "", plazo3: "", plazo4: "" };
        return {
          id: p.id,
          plazo1: Number(plan.plazo1),
          plazo2: plan.plazo2 === "" ? null : Number(plan.plazo2),
          plazo3: plan.plazo3 === "" ? null : Number(plan.plazo3),
          plazo4: plan.plazo4 === "" ? null : Number(plan.plazo4),
        };
      });
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
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
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
                <TableHead className="w-[36%] min-w-[10rem]">PROVEEDOR</TableHead>
                <TableHead className="w-[16%] min-w-[5rem]">1.º</TableHead>
                <TableHead className="w-[16%] min-w-[5rem]">2.º</TableHead>
                <TableHead className="w-[16%] min-w-[5rem]">3.º</TableHead>
                <TableHead className="w-[16%] min-w-[5rem]">4.º</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedores.length === 0 ? (
                <EmptyTableRow colSpan={5} message="Sin proveedores de mercadería." />
              ) : (
                proveedores.map((p) => {
                  const plan = planes[p.id] ?? {
                    plazo1: "30",
                    plazo2: "",
                    plazo3: "",
                    plazo4: "",
                  };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="celda-datos text-left font-medium">{p.nombre}</TableCell>
                      <TableCell className="celda-datos p-1">
                        <PlazoSelect
                          value={plan.plazo1}
                          onChange={(v) => setSlot(p.id, "plazo1", v)}
                          required
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell className="celda-datos p-1">
                        <PlazoSelect
                          value={plan.plazo2}
                          onChange={(v) => setSlot(p.id, "plazo2", v)}
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell className="celda-datos p-1">
                        <PlazoSelect
                          value={plan.plazo3}
                          onChange={(v) => setSlot(p.id, "plazo3", v)}
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell className="celda-datos p-1">
                        <PlazoSelect
                          value={plan.plazo4}
                          onChange={(v) => setSlot(p.id, "plazo4", v)}
                          disabled={isPending}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </AppModal>
    </Dialog>
  );
}
