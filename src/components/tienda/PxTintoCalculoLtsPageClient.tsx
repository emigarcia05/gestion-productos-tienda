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
import GestionTiposPinturaModal from "@/components/tienda/GestionTiposPinturaModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TipoPinturaRendimiento } from "@/actions/tiposPinturaRendimientos";
import { Plus, Trash2 } from "lucide-react";

type ProveedorOption = {
  id: string;
  nombre: string;
  prefijo: string;
  coeficienteTintometrico: number;
};

interface Props {
  proveedores: ProveedorOption[];
  tiposPintura: TipoPinturaRendimiento[];
  esEditor: boolean;
}

type FormaCalculoLts = "POR_PAREDES" | "POR_MODULO" | "PILETA";

type FilaPared = {
  id: string;
  cantParedes: string;
  largoPared: string;
  anchoPared: string;
};

function parseMonto(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatMonto(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function roundToNearestHundred(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / 100) * 100;
}

function parseDecimalInput(value: string): number {
  const normalized = value.replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatDecimal(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function crearFilaParedVacia(): FilaPared {
  return {
    id: `pared-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cantParedes: "",
    largoPared: "",
    anchoPared: "",
  };
}

export default function PxTintoCalculoLtsPageClient({
  proveedores,
  tiposPintura,
  esEditor,
}: Props) {
  const router = useRouter();
  const [proveedor, setProveedor] = useState<string>("");
  const [pxCompra, setPxCompra] = useState<string>("");
  const [editarCoefOpen, setEditarCoefOpen] = useState(false);
  const [gestionarTiposOpen, setGestionarTiposOpen] = useState(false);
  const [formaCalculo, setFormaCalculo] = useState<FormaCalculoLts>("POR_PAREDES");
  const [tipoPinturaId, setTipoPinturaId] = useState<string>("");
  const [filasPared, setFilasPared] = useState<FilaPared[]>([crearFilaParedVacia()]);
  const proveedoresConCoefMayorAUno = useMemo(
    () => proveedores.filter((p) => p.coeficienteTintometrico > 1),
    [proveedores]
  );

  const pxListaTienda = useMemo(() => {
    const base = Math.round(parseMonto(pxCompra));
    if (!proveedor) return formatMonto(roundToNearestHundred(base));
    const coef =
      proveedoresConCoefMayorAUno.find((p) => p.prefijo === proveedor)
        ?.coeficienteTintometrico ?? 1;
    return formatMonto(roundToNearestHundred(base * coef));
  }, [pxCompra, proveedor, proveedoresConCoefMayorAUno]);

  const rendimientoSeleccionado = useMemo(() => {
    if (!tipoPinturaId) return 0;
    const row = tiposPintura.find((t) => t.id === tipoPinturaId);
    return row ? Number(row.rendimiento) : 0;
  }, [tipoPinturaId, tiposPintura]);

  function actualizarFilaPared(
    id: string,
    campo: "cantParedes" | "largoPared" | "anchoPared",
    value: string
  ) {
    const sanitized = value.replace(/[^\d.,]/g, "");
    setFilasPared((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [campo]: sanitized } : row))
    );
  }

  function agregarFilaPared() {
    setFilasPared((prev) => [...prev, crearFilaParedVacia()]);
  }

  function eliminarFilaPared(id: string) {
    setFilasPared((prev) =>
      prev.length <= 1 ? [crearFilaParedVacia()] : prev.filter((row) => row.id !== id)
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <EditarCoeficientesModal
        open={editarCoefOpen}
        onOpenChange={setEditarCoefOpen}
        proveedores={proveedores}
        onSaved={() => router.refresh()}
      />
      <GestionTiposPinturaModal
        open={gestionarTiposOpen}
        onOpenChange={setGestionarTiposOpen}
        rows={tiposPintura}
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
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-center text-sm font-semibold uppercase text-foreground">
                  CÁLCULO DE PX TINTOMÉTRICO
                </h2>
                <span className="h-0.5 w-[70%] rounded-full bg-primary" aria-hidden />
              </div>

              <div className="grid grid-cols-[11rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                <span className="text-xs font-semibold uppercase text-foreground">
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

                <span className="text-xs font-semibold uppercase text-foreground">
                  Px. Compra
                </span>
                <Input
                  value={pxCompra}
                  onChange={(e) =>
                    setPxCompra(e.target.value.replace(/\D/g, ""))
                  }
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

          <section className="min-h-0 rounded-lg border border-border bg-card p-4">
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-center text-sm font-semibold uppercase text-foreground">
                  CALCULO DE LTS
                </h2>
                <span className="h-0.5 w-[70%] rounded-full bg-primary" aria-hidden />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                  value={formaCalculo}
                  onValueChange={(value) => setFormaCalculo(value as FormaCalculoLts)}
                >
                  <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "h-10")}>
                    <SelectValue placeholder="FORMA DE CÁLCULO" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    <SelectItem value="POR_PAREDES">Por Paredes</SelectItem>
                    <SelectItem value="POR_MODULO">Por Módulo</SelectItem>
                    <SelectItem value="PILETA">Pileta</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={tipoPinturaId || "none"}
                  onValueChange={(value) =>
                    setTipoPinturaId(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "h-10")}>
                    <SelectValue placeholder="TIPO DE PINTURA" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    <SelectItem value="none">TIPO DE PINTURA</SelectItem>
                    {tiposPintura.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {row.tipoPintura}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background">
                <div className="h-full min-h-0 overflow-y-auto no-scrollbar">
                  {formaCalculo === "POR_PAREDES" ? (
                    <Table variant="compact" scrollX={false}>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[10%]">CANT. PAREDES</TableHead>
                          <TableHead className="w-[16%]">LARGO PARED</TableHead>
                          <TableHead className="w-[16%]">ANCHO PARED</TableHead>
                          <TableHead className="w-[16%]">MTS2</TableHead>
                          <TableHead className="w-[16%]">LTS 1 MANO</TableHead>
                          <TableHead className="w-[16%]">LTS 2 MANOS</TableHead>
                          <TableHead className="w-[10%] tabla-bloque-secundario-head-divider">
                            ACCIONES
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filasPared.map((row) => {
                          const cantParedes = parseDecimalInput(row.cantParedes);
                          const largo = parseDecimalInput(row.largoPared);
                          const ancho = parseDecimalInput(row.anchoPared);
                          const mts2 = cantParedes * largo * ancho;
                          const lts1Mano =
                            rendimientoSeleccionado > 0
                              ? mts2 / rendimientoSeleccionado
                              : 0;
                          const lts2Manos = lts1Mano * 2;

                          return (
                            <TableRow key={row.id}>
                              <TableCell className="celda-datos">
                                <Input
                                  value={row.cantParedes}
                                  onChange={(e) =>
                                    actualizarFilaPared(
                                      row.id,
                                      "cantParedes",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-center"
                                  inputMode="decimal"
                                  placeholder="0,0"
                                  aria-label="Cantidad de paredes"
                                />
                              </TableCell>
                              <TableCell className="celda-datos">
                                <Input
                                  value={row.largoPared}
                                  onChange={(e) =>
                                    actualizarFilaPared(
                                      row.id,
                                      "largoPared",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-center"
                                  inputMode="decimal"
                                  placeholder="0,0"
                                  aria-label="Largo de pared"
                                />
                              </TableCell>
                              <TableCell className="celda-datos">
                                <Input
                                  value={row.anchoPared}
                                  onChange={(e) =>
                                    actualizarFilaPared(
                                      row.id,
                                      "anchoPared",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-center"
                                  inputMode="decimal"
                                  placeholder="0,0"
                                  aria-label="Ancho de pared"
                                />
                              </TableCell>
                              <TableCell className="celda-datos text-center tabular-nums">
                                {formatDecimal(mts2)}
                              </TableCell>
                              <TableCell className="celda-datos text-center tabular-nums">
                                {formatDecimal(lts1Mano)}
                              </TableCell>
                              <TableCell className="celda-datos text-center tabular-nums">
                                {formatDecimal(lts2Manos)}
                              </TableCell>
                              <TableCell className="celda-datos tabla-bloque-secundario-cell-divider">
                                <div className="flex items-center justify-center">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-xs"
                                    onClick={() => eliminarFilaPared(row.id)}
                                    aria-label="Eliminar fila"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex h-full min-h-[12rem] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
                      Esta forma de cálculo se implementará en el siguiente paso.
                    </div>
                  )}
                </div>
              </div>
              {formaCalculo === "POR_PAREDES" ? (
                <div className="flex justify-center">
                  <Button type="button" variant="outline" onClick={agregarFilaPared}>
                    <Plus className="h-4 w-4" />
                    +
                  </Button>
                </div>
              ) : null}
              {esEditor ? (
                <div className="flex justify-center pt-1">
                  <Button type="button" onClick={() => setGestionarTiposOpen(true)}>
                    EDITAR RENDIMIENTOS
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
