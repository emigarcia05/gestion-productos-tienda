"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import EditarCoeficientesModal from "@/components/stock/EditarCoeficientesModal";
import {
  formatMonto,
  parseMonto,
  roundToNearestHundred,
} from "@/lib/tiendaCalculosLts";

type ProveedorOption = {
  id: string;
  nombre: string;
  prefijo: string;
  codigoUnico: string;
  coeficienteTintometrico: number;
};

interface Props {
  proveedores: ProveedorOption[];
  esEditor: boolean;
}

export default function TiendaCalcTintometricoPageClient({
  proveedores,
  esEditor,
}: Props) {
  const router = useRouter();
  /** `id` del proveedor seleccionado. */
  const [proveedorId, setProveedorId] = useState<string>("");
  const [pxCompra, setPxCompra] = useState<string>("");
  const [editarCoefOpen, setEditarCoefOpen] = useState(false);

  const proveedoresConCoefMayorAUno = useMemo(
    () => proveedores.filter((p) => p.coeficienteTintometrico > 1),
    [proveedores]
  );

  const pxListaTienda = useMemo(() => {
    const base = Math.round(parseMonto(pxCompra));
    if (!proveedorId) return formatMonto(roundToNearestHundred(base));
    const coef =
      proveedoresConCoefMayorAUno.find((p) => p.id === proveedorId)?.coeficienteTintometrico ?? 1;
    return formatMonto(roundToNearestHundred(base * coef));
  }, [pxCompra, proveedorId, proveedoresConCoefMayorAUno]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <EditarCoeficientesModal
        open={editarCoefOpen}
        onOpenChange={setEditarCoefOpen}
        proveedores={proveedores}
        onSaved={() => router.refresh()}
      />
      <SectionHeader titulo="Lista Tienda" subtitulo="Calc. Tintométrico" />

      <div className="flex-1 overflow-hidden w-full px-4 sm:px-6 lg:px-8 contenedor-pagina-con-filtros">
        <section className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card p-4">
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-center text-sm font-semibold uppercase text-foreground">
                CÁLCULO DE PX TINTOMÉTRICO
              </h2>
              <span className="h-0.5 w-[70%] rounded-full bg-primary" aria-hidden />
            </div>

            <div className="mx-auto grid w-full max-w-xl grid-cols-[11rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
              <span className="text-xs font-semibold uppercase text-foreground">
                Proveedor
              </span>
              <div className="min-w-0">
                <Select
                  value={proveedorId || "none"}
                  onValueChange={(value) => setProveedorId(value === "none" ? "" : value)}
                >
                  <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "h-10")}>
                    <SelectValue placeholder="SELECCIONAR" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    <SelectItem value="none">SELECCIONAR</SelectItem>
                    {proveedoresConCoefMayorAUno.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.prefijo ? `[${item.prefijo}] ` : `[${item.codigoUnico}] `}
                        {item.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <span className="text-xs font-semibold uppercase text-foreground">
                Px. Compra
              </span>
              <Input
                value={pxCompra}
                onChange={(e) => setPxCompra(e.target.value.replace(/\D/g, ""))}
                placeholder="0,00"
                inputMode="numeric"
                className="h-10 text-center"
                aria-label="Px.Compra"
              />

              <span className="text-xs font-semibold uppercase text-foreground">
                Px Lista Tienda
              </span>
              <div className="h-10 rounded-md border border-border bg-background px-3 text-sm tabular-nums text-foreground flex items-center justify-center">
                {pxListaTienda || "0,00"}
              </div>
            </div>

            {esEditor ? (
              <div className="flex justify-center pt-1">
                <Button type="button" onClick={() => setEditarCoefOpen(true)}>
                  Editar Coeficientes
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
