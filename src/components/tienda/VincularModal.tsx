"use client";

import { useState, useTransition, useEffect } from "react";
import { Link2, Plus, Loader2, X, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getVinculos, vincularProducto, desvincularProducto } from "@/actions/vinculos";
import { convertirEnProveedor } from "@/actions/tienda";
import { calcPxCompraFinal } from "@/lib/calculos";
import { fmtPrecio } from "@/lib/format";
import SeleccionarProductoModal from "./SeleccionarProductoModal";

type ProductoConProveedor = {
  id: string;
  codigoExterno: string;
  codProdProv: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
  descuentoProducto: number;
  descuentoCantidad: number;
  cxTransporte: number;
  proveedor: { nombre: string; prefijo: string };
};


interface Props {
  itemTiendaId: string;
  itemDescripcion: string;
  codigoExterno: string | null;
  cantidadVinculos: number;
  costoTienda: number;
  /** Si se pasa, el modal se controla desde afuera (fila clickeable) */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

const UMBRAL_PCT = 1; // diferencia mínima para mostrar como significativa

function DifCosto({ costoTienda, pxCompraFinal }: { costoTienda: number; pxCompraFinal: number }) {
  if (costoTienda <= 0 || pxCompraFinal <= 0) return <span className="text-muted-foreground text-xs">—</span>;
  const dif = ((pxCompraFinal - costoTienda) / costoTienda) * 100;
  const abs = Math.abs(dif);
  // Si la diferencia es menor al umbral, mostrar como neutro
  if (abs < UMBRAL_PCT) return <span className="text-xs text-muted-foreground">≈0%</span>;
  const absFmt = abs.toFixed(1);
  if (dif > 0) {
    return (
      <span className="text-xs font-medium text-red-500" title={`Px Compra Final es ${absFmt}% más caro que Cx Actual`}>
        +{absFmt}%
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-emerald-500" title={`Px Compra Final es ${absFmt}% más económico que Cx Actual`}>
      -{absFmt}%
    </span>
  );
}

export default function VincularModal({
  itemTiendaId, itemDescripcion, codigoExterno, cantidadVinculos: cantidadInicial, costoTienda,
  open: openProp, onOpenChange,
}: Props) {
  const [openInterno, setOpenInterno] = useState(false);
  const open    = openProp    !== undefined ? openProp    : openInterno;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setOpenInterno;
  const [abrirSelector, setAbrirSelector] = useState(false);
  const [vinculados, setVinculados]       = useState<ProductoConProveedor[]>([]);
  const [cargando, setCargando]           = useState(false);
  const [cantidad, setCantidad]           = useState(cantidadInicial);
  const [isPending, startTransition]      = useTransition();

  // Cargar vínculos al abrir (ServiceResult: success + data | error)
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setCargando(true));
    getVinculos(itemTiendaId).then((result) => {
      if (result.success) setVinculados(result.data);
      else toast.error(result.error);
      setCargando(false);
    });
  }, [open, itemTiendaId]);

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
        toast.success(`Proveedor Dux actualizado a "${producto.proveedor.nombre}"`);
      } else {
        toast.error(res.error);
      }
    });
  }

  // Llamado desde SeleccionarProductoModal al hacer doble clic
  async function handleSeleccionar(producto: { id: string; codigoExterno: string; codProdProv: string; descripcion: string; precioLista: number; proveedor: { nombre: string; prefijo: string } }) {
    setAbrirSelector(false);
    startTransition(async () => {
      const res = await vincularProducto(itemTiendaId, producto.id);
      if (res.ok) {
        // Rellenar campos de descuento con 0 — se actualizarán al reabrir el modal
        const productoCompleto: ProductoConProveedor = {
          ...producto,
          precioVentaSugerido: 0,
          descuentoProducto: 0,
          descuentoCantidad: 0,
          cxTransporte: 0,
        };
        setVinculados((prev) => [...prev, productoCompleto]);
        setCantidad((c) => c + 1);
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
              title="Gestionar vínculos con Lista Proveedores"
            >
              <Link2 className="h-3.5 w-3.5" />
              {cantidad > 0 && (
                <span className="tabular-nums font-medium text-primary">{cantidad}</span>
              )}
            </Button>
          </DialogTrigger>
        )}

        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-5 pb-3">
            <DialogTitle className="text-base font-semibold leading-tight">
              Vínculos con Lista Proveedores
            </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{itemDescripcion}</p>
          <div className="flex items-center gap-3 mt-1">
            {costoTienda > 0 && (
              <p className="text-xs text-muted-foreground">
                Cx Actual: <span className="font-medium text-foreground">${fmtPrecio(costoTienda)}</span>
              </p>
            )}
            {codigoExterno && (
              <p className="text-xs text-muted-foreground">
                Cód. externo: <code className="bg-muted px-1 rounded">{codigoExterno}</code>
              </p>
            )}
          </div>
          </DialogHeader>

          <Separator />

          {/* Lista de vinculados */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cargando ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...
              </div>
            ) : vinculados.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sin vínculos aún.
              </p>
            ) : (
              <div className="space-y-2">
                {vinculados.map((prod) => {
                  const pxCompra = calcPxCompraFinal(prod.precioLista, prod.descuentoProducto, prod.descuentoCantidad, prod.cxTransporte);
                  return (
                    <div
                      key={prod.id}
                      className="rounded-md border border-border/50 bg-muted/30 px-3 py-2.5 space-y-2"
                    >
                      {/* Fila 1: badge + código + descripción completa */}
                      <div className="flex items-start gap-2">
                        <Badge variant="secondary" className="font-mono text-xs shrink-0 mt-0.5">
                          {prod.proveedor.prefijo}
                        </Badge>
                        <code className="text-xs text-muted-foreground shrink-0 mt-0.5">{prod.codigoExterno}</code>
                        <span className="text-xs leading-relaxed">{prod.descripcion}</span>
                      </div>

                      {/* Fila 2: precios + acciones */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-start gap-0.5">
                            <p className="text-xs tabular-nums font-medium leading-none">${fmtPrecio(pxCompra)}</p>
                            <p className="text-[10px] text-muted-foreground leading-none">Px Compra Final</p>
                          </div>
                          <div className="flex flex-col items-start gap-0.5">
                            <div className="leading-none"><DifCosto costoTienda={costoTienda} pxCompraFinal={pxCompra} /></div>
                            <p className="text-[10px] text-muted-foreground leading-none">Vs Cx Actual</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvertir(prod)}
                            disabled={isPending}
                            title="Actualizar Proveedor Dux, Costo y Cód. Externo del item con este producto"
                            className="gap-1 text-xs text-muted-foreground hover:text-primary border-border/60 hover:border-primary/50"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            Convertir en proveedor
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDesvincular(prod)}
                            disabled={isPending}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            title="Desvincular"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="px-6 py-3 border-t border-border/50 flex items-center justify-end gap-2">
            <Button
              size="sm"
              className="gap-1.5 ml-auto"
              onClick={() => setAbrirSelector(true)}
              disabled={isPending}
            >
              <Plus className="h-3.5 w-3.5" />
              Vincular nuevo producto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal selector — se abre encima del modal principal */}
      <SeleccionarProductoModal
        open={abrirSelector}
        onClose={() => setAbrirSelector(false)}
        onSeleccionar={handleSeleccionar}
        excluirItemTiendaId={itemTiendaId}
      />
    </>
  );
}
