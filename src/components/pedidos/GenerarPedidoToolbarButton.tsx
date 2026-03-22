"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import {
  TIPOS_PEDIDO,
  type SucursalPedido,
  type TipoPedido,
} from "@/lib/pedidos";
import { generarPdfEnviarPedidoAction } from "@/actions/pedidos";

const SUCURSALES: { value: SucursalPedido; label: string }[] = [
  { value: "guaymallen", label: "GUAYMALLÉN" },
  { value: "maipu", label: "MAIPÚ" },
];

const OPCIONES_TIPO: { value: TipoPedido; label: string }[] = [
  { value: "URGENTE", label: "URGENTE" },
  { value: "TINTOMETRICO", label: "TINTOMÉTRICO" },
  { value: "REPOSICION", label: "REPOSICIÓN" },
];

export type ModuloGenerarPedidoOrigen =
  | "enviar"
  | "urgente"
  | "tintometrico"
  | "reposicion";

export interface ProveedorGenerarPedidoOpcion {
  id: string;
  nombre: string;
  prefijo: string;
}

function descargarPdfBase64(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function tiposInicialesParaModulo(
  modulo: ModuloGenerarPedidoOrigen,
  desdePagina: TipoPedido[]
): TipoPedido[] {
  const set = new Set<TipoPedido>(desdePagina);
  if (modulo === "urgente") set.add("URGENTE");
  if (modulo === "tintometrico") set.add("TINTOMETRICO");
  if (modulo === "reposicion") set.add("REPOSICION");
  return TIPOS_PEDIDO.filter((t) => set.has(t));
}

interface Props {
  proveedores: ProveedorGenerarPedidoOpcion[];
  defaultSucursal: SucursalPedido | "";
  defaultProveedor: string;
  defaultTipos: TipoPedido[];
  modulo: ModuloGenerarPedidoOrigen;
  /** Texto del botón que abre el modal (title case). */
  triggerLabel?: string;
  triggerClassName?: string;
  triggerSize?: ComponentProps<typeof Button>["size"];
}

export default function GenerarPedidoToolbarButton({
  proveedores,
  defaultSucursal,
  defaultProveedor,
  defaultTipos,
  modulo,
  triggerLabel = "Generar Pedido",
  triggerClassName,
  triggerSize = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const [sucursal, setSucursal] = useState<SucursalPedido | "">("");
  const [proveedor, setProveedor] = useState("");
  const [tipos, setTipos] = useState<TipoPedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [multiTipoOpen, setMultiTipoOpen] = useState(false);
  const multiRef = useRef<HTMLDivElement>(null);

  const aplicarDefaults = useCallback(() => {
    setSucursal(defaultSucursal);
    setProveedor(defaultProveedor.trim());
    setTipos(tiposInicialesParaModulo(modulo, defaultTipos));
  }, [defaultSucursal, defaultProveedor, defaultTipos, modulo]);

  useEffect(() => {
    if (open) aplicarDefaults();
  }, [open, aplicarDefaults]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (multiRef.current && !multiRef.current.contains(e.target as Node)) {
        setMultiTipoOpen(false);
      }
    }
    if (multiTipoOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [multiTipoOpen]);

  const puedeGenerar =
    !!sucursal && !!proveedor.trim() && tipos.length > 0;

  const labelTipo =
    tipos.length === 0
      ? "TIPO DE PEDIDO"
      : tipos.length === TIPOS_PEDIDO.length
        ? "TODOS"
        : tipos
            .map((t) => OPCIONES_TIPO.find((o) => o.value === t)?.label ?? t)
            .join(", ");

  function toggleTipo(t: TipoPedido) {
    setTipos((prev) =>
      prev.includes(t) ? prev.filter((k) => k !== t) : [...prev, t]
    );
  }

  async function handleGenerar() {
    if (!puedeGenerar || !sucursal) {
      toast.error("Completá sucursal, proveedor y al menos un tipo de pedido.");
      return;
    }
    setLoading(true);
    try {
      const result = await generarPdfEnviarPedidoAction({
        proveedorId: proveedor.trim(),
        sucursal,
        tipos,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { pdfBase64, filename, sentViaWhatsApp } = result.data!;
      if (sentViaWhatsApp) {
        toast.success("Pedido generado y enviado al proveedor.");
        setOpen(false);
        return;
      }
      descargarPdfBase64(pdfBase64, filename);
      toast.success(`PDF generado: ${filename}`);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="default"
        size={triggerSize}
        onClick={() => setOpen(true)}
        className={cn("gap-2", triggerClassName)}
        aria-label={triggerLabel}
      >
        <Send className="h-4 w-4" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <AppModal
          title="Generar Pedido"
          size="md"
          padding="sm"
          scrollBody={false}
          headerClassName="pt-4 pb-3"
          footerClassName="py-3"
          actions={
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleGenerar}
                disabled={!puedeGenerar || loading}
                className="gap-2"
                aria-label="Generar Pedido"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Generar Pedido
              </Button>
            </div>
          }
        >
          <div className="flex w-full min-w-0 flex-col gap-4">
            <div className="w-full min-w-0">
              <Select
                value={sucursal || "none"}
                onValueChange={(v) =>
                  setSucursal(v === "none" ? "" : (v as SucursalPedido))
                }
              >
                <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                  <SelectValue placeholder="SUCURSAL" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value="none">SUCURSAL</SelectItem>
                  {SUCURSALES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full min-w-0">
              <Select
                value={proveedor || "none"}
                onValueChange={(v) => setProveedor(v === "none" ? "" : v)}
              >
                <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                  <SelectValue placeholder="PROVEEDOR" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value="none">PROVEEDOR</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      [{p.prefijo}] {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative w-full min-w-0" ref={multiRef}>
              <button
                type="button"
                onClick={() => setMultiTipoOpen((o) => !o)}
                className={cn(
                  SELECT_TRIGGER_FILTER_CLASS,
                  "flex w-full items-center justify-between gap-2 text-left font-semibold"
                )}
                aria-expanded={multiTipoOpen}
                aria-haspopup="listbox"
                aria-label="Tipo de pedido (selección múltiple)"
              >
                <span className="truncate">{labelTipo}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </button>
              {multiTipoOpen && (
                <div
                  className="absolute top-full left-0 z-50 mt-1 min-w-full rounded-md border border-border bg-popover p-1 shadow-md"
                  role="listbox"
                  aria-multiselectable="true"
                >
                  {OPCIONES_TIPO.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={tipos.includes(opt.value)}
                        onChange={() => toggleTipo(opt.value)}
                        className="h-4 w-4 rounded border-border"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AppModal>
      </Dialog>
    </>
  );
}
