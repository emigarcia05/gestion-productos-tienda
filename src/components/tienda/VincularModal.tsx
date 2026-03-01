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
  if (costoTienda <= 0 || pxCompraFinal <= 0) return <span className="variacion-costo--neutra">—</span>;
  const dif = ((pxCompraFinal - costoTienda) / costoTienda) * 100;
  const abs = Math.abs(dif);
  if (abs < UMBRAL_PCT) return <span className="variacion-costo--neutra">≈0%</span>;
  const absFmt = abs.toFixed(1);
  if (dif > 0) {
    return (
      <span className="variacion-costo--positiva" title={`Px Compra Final es ${absFmt}% más caro que Cx Actual`}>
        +{absFmt}%
      </span>
    );
  }
  return (
    <span className="variacion-costo--negativa" title={`Px Compra Final es ${absFmt}% más económico que Cx Actual`}>
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

        <DialogContent className="modal-app">
          <DialogHeader className="modal-app__header">
            <DialogTitle className="modal-app__title">
              Vínculos con Lista Proveedores
            </DialogTitle>
          </DialogHeader>

          {/* Primer div: resumen del producto */}
          <div className="modal-resumen-producto">
            <p className="modal-resumen-producto__titulo">{itemDescripcion}</p>
            <div className="modal-resumen-producto__grid">
              <div>
                <span className="modal-resumen-producto__label">Prefijo proveedor</span>
                <span className="modal-resumen-producto__valor">{prefijoProveedor ?? "—"}</span>
              </div>
              <div>
                <span className="modal-resumen-producto__label">Marca</span>
                <span className="modal-resumen-producto__valor">{marca ?? "—"}</span>
              </div>
              <div>
                <span className="modal-resumen-producto__label">Rubro</span>
                <span className="modal-resumen-producto__valor">{rubro ?? "—"}</span>
              </div>
              <div>
                <span className="modal-resumen-producto__label">Subrubro</span>
                <span className="modal-resumen-producto__valor">{subRubro ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Segundo div: tabla de productos vinculados */}
          <div className="modal-panel-scroll modal-panel-scroll--borde-primary">
            {cargando ? (
              <div className="modal-mensaje-carga">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
              </div>
            ) : vinculados.length === 0 ? (
              <p className="modal-mensaje-vacio">Sin vínculos aún.</p>
            ) : (
              <div className="modal-vinculos-listado-contenedor">
                {vinculados.map((prod, idx) => {
                  const pxCompra = calcPxCompraFinal(prod.precioLista, prod.descuentoProducto, prod.descuentoCantidad, prod.cxTransporte);
                  const esMenorCosto = vinculados.length > 1 && pxCompra <= minCxVinculados;
                  const zebra = idx % 2 === 1 ? "modal-vinculos-fila--zebra-par" : "modal-vinculos-fila--zebra-impar";
                  return (
                    <div
                      key={prod.id}
                      className={`modal-vinculos-fila ${zebra} ${esMenorCosto ? "modal-vinculos-fila--destacado" : ""}`}
                    >
                      <div className="modal-vinculos-celda">
                        <Badge variant="secondary" className="modal-vinculos-prefijo">
                          {prod.proveedor.prefijo}
                        </Badge>
                      </div>
                      <div className="modal-vinculos-celda modal-vinculos-celda--numero">
                        ${fmtPrecio(pxCompra)}
                      </div>
                      <div className="modal-vinculos-celda modal-vinculos-celda--variacion">
                        <DifCosto costoTienda={costoTienda} pxCompraFinal={pxCompra} />
                      </div>
                      <div className="modal-vinculos-celda modal-vinculos-celda--acciones">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConvertir(prod)}
                          disabled={isPending}
                          title="Marcar como proveedor principal del ítem"
                          className="btn-convertir-proveedor-principal"
                        >
                          <ArrowRightLeft className="h-3 w-3 shrink-0" />
                          <span className="block">
                            <span className="block">Proveedor</span>
                            <span className="block">Principal</span>
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDesvincular(prod)}
                          disabled={isPending}
                          className="btn-desvincular-icono"
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
          <div className="modal-vinculos-footer">
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
