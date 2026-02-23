"use client";

import { useState, useTransition, useEffect } from "react";
import { Link2, Wand2, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getVinculos, vincularProducto, desvincularProducto, autoVincular,
} from "@/actions/vinculos";
import SeleccionarProductoModal from "./SeleccionarProductoModal";

type ProductoConProveedor = {
  id: string;
  codExt: string;
  codProdProv: string;
  descripcion: string;
  precioLista: number;
  proveedor: { nombre: string; sufijo: string };
};

interface Props {
  itemTiendaId: string;
  itemDescripcion: string;
  codigoExterno: string | null;
  cantidadVinculos: number;
}

function fmtPrecio(n: number) {
  return Math.round(n).toLocaleString("es-AR");
}

export default function VincularModal({
  itemTiendaId, itemDescripcion, codigoExterno, cantidadVinculos: cantidadInicial,
}: Props) {
  const [open, setOpen]                   = useState(false);
  const [abrirSelector, setAbrirSelector] = useState(false);
  const [vinculados, setVinculados]       = useState<ProductoConProveedor[]>([]);
  const [cargando, setCargando]           = useState(false);
  const [cantidad, setCantidad]           = useState(cantidadInicial);
  const [isPending, startTransition]      = useTransition();

  // Cargar vínculos al abrir
  useEffect(() => {
    if (!open) return;
    setCargando(true);
    getVinculos(itemTiendaId).then((data) => {
      setVinculados(data as ProductoConProveedor[]);
      setCargando(false);
    });
  }, [open, itemTiendaId]);

  function handleDesvincular(producto: ProductoConProveedor) {
    startTransition(async () => {
      const res = await desvincularProducto(itemTiendaId, producto.id);
      if (res.ok) {
        setVinculados((prev) => prev.filter((p) => p.id !== producto.id));
        setCantidad((c) => Math.max(0, c - 1));
        toast.success(`Desvinculado: ${producto.codExt}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleAutoVincular() {
    startTransition(async () => {
      const res = await autoVincular(itemTiendaId);
      if (res.ok) {
        toast.success(`Auto-vinculado: ${res.data.vinculados} producto(s) nuevos`);
        const data = await getVinculos(itemTiendaId);
        setVinculados(data as ProductoConProveedor[]);
        setCantidad(data.length);
      } else {
        toast.error(res.error);
      }
    });
  }

  // Llamado desde SeleccionarProductoModal al hacer doble clic
  async function handleSeleccionar(producto: ProductoConProveedor) {
    setAbrirSelector(false);
    startTransition(async () => {
      const res = await vincularProducto(itemTiendaId, producto.id);
      if (res.ok) {
        setVinculados((prev) => [...prev, producto]);
        setCantidad((c) => c + 1);
        toast.success(`Vinculado: ${producto.codExt}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            title="Gestionar vínculos con Lista Proveedores"
          >
            <Link2 className="h-3.5 w-3.5" />
            {cantidad > 0 && (
              <span className="tabular-nums font-medium text-primary">{cantidad}</span>
            )}
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-5 pb-3">
            <DialogTitle className="text-base font-semibold leading-tight">
              Vínculos con Lista Proveedores
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1 truncate">{itemDescripcion}</p>
            {codigoExterno && (
              <p className="text-xs text-muted-foreground">
                Código externo:{" "}
                <code className="bg-muted px-1 rounded">{codigoExterno}</code>
              </p>
            )}
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
                {vinculados.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-muted/30 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="font-mono text-xs shrink-0">
                        {prod.proveedor.sufijo}
                      </Badge>
                      <code className="text-xs text-muted-foreground shrink-0">{prod.codExt}</code>
                      <span className="text-xs truncate">{prod.descripcion}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        ${fmtPrecio(prod.precioLista)}
                      </span>
                      <button
                        onClick={() => handleDesvincular(prod)}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Desvincular"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="px-6 py-3 border-t border-border/50 flex items-center justify-between gap-2">
            {codigoExterno && (
              <Button
                size="sm" variant="ghost"
                className="gap-1.5 text-xs text-muted-foreground"
                onClick={handleAutoVincular}
                disabled={isPending}
              >
                {isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Wand2 className="h-3.5 w-3.5" />
                }
                Auto-vincular por código externo
              </Button>
            )}
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
