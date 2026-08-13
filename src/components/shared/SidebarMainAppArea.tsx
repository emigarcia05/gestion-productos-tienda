"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getIndicadorSlidenavAction,
  type IndicadorSlidenavDto,
} from "@/actions/stock";
import {
  EVENTO_INDICADOR_SLIDENAV,
} from "@/lib/indicadorSlidenav";
import {
  EVENTO_SUCURSAL_PREFERIDA,
  leerSucursalPreferida,
} from "@/lib/sucursalPreferida";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { CALLOUT_WARNING_CLASS } from "@/lib/ui-classes";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";

export interface SidebarMainAppAreaProps {
  /** Clases en el botón compacto. */
  className?: string;
}

const VACIO: IndicadorSlidenavDto = {
  urgente: 0,
  tintometrico: 0,
  reposicion: 0,
  emision: 0,
  recepcion: 0,
};

function FilaDetalle({
  label,
  valor,
}: {
  label: string;
  valor: number;
}) {
  return (
    <>
      <span className="min-w-0 text-xs leading-tight">{label}</span>
      <span className="text-right text-xs tabular-nums leading-tight">{valor}</span>
    </>
  );
}

function hrefTransfDepositosConOrigen(): string {
  const sucursal = leerSucursalPreferida();
  if (!sucursal) return GP_ROUTES.ayudaVendedor.transfDepositos;
  return `${GP_ROUTES.ayudaVendedor.transfDepositos}?origen=${encodeURIComponent(sucursal)}`;
}

function BotonCategoriaPendiente({
  label,
  rowSpanClass,
  onNavigate,
}: {
  label: string;
  rowSpanClass: string;
  onNavigate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onNavigate();
      }}
      className={cn(
        rowSpanClass,
        "self-center justify-self-start text-left text-xs font-semibold tracking-wide",
        "rounded-sm text-foreground underline-offset-2",
        "hover:text-primary hover:underline",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {label}
    </button>
  );
}

/**
 * Fila **Pendientes** del dock de sesión (slidenav).
 * Label **PENDIENTES** centrado; badge = categorías con pendientes (Pedido y/o
 * Transferencia; máx. 2). Hover: detalle con botones Pedido / Transferencia.
 * Click con transf. pendientes → aviso.
 */
export default function SidebarMainAppArea({ className }: SidebarMainAppAreaProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [conteos, setConteos] = useState<IndicadorSlidenavDto>(VACIO);
  const [advertenciaOpen, setAdvertenciaOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function cargar() {
      const sucursal = leerSucursalPreferida();
      if (!sucursal) {
        if (!cancelled) setConteos(VACIO);
        return;
      }
      const res = await getIndicadorSlidenavAction({ sucursal });
      if (cancelled) return;
      setConteos(res.ok ? res.data : VACIO);
    }

    function onRefresh() {
      void cargar();
    }

    function onVisible() {
      if (document.visibilityState === "visible") void cargar();
    }

    void cargar();
    window.addEventListener("focus", onRefresh);
    window.addEventListener(EVENTO_SUCURSAL_PREFERIDA, onRefresh);
    window.addEventListener(EVENTO_INDICADOR_SLIDENAV, onRefresh);
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(() => {
      void cargar();
    }, 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener(EVENTO_SUCURSAL_PREFERIDA, onRefresh);
      window.removeEventListener(EVENTO_INDICADOR_SLIDENAV, onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [pathname]);

  const hayPedidoPendiente =
    conteos.urgente + conteos.tintometrico + conteos.reposicion > 0;
  const hayTransfPendiente = conteos.emision > 0 || conteos.recepcion > 0;
  /** Categorías con pendientes (Pedido y/o Transferencia); máximo 2. */
  const categoriasPendientes =
    (hayPedidoPendiente ? 1 : 0) + (hayTransfPendiente ? 1 : 0);

  function handleClickPendientes() {
    if (hayTransfPendiente) setAdvertenciaOpen(true);
  }

  function irAGenerarPedido() {
    router.push(GP_ROUTES.pedidoMercaderia.generarPedido);
  }

  function irATransfDepositos() {
    router.push(hrefTransfDepositosConOrigen());
  }

  return (
    <>
      <Tooltip delayDuration={150} disableHoverableContent={false}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClickPendientes}
            aria-label={`Pendientes, ${categoriasPendientes}`}
            className={cn(
              "flex h-9 w-full min-w-0 items-center gap-1.5 rounded-md px-2",
              "text-sidebar-foreground",
              "outline-none hover:bg-sidebar-accent/80",
              "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              className
            )}
          >
            <span className="min-w-0 flex-1 truncate text-center text-xs font-semibold uppercase tracking-wide">
              Pendientes
            </span>
            <span
              className={cn(
                "inline-flex min-w-5 shrink-0 items-center justify-center rounded px-1",
                "text-[10px] font-bold tabular-nums leading-none",
                hayTransfPendiente
                  ? "bg-accent2 text-foreground"
                  : "bg-sidebar-accent text-sidebar-foreground"
              )}
            >
              {categoriasPendientes}
            </span>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          sideOffset={10}
          className="pointer-events-auto border-border bg-card p-2.5 text-card-foreground"
        >
          <div
            className="grid min-w-[13.5rem] grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1"
            aria-label="Detalle de pendientes"
          >
            <BotonCategoriaPendiente
              label="Pedido"
              rowSpanClass="row-span-3"
              onNavigate={irAGenerarPedido}
            />
            <FilaDetalle label="Urgente" valor={conteos.urgente} />
            <FilaDetalle label="Tintométrico" valor={conteos.tintometrico} />
            <FilaDetalle label="Reposición" valor={conteos.reposicion} />

            <span className="col-span-3 my-1 h-px bg-primary" aria-hidden />

            <BotonCategoriaPendiente
              label="Transferencia"
              rowSpanClass="row-span-2"
              onNavigate={irATransfDepositos}
            />
            <FilaDetalle label="Emisión" valor={conteos.emision} />
            <FilaDetalle label="Recepción" valor={conteos.recepcion} />
          </div>
        </TooltipContent>
      </Tooltip>

      <Dialog open={advertenciaOpen} onOpenChange={setAdvertenciaOpen}>
        <AppModal
          size="sm"
          title={
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-accent2" aria-hidden />
              <span>Transferencias Pendientes</span>
            </div>
          }
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdvertenciaOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setAdvertenciaOpen(false);
                  irATransfDepositos();
                }}
              >
                Ir A Trans. Depósitos
              </Button>
            </>
          }
        >
          <p className={CALLOUT_WARNING_CLASS}>
            Hay transferencias pendientes de registro para esta sucursal.
          </p>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm text-foreground">
            <span>Emisión</span>
            <span className="text-right tabular-nums">{conteos.emision}</span>
            <span>Recepción</span>
            <span className="text-right tabular-nums">{conteos.recepcion}</span>
          </div>
        </AppModal>
      </Dialog>
    </>
  );
}
