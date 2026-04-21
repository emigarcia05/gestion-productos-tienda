"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Link2, Plus, Loader2, Trash2, ArrowUp, ArrowDown, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
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
import { convertirEnProveedor } from "@/actions/tienda";
import { calcPxCompraFinal, calcMargenSinIvaPct } from "@/lib/calculos";
import { fmtPrecio, fmtPctEntero } from "@/lib/format";
import SeleccionarProductoModal from "./SeleccionarProductoModal";

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
  pxCompraFinal?: number | null;
  proveedor: { nombre: string; prefijo: string };
};

interface Props {
  itemTiendaId: string;
  itemDescripcion: string;
  codigoExterno: string | null;
  cantidadVinculos: number;
  costoTienda: number;
  /** Precio lista tienda (px. venta) para margen s/ IVA — mismo criterio que `TablaTienda`. */
  precioListaTienda: number;
  porcIva: number;
  marca?: string | null;
  rubro?: string | null;
  subRubro?: string | null;
  /** Prefijo o nombre del proveedor principal del ítem tienda (proveedorDux) */
  prefijoProveedor?: string | null;
  /** Si se pasa, el modal se controla desde afuera (fila clickeable) */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

const UMBRAL_PCT = 1;

function pxCompraDeProducto(p: ProductoConProveedor): number {
  return p.pxCompraFinal != null
    ? p.pxCompraFinal
    : calcPxCompraFinal(
        p.precioLista,
        p.descuentoRubro,
        p.descuentoCantidad,
        p.cxTransporte
      );
}

function DifCosto({ costoTienda, pxCompraFinal }: { costoTienda: number; pxCompraFinal: number }) {
  if (costoTienda <= 0 || pxCompraFinal <= 0) return <span className="variacion-costo--neutra">—</span>;
  const dif = ((pxCompraFinal - costoTienda) / costoTienda) * 100;
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
  precioListaTienda,
  porcIva,
  marca,
  rubro,
  subRubro,
  prefijoProveedor,
  open: openProp,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [openInterno, setOpenInterno] = useState(false);
  const open = openProp !== undefined ? openProp : openInterno;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setOpenInterno;
  const [abrirSelector, setAbrirSelector] = useState(false);
  const [vinculados, setVinculados] = useState<ProductoConProveedor[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cantidad, setCantidad] = useState(cantidadInicial);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setCargando(true));
    getVinculos(itemTiendaId).then((result) => {
      if (result.success) setVinculados(result.data);
      else toast.error(result.error);
      setCargando(false);
    });
  }, [open, itemTiendaId]);

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
        toast.success(`Desvinculado: ${producto.codigoExterno}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleConvertir(producto: ProductoConProveedor) {
    startTransition(async () => {
      const res = await convertirEnProveedor(itemTiendaId, producto.id);
      if (res.ok) {
        const refreshed = await getVinculos(itemTiendaId);
        if (refreshed.success) setVinculados(refreshed.data);
        router.refresh();
        toast.success(`Proveedor principal actualizado a "${producto.proveedor.nombre}"`);
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
          setVinculados(refreshed.data);
          setCantidad(refreshed.data.length);
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
          title="Vínculos con Proveedores"
          size="lg"
          className="sm:max-w-2xl w-[calc(100%-2rem)]"
          scrollBody={false}
          bodyShellClassName="p-1.5 sm:p-2"
          bodyClassName="flex flex-col min-h-0 overflow-hidden p-2 sm:p-3"
          actions={
            <>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setAbrirSelector(true)}
                disabled={isPending}
              >
                <Plus className="h-3.5 w-3.5" />
                Vincular Nuevo Producto
              </Button>
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
            ) : vinculados.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Sin vínculos aún.</p>
            ) : (
              <div className="contenedor-tabla-gestion no-scroll-x max-h-[min(420px,55vh)] min-h-[12rem] w-full min-w-0">
                <Table variant="compact" scrollX={false} className="tabla-vinculos-modal">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[14%]" />
                    <col className="w-[22%]" />
                    <col className="w-[14%]" />
                    <col className="w-[24%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>OFICIAL</TableHead>
                      <TableHead>PREFIJO</TableHead>
                      <TableHead>PX. FINAL</TableHead>
                      <TableHead>VARIAC.</TableHead>
                      <TableHead>MARGEN</TableHead>
                      <TableHead>
                        <span className="sr-only">DESVINC.</span>
                        <Trash2 className="mx-auto h-4 w-4 text-primary-foreground" aria-hidden />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasOrdenadas.map(({ producto: p, px }) => {
                      const oficial = esOficial(p);
                      const margenPct = calcMargenSinIvaPct(precioListaTienda, px, porcIva);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="celda-datos">
                            {oficial ? (
                              <span className="sr-only">Proveedor oficial actual</span>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-1.5 text-[0.6875rem] font-semibold shrink-0"
                                disabled={isPending}
                                title="Marcar Como Proveedor Oficial Del Ítem"
                                onClick={() => handleConvertir(p)}
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                Oficial
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="celda-datos celda-mono whitespace-nowrap">
                            {p.proveedor.prefijo}
                          </TableCell>
                          <TableCell className="celda-datos celda-numero celda-destacado">
                            ${fmtPrecio(px)}
                          </TableCell>
                          <TableCell className="celda-datos celda-numero">
                            <DifCosto costoTienda={costoTienda} pxCompraFinal={px} />
                          </TableCell>
                          <TableCell className="celda-datos celda-numero">
                            {margenPct != null ? fmtPctEntero(margenPct) : ""}
                          </TableCell>
                          <TableCell className="celda-datos">
                            <div className="flex justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDesvincular(p)}
                                disabled={isPending}
                                className="text-foreground hover:text-destructive"
                                title="Desvincular"
                                aria-label={`Desvincular ${p.proveedor.prefijo}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
      />
    </>
  );
}
