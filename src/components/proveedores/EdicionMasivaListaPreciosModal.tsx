"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import PorcentajeCentInput from "@/components/shared/PorcentajeCentInput";
import MontoArInput from "@/components/shared/MontoArInput";
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
import type { ListaPreciosFiltrosExportSnapshot } from "@/components/proveedores/ExportarListaPreciosButton";
import {
  parsePorcentajeCentNormalized,
  porcentajeCentFromNumber,
} from "@/lib/porcentajeCentMask";
import { montoArNumberToNormalizedString, montoArNormalizedStringToPesosNumber } from "@/lib/montoArMask";
import { roundPrecioListaTienda } from "@/lib/calculos";
import { cn } from "@/lib/utils";

interface MarcaOption {
  id: string;
  nombre: string;
}

interface RubroOption {
  id: string;
  nombre: string;
}

type PercentCentKey = keyof Pick<
  ActualizacionMasivaListaPrecios,
  "dtoProveedor" | "dtoMarca" | "dtoRubro" | "dtoCantidad" | "dtoFinanciero" | "cxTransporte"
>;

const CAMPOS_DESCUENTO_CENT: { key: Exclude<PercentCentKey, "cxTransporte">; label: string }[] = [
  { key: "dtoProveedor", label: "DESC. PROVEEDOR" },
  { key: "dtoMarca", label: "DESC. MARCA" },
  { key: "dtoRubro", label: "DESC. RUBRO" },
  { key: "dtoCantidad", label: "DESC. CANTIDAD" },
  { key: "dtoFinanciero", label: "DESC. FINANCIERO" },
];

const FORM_GRID_CLASS = "grid grid-cols-[1.35fr_minmax(0,1fr)] gap-x-4 gap-y-2 items-center";
const LABEL_CLASS = "text-right font-medium text-sm";
const INPUT_CONTROL_CLASS = "tabular-nums border-primary w-full min-w-0";

function ModalFormDivider() {
  return (
    <div
      className="col-span-2 border-t border-primary/30 my-3"
      role="separator"
      aria-hidden
    />
  );
}

function ModalFormRow({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <Label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </Label>
      <div className="min-w-0">{children}</div>
    </>
  );
}

interface BaseProps {
  marcas: MarcaOption[];
  rubros: RubroOption[];
  onSuccess?: () => void;
}

interface MasivaProps extends BaseProps {
  mode?: "masiva";
  filtrosSnapshot: ListaPreciosFiltrosExportSnapshot;
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

function centInputsDesdeFila(fila: FilaListaPrecioParaCliente): Partial<Record<PercentCentKey, string>> {
  return {
    dtoProveedor: porcentajeCentFromNumber(fila.dtoProveedor),
    dtoMarca: porcentajeCentFromNumber(fila.dtoMarca),
    dtoRubro: porcentajeCentFromNumber(fila.dtoRubro),
    dtoCantidad: porcentajeCentFromNumber(fila.dtoCantidad),
    dtoFinanciero: porcentajeCentFromNumber(fila.dtoFinanciero),
    cxTransporte: porcentajeCentFromNumber(fila.cxTransporte),
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
  const [percentCentNormalized, setPercentCentNormalized] = useState<
    Partial<Record<PercentCentKey, string>>
  >({});
  const [cotizacionDolar, setCotizacionDolar] = useState("");
  const [pxListaProveedorNorm, setPxListaProveedorNorm] = useState("");
  const filaActual = filaMode ? props.fila : null;

  const filtrosSnapshot = filaMode ? null : props.filtrosSnapshot;
  const totalFiltrados =
    filtrosSnapshot?.hasFilterActive && filtrosSnapshot.filtros ? filtrosSnapshot.total : 0;

  const filteredIds = filaMode
    ? filaActual
      ? [filaActual.id]
      : []
    : [];

  useEffect(() => {
    if (!filaMode || !open || !filaActual) return;
    setMarcaNombre(filaActual.marca ?? "");
    setRubroNombre(filaActual.rubro ?? "");
    setPercentCentNormalized(centInputsDesdeFila(filaActual));
    setCotizacionDolar("");
    setPxListaProveedorNorm(montoArNumberToNormalizedString(Number(filaActual.pxListaProveedor) || 0));
  }, [filaMode, open, filaActual]);

  function resetForm() {
    setMarcaNombre("");
    setRubroNombre("");
    setPercentCentNormalized({});
    setCotizacionDolar("");
    setPxListaProveedorNorm("");
  }

  function setPercentCent(key: PercentCentKey, next: string) {
    setPercentCentNormalized((prev) => ({ ...prev, [key]: next }));
  }

  function validatePercentInputs(): string | null {
    const all: { key: PercentCentKey; label: string }[] = [
      ...CAMPOS_DESCUENTO_CENT,
      { key: "cxTransporte", label: "CX. TRANSPORTE" },
    ];
    for (const { key, label } of all) {
      const norm = percentCentNormalized[key];
      if (norm === undefined || norm.trim() === "") continue;
      const parsed = parsePorcentajeCentNormalized(norm);
      if (parsed === undefined) {
        return `${label}: ingresá un valor entre 0 y menor a 100.`;
      }
    }
    return null;
  }

  function applyPercentCentToPayload(
    data: ActualizacionMasivaListaPrecios,
    keys: readonly PercentCentKey[]
  ) {
    for (const key of keys) {
      const norm = percentCentNormalized[key];
      if (norm === undefined || norm.trim() === "") continue;
      const parsed = parsePorcentajeCentNormalized(norm);
      if (parsed !== undefined) data[key] = parsed;
    }
  }

  function buildPayload(): ActualizacionMasivaListaPrecios {
    const data: ActualizacionMasivaListaPrecios = {};
    if (marcaNombre) data.marca = marcaNombre;
    if (rubroNombre) data.rubro = rubroNombre;

    applyPercentCentToPayload(
      data,
      CAMPOS_DESCUENTO_CENT.map((c) => c.key)
    );
    applyPercentCentToPayload(data, ["cxTransporte"]);

    const cotizacion = parsePxListaProveedor(cotizacionDolar);
    if (cotizacion !== undefined) data.cotizacionDolar = cotizacion;

    if (filaMode) {
      const norm = pxListaProveedorNorm.trim();
      if (norm !== "") {
        data.pxListaProveedor = roundPrecioListaTienda(montoArNormalizedStringToPesosNumber(norm));
      }
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
    if (filaMode) {
      if (filteredIds.length === 0) {
        toast.error("No hay producto seleccionado.");
        return;
      }
    } else if (!filtrosSnapshot?.hasFilterActive || !filtrosSnapshot.filtros || totalFiltrados === 0) {
      toast.error("No hay productos en el filtro actual.");
      return;
    }
    setPending(true);
    try {
      const result = await actualizarListaPreciosMasivoAction(
        filaMode
          ? { ids: filteredIds, data }
          : { filtros: filtrosSnapshot!.filtros!, data }
      );
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

  const cantidad = filaMode ? filteredIds.length : totalFiltrados;
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

      <div className={cn(FORM_GRID_CLASS, "py-1")}>
        {filaMode && (
          <>
            <ModalFormRow id="pxListaProveedor" label="PX. LISTA PROVEEDOR">
              <MontoArInput
                id="pxListaProveedor"
                placeholder="—"
                valueNormalized={pxListaProveedorNorm}
                onValueNormalizedChange={setPxListaProveedorNorm}
                treatEmptyNormalizedAsBlank
                className={INPUT_CONTROL_CLASS}
              />
            </ModalFormRow>
            <ModalFormDivider />
          </>
        )}

        <ModalFormRow id="marca" label="MARCA">
          <Select value={marcaNombre || "none"} onValueChange={(v) => setMarcaNombre(v === "none" ? "" : v)}>
            <SelectTrigger id="marca" className={cn("input-filtro-unificado", INPUT_CONTROL_CLASS)}>
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
        </ModalFormRow>

        <ModalFormRow id="rubro" label="RUBRO">
          <Select value={rubroNombre || "none"} onValueChange={(v) => setRubroNombre(v === "none" ? "" : v)}>
            <SelectTrigger id="rubro" className={cn("input-filtro-unificado", INPUT_CONTROL_CLASS)}>
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
        </ModalFormRow>

        <ModalFormDivider />

        {CAMPOS_DESCUENTO_CENT.map(({ key, label }) => (
          <ModalFormRow key={key} id={key} label={label}>
            <PorcentajeCentInput
              id={key}
              placeholder="0,00%"
              valueNormalized={percentCentNormalized[key] ?? ""}
              onValueNormalizedChange={(next) => setPercentCent(key, next)}
              className={INPUT_CONTROL_CLASS}
            />
          </ModalFormRow>
        ))}

        <ModalFormDivider />

        <ModalFormRow id="cxTransporte" label="CX. TRANSPORTE">
          <PorcentajeCentInput
            id="cxTransporte"
            placeholder="0,00%"
            valueNormalized={percentCentNormalized.cxTransporte ?? ""}
            onValueNormalizedChange={(next) => setPercentCent("cxTransporte", next)}
            className={INPUT_CONTROL_CLASS}
          />
        </ModalFormRow>

        <ModalFormDivider />

        <ModalFormRow id="cotizacionDolar" label="COTIZACIÓN DÓLAR">
          <Input
            id="cotizacionDolar"
            type="number"
            min={1}
            step={1}
            placeholder="—"
            value={cotizacionDolar}
            onChange={(e) => setCotizacionDolar(e.target.value)}
            className={INPUT_CONTROL_CLASS}
          />
        </ModalFormRow>
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
          disabled={
            props.disabled ||
            !props.filtrosSnapshot.hasFilterActive ||
            !props.filtrosSnapshot.filtros ||
            totalFiltrados === 0
          }
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
