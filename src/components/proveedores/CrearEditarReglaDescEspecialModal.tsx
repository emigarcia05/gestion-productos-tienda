"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import PorcentajeCentInput from "@/components/shared/PorcentajeCentInput";
import { Button } from "@/components/ui/button";
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
  crearReglaDescEspecialAction,
  actualizarReglaDescEspecialAction,
  type ReglaDescEspecialDetalle,
} from "@/actions/descEspecialReglas";
import {
  listarCatalogosReglasDescuentosAction,
  type CatalogosReglasDescuentosListaPrecio,
} from "@/actions/descuentosListaPrecioReglas";
import {
  parsePorcentajeCentNormalized,
  porcentajeCentFromNumber,
} from "@/lib/porcentajeCentMask";
import ReglaDescEspecialAgregarProductosModal, {
  type FiltrosReglaDescEspecialProductos,
} from "@/components/proveedores/ReglaDescEspecialAgregarProductosModal";
import { cn } from "@/lib/utils";

type Modo = "crear" | "editar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: Modo;
  regla?: ReglaDescEspecialDetalle | null;
  onSuccess?: () => void;
}

const FORM_GRID_CLASS = "grid grid-cols-[1.35fr_minmax(0,1fr)] gap-x-4 gap-y-2 items-center";
const LABEL_CLASS = "text-right font-medium text-sm";
const SELECT_CLASS = "input-filtro-unificado w-full min-w-0";

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

export default function CrearEditarReglaDescEspecialModal({
  open,
  onOpenChange,
  modo,
  regla,
  onSuccess,
}: Props) {
  const [pending, setPending] = useState(false);
  const [catalogos, setCatalogos] = useState<CatalogosReglasDescuentosListaPrecio | null>(null);
  const [nombre, setNombre] = useState("");
  const [valorNorm, setValorNorm] = useState("");
  const [idProveedor, setIdProveedor] = useState("");
  const [idMarca, setIdMarca] = useState("");
  const [idRubro, setIdRubro] = useState("");
  const [codigosExt, setCodigosExt] = useState<string[]>([]);
  const [agregarOpen, setAgregarOpen] = useState(false);

  const cargarCatalogos = useCallback(async () => {
    const res = await listarCatalogosReglasDescuentosAction();
    if (res.ok) setCatalogos(res.data);
  }, []);

  useEffect(() => {
    if (!open) return;
    void cargarCatalogos();
    if (modo === "editar" && regla) {
      setNombre(regla.nombre);
      setValorNorm(porcentajeCentFromNumber(regla.valor));
      setIdProveedor(regla.idProveedor ?? "");
      setIdMarca(regla.idMarca ?? "");
      setIdRubro(regla.idRubro ?? "");
      setCodigosExt(regla.codigosExt);
      return;
    }
    setNombre("");
    setValorNorm("");
    setIdProveedor("");
    setIdMarca("");
    setIdRubro("");
    setCodigosExt([]);
  }, [open, modo, regla, cargarCatalogos]);

  const titulo = modo === "crear" ? "Nueva Regla Desc. Específico" : "Editar Regla Desc. Específico";

  const filtrosProductos = useMemo((): FiltrosReglaDescEspecialProductos => {
    if (!catalogos) return {};
    return {
      proveedorId: idProveedor || undefined,
      marcaNombre: idMarca
        ? catalogos.marcas.find((m) => m.id === idMarca)?.nombre
        : undefined,
      rubroNombre: idRubro
        ? catalogos.rubros.find((r) => r.id === idRubro)?.nombre
        : undefined,
    };
  }, [catalogos, idProveedor, idMarca, idRubro]);

  const tieneAlgunFiltro = Boolean(idProveedor || idMarca || idRubro);

  const resumenProductos = useMemo(() => {
    if (codigosExt.length === 0) return "Sin productos vinculados.";
    if (codigosExt.length <= 3) return codigosExt.join(", ");
    return `${codigosExt.slice(0, 3).join(", ")} y ${codigosExt.length - 3} más`;
  }, [codigosExt]);

  function aplicarCambioFiltro(
    setter: (v: string) => void,
    valor: string,
    etiqueta: string
  ) {
    setter(valor);
    if (codigosExt.length > 0) {
      setCodigosExt([]);
      toast.message(`Se limpiaron los productos al cambiar ${etiqueta}.`);
    }
  }

  function abrirAgregarProductos() {
    if (!tieneAlgunFiltro) {
      toast.error("Seleccioná al menos un filtro (proveedor, marca o rubro) antes de agregar productos.");
      return;
    }
    setAgregarOpen(true);
  }

  async function handleGuardar() {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      toast.error("Ingresá un nombre para la regla.");
      return;
    }

    if (!tieneAlgunFiltro) {
      toast.error("Seleccioná al menos un filtro (proveedor, marca o rubro).");
      return;
    }

    const valor = parsePorcentajeCentNormalized(valorNorm);
    if (valor === undefined) {
      toast.error("Ingresá un porcentaje válido (0–100).");
      return;
    }

    if (codigosExt.length === 0) {
      toast.error("Vinculá al menos un producto.");
      return;
    }

    setPending(true);
    try {
      const payload = {
        nombre: nombreTrim,
        valor,
        codigosExt,
        idProveedor: idProveedor || null,
        idMarca: idMarca || null,
        idRubro: idRubro || null,
      };
      const result =
        modo === "editar" && regla
          ? await actualizarReglaDescEspecialAction({ id: regla.id, ...payload })
          : await crearReglaDescEspecialAction(payload);

      if (!result.ok) {
        toast.error(result.error ?? "No se pudo guardar la regla.");
        return;
      }

      toast.success(
        modo === "crear"
          ? "Regla creada. Se actualizó desc. específico en los productos."
          : "Regla actualizada."
      );
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  function quitarCodigo(codExt: string) {
    setCodigosExt((prev) => prev.filter((c) => c !== codExt));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
        <AppModal
          title={titulo}
          size="lg"
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleGuardar} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Definí proveedor, marca y/o rubro para categorizar la regla. Los productos vinculados reciben el valor en{" "}
              <strong className="text-foreground">desc. específico</strong> y se suma al cálculo de px. final sin IVA.
            </p>

            <div className={cn(FORM_GRID_CLASS, "py-1")}>
              <ModalFormRow id="nombre-regla-esp" label="NOMBRE">
                <Input
                  id="nombre-regla-esp"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="border-primary w-full min-w-0"
                  placeholder="Ej. Descuento por fullpallet Paclin"
                />
              </ModalFormRow>

              <ModalFormRow id="valor-regla-esp" label="VALOR">
                <PorcentajeCentInput
                  id="valor-regla-esp"
                  valueNormalized={valorNorm}
                  onValueNormalizedChange={setValorNorm}
                  placeholder="0,00%"
                  className="border-primary w-full min-w-0"
                />
              </ModalFormRow>

              <ModalFormRow id="proveedor-regla-esp" label="PROVEEDOR">
                <Select
                  value={idProveedor || "none"}
                  onValueChange={(v) =>
                    aplicarCambioFiltro(setIdProveedor, v === "none" ? "" : v, "proveedor")
                  }
                  disabled={!catalogos}
                >
                  <SelectTrigger id="proveedor-regla-esp" className={SELECT_CLASS}>
                    <SelectValue placeholder="TODOS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">TODOS</SelectItem>
                    {(catalogos?.proveedores ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.prefijo ? `[${p.prefijo}] ` : ""}
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ModalFormRow>

              <ModalFormRow id="marca-regla-esp" label="MARCA">
                <Select
                  value={idMarca || "none"}
                  onValueChange={(v) =>
                    aplicarCambioFiltro(setIdMarca, v === "none" ? "" : v, "marca")
                  }
                  disabled={!catalogos}
                >
                  <SelectTrigger id="marca-regla-esp" className={SELECT_CLASS}>
                    <SelectValue placeholder="TODAS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">TODAS</SelectItem>
                    {(catalogos?.marcas ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ModalFormRow>

              <ModalFormRow id="rubro-regla-esp" label="RUBRO">
                <Select
                  value={idRubro || "none"}
                  onValueChange={(v) =>
                    aplicarCambioFiltro(setIdRubro, v === "none" ? "" : v, "rubro")
                  }
                  disabled={!catalogos}
                >
                  <SelectTrigger id="rubro-regla-esp" className={SELECT_CLASS}>
                    <SelectValue placeholder="TODOS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">TODOS</SelectItem>
                    {(catalogos?.rubros ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ModalFormRow>
            </div>

            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  Productos asociados ({codigosExt.length})
                </p>
                <Button type="button" size="sm" variant="default" onClick={abrirAgregarProductos}>
                  <Plus className="h-4 w-4" />
                  Agregar Productos
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground truncate" title={codigosExt.join(", ")}>
                {resumenProductos}
              </p>
              {codigosExt.length > 0 && (
                <ul className="mt-3 max-h-40 overflow-y-auto flex flex-col gap-1">
                  {codigosExt.map((codExt) => (
                    <li
                      key={codExt}
                      className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2 py-1 text-sm"
                    >
                      <span className="tabular-nums truncate">{codExt}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        aria-label={`Quitar ${codExt}`}
                        onClick={() => quitarCodigo(codExt)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </AppModal>
      </Dialog>

      <ReglaDescEspecialAgregarProductosModal
        open={agregarOpen}
        onOpenChange={setAgregarOpen}
        codigosSeleccionados={codigosExt}
        filtros={filtrosProductos}
        onConfirm={(nuevos) => {
          setCodigosExt((prev) => [...new Set([...prev, ...nuevos])]);
          setAgregarOpen(false);
        }}
      />
    </>
  );
}
