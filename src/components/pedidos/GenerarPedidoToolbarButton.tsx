"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { useRouter } from "next/navigation";
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
import { DropdownMenu } from "radix-ui";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import {
  TIPOS_PEDIDO,
  type SucursalPedido,
  type TipoPedido,
} from "@/lib/pedidos";
import {
  comprobarItemsParaGenerarPedidoAction,
  generarPdfEnviarPedidoAction,
  getSobreStockReposicionParaModalAction,
} from "@/actions/pedidos";
import { descargarPdfBase64 } from "@/lib/descargarPdfBase64";
import SobreStockReposicionAdvertenciaModal from "@/components/pedidos/SobreStockReposicionAdvertenciaModal";
import type { SobreStockReposicionItem } from "@/services/sobreStock.service";

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sucursal, setSucursal] = useState<SucursalPedido | "">("");
  const [proveedor, setProveedor] = useState("");
  const [tipos, setTipos] = useState<TipoPedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [sobreStockOpen, setSobreStockOpen] = useState(false);
  const [sobreStockItems, setSobreStockItems] = useState<
    SobreStockReposicionItem[]
  >([]);
  const [multiTipoOpen, setMultiTipoOpen] = useState(false);
  const [hayItems, setHayItems] = useState<boolean | null>(null);
  const [verificandoItems, setVerificandoItems] = useState(false);
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null);
  const verificarSeqRef = useRef(0);

  const aplicarDefaults = useCallback(() => {
    setSucursal(defaultSucursal);
    setProveedor(defaultProveedor.trim());
    setTipos(tiposInicialesParaModulo(modulo, defaultTipos));
  }, [defaultSucursal, defaultProveedor, defaultTipos, modulo]);

  useEffect(() => {
    if (open) aplicarDefaults();
  }, [open, aplicarDefaults]);

  useEffect(() => {
    if (!open) {
      setMultiTipoOpen(false);
      setHayItems(null);
      setVerificandoItems(false);
      setErrorVerificacion(null);
      setSobreStockOpen(false);
      setSobreStockItems([]);
    }
  }, [open]);

  const filtrosCompletos =
    !!sucursal && !!proveedor.trim() && tipos.length > 0;

  useEffect(() => {
    if (!open || !filtrosCompletos || !sucursal) {
      setHayItems(null);
      setVerificandoItems(false);
      setErrorVerificacion(null);
      return;
    }

    setVerificandoItems(true);
    setHayItems(null);
    setErrorVerificacion(null);
    const seq = ++verificarSeqRef.current;
    const proveedorId = proveedor.trim();
    const tiposSnapshot = [...tipos];

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const res = await comprobarItemsParaGenerarPedidoAction({
          proveedorId,
          sucursal,
          tipos: tiposSnapshot,
        });
        if (seq !== verificarSeqRef.current) return;
        setVerificandoItems(false);
        if (!res.ok) {
          setErrorVerificacion(res.error);
          setHayItems(null);
          return;
        }
        setHayItems(res.data.hayItems);
      })();
    }, 320);

    return () => window.clearTimeout(timeoutId);
  }, [open, filtrosCompletos, sucursal, proveedor, tipos]);

  const faltantes: string[] = [];
  if (!sucursal) faltantes.push("SUCURSAL");
  if (!proveedor.trim()) faltantes.push("PROVEEDOR");
  if (tipos.length === 0) faltantes.push("TIPO DE PEDIDO");

  const mensajeFaltantes =
    faltantes.length > 0
      ? `Falta seleccionar: ${faltantes.join(", ")}.`
      : null;

  const puedeGenerar =
    filtrosCompletos && hayItems === true && !verificandoItems && !errorVerificacion;

  const labelTipo =
    tipos.length === 0
      ? "TIPO DE PEDIDO"
      : tipos.length === TIPOS_PEDIDO.length
        ? "TODOS"
        : tipos
            .map((t) => OPCIONES_TIPO.find((o) => o.value === t)?.label ?? t)
            .join(", ");

  async function abrirModalSobreStock() {
    const proveedorId = proveedor.trim();
    const tiposSnapshot = [...tipos];
    if (!sucursal || !proveedorId || tiposSnapshot.length === 0) return false;

    const res = await getSobreStockReposicionParaModalAction({
      proveedorId,
      sucursal,
      tipos: tiposSnapshot,
    });
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    if (!res.data.tieneSobreStock) return false;

    setSobreStockItems(res.data.items);
    setSobreStockOpen(true);
    return true;
  }

  async function handleGenerar() {
    if (!puedeGenerar || !sucursal || hayItems !== true) {
      toast.error(
        "Completá los filtros y asegurate de que haya ítems para generar el pedido."
      );
      return;
    }
    setLoading(true);
    try {
      // Validacion opcional: sobrestock en REPOSICION requiere confirmacion.
      if (tipos.includes("REPOSICION")) {
        const opened = await abrirModalSobreStock();
        if (opened) return;
      }

      const result = await generarPdfEnviarPedidoAction({
        proveedorId: proveedor.trim(),
        sucursal,
        tipos,
      });
      if (!result.ok) {
        const prefix = "SOBRESTOCK_REQUIERE_CONFIRMACION:";
        if (result.error.startsWith(prefix)) {
          const reopened = await abrirModalSobreStock();
          if (reopened) return;
        }
        toast.error(result.error);
        return;
      }
      const { pdfBase64, filename, sentViaWhatsApp } = result.data!;
      if (sentViaWhatsApp) {
        toast.success("Pedido generado y enviado al proveedor.");
        setOpen(false);
        router.refresh();
        return;
      }
      descargarPdfBase64(pdfBase64, filename);
      toast.success(`PDF generado: ${filename}`);
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handlePedirAlProveedorIgual() {
    if (!sucursal) return;
    setLoading(true);
    try {
      const result = await generarPdfEnviarPedidoAction({
        proveedorId: proveedor.trim(),
        sucursal,
        tipos,
        bloquearSiSobreStock: true,
        confirmarSobreStock: true,
      });
      if (!result.ok) {
        const prefix = "SOBRESTOCK_REQUIERE_CONFIRMACION:";
        if (result.error.startsWith(prefix)) {
          const reopened = await abrirModalSobreStock();
          if (reopened) return;
        }
        toast.error(result.error);
        return;
      }

      const { pdfBase64, filename, sentViaWhatsApp } = result.data!;
      setSobreStockOpen(false);

      if (sentViaWhatsApp) {
        toast.success("Pedido generado y enviado al proveedor.");
        setOpen(false);
        router.refresh();
        return;
      }

      descargarPdfBase64(pdfBase64, filename);
      toast.success(`PDF generado: ${filename}`);
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handlePreferirTransferencia() {
    setSobreStockOpen(false);
    setOpen(false);
    toast.warning("Transferencia no disponible aun. El pedido quedo cancelado.");
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
                onClick={() => {
                  setOpen(false);
                  setSobreStockOpen(false);
                  setSobreStockItems([]);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleGenerar}
                disabled={!puedeGenerar || loading || verificandoItems}
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

            <div className="w-full min-w-0">
              <DropdownMenu.Root
                modal={false}
                open={multiTipoOpen}
                onOpenChange={setMultiTipoOpen}
              >
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className={cn(
                      SELECT_TRIGGER_FILTER_CLASS,
                      "flex h-auto min-h-9 w-full items-center justify-between gap-2 py-2 text-left font-semibold whitespace-normal"
                    )}
                    aria-expanded={multiTipoOpen}
                    aria-haspopup="menu"
                    aria-label="Tipo de pedido (selección múltiple)"
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {labelTipo}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 opacity-50 transition-transform",
                        multiTipoOpen && "rotate-180"
                      )}
                    />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className={cn(
                      "select-content-filtro z-[200] max-h-[min(18rem,var(--radix-dropdown-menu-content-available-height))] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
                      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                    )}
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    collisionPadding={8}
                  >
                    {OPCIONES_TIPO.map((opt) => (
                      <DropdownMenu.CheckboxItem
                        key={opt.value}
                        className={cn(
                          "relative flex cursor-pointer items-center gap-2 rounded-sm py-2 pr-8 pl-2 text-sm font-medium outline-none select-none",
                          "focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-muted"
                        )}
                        checked={tipos.includes(opt.value)}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setTipos((prev) =>
                              prev.includes(opt.value) ? prev : [...prev, opt.value]
                            );
                          } else {
                            setTipos((prev) => prev.filter((k) => k !== opt.value));
                          }
                        }}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <DropdownMenu.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center text-primary">
                          <Check className="size-4" aria-hidden />
                        </DropdownMenu.ItemIndicator>
                        {opt.label}
                      </DropdownMenu.CheckboxItem>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>

            <div
              className="flex min-h-[5rem] flex-col items-center justify-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-center"
              role="status"
              aria-live="polite"
            >
              {mensajeFaltantes ? (
                <div className="flex max-w-full flex-col items-center justify-center gap-2">
                  <AlertCircle
                    className="h-5 w-5 shrink-0 text-destructive"
                    aria-hidden
                  />
                  <p className="text-sm leading-snug text-foreground">
                    {mensajeFaltantes}
                  </p>
                </div>
              ) : errorVerificacion ? (
                <div className="flex max-w-full flex-col items-center justify-center gap-2">
                  <AlertCircle
                    className="h-5 w-5 shrink-0 text-destructive"
                    aria-hidden
                  />
                  <p className="text-sm leading-snug text-destructive">
                    {errorVerificacion}
                  </p>
                </div>
              ) : verificandoItems ? (
                <div className="flex max-w-full flex-col items-center justify-center gap-2">
                  <Loader2
                    className="h-5 w-5 shrink-0 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                  <p className="text-sm leading-snug text-muted-foreground">
                    Comprobando ítems…
                  </p>
                </div>
              ) : filtrosCompletos && hayItems === false ? (
                <div className="flex max-w-full flex-col items-center justify-center gap-2">
                  <AlertCircle
                    className="h-5 w-5 shrink-0 text-destructive"
                    aria-hidden
                  />
                  <p className="text-sm leading-snug text-muted-foreground">
                    No hay ítems para esta combinación de filtros.
                  </p>
                </div>
              ) : filtrosCompletos && hayItems === true ? (
                <div className="flex max-w-full flex-col items-center justify-center gap-2">
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <p className="text-sm font-medium leading-snug text-foreground">
                    Listo para generar el pedido.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </AppModal>
      </Dialog>

      <SobreStockReposicionAdvertenciaModal
        open={sobreStockOpen}
        onOpenChange={(v) => setSobreStockOpen(v)}
        items={sobreStockItems}
        pending={loading}
        onPedirAlProveedorIgual={handlePedirAlProveedorIgual}
        onPreferirTransferencia={handlePreferirTransferencia}
      />
    </>
  );
}
