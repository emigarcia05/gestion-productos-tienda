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

type ProveedorOption = {
  id: string;
  nombre: string;
  prefijo: string;
  coeficienteTintometrico: number;
};

interface Props {
  proveedores: ProveedorOption[];
  esEditor: boolean;
}

function parseMonto(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatMonto(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PxTintoCalculoLtsPageClient({
  proveedores,
  esEditor,
}: Props) {
  const router = useRouter();
  const [proveedor, setProveedor] = useState<string>("");
  const [pxCompra, setPxCompra] = useState<string>("");
  const [editarCoefOpen, setEditarCoefOpen] = useState(false);
  const proveedoresConCoefMayorAUno = useMemo(
    () => proveedores.filter((p) => p.coeficienteTintometrico > 1),
    [proveedores]
  );

  const pxListaTienda = useMemo(() => {
    const base = parseMonto(pxCompra);
    if (!proveedor) return formatMonto(base);
    const coef =
      proveedoresConCoefMayorAUno.find((p) => p.prefijo === proveedor)
        ?.coeficienteTintometrico ?? 1;
    return formatMonto(base * coef);
  }, [pxCompra, proveedor, proveedoresConCoefMayorAUno]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <EditarCoeficientesModal
        open={editarCoefOpen}
        onOpenChange={setEditarCoefOpen}
        proveedores={proveedores}
        onSaved={() => router.refresh()}
      />
      <SectionHeader
        titulo="Lista Tienda"
        subtitulo="Px. Tinto. / Cal. Lts"
      />

      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 contenedor-pagina-con-filtros">
        <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="min-h-0 rounded-lg border border-border bg-card p-4">
            <div className="flex h-full min-h-0 flex-col gap-3">
              <h2 className="text-center text-sm font-semibold uppercase text-foreground">
                CÁLCULO DE PX TINTOMÉTRICO
              </h2>

              <div className="grid grid-cols-[11rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Proveedor
                </span>
                <div className="min-w-0">
                  <Select
                    value={proveedor || "none"}
                    onValueChange={(value) =>
                      setProveedor(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      className={cn(SELECT_TRIGGER_FILTER_CLASS, "h-10")}
                    >
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
                        <SelectItem key={item.prefijo} value={item.prefijo}>
                          [{item.prefijo}] {item.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Px. Compra
                </span>
                <Input
                  value={pxCompra}
                  onChange={(e) =>
                    setPxCompra(e.target.value.replace(/[^0-9,.\s]/g, ""))
                  }
                  placeholder="0,00"
                  inputMode="decimal"
                  className="h-10 text-center"
                  aria-label="Px.Compra"
                />

                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Px Lista Tienda
                </span>
                <div className="h-10 rounded-md border border-border bg-background px-3 text-sm tabular-nums text-foreground flex items-center justify-center">
                  {pxListaTienda || "0,00"}
                </div>
              </div>

              {esEditor ? (
                <div className="pt-1">
                  <Button type="button" variant="outline" onClick={() => setEditarCoefOpen(true)}>
                    Editar Coeficientes
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="min-h-0 rounded-lg border border-border bg-card p-4" />
        </div>
      </div>
    </div>
  );
}
