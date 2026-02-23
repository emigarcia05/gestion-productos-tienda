"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getProveedores, buscarProductos } from "@/actions/vinculos";

type ProductoConProveedor = {
  id: string;
  codExt: string;
  codProdProv: string;
  descripcion: string;
  precioLista: number;
  proveedor: { nombre: string; sufijo: string };
};

type ProveedorSimple = { id: string; nombre: string; sufijo: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onSeleccionar: (producto: ProductoConProveedor) => void;
  excluirItemTiendaId: string;
}

function fmtPrecio(n: number) {
  return Math.round(n).toLocaleString("es-AR");
}

export default function SeleccionarProductoModal({
  open, onClose, onSeleccionar, excluirItemTiendaId,
}: Props) {
  const [proveedores, setProveedores] = useState<ProveedorSimple[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [q, setQ]                     = useState("");
  const [resultados, setResultados]   = useState<ProductoConProveedor[]>([]);
  const [buscando, setBuscando]       = useState(false);
  const [clickedId, setClickedId]     = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Cargar proveedores al abrir
  useEffect(() => {
    if (!open) return;
    getProveedores().then(setProveedores);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!open) {
      setProveedorId("");
      setQ("");
      setResultados([]);
      setClickedId(null);
    }
  }, [open]);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResultados([]); return; }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      const data = await buscarProductos(q, excluirItemTiendaId, proveedorId || undefined);
      setResultados(data as ProductoConProveedor[]);
      setBuscando(false);
    }, 400);
  }, [q, proveedorId, excluirItemTiendaId]);

  function handleProveedorChange(id: string) {
    setProveedorId(id);
    setQ("");
    setResultados([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // Doble clic = vincular
  function handleClick(prod: ProductoConProveedor) {
    if (clickedId === prod.id) {
      // Segundo clic = confirmar
      onSeleccionar(prod);
      setClickedId(null);
    } else {
      // Primer clic = seleccionar
      setClickedId(prod.id);
      // Si no hay segundo clic en 600ms, deseleccionar
      setTimeout(() => setClickedId((prev) => (prev === prod.id ? null : prev)), 600);
    }
  }

  const proveedorSeleccionado = proveedores.find((p) => p.id === proveedorId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold">
            Seleccionar producto
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Filtrá por proveedor, buscá y hacé <strong>doble clic</strong> para vincular.
          </p>
        </DialogHeader>

        {/* Filtros */}
        <div className="px-6 pb-3 space-y-2 border-b border-border/50">
          {/* Selector de proveedor */}
          <div className="relative">
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <select
              value={proveedorId}
              onChange={(e) => handleProveedorChange(e.target.value)}
              className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>[{p.sufijo}] {p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            {buscando && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                proveedorSeleccionado
                  ? `Buscar en [${proveedorSeleccionado.sufijo}] ${proveedorSeleccionado.nombre}...`
                  : "Buscar por código o descripción..."
              }
              className="w-full pl-8 pr-8 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {q && (
              <button
                onClick={() => { setQ(""); setResultados([]); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabla de resultados */}
        <div className="flex-1 overflow-y-auto">
          {q.trim().length < 2 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Escribí al menos 2 caracteres para buscar
            </div>
          ) : resultados.length === 0 && !buscando ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Sin resultados para &quot;{q}&quot;
              {proveedorSeleccionado ? ` en ${proveedorSeleccionado.nombre}` : ""}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b border-border/50">
                <tr>
                  <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium w-20">Prov.</th>
                  <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium w-28">Cód. Ext.</th>
                  <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Descripción</th>
                  <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium w-24">Px Lista</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((prod) => {
                  const seleccionado = clickedId === prod.id;
                  return (
                    <tr
                      key={prod.id}
                      onClick={() => handleClick(prod)}
                      className={`border-b border-border/30 cursor-pointer select-none transition-colors ${
                        seleccionado
                          ? "bg-primary/10 border-primary/30"
                          : "hover:bg-muted/30"
                      }`}
                      title="Doble clic para vincular"
                    >
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={seleccionado ? "default" : "secondary"} className="font-mono text-xs">
                          {prod.proveedor.sufijo}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <code className="text-xs text-muted-foreground">{prod.codExt}</code>
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs">
                        {seleccionado
                          ? <span className="font-medium">{prod.descripcion} <span className="text-primary text-[10px]">← clic de nuevo para vincular</span></span>
                          : prod.descripcion
                        }
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-xs">
                        ${fmtPrecio(prod.precioLista)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            {resultados.length > 0 && `${resultados.length} resultado(s)`}
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
