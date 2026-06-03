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
import ModalFeedbackRegion from "@/components/shared/ModalFeedbackRegion";
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
  listarProveedoresConPedidoActivoAction,
} from "@/actions/pedidos";
import { descargarPdfBase64 } from "@/lib/descargarPdfBase64";
import SobreStockReposicionAdvertenciaModal from "@/components/shared/SobreStockReposicionAdvertenciaModal";
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
  /** Tras generar con éxito (antes del refresh de Next). Útil para limpiar estado local en Pedido Urgente. */
  onGeneradoExito?: () => void;
}

export default function GenerarPedidoToolbarButton({
  proveedores: _proveedores,
  defaultSucursal,
  defaultProveedor,
  defaultTipos,
  modulo,
  triggerLabel = "Generar Pedido",
  triggerClassName,
  triggerSize = "sm",
  onGeneradoExito,
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
  const [proveedoresActivos, setProveedoresActivos] = useState<ProveedorGenerarPedidoOpcion[]>([]);
  const [cargandoProveedores, setCargandoProveedores] = useState(false);
  const verificarSeqRef = useRef(0);
  const proveedoresSeqRef = useRef(0);

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
      setProveedoresActivos([]);
      setCargandoProveedores(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !sucursal || tipos.length === 0) {
      setProveedoresActivos([]);
      if (!sucursal || tipos.length === 0) setProveedor("");
      return;
    }

    const seq = ++proveedoresSeqRef.current;
    setCargandoProveedores(true);
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const res = await listarProveedoresConPedidoActivoAction({
          sucursal,
          tipos,
        });
        if (seq !== proveedoresSeqRef.current) return;
        setCargandoProveedores(false);
        if (!res.ok) {
          setProveedoresActivos([]);
          return;
        }
        const lista = res.data.proveedores;
        setProveedoresActivos(lista);
        setProveedor((actual) => {
          const pid = actual.trim();
          if (!pid) return "";
          return lista.some((p) => p.id === pid) ? pid : "";
        });
      })();
    }, 280);

    return () => window.clearTimeout(timeoutId);
  }, [open, sucursal, tipos]);

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
  if (tipos.length === 0) faltantes.push("TIPO DE PEDIDO");
  if (!proveedor.trim()) faltantes.push("PROVEEDOR");

  const mensajeFaltantes =
    faltantes.length > 0
      ? `FALTA SELECCIONAR: ${faltantes.join(", ")}.`
      : null;

  const puedeGenerar =
    filtrosCompletos && hayItems === true && !verificandoItems && !errorVerificacion;

  const labelTipo = !sucursal
    ? "TIPO DE PEDIDO (elegí sucursal)"
    : tipos.length === 0
      ? "TIPO DE PEDIDO"
      : tipos.length === TIPOS_PEDIDO.length
        ? "TODOS"
        : tipos
            .map((t) => OPCIONES_TIPO.find((o) => o.value === t)?.label ?? t)
            .join(", ");

  /** Tras `SOBRESTOCK_REQUIERE_CONFIRMACION` del servidor, carga ítems y abre el modal. */
  async function abrirModalSobrestockDesdeServidor(): Promise<void> {
    const proveedorId = proveedor.trim();
    if (!sucursal || !proveedorId || tipos.length === 0) return;

    const res = await getSobreStockReposicionParaModalAction({
      proveedorId,
      sucursal,
      tipos: [...tipos],
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (!res.data.tieneSobreStock) {
      toast.error(
        "No se pudo mostrar el detalle de sobrestock. Volvé a intentar generar el pedido."
      );
      return;
    }
    setSobreStockItems(res.data.items);
    setSobreStockOpen(true);
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
      const result = await generarPdfEnviarPedidoAction({
        proveedorId: proveedor.trim(),
        sucursal,
        tipos,
      });
      if (!result.ok) {
        const prefix = "SOBRESTOCK_REQUIERE_CONFIRMACION:";
        if (result.error.startsWith(prefix)) {
          await abrirModalSobrestockDesdeServidor();
          return;
        }
        toast.error(result.error);
        return;
      }
      const { pdfBase64, filename, sentViaWhatsApp } = result.data!;
      onGeneradoExito?.();
      router.refresh();
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

  async function handlePedirAlProveedorIgual(
    ajustesSobreStock: Array<{ idItemPedidoEnvio: string; cantPedir: number }>
  ) {
    if (!sucursal) return;
    setLoading(true);
    try {
      const result = await generarPdfEnviarPedidoAction({
        proveedorId: proveedor.trim(),
        sucursal,
        tipos,
        confirmarSobreStock: true,
        ajustesSobreStock,
      });
      if (!result.ok) {
        const prefix = "SOBRESTOCK_REQUIERE_CONFIRMACION:";
        if (result.error.startsWith(prefix)) {
          await abrirModalSobrestockDesdeServidor();
          return;
        }
        toast.error(result.error);
        return;
      }

      const { pdfBase64, filename, sentViaWhatsApp } = result.data!;
      onGeneradoExito?.();
      router.refresh();
      setSobreStockOpen(false);

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
                value={sucursal || undefined}
                onValueChange={(v) => {
                  const next = v as SucursalPedido;
                  setSucursal(next);
                  setTipos([]);
                  setProveedor("");
                }}
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
                  {SUCURSALES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full min-w-0">
              <DropdownMenu.Root
                modal={false}
                open={multiTipoOpen}
                onOpenChange={(next) => {
                  if (!sucursal) return;
                  setMultiTipoOpen(next);
                }}
              >
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    disabled={!sucursal}
                    className={cn(
                      SELECT_TRIGGER_FILTER_CLASS,
                      "flex h-auto min-h-9 w-full items-center justify-between gap-2 py-2 text-left font-semibold whitespace-normal",
                      !sucursal && "pointer-events-none opacity-50"
                    )}
                    aria-expanded={multiTipoOpen}
                    aria-haspopup="menu"
                    aria-disabled={!sucursal}
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
                    {OPCIONES_TIPO.map((opt) => {
                      const selected = tipos.includes(opt.value);
                      return (
                        <DropdownMenu.Item
                          key={opt.value}
                          className={cn(
                            "cursor-pointer rounded-sm px-2 py-1.5 text-sm font-medium outline-none select-none",
                            "focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-muted"
                          )}
                          onSelect={(e) => e.preventDefault()}
                          asChild
                        >
                          <label className="flex w-full cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {
                                if (selected) {
                                  setTipos((prev) => {
                                    const next = prev.filter((k) => k !== opt.value);
                                    if (next.length === 0) setProveedor("");
                                    return next;
                                  });
                                } else {
                                  setTipos((prev) =>
                                    prev.includes(opt.value) ? prev : [...prev, opt.value]
                                  );
                                }
                              }}
                              className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                              aria-label={opt.label}
                            />
                            <span>{opt.label}</span>
                          </label>
                        </DropdownMenu.Item>
                      );
                    })}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>

            <div className="w-full min-w-0">
              <Select
                value={proveedor || undefined}
                onValueChange={(v) => setProveedor(v)}
                disabled={!sucursal || tipos.length === 0 || cargandoProveedores}
              >
                <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                  <SelectValue
                    placeholder={
                      !sucursal
                        ? "PROVEEDOR (elegí sucursal y tipo)"
                        : tipos.length === 0
                          ? "PROVEEDOR (elegí tipo de pedido)"
                          : cargandoProveedores
                            ? "PROVEEDOR…"
                            : proveedoresActivos.length === 0
                              ? "SIN PROVEEDORES CON PEDIDO"
                              : "PROVEEDOR"
                    }
                  />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  {proveedoresActivos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      [{p.prefijo}] {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ModalFeedbackRegion>
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
                  <p className="text-sm leading-snug text-muted-foreground uppercase tracking-wide">
                    COMPROBANDO ÍTEMS…
                  </p>
                </div>
              ) : filtrosCompletos && hayItems === false ? (
                <div className="flex max-w-full flex-col items-center justify-center gap-2">
                  <AlertCircle
                    className="h-5 w-5 shrink-0 text-destructive"
                    aria-hidden
                  />
                  <p className="text-sm leading-snug text-muted-foreground uppercase tracking-wide">
                    NO HAY ÍTEMS PARA ESTA COMBINACIÓN DE FILTROS.
                  </p>
                </div>
              ) : filtrosCompletos && hayItems === true ? (
                <div className="flex max-w-full flex-col items-center justify-center gap-2">
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <p className="text-sm font-medium leading-snug text-foreground uppercase tracking-wide">
                    LISTO PARA GENERAR EL PEDIDO.
                  </p>
                </div>
              ) : null}
            </ModalFeedbackRegion>
          </div>
        </AppModal>
      </Dialog>

      <SobreStockReposicionAdvertenciaModal
        open={sobreStockOpen}
        onOpenChange={(v) => setSobreStockOpen(v)}
        items={sobreStockItems}
        pending={loading}
        onPedirAlProveedorIgual={handlePedirAlProveedorIgual}
      />
    </>
  );
}
