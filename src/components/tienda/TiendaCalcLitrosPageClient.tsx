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
  sanitizeDecimalUnDigito,
  type FilaParedLts,
} from "@/lib/tiendaCalculosLts";
import { Trash2 } from "lucide-react";

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
  const [piletaLargo, setPiletaLargo] = useState<string>("");
  const [piletaAncho, setPiletaAncho] = useState<string>("");
  const [piletaProfundidad, setPiletaProfundidad] = useState<string>("");

  const rendimientoSeleccionado = useMemo(() => {
    if (!tipoPinturaId) return 0;
    const row = tiposPintura.find((t) => t.id === tipoPinturaId);
    return row ? Number(row.rendimiento) : 0;
  }, [tipoPinturaId, tiposPintura]);

  const totalesPared = useMemo(() => {
    return filasPared.reduce(
      (acc, row) => {
        const cant = parseDecimalInput(row.cantidad);
        const largo = parseDecimalInput(row.largo);
        const ancho = parseDecimalInput(row.ancho);
        const mts2 = cant * largo * ancho;
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

  /** POR MÓDULO: MTS y litros desde dimensiones del módulo (fila superior). */
  const calculoModulo = useMemo(() => {
    const L = parseDecimalInput(moduloLargo);
    const A = parseDecimalInput(moduloAncho);
    const H = parseDecimalInput(moduloAlto);
    const R = rendimientoSeleccionado;

    const mtsLargoAlto = L * H;
    const mtsAnchoAlto = A * H;
    const mtsTecho = moduloIncluyeTecho ? L * A : 0;

    function litrosDesdeMts(mts2: number) {
      const l1 = R > 0 ? mts2 / R : 0;
      return { lts1Mano: l1, lts2Manos: l1 * 2 };
    }

    const p12 = litrosDesdeMts(mtsLargoAlto);
    const p34 = litrosDesdeMts(mtsAnchoAlto);
    const techo = litrosDesdeMts(mtsTecho);

    const filas = [
      { id: "modulo-pared-1", label: "Pared 1", mts2: mtsLargoAlto, ...p12 },
      { id: "modulo-pared-2", label: "Pared 2", mts2: mtsLargoAlto, ...p12 },
      { id: "modulo-pared-3", label: "Pared 3", mts2: mtsAnchoAlto, ...p34 },
      { id: "modulo-pared-4", label: "Pared 4", mts2: mtsAnchoAlto, ...p34 },
      { id: "modulo-techo", label: "Techo", mts2: mtsTecho, ...techo },
    ];

    const total = filas.reduce(
      (acc, row) => ({
        mts2: acc.mts2 + row.mts2,
        lts1Mano: acc.lts1Mano + row.lts1Mano,
        lts2Manos: acc.lts2Manos + row.lts2Manos,
      }),
      { mts2: 0, lts1Mano: 0, lts2Manos: 0 }
    );

    return { filas, total };
  }, [
    moduloLargo,
    moduloAncho,
    moduloAlto,
    moduloIncluyeTecho,
    rendimientoSeleccionado,
  ]);

  /** PILETA: igual que POR MÓDULO pero Alto→Profundidad, Techo→Piso (siempre L×A). */
  const calculoPileta = useMemo(() => {
    const L = parseDecimalInput(piletaLargo);
    const A = parseDecimalInput(piletaAncho);
    const P = parseDecimalInput(piletaProfundidad);
    const R = rendimientoSeleccionado;

    const mtsLargoProf = L * P;
    const mtsAnchoProf = A * P;
    const mtsPiso = L * A;

    function litrosDesdeMts(mts2: number) {
      const l1 = R > 0 ? mts2 / R : 0;
      return { lts1Mano: l1, lts2Manos: l1 * 2 };
    }

    const p12 = litrosDesdeMts(mtsLargoProf);
    const p34 = litrosDesdeMts(mtsAnchoProf);
    const piso = litrosDesdeMts(mtsPiso);

    const filas = [
      { id: "pileta-pared-1", label: "Pared 1", mts2: mtsLargoProf, ...p12 },
      { id: "pileta-pared-2", label: "Pared 2", mts2: mtsLargoProf, ...p12 },
      { id: "pileta-pared-3", label: "Pared 3", mts2: mtsAnchoProf, ...p34 },
      { id: "pileta-pared-4", label: "Pared 4", mts2: mtsAnchoProf, ...p34 },
      { id: "pileta-piso", label: "Piso", mts2: mtsPiso, ...piso },
    ];

    const total = filas.reduce(
      (acc, row) => ({
        mts2: acc.mts2 + row.mts2,
        lts1Mano: acc.lts1Mano + row.lts1Mano,
        lts2Manos: acc.lts2Manos + row.lts2Manos,
      }),
      { mts2: 0, lts1Mano: 0, lts2Manos: 0 }
    );

    return { filas, total };
  }, [piletaLargo, piletaAncho, piletaProfundidad, rendimientoSeleccionado]);

  function actualizarFilaPared(
    id: string,
    campo: "cantidad" | "largo" | "ancho",
    value: string
  ) {
    const sanitized = sanitizeDecimalUnDigito(value);
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
                  <>
                  <Table variant="compact" scrollX={false}>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[20%]">SUPERFICIE</TableHead>
                        <TableHead className="w-[15%]">CANT.</TableHead>
                        <TableHead className="w-[15%]">LARGO</TableHead>
                        <TableHead className="w-[15%]">ANCHO</TableHead>
                        <TableHead className="w-[10%]">MTS2</TableHead>
                        <TableHead className="w-[10%]">1 MANO</TableHead>
                        <TableHead className="w-[10%]">2 MANOS</TableHead>
                        <TableHead className="w-[5%] tabla-bloque-secundario-head-divider">
                          ACCIONES
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasPared.map((row, index) => {
                        const cant = parseDecimalInput(row.cantidad);
                        const largo = parseDecimalInput(row.largo);
                        const ancho = parseDecimalInput(row.ancho);
                        const mts2 = cant * largo * ancho;
                        const lts1Mano =
                          rendimientoSeleccionado > 0 ? mts2 / rendimientoSeleccionado : 0;
                        const lts2Manos = lts1Mano * 2;

                        return (
                          <TableRow key={row.id}>
                            <TableCell className="celda-datos text-left font-medium">
                              Pared {index + 1}
                            </TableCell>
                            <TableCell className="celda-datos">
                              <Input
                                value={row.cantidad}
                                onChange={(e) =>
                                  actualizarFilaPared(row.id, "cantidad", e.target.value)
                                }
                                className="h-8 text-center"
                                inputMode="decimal"
                                placeholder="0,0"
                                aria-label="Cantidad"
                              />
                            </TableCell>
                            <TableCell className="celda-datos">
                              <Input
                                value={row.largo}
                                onChange={(e) =>
                                  actualizarFilaPared(row.id, "largo", e.target.value)
                                }
                                className="h-8 text-center"
                                inputMode="decimal"
                                placeholder="0,0"
                                aria-label="Largo"
                              />
                            </TableCell>
                            <TableCell className="celda-datos">
                              <Input
                                value={row.ancho}
                                onChange={(e) =>
                                  actualizarFilaPared(row.id, "ancho", e.target.value)
                                }
                                className="h-8 text-center"
                                inputMode="decimal"
                                placeholder="0,0"
                                aria-label="Ancho"
                              />
                            </TableCell>
                            <TableCell className="celda-datos text-center tabular-nums">
                              {formatDecimal(mts2, 1)} mts2
                            </TableCell>
                            <TableCell className="celda-datos text-center tabular-nums">
                              {formatDecimal(lts1Mano, 1)} lts
                            </TableCell>
                            <TableCell className="celda-datos text-center tabular-nums">
                              {formatDecimal(lts2Manos, 1)} lts
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
                        <TableCell className="celda-datos" colSpan={3} aria-hidden />
                        <TableCell className="celda-datos !text-right font-semibold celda-datos--flush-right">
                          TOTAL
                        </TableCell>
                        <TableCell className="celda-datos text-center tabular-nums font-semibold border-t border-[#0072bb]">
                          {formatDecimal(totalesPared.mts2, 1)} mts2
                        </TableCell>
                        <TableCell className="celda-datos text-center tabular-nums font-semibold border-t border-[#0072bb]">
                          {formatDecimal(totalesPared.lts1Mano, 1)} lts
                        </TableCell>
                        <TableCell className="celda-datos text-center tabular-nums font-semibold border-t border-[#0072bb]">
                          {formatDecimal(totalesPared.lts2Manos, 1)} lts
                        </TableCell>
                        <TableCell className="celda-datos tabla-bloque-secundario-cell-divider" />
                      </TableRow>
                    </TableFooter>
                  </Table>
                  <div className="flex justify-center border-t border-border/60 bg-background py-2">
                    <Button type="button" onClick={agregarFilaPared} aria-label="Agregar pared">
                      +
                    </Button>
                  </div>
                  </>
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
                          <TableHead className="w-[40%]">SUPERFICIE</TableHead>
                          <TableHead className="w-[20%]">MTS2</TableHead>
                          <TableHead className="w-[20%]">1 MANO</TableHead>
                          <TableHead className="w-[20%]">2 MANOS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculoModulo.filas.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="celda-datos text-left font-medium">
                              {row.label}
                            </TableCell>
                            <TableCell className="celda-datos text-center tabular-nums">
                              {formatDecimal(row.mts2, 1)} mts2
                            </TableCell>
                            <TableCell className="celda-datos text-center tabular-nums">
                              {formatDecimal(row.lts1Mano, 1)} lts
                            </TableCell>
                            <TableCell className="celda-datos text-center tabular-nums">
                              {formatDecimal(row.lts2Manos, 1)} lts
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter className="border-t border-border/60 bg-background">
                        <TableRow className="hover:bg-background odd:bg-background even:bg-background">
                          <TableCell className="celda-datos !text-right font-semibold celda-datos--flush-right">
                            TOTAL
                          </TableCell>
                          <TableCell className="celda-datos text-center tabular-nums font-semibold border-t border-[#0072bb]">
                            {formatDecimal(calculoModulo.total.mts2, 1)} mts2
                          </TableCell>
                          <TableCell className="celda-datos text-center tabular-nums font-semibold border-t border-[#0072bb]">
                            {formatDecimal(calculoModulo.total.lts1Mano, 1)} lts
                          </TableCell>
                          <TableCell className="celda-datos text-center tabular-nums font-semibold border-t border-[#0072bb]">
                            {formatDecimal(calculoModulo.total.lts2Manos, 1)} lts
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                ) : formaCalculo === "PILETA" ? (
                  <div className="flex h-full min-h-0 flex-col gap-2 p-2">
                    <Table variant="compact" scrollX={false}>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[22%]">LARGO</TableHead>
                          <TableHead className="w-[22%]">ANCHO</TableHead>
                          <TableHead className="w-[22%]">PROFUNDIDAD</TableHead>
                          <TableHead className="w-[34%]">PISO</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="celda-datos">
                            <Input
                              value={piletaLargo}
                              onChange={(e) =>
                                setPiletaLargo(e.target.value.replace(/[^\d.,]/g, ""))
                              }
                              className="h-8 text-center"
                              inputMode="decimal"
                              placeholder="0,0"
                              aria-label="Largo pileta"
                            />
                          </TableCell>
                          <TableCell className="celda-datos">
                            <Input
                              value={piletaAncho}
                              onChange={(e) =>
                                setPiletaAncho(e.target.value.replace(/[^\d.,]/g, ""))
                              }
                              className="h-8 text-center"
                              inputMode="decimal"
                              placeholder="0,0"
                              aria-label="Ancho pileta"
                            />
                          </TableCell>
                          <TableCell className="celda-datos">
                            <Input
                              value={piletaProfundidad}
                              onChange={(e) =>
                                setPiletaProfundidad(e.target.value.replace(/[^\d.,]/g, ""))
                              }
                              className="h-8 text-center"
                              inputMode="decimal"
                              placeholder="0,0"
                              aria-label="Profundidad pileta"
                            />
                          </TableCell>
                          <TableCell className="celda-datos">
                            <div className="flex items-center justify-center text-xs font-medium text-foreground">
                              Siempre incluido
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    <div className="h-px w-full bg-border/60" />

                    <Table variant="compact" scrollX={false}>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">SUPERFICIE</TableHead>
                          <TableHead className="w-[20%]">MTS2</TableHead>
                          <TableHead className="w-[20%]">1 MANO</TableHead>
                          <TableHead className="w-[20%]">2 MANOS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculoPileta.filas.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="celda-datos text-left font-medium">
                              {row.label}
                            </TableCell>
                            <TableCell className="celda-datos text-center tabular-nums">
                              {formatDecimal(row.mts2, 1)} mts2
                            </TableCell>
                            <TableCell className="celda-datos text-center tabular-nums">
                              {formatDecimal(row.lts1Mano, 1)} lts
                            </TableCell>
                            <TableCell className="celda-datos text-center tabular-nums">
                              {formatDecimal(row.lts2Manos, 1)} lts
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter className="border-t border-border/60 bg-background">
                        <TableRow className="hover:bg-background odd:bg-background even:bg-background">
                          <TableCell className="celda-datos !text-right font-semibold celda-datos--flush-right">
                            TOTAL
                          </TableCell>
                          <TableCell className="celda-datos text-center tabular-nums font-semibold border-t border-[#0072bb]">
                            {formatDecimal(calculoPileta.total.mts2, 1)} mts2
                          </TableCell>
                          <TableCell className="celda-datos text-center tabular-nums font-semibold border-t border-[#0072bb]">
                            {formatDecimal(calculoPileta.total.lts1Mano, 1)} lts
                          </TableCell>
                          <TableCell className="celda-datos text-center tabular-nums font-semibold border-t border-[#0072bb]">
                            {formatDecimal(calculoPileta.total.lts2Manos, 1)} lts
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                ) : null}
              </div>
            </div>
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
