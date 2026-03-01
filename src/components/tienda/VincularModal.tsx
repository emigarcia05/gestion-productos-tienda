"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { Link2, Plus, Loader2, X, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  marca?: string | null;
  rubro?: string | null;
  subRubro?: string | null;
  /** Prefijo o nombre del proveedor principal del ítem tienda (proveedorDux) */
  prefijoProveedor?: string | null;
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
  marca, rubro, subRubro, prefijoProveedor,
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

  const minCxVinculados = useMemo(() => {
    if (vinculados.length === 0) return 0;
    return Math.min(
      ...vinculados.map((p) =>
        calcPxCompraFinal(p.precioLista, p.descuentoProducto, p.descuentoCantidad, p.cxTransporte)
      )
    );
  }, [vinculados]);

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
          <DialogHeader className="px-6 pt-5 pb-2">
            <DialogTitle className="text-base font-semibold leading-tight">
              Vínculos con Lista Proveedores
            </DialogTitle>
          </DialogHeader>

          {/* Primer div: resumen del producto */}
          <div className="px-6 pb-4 border-b border-border/50 space-y-3">
            <p className="text-sm font-medium text-foreground leading-relaxed text-center">{itemDescripcion}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs text-center">
              <div>
                <span className="text-muted-foreground block">Prefijo proveedor</span>
                <span className="font-medium">{prefijoProveedor ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Marca</span>
                <span className="font-medium">{marca ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Rubro</span>
                <span className="font-medium">{rubro ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Subrubro</span>
                <span className="font-medium">{subRubro ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Segundo div: tabla de productos vinculados */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {cargando ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
              </div>
            ) : vinculados.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sin vínculos aún.</p>
            ) : (
              <div className="px-6 py-3">
                {vinculados.map((prod, idx) => {
                  const pxCompra = calcPxCompraFinal(prod.precioLista, prod.descuentoProducto, prod.descuentoCantidad, prod.cxTransporte);
                  const esMenorCosto = vinculados.length > 1 && pxCompra <= minCxVinculados;
                  const zebra = idx % 2 === 1 ? "bg-slate-50/80" : "bg-white";
                  return (
                    <div
                      key={prod.id}
                      className={`grid gap-2 items-center px-3 py-2.5 border-x border-b border-border/50 ${zebra} ${esMenorCosto ? "ring-2 ring-amber-400 ring-inset bg-amber-50/70" : ""}`}
                      style={{ gridTemplateColumns: "15% 20% 20% 45%" }}
                    >
                      <div className="text-center">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {prod.proveedor.prefijo}
                        </Badge>
                      </div>
                      <div className="text-center text-xs tabular-nums font-medium">
                        ${fmtPrecio(pxCompra)}
                      </div>
                      <div className="text-center font-bold">
                        <DifCosto costoTienda={costoTienda} pxCompraFinal={pxCompra} />
                      </div>
                      <div className="flex items-center gap-1 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConvertir(prod)}
                          disabled={isPending}
                          title="Marcar como proveedor principal del ítem"
                          className="gap-1 text-xs text-center leading-tight whitespace-normal h-auto py-2"
                        >
                          <ArrowRightLeft className="h-3 w-3 shrink-0" />
                          <span className="block">
                            <span className="block">Convertir en</span>
                            <span className="block">Proveedor Principal</span>
                          </span>
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Tercer div: botón Vincular nuevo producto */}
          <div className="px-6 py-3 border-t border-border/50 flex justify-end shrink-0">
            <Button
              size="sm"
              className="gap-1.5"
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
