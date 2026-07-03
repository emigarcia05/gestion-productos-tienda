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
          size="lg"
          scrollBody={false}
          bodyShellClassName="flex min-h-0 flex-1 items-stretch p-4"
          bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-6"
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
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className={cn(FORM_GRID_CLASS, "shrink-0 py-1")}>
              <ModalFormRow id="nombre-regla-esp" label="NOMBRE">
                <Input
                  id="nombre-regla-esp"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.toUpperCase())}
                  className="border-primary w-full min-w-0 uppercase"
                  placeholder="EJ. DESCUENTO POR FULLPALLET PACLIN"
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

            <div className="flex min-h-[min(52vh,28rem)] flex-1 flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-3">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  Productos asociados ({productosVinculados.length})
                </p>
                <Button type="button" size="sm" variant="default" onClick={abrirAgregarProductos}>
                  <Plus className="h-4 w-4" />
                  Agregar Productos
                </Button>
              </div>

              <div className="contenedor-tabla-gestion no-scroll-x min-h-0 flex-1">
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
