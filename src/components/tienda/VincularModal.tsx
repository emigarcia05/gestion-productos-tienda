"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Link2, Unlink, Wand2, Search, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getVinculos,
  buscarProductos,
  vincularProducto,
  desvincularProducto,
  autoVincular,
} from "@/actions/vinculos";

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
  itemTiendaId,
  itemDescripcion,
  codigoExterno,
  cantidadVinculos: cantidadInicial,
}: Props) {
  const [open, setOpen] = useState(false);
  const [vinculados, setVinculados] = useState<ProductoConProveedor[]>([]);
  const [resultados, setResultados] = useState<ProductoConProveedor[]>([]);
  const [q, setQ] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cantidad, setCantidad] = useState(cantidadInicial);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar vínculos al abrir
  useEffect(() => {
    if (!open) return;
    setCargando(true);
    getVinculos(itemTiendaId).then((data) => {
      setVinculados(data as ProductoConProveedor[]);
      setCargando(false);
    });
  }, [open, itemTiendaId]);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResultados([]); return; }
    debounceRef.current = setTimeout(() => {
      buscarProductos(q, itemTiendaId).then((data) => {
        setResultados(data as ProductoConProveedor[]);
      });
    }, 400);
  }, [q, itemTiendaId]);

  function handleVincular(producto: ProductoConProveedor) {
    startTransition(async () => {
      const res = await vincularProducto(itemTiendaId, producto.id);
      if (res.ok) {
        setVinculados((prev) => [...prev, producto]);
        setResultados((prev) => prev.filter((p) => p.id !== producto.id));
        setCantidad((c) => c + 1);
        toast.success(`Vinculado: ${producto.codExt}`);
      } else {
        toast.error(res.error);
      }
    });
  }

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
        // Recargar vínculos
        const data = await getVinculos(itemTiendaId);
        setVinculados(data as ProductoConProveedor[]);
        setCantidad(data.length);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
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

      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold leading-tight">
            Vínculos con Lista Proveedores
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 truncate">{itemDescripcion}</p>
          {codigoExterno && (
            <p className="text-xs text-muted-foreground">
              Código externo: <code className="bg-muted px-1 rounded">{codigoExterno}</code>
            </p>
          )}
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Productos ya vinculados */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Vinculados ({vinculados.length})
              </h3>
              {codigoExterno && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleAutoVincular}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  Auto-vincular
                </Button>
              )}
            </div>

            {cargando ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...
              </div>
            ) : vinculados.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3">
                Sin vínculos. Usá el buscador o "Auto-vincular" para agregar.
              </p>
            ) : (
              <div className="space-y-1.5">
                {vinculados.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-muted/30 px-3 py-2"
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

          <Separator />

          {/* Buscador para agregar nuevos vínculos */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Agregar vínculo
            </h3>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por código o descripción..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {resultados.length > 0 && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {resultados.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
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
                        onClick={() => handleVincular(prod)}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Vincular"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {q.trim().length >= 2 && resultados.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin resultados para "{q}".</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
