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
import GestionTiposPinturaModal from "@/components/tienda/GestionTiposPinturaModal";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TipoPinturaRendimiento } from "@/actions/tiposPinturaRendimientos";
import {
  crearFilaParedVacia,
  formatDecimal,
  parseDecimalInput,
  type FilaParedLts,
} from "@/lib/tiendaCalculosLts";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  tiposPintura: TipoPinturaRendimiento[];
  esEditor: boolean;
}

type FormaCalculoLts = "POR_PAREDES" | "POR_MODULO" | "PILETA";

export default function TiendaCalcLitrosPageClient({
  tiposPintura,
  esEditor,
}: Props) {
  const router = useRouter();
  const [gestionarTiposOpen, setGestionarTiposOpen] = useState(false);
  const [formaCalculo, setFormaCalculo] = useState<FormaCalculoLts>("POR_PAREDES");
  const [tipoPinturaId, setTipoPinturaId] = useState<string>("");
  const [filasPared, setFilasPared] = useState<FilaParedLts[]>([crearFilaParedVacia()]);
  const [moduloLargo, setModuloLargo] = useState<string>("");
  const [moduloAncho, setModuloAncho] = useState<string>("");
  const [moduloAlto, setModuloAlto] = useState<string>("");
  const [moduloIncluyeTecho, setModuloIncluyeTecho] = useState<boolean>(false);

  const rendimientoSeleccionado = useMemo(() => {
    if (!tipoPinturaId) return 0;
    const row = tiposPintura.find((t) => t.id === tipoPinturaId);
    return row ? Number(row.rendimiento) : 0;
  }, [tipoPinturaId, tiposPintura]);

  const totalesPared = useMemo(() => {
    return filasPared.reduce(
      (acc, row) => {
        const cantParedes = parseDecimalInput(row.cantParedes);
        const largo = parseDecimalInput(row.largoPared);
        const ancho = parseDecimalInput(row.anchoPared);
        const mts2 = cantParedes * largo * ancho;
        const lts1Mano = rendimientoSeleccionado > 0 ? mts2 / rendimientoSeleccionado : 0;
        const lts2Manos = lts1Mano * 2;

        return {
          mts2: acc.mts2 + mts2,
          lts1Mano: acc.lts1Mano + lts1Mano,
          lts2Manos: acc.lts2Manos + lts2Manos,
        };
      },
      { mts2: 0, lts1Mano: 0, lts2Manos: 0 }
    );
  }, [filasPared, rendimientoSeleccionado]);

  const resumenModulo = useMemo(() => {
    const largo = parseDecimalInput(moduloLargo);
    const ancho = parseDecimalInput(moduloAncho);
    const alto = parseDecimalInput(moduloAlto);

    const mts2ParedLargoAlto = largo * alto;
    const mts2ParedAnchoAlto = ancho * alto;
    const mts2Techo = moduloIncluyeTecho ? largo * ancho : 0;

    function ltsDesdeMts2(mts2: number) {
      const l1 = rendimientoSeleccionado > 0 ? mts2 / rendimientoSeleccionado : 0;
      return { lts1: l1, lts2: l1 * 2 };
    }

    const p12 = ltsDesdeMts2(mts2ParedLargoAlto);
    const p34 = ltsDesdeMts2(mts2ParedAnchoAlto);
    const techo = ltsDesdeMts2(mts2Techo);

    const filas = [
      { label: "PARED 1", mts2: mts2ParedLargoAlto, lts1: p12.lts1, lts2: p12.lts2 },
      { label: "PARED 2", mts2: mts2ParedLargoAlto, lts1: p12.lts1, lts2: p12.lts2 },
      { label: "PARED 3", mts2: mts2ParedAnchoAlto, lts1: p34.lts1, lts2: p34.lts2 },
      { label: "PARED 4", mts2: mts2ParedAnchoAlto, lts1: p34.lts1, lts2: p34.lts2 },
      { label: "TECHOS", mts2: mts2Techo, lts1: techo.lts1, lts2: techo.lts2 },
    ];

    const total = filas.reduce(
      (acc, row) => ({
        mts2: acc.mts2 + row.mts2,
        lts1: acc.lts1 + row.lts1,
        lts2: acc.lts2 + row.lts2,
      }),
      { mts2: 0, lts1: 0, lts2: 0 }
    );

    return { filas, total };
  }, [moduloLargo, moduloAncho, moduloAlto, moduloIncluyeTecho, rendimientoSeleccionado]);

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
      <GestionTiposPinturaModal
        open={gestionarTiposOpen}
        onOpenChange={setGestionarTiposOpen}
        rows={tiposPintura}
        onSaved={() => router.refresh()}
      />
      <SectionHeader titulo="Lista Tienda" subtitulo="Calc. Litros" />

      <div className="flex-1 overflow-hidden w-full px-4 sm:px-6 lg:px-8 contenedor-pagina-con-filtros">
        <section className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card p-4">
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
                  <SelectItem value="POR_PAREDES">POR PAREDES</SelectItem>
                  <SelectItem value="POR_MODULO">POR MÓDULO</SelectItem>
                  <SelectItem value="PILETA">PILETA</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={tipoPinturaId || "none"}
                onValueChange={(value) => setTipoPinturaId(value === "none" ? "" : value)}
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
                          rendimientoSeleccionado > 0 ? mts2 / rendimientoSeleccionado : 0;
                        const lts2Manos = lts1Mano * 2;

                        return (
                          <TableRow key={row.id}>
                            <TableCell className="celda-datos">
                              <Input
                                value={row.cantParedes}
                                onChange={(e) =>
                                  actualizarFilaPared(row.id, "cantParedes", e.target.value)
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
                                  actualizarFilaPared(row.id, "largoPared", e.target.value)
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
                                  actualizarFilaPared(row.id, "anchoPared", e.target.value)
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
                    <TableFooter className="border-t border-border/60 bg-background">
                      <TableRow className="hover:bg-background odd:bg-background even:bg-background">
                        <TableCell className="celda-datos text-right font-semibold" colSpan={3}>
                          TOTAL
                        </TableCell>
                        <TableCell className="celda-datos text-center tabular-nums font-semibold">
                          {formatDecimal(totalesPared.mts2)}
                        </TableCell>
                        <TableCell className="celda-datos text-center tabular-nums font-semibold">
                          {formatDecimal(totalesPared.lts1Mano)}
                        </TableCell>
                        <TableCell className="celda-datos text-center tabular-nums font-semibold">
                          {formatDecimal(totalesPared.lts2Manos)}
                        </TableCell>
                        <TableCell className="celda-datos tabla-bloque-secundario-cell-divider" />
                      </TableRow>
                    </TableFooter>
                  </Table>
                ) : formaCalculo === "POR_MODULO" ? (
                  <div className="flex h-full min-h-0 flex-col gap-2 p-2">
                    <Table variant="compact" scrollX={false}>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[22%]">LARGO</TableHead>
                          <TableHead className="w-[22%]">ANCHO</TableHead>
                          <TableHead className="w-[22%]">ALTO</TableHead>
                          <TableHead className="w-[34%]">INCLUYE TECHO</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="celda-datos">
                            <Input
                              value={moduloLargo}
                              onChange={(e) =>
                                setModuloLargo(e.target.value.replace(/[^\d.,]/g, ""))
                              }
                              className="h-8 text-center"
                              inputMode="decimal"
                              placeholder="0,0"
                              aria-label="Largo módulo"
                            />
                          </TableCell>
                          <TableCell className="celda-datos">
                            <Input
                              value={moduloAncho}
                              onChange={(e) =>
                                setModuloAncho(e.target.value.replace(/[^\d.,]/g, ""))
                              }
                              className="h-8 text-center"
                              inputMode="decimal"
                              placeholder="0,0"
                              aria-label="Ancho módulo"
                            />
                          </TableCell>
                          <TableCell className="celda-datos">
                            <Input
                              value={moduloAlto}
                              onChange={(e) =>
                                setModuloAlto(e.target.value.replace(/[^\d.,]/g, ""))
                              }
                              className="h-8 text-center"
                              inputMode="decimal"
                              placeholder="0,0"
                              aria-label="Alto módulo"
                            />
                          </TableCell>
                          <TableCell className="celda-datos">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={moduloIncluyeTecho}
                                onChange={(e) => setModuloIncluyeTecho(e.target.checked)}
                                className="h-4 w-4 rounded border-border accent-primary"
                                aria-label="Incluye techo"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    <div className="h-px w-full bg-border/60" />

                    <Table variant="compact" scrollX={false}>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">SECTOR</TableHead>
                          <TableHead className="w-[20%]">MTS2</TableHead>
                          <TableHead className="w-[20%]">1 MANO</TableHead>
                          <TableHead className="w-[20%]">2 MANOS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resumenModulo.filas.map((row) => (
                          <TableRow key={row.label}>
                            <TableCell className="celda-datos text-left">{row.label}</TableCell>
                            <TableCell className="celda-datos tabular-nums">
                              {formatDecimal(row.mts2)}
                            </TableCell>
                            <TableCell className="celda-datos tabular-nums">
                              {formatDecimal(row.lts1)}
                            </TableCell>
                            <TableCell className="celda-datos tabular-nums">
                              {formatDecimal(row.lts2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter className="border-t border-border/60 bg-background">
                        <TableRow className="hover:bg-background odd:bg-background even:bg-background">
                          <TableCell className="celda-datos text-right font-semibold">
                            TOTAL
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums font-semibold">
                            {formatDecimal(resumenModulo.total.mts2)}
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums font-semibold">
                            {formatDecimal(resumenModulo.total.lts1)}
                          </TableCell>
                          <TableCell className="celda-datos tabular-nums font-semibold">
                            {formatDecimal(resumenModulo.total.lts2)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
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
  );
}
