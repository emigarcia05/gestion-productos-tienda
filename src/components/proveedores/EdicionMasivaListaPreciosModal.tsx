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

interface MarcaOption {
  id: string;
  nombre: string;
}

interface RubroOption {
  id: string;
  nombre: string;
}

const CAMPOS_NUMERICOS: { key: keyof ActualizacionMasivaListaPrecios; label: string }[] = [
  { key: "dtoProveedor", label: "DESC. PROVEEDOR (%)" },
  { key: "dtoMarca", label: "DESC. MARCA (%)" },
  { key: "dtoRubro", label: "DESC. RUBRO (%)" },
  { key: "dtoCantidad", label: "DESC. CANTIDAD (%)" },
  { key: "dtoFinanciero", label: "DESC. FINAN. (%)" },
  { key: "cxTransporte", label: "CX. TRANSPORTE (%)" },
  { key: "cotizacionDolar", label: "COTIZACIÓN DÓLAR" },
];

const VALORES_VACIOS: ActualizacionMasivaListaPrecios = {
  dtoProveedor: undefined,
  dtoMarca: undefined,
  dtoRubro: undefined,
  dtoCantidad: undefined,
  dtoFinanciero: undefined,
  cxTransporte: undefined,
  cotizacionDolar: undefined,
};

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

function valoresDesdeFila(fila: FilaListaPrecioParaCliente) {
  return {
    marcaNombre: fila.marca ?? "",
    rubroNombre: fila.rubro ?? "",
    values: {
      dtoProveedor: fila.dtoProveedor,
      dtoMarca: fila.dtoMarca,
      dtoRubro: fila.dtoRubro,
      dtoCantidad: fila.dtoCantidad,
      dtoFinanciero: fila.dtoFinanciero,
      cxTransporte: fila.cxTransporte,
      cotizacionDolar: undefined,
    },
    pxListaProveedor: String(Math.round(Number(fila.pxListaProveedor) || 0)),
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
  const [values, setValues] = useState<ActualizacionMasivaListaPrecios>(VALORES_VACIOS);
  const [pxListaProveedor, setPxListaProveedor] = useState("");
  const filaActual = filaMode ? props.fila : null;

  const filteredIds = filaMode
    ? filaActual
      ? [filaActual.id]
      : []
    : props.filteredIds;

  useEffect(() => {
    if (!filaMode || !open || !filaActual) return;
    const inicial = valoresDesdeFila(filaActual);
    setMarcaNombre(inicial.marcaNombre);
    setRubroNombre(inicial.rubroNombre);
    setValues(inicial.values);
    setPxListaProveedor(inicial.pxListaProveedor);
  }, [filaMode, open, filaActual]);

  function resetForm() {
    setMarcaNombre("");
    setRubroNombre("");
    setValues(VALORES_VACIOS);
    setPxListaProveedor("");
  }

  function handleChange(key: keyof ActualizacionMasivaListaPrecios, value: string) {
    const num = value === "" ? undefined : parseInt(value, 10);
    if (num !== undefined && (Number.isNaN(num) || num < 0)) return;
    setValues((prev) => ({ ...prev, [key]: num }));
  }

  function buildPayload(): ActualizacionMasivaListaPrecios {
    const data: ActualizacionMasivaListaPrecios = {};
    if (marcaNombre) data.marca = marcaNombre;
    if (rubroNombre) data.rubro = rubroNombre;
    if (values.dtoProveedor !== undefined && !Number.isNaN(values.dtoProveedor))
      data.dtoProveedor = values.dtoProveedor;
    if (values.dtoMarca !== undefined && !Number.isNaN(values.dtoMarca)) data.dtoMarca = values.dtoMarca;
    if (values.dtoRubro !== undefined && !Number.isNaN(values.dtoRubro)) data.dtoRubro = values.dtoRubro;
    if (values.dtoCantidad !== undefined && !Number.isNaN(values.dtoCantidad))
      data.dtoCantidad = values.dtoCantidad;
    if (values.dtoFinanciero !== undefined && !Number.isNaN(values.dtoFinanciero))
      data.dtoFinanciero = values.dtoFinanciero;
    if (values.cxTransporte !== undefined && !Number.isNaN(values.cxTransporte))
      data.cxTransporte = values.cxTransporte;
    if (
      values.cotizacionDolar !== undefined &&
      !Number.isNaN(values.cotizacionDolar) &&
      values.cotizacionDolar > 0
    )
      data.cotizacionDolar = values.cotizacionDolar;

    if (filaMode) {
      const px = parsePxListaProveedor(pxListaProveedor);
      if (px !== undefined) data.pxListaProveedor = px;
    }

    return data;
  }

  async function handleGuardar() {
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
        {CAMPOS_NUMERICOS.map(({ key, label }) => (
          <div key={key} className="grid grid-cols-[1.5fr_minmax(0,1fr)] gap-2 items-center py-1">
            <Label htmlFor={key} className="text-right font-medium">
              {label}
            </Label>
            <Input
              id={key}
              type="number"
              min={key === "cotizacionDolar" ? 1 : 0}
              max={key === "cotizacionDolar" ? undefined : 100}
              step={1}
              placeholder="—"
              value={values[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              className="tabular-nums border-primary"
            />
          </div>
        ))}
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
