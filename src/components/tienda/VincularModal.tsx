"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Link2, Plus, Loader2, Trash2, ArrowUp, ArrowDown, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import AppModal from "@/components/shared/AppModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getVinculos, vincularProducto, desvincularProducto } from "@/actions/vinculos";
import { setProductoPropioTiendaAction } from "@/actions/productoPropioTienda";
import { calcPxCompraFinal } from "@/lib/calculos";
import { fmtPrecio } from "@/lib/format";
import SeleccionarProductoModal from "./SeleccionarProductoModal";
import type { Rol } from "@/lib/permisos";

type ProductoConProveedor = {
  id: string;
  proveedorId: string;
  codigoExterno: string;
  codProdProv: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
  descuentoRubro: number;
  descuentoCantidad: number;
  cxTransporte: number;
  pxCompraFinalSinIva?: number | null;
  proveedor: { nombre: string; prefijo: string };
};

interface Props {
  itemTiendaId: string;
  itemDescripcion: string;
  codigoExterno: string | null;
  cantidadVinculos: number;
  costoTienda: number;
  marca?: string | null;
  rubro?: string | null;
  subRubro?: string | null;
  /** Prefijo o nombre del proveedor principal del ítem tienda (proveedorDux) */
  prefijoProveedor?: string | null;
  /** Si se pasa, el modal se controla desde afuera (fila clickeable) */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  /** Vincular / desvincular requieren rol editor (mutaciones en servidor). */
  rol?: Rol;
}

const UMBRAL_PCT = 1;

function pxCompraDeProducto(p: ProductoConProveedor): number {
  return p.pxCompraFinalSinIva != null
    ? p.pxCompraFinalSinIva
    : calcPxCompraFinal(
        p.precioLista,
        p.descuentoRubro,
        p.descuentoCantidad,
        p.cxTransporte
      );
}

function DifCosto({ costoTienda, pxCompraFinalSinIva }: { costoTienda: number; pxCompraFinalSinIva: number }) {
  if (costoTienda <= 0 || pxCompraFinalSinIva <= 0) return <span className="variacion-costo--neutra">—</span>;
  const dif = ((pxCompraFinalSinIva - costoTienda) / costoTienda) * 100;
  const abs = Math.abs(dif);
  if (abs < UMBRAL_PCT) return <span className="variacion-costo--neutra">≈0%</span>;
  const absFmt = abs.toFixed(1);
  if (dif > 0) {
    return (
      <span className="variacion-costo--positiva flex items-center justify-center gap-1" title={`Px. Compra Final es ${absFmt}% más caro que Cx. Actual`}>
        <ArrowUp className="h-3.5 w-3.5 variacion-costo-icon--positiva shrink-0" />
        +{absFmt}%
      </span>
    );
  }
  return (
    <span className="variacion-costo--negativa flex items-center justify-center gap-1" title={`Px. Compra Final es ${absFmt}% más económico que Cx. Actual`}>
      <ArrowDown className="h-3.5 w-3.5 variacion-costo-icon--negativa shrink-0" />
      -{absFmt}%
    </span>
  );
}

export default function VincularModal({
  itemTiendaId,
  itemDescripcion,
  cantidadVinculos: cantidadInicial,
  costoTienda,
  marca,
  rubro,
  subRubro,
  prefijoProveedor,
  open: openProp,
  onOpenChange,
  rol = "editor",
}: Props) {
  const router = useRouter();
  const puedeEditar = rol === "editor";
  const [openInterno, setOpenInterno] = useState(false);
  const open = openProp !== undefined ? openProp : openInterno;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setOpenInterno;
  const [abrirSelector, setAbrirSelector] = useState(false);
  const [vinculados, setVinculados] = useState<ProductoConProveedor[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cantidad, setCantidad] = useState(cantidadInicial);
  const [esPropio, setEsPropio] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setCargando(true));
    getVinculos(itemTiendaId).then((result) => {
      if (result.success) {
        setVinculados(result.data.productos);
        setEsPropio(result.data.esProductoPropio);
      } else toast.error(result.error);
      setCargando(false);
    });
  }, [open, itemTiendaId]);

  function handleToggleProductoPropio() {
    const nuevoValor = !esPropio;
    startTransition(async () => {
      const res = await setProductoPropioTiendaAction({
        codTienda: itemTiendaId,
        esPropio: nuevoValor,
      });
      if (res.ok) {
        setEsPropio(nuevoValor);
        router.refresh();
        toast.success(
          nuevoValor
            ? "Marcado como Producto TiendaColor."
            : "Producto TiendaColor desmarcado."
        );
      } else {
        toast.error(res.error);
      }
    });
  }

  const prefijoPrincipal = (prefijoProveedor ?? "").trim().toLowerCase();

  const lineaMarcaRubroSub = useMemo(
    () =>
      [marca, rubro, subRubro]
        .map((s) => (s ?? "").trim())
        .filter(Boolean)
        .join(" - "),
    [marca, rubro, subRubro]
  );

  const filasOrdenadas = useMemo(() => {
    const conPx = vinculados.map((p) => ({ producto: p, px: pxCompraDeProducto(p) }));
    const principalItem =
      prefijoPrincipal === ""
        ? null
        : vinculados.find((p) => p.proveedor.prefijo.trim().toLowerCase() === prefijoPrincipal) ?? null;

    if (principalItem) {
      const principalRow = conPx.find((r) => r.producto.id === principalItem.id);
      const rest = conPx
        .filter((r) => r.producto.id !== principalItem.id)
        .sort((a, b) => a.px - b.px);
      return principalRow ? [principalRow, ...rest] : rest;
    }
    return [...conPx].sort((a, b) => a.px - b.px);
  }, [vinculados, prefijoPrincipal]);

  function esOficial(p: ProductoConProveedor): boolean {
    if (prefijoPrincipal === "") return false;
    return p.proveedor.prefijo.trim().toLowerCase() === prefijoPrincipal;
  }

  function handleDesvincular(producto: ProductoConProveedor) {
    startTransition(async () => {
      const res = await desvincularProducto(itemTiendaId, producto.id);
      if (res.ok) {
        setVinculados((prev) => prev.filter((p) => p.id !== producto.id));
        setCantidad((c) => Math.max(0, c - 1));
        router.refresh();
        toast.success(`Desvinculado: ${producto.codigoExterno}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  async function handleSeleccionar(producto: {
    id: string;
    proveedorId: string;
    codigoExterno: string;
    codProdProv: string;
    descripcion: string;
    precioLista: number;
    proveedor: { nombre: string; prefijo: string };
  }) {
    if (vinculados.some((p) => p.proveedorId === producto.proveedorId)) {
      toast.error("Ya existe un vínculo con ese proveedor. No se puede tener dos vinculaciones del mismo proveedor.");
      return;
    }
    setAbrirSelector(false);
    startTransition(async () => {
      const res = await vincularProducto(itemTiendaId, producto.id);
      if (res.ok) {
        const refreshed = await getVinculos(itemTiendaId);
        if (refreshed.success) {
          setVinculados(refreshed.data.productos);
          setCantidad(refreshed.data.productos.length);
        } else {
          setVinculados((prev) => [
            ...prev,
            {
              ...producto,
              precioVentaSugerido: 0,
              descuentoRubro: 0,
              descuentoCantidad: 0,
              cxTransporte: 0,
            },
          ]);
          setCantidad((c) => c + 1);
        }
        router.refresh();
        toast.success(`Vinculado: ${producto.codigoExterno}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {openProp === undefined && (
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary"
              title="Gestionar Vínculos Con Proveedores"
            >
              <Link2 className="h-3.5 w-3.5" />
              {cantidad > 0 && (
                <span className="tabular-nums font-medium text-primary">{cantidad}</span>
              )}
            </Button>
          </DialogTrigger>
        )}

        <AppModal
          title="Vínculos Con Proveedores"
          size="lg"
          className="max-w-2xl w-[calc(100%-2rem)]"
          scrollBody={false}
          bodyShellClassName="p-1.5 p-2"
          bodyClassName="flex flex-col min-h-0 overflow-hidden p-2 p-3"
          actions={
            <>
              {puedeEditar ? (
                <Button
                  size="sm"
                  variant={esPropio ? "default" : "outline"}
                  className="gap-1.5"
                  onClick={handleToggleProductoPropio}
                  disabled={isPending}
                  title={
                    esPropio
                      ? "Quitar marca de Producto TiendaColor."
                      : "Marcar como Producto TiendaColor (no se vincula con proveedores)."
                  }
                >
                  <Tag className="h-3.5 w-3.5" />
                  Producto TiendaColor
                </Button>
              ) : null}
              {puedeEditar && !esPropio ? (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setAbrirSelector(true)}
                  disabled={isPending}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Vincular Nuevo Producto
                </Button>
              ) : null}
              <Button variant="default" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </>
          }
        >
          <div className="flex shrink-0 flex-col gap-1 pb-2 text-center">
            <p className="text-sm font-semibold text-foreground break-words">{itemDescripcion}</p>
            {lineaMarcaRubroSub ? (
              <p className="text-xs text-muted-foreground break-words">{lineaMarcaRubroSub}</p>
            ) : null}
          </div>

          <div className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden">
            {cargando ? (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                Cargando...
              </div>
            ) : esPropio ? (
              <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                <Tag className="h-5 w-5 text-primary" aria-hidden />
                <p className="text-sm font-semibold text-foreground">Producto TiendaColor</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Este ítem está marcado como producto propio. No se vincula con proveedores
                  y queda excluido del filtro <strong>VINCULADO = NO</strong>.
                </p>
              </div>
            ) : vinculados.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Sin vínculos aún.</p>
            ) : (
              <div className="contenedor-tabla-gestion no-scroll-x max-h-[min(420px,55vh)] min-h-[12rem] w-full min-w-0">
                <Table variant="compact" scrollX={false} className="tabla-vinculos-modal">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[28%]" />
                    <col className={puedeEditar ? "w-[36%]" : "w-[50%]"} />
                    {puedeEditar ? <col className="w-[14%]" /> : null}
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>PREFIJO</TableHead>
                      <TableHead>PX. FINAL</TableHead>
                      <TableHead>VARIAC.</TableHead>
                      {puedeEditar ? (
                        <TableHead>
                          <span className="sr-only">DESVINC.</span>
                          <Trash2 className="mx-auto h-4 w-4 text-primary-foreground" aria-hidden />
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasOrdenadas.map(({ producto: p, px }) => (
                        <TableRow key={p.id}>
                          <TableCell className="celda-datos celda-mono whitespace-nowrap">
                            {p.proveedor.prefijo}
                          </TableCell>
                          <TableCell className="celda-datos celda-numero celda-destacado">
                            ${fmtPrecio(px)}
                          </TableCell>
                          <TableCell className="celda-datos celda-numero">
                            <DifCosto costoTienda={costoTienda} pxCompraFinalSinIva={px} />
                          </TableCell>
                          {puedeEditar ? (
                            <TableCell className="celda-datos celda-datos--accion-relleno-fila">
                              <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDesvincular(p);
                                  }}
                                  disabled={isPending}
                                  className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                  title="Desvincular"
                                  aria-label={`Desvincular ${p.proveedor.prefijo}`}
                                >
                                  <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                                </Button>
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </AppModal>
      </Dialog>

      <SeleccionarProductoModal
        open={abrirSelector}
        onClose={() => setAbrirSelector(false)}
        onSeleccionar={handleSeleccionar}
        excluirItemTiendaId={itemTiendaId}
        idsProveedoresYaVinculados={vinculados.map((p) => p.proveedorId)}
        itemDescripcion={itemDescripcion}
        marca={marca}
        rubro={rubro}
        subRubro={subRubro}
      />
    </>
  );
}
