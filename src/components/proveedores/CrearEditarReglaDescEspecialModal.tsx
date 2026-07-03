"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
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
import { resolverDescripcionesProductosDescEspecial } from "@/lib/descEspecialProductosUi";
import ReglaDescEspecialAgregarProductosModal, {
  type FiltrosReglaDescEspecialProductos,
} from "@/components/proveedores/ReglaDescEspecialAgregarProductosModal";
import type { ProductoVinculadoReglaDescEspecial } from "@/lib/descEspecialProductosUi";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type Modo = "crear" | "editar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: Modo;
  regla?: ReglaDescEspecialDetalle | null;
  onSuccess?: () => void;
}

const FORM_GRID_4_COL_CLASS =
  "grid shrink-0 grid-cols-4 gap-x-3 gap-y-2 items-center min-w-0";
const LABEL_CLASS = "text-right font-medium text-sm";
const SELECT_CLASS = "input-filtro-unificado w-full min-w-0";
const FORM_CONTROL_CLASS = "min-w-0";

/** Modal alto: la sección productos reserva ≥50% del cuerpo útil. */
const REGLA_DESC_ESPECIAL_MODAL_CLASS = "sm:max-w-[42rem] min-h-[min(85vh,38rem)]";
const REGLA_DESC_ESPECIAL_BODY_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5";
const REGLA_DESC_ESPECIAL_PRODUCTOS_CLASS =
  "flex min-h-[50%] flex-1 flex-col gap-2 overflow-hidden rounded-md border border-border bg-muted/30 px-3 py-2";

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
  const [productosVinculados, setProductosVinculados] = useState<ProductoVinculadoReglaDescEspecial[]>(
    []
  );
  const [agregarOpen, setAgregarOpen] = useState(false);

  const cargarCatalogos = useCallback(async () => {
    const res = await listarCatalogosReglasDescuentosAction();
    if (res.ok) setCatalogos(res.data);
  }, []);

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

  useEffect(() => {
    if (!open) return;
    void cargarCatalogos();
    if (modo === "editar" && regla) {
      setNombre(regla.nombre.toUpperCase());
      setValorNorm(porcentajeCentFromNumber(regla.valor));
      setIdProveedor(regla.idProveedor ?? "");
      setIdMarca(regla.idMarca ?? "");
      setIdRubro(regla.idRubro ?? "");
      setProductosVinculados([]);
      void (async () => {
        const productos = await resolverDescripcionesProductosDescEspecial(regla.codigosExt);
        setProductosVinculados(productos);
      })();
      return;
    }
    setNombre("");
    setValorNorm("");
    setIdProveedor("");
    setIdMarca("");
    setIdRubro("");
    setProductosVinculados([]);
  }, [open, modo, regla, cargarCatalogos]);

  const titulo = modo === "crear" ? "Nueva Regla Desc. Específico" : "Editar Regla Desc. Específico";

  const tieneAlgunFiltro = Boolean(idProveedor || idMarca || idRubro);

  const codigosExt = useMemo(
    () => productosVinculados.map((p) => p.codExt),
    [productosVinculados]
  );

  const productosOrdenados = useMemo(
    () =>
      [...productosVinculados].sort((a, b) =>
        a.descripcion.localeCompare(b.descripcion, "es", { sensitivity: "base" })
      ),
    [productosVinculados]
  );

  function aplicarCambioFiltro(
    setter: (v: string) => void,
    valor: string,
    etiqueta: string
  ) {
    setter(valor);
    if (productosVinculados.length > 0) {
      setProductosVinculados([]);
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

  function quitarProducto(codExt: string) {
    setProductosVinculados((prev) => prev.filter((p) => p.codExt !== codExt));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
        <AppModal
          title={titulo}
          size="xl"
          className={REGLA_DESC_ESPECIAL_MODAL_CLASS}
          padding="sm"
          scrollBody={false}
          bodyShellClassName="flex min-h-0 flex-1 items-stretch p-3 sm:p-4"
          bodyClassName={REGLA_DESC_ESPECIAL_BODY_CLASS}
          headerClassName="pt-4 pb-3"
          footerClassName="py-3"
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
          <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
            <div className={FORM_GRID_4_COL_CLASS}>
              <Label htmlFor="nombre-regla-esp" className={cn(LABEL_CLASS, "col-span-2")}>
                DESCRIPCIÓN
              </Label>
              <div className={cn(FORM_CONTROL_CLASS, "col-span-2")}>
                <Input
                  id="nombre-regla-esp"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.toUpperCase())}
                  className="border-primary w-full min-w-0 uppercase"
                  placeholder="EJ. DESCUENTO POR FULLPALLET PACLIN"
                />
              </div>

              <Label htmlFor="proveedor-regla-esp" className={LABEL_CLASS}>
                PROVEEDOR
              </Label>
              <div className={FORM_CONTROL_CLASS}>
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
              </div>

              <Label htmlFor="rubro-regla-esp" className={LABEL_CLASS}>
                RUBRO
              </Label>
              <div className={FORM_CONTROL_CLASS}>
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
              </div>

              <Label htmlFor="marca-regla-esp" className={LABEL_CLASS}>
                MARCA
              </Label>
              <div className={FORM_CONTROL_CLASS}>
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
              </div>

              <Label htmlFor="valor-regla-esp" className={LABEL_CLASS}>
                VALOR
              </Label>
              <div className={FORM_CONTROL_CLASS}>
                <PorcentajeCentInput
                  id="valor-regla-esp"
                  valueNormalized={valorNorm}
                  onValueNormalizedChange={setValorNorm}
                  placeholder="0,00%"
                  className="border-primary w-full min-w-0"
                />
              </div>
            </div>

            <section
              aria-label="Productos vinculados a la regla"
              className={REGLA_DESC_ESPECIAL_PRODUCTOS_CLASS}
            >
              <div className="flex shrink-0 items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  Productos asociados ({productosVinculados.length})
                </p>
                <Button type="button" size="sm" variant="default" onClick={abrirAgregarProductos}>
                  <Plus className="h-4 w-4" />
                  Agregar Productos
                </Button>
              </div>

              <div
                className="contenedor-tabla-gestion no-scroll-x min-h-0 flex-1 overflow-y-auto"
                style={{ height: "auto" }}
              >
                <Table variant="compact" scrollX={false} className="tabla-vinculos-modal w-full min-w-0">
                  <colgroup>
                    <col style={{ width: "88%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>DESCRIPCIÓN</TableHead>
                      <TableHead className="text-center">ACC.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosOrdenados.length === 0 ? (
                      <EmptyTableRow colSpan={2} message="Sin productos vinculados." />
                    ) : (
                      productosOrdenados.map((producto) => (
                        <TableRow key={producto.codExt}>
                          <TableCell className="celda-datos min-w-0">
                            <span className="block truncate" title={producto.descripcion}>
                              {producto.descripcion}
                            </span>
                          </TableCell>
                          <TableCell className="celda-datos celda-datos--accion-relleno-fila p-0">
                            <div
                              className={cn(
                                TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
                                "justify-center"
                              )}
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                aria-label={`Quitar ${producto.descripcion}`}
                                onClick={() => quitarProducto(producto.codExt)}
                              >
                                <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        </AppModal>
      </Dialog>

      <ReglaDescEspecialAgregarProductosModal
        open={agregarOpen}
        onOpenChange={setAgregarOpen}
        codigosSeleccionados={codigosExt}
        filtros={filtrosProductos}
        onConfirm={(nuevos) => {
          setProductosVinculados((prev) => {
            const existentes = new Set(prev.map((p) => p.codExt));
            const merged = [...prev];
            for (const p of nuevos) {
              if (!existentes.has(p.codExt)) merged.push(p);
            }
            return merged;
          });
          setAgregarOpen(false);
        }}
      />
    </>
  );
}
