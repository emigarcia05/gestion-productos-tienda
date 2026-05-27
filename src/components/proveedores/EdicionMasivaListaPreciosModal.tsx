"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  actualizarListaPreciosMasivoAction,
  type ActualizacionMasivaListaPrecios,
  type FilaListaPrecioParaCliente,
} from "@/actions/listaPrecios";
import {
  formatPorcentaje0a100Input,
  parsePorcentaje0a100Input,
} from "@/lib/format";

interface MarcaOption {
  id: string;
  nombre: string;
}

interface RubroOption {
  id: string;
  nombre: string;
}

type PercentKey = keyof Pick<
  ActualizacionMasivaListaPrecios,
  "dtoProveedor" | "dtoMarca" | "dtoRubro" | "dtoCantidad" | "dtoFinanciero" | "cxTransporte"
>;

const CAMPOS_PORCENTAJE: { key: PercentKey; label: string }[] = [
  { key: "dtoProveedor", label: "DESC. PROVEEDOR (%)" },
  { key: "dtoMarca", label: "DESC. MARCA (%)" },
  { key: "dtoRubro", label: "DESC. RUBRO (%)" },
  { key: "dtoCantidad", label: "DESC. CANTIDAD (%)" },
  { key: "dtoFinanciero", label: "DESC. FINAN. (%)" },
  { key: "cxTransporte", label: "CX. TRANSPORTE (%)" },
];

const PERCENT_INPUT_PATTERN = /^\d{0,3}([.,]\d{0,2})?$/;

interface BaseProps {
  marcas: MarcaOption[];
  rubros: RubroOption[];
  onSuccess?: () => void;
}

interface MasivaProps extends BaseProps {
  mode?: "masiva";
  filteredIds: string[];
  disabled?: boolean;
}

interface FilaProps extends BaseProps {
  mode: "fila";
  fila: FilaListaPrecioParaCliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Props = MasivaProps | FilaProps;

function isFilaMode(props: Props): props is FilaProps {
  return props.mode === "fila";
}

function parsePxListaProveedor(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

function percentInputsDesdeFila(fila: FilaListaPrecioParaCliente): Partial<Record<PercentKey, string>> {
  return {
    dtoProveedor: formatPorcentaje0a100Input(fila.dtoProveedor),
    dtoMarca: formatPorcentaje0a100Input(fila.dtoMarca),
    dtoRubro: formatPorcentaje0a100Input(fila.dtoRubro),
    dtoCantidad: formatPorcentaje0a100Input(fila.dtoCantidad),
    dtoFinanciero: formatPorcentaje0a100Input(fila.dtoFinanciero),
    cxTransporte: formatPorcentaje0a100Input(fila.cxTransporte),
  };
}

export default function EdicionMasivaListaPreciosModal(props: Props) {
  const { marcas, rubros, onSuccess } = props;
  const filaMode = isFilaMode(props);

  const [openMasiva, setOpenMasiva] = useState(false);
  const open = filaMode ? props.open : openMasiva;
  const setOpen = filaMode ? props.onOpenChange : setOpenMasiva;

  const [pending, setPending] = useState(false);
  const [marcaNombre, setMarcaNombre] = useState("");
  const [rubroNombre, setRubroNombre] = useState("");
  const [percentInputs, setPercentInputs] = useState<Partial<Record<PercentKey, string>>>({});
  const [cotizacionDolar, setCotizacionDolar] = useState("");
  const [pxListaProveedor, setPxListaProveedor] = useState("");
  const filaActual = filaMode ? props.fila : null;

  const filteredIds = filaMode
    ? filaActual
      ? [filaActual.id]
      : []
    : props.filteredIds;

  useEffect(() => {
    if (!filaMode || !open || !filaActual) return;
    setMarcaNombre(filaActual.marca ?? "");
    setRubroNombre(filaActual.rubro ?? "");
    setPercentInputs(percentInputsDesdeFila(filaActual));
    setCotizacionDolar("");
    setPxListaProveedor(String(Math.round(Number(filaActual.pxListaProveedor) || 0)));
  }, [filaMode, open, filaActual]);

  function resetForm() {
    setMarcaNombre("");
    setRubroNombre("");
    setPercentInputs({});
    setCotizacionDolar("");
    setPxListaProveedor("");
  }

  function handlePercentInputChange(key: PercentKey, raw: string) {
    const trimmed = raw.trim();
    if (trimmed !== "" && !PERCENT_INPUT_PATTERN.test(trimmed)) return;
    setPercentInputs((prev) => ({ ...prev, [key]: raw }));
  }

  function validatePercentInputs(): string | null {
    for (const { key, label } of CAMPOS_PORCENTAJE) {
      const raw = percentInputs[key];
      if (raw === undefined || raw.trim() === "") continue;
      const parsed = parsePorcentaje0a100Input(raw);
      if (parsed === undefined) {
        return `${label}: ingresá un valor entre 0 y 100 con hasta 2 decimales.`;
      }
    }
    return null;
  }

  function buildPayload(): ActualizacionMasivaListaPrecios {
    const data: ActualizacionMasivaListaPrecios = {};
    if (marcaNombre) data.marca = marcaNombre;
    if (rubroNombre) data.rubro = rubroNombre;

    for (const { key } of CAMPOS_PORCENTAJE) {
      const raw = percentInputs[key];
      if (raw === undefined || raw.trim() === "") continue;
      const parsed = parsePorcentaje0a100Input(raw);
      if (parsed !== undefined) data[key] = parsed;
    }

    const cotizacion = parsePxListaProveedor(cotizacionDolar);
    if (cotizacion !== undefined && cotizacion > 0) data.cotizacionDolar = cotizacion;

    if (filaMode) {
      const px = parsePxListaProveedor(pxListaProveedor);
      if (px !== undefined) data.pxListaProveedor = px;
    }

    return data;
  }

  async function handleGuardar() {
    const percentError = validatePercentInputs();
    if (percentError) {
      toast.error(percentError);
      return;
    }

    const data = buildPayload();
    if (Object.keys(data).length === 0) {
      toast.error("Ingresá al menos un valor para actualizar.");
      return;
    }
    if (filteredIds.length === 0) {
      toast.error("No hay producto seleccionado.");
      return;
    }
    setPending(true);
    try {
      const result = await actualizarListaPreciosMasivoAction(filteredIds, data);
      if (!result.ok) {
        toast.error(result.error ?? "Error al actualizar.");
        return;
      }
      const n = result.data?.actualizados ?? 0;
      toast.success(
        filaMode
          ? "Producto actualizado."
          : `Se actualizaron ${n} producto${n !== 1 ? "s" : ""}.`
      );
      setOpen(false);
      resetForm();
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  const cantidad = filteredIds.length;
  const titulo = filaMode ? "Editar producto" : "Edición Masiva";

  const formulario = (
    <div className="flex flex-col gap-4">
      {!filaMode && (
        <p className="text-sm">
          Se aplicará a los <strong>{cantidad.toLocaleString()}</strong> producto
          {cantidad !== 1 ? "s" : ""} del filtro actual.
        </p>
      )}
      {filaMode && props.fila && (
        <p className="text-sm">
          <strong>{props.fila.codExt}</strong>
          {" — "}
          {props.fila.descripcionProveedor}
        </p>
      )}

      <div className="grid gap-0 py-1">
        {filaMode && (
          <div className="grid grid-cols-[1.5fr_minmax(0,1fr)] gap-2 items-center py-1">
            <Label htmlFor="pxListaProveedor" className="text-right font-medium">
              PX. LISTA PROVEEDOR
            </Label>
            <Input
              id="pxListaProveedor"
              type="number"
              min={0}
              step={1}
              placeholder="—"
              value={pxListaProveedor}
              onChange={(e) => setPxListaProveedor(e.target.value)}
              className="tabular-nums border-primary"
            />
          </div>
        )}
        <div className="grid grid-cols-[1.5fr_minmax(0,1fr)] gap-2 items-center py-1">
          <Label htmlFor="marca" className="text-right font-medium">
            MARCA
          </Label>
          <Select value={marcaNombre || "none"} onValueChange={(v) => setMarcaNombre(v === "none" ? "" : v)}>
            <SelectTrigger id="marca" className="input-filtro-unificado tabular-nums border-primary">
              <SelectValue placeholder="SELECCIONAR MARCA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {marcas.map((m) => (
                <SelectItem key={m.id} value={m.nombre}>
                  {m.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-[1.5fr_minmax(0,1fr)] gap-2 items-center py-1">
          <Label htmlFor="rubro" className="text-right font-medium">
            RUBRO
          </Label>
          <Select value={rubroNombre || "none"} onValueChange={(v) => setRubroNombre(v === "none" ? "" : v)}>
            <SelectTrigger id="rubro" className="input-filtro-unificado tabular-nums border-primary">
              <SelectValue placeholder="SELECCIONAR RUBRO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {rubros.map((r) => (
                <SelectItem key={r.id} value={r.nombre}>
                  {r.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {CAMPOS_PORCENTAJE.map(({ key, label }) => (
          <div key={key} className="grid grid-cols-[1.5fr_minmax(0,1fr)] gap-2 items-center py-1">
            <Label htmlFor={key} className="text-right font-medium">
              {label}
            </Label>
            <Input
              id={key}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={percentInputs[key] ?? ""}
              onChange={(e) => handlePercentInputChange(key, e.target.value)}
              className="tabular-nums border-primary"
            />
          </div>
        ))}
        <p id="dtoProveedor-hint" className="col-span-2 text-xs text-muted-foreground text-right">
          Porcentajes: 0 a 100, hasta 2 decimales.
        </p>
        <div className="grid grid-cols-[1.5fr_minmax(0,1fr)] gap-2 items-center py-1">
          <Label htmlFor="cotizacionDolar" className="text-right font-medium">
            COTIZACIÓN DÓLAR
          </Label>
          <Input
            id="cotizacionDolar"
            type="number"
            min={1}
            step={1}
            placeholder="—"
            value={cotizacionDolar}
            onChange={(e) => setCotizacionDolar(e.target.value)}
            className="tabular-nums border-primary"
          />
        </div>
      </div>
    </div>
  );

  if (filaMode) {
    if (!props.fila) return null;
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <AppModal
          title={titulo}
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleGuardar} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </>
          }
        >
          {formulario}
        </AppModal>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="default"
          size="default"
          className="btn-primario-gestion gap-2 shrink-0"
          disabled={props.disabled || cantidad === 0}
        >
          <Pencil className="h-4 w-4 shrink-0" />
          Edición Masiva
        </Button>
      </DialogTrigger>
      <AppModal
        title={titulo}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGuardar} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </>
        }
      >
        {formulario}
      </AppModal>
    </Dialog>
  );
}
