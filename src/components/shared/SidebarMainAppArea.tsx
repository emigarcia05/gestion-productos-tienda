"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getIndicadorSlidenavAction,
  type IndicadorSlidenavDto,
  type IndicadorSlidenavProveedorPedidoDto,
} from "@/actions/stock";
import { EVENTO_INDICADOR_SLIDENAV } from "@/lib/indicadorSlidenav";
import {
  EVENTO_SUCURSAL_PREFERIDA,
  leerSucursalPreferida,
} from "@/lib/sucursalPreferida";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { hrefAbrirGenerarTransfDepositos } from "@/lib/transfDepositosControl";

export interface SidebarMainAppAreaProps {
  /** Clases en el botón compacto. */
  className?: string;
}

const VACIO: IndicadorSlidenavDto = {
  urgente: 0,
  tintometrico: 0,
  reposicion: 0,
  proveedoresPedido: [],
  hayTransfOrigen: false,
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

function FilaProveedorPedido({
  proveedor,
  urgente,
  tintometrico,
  reposicion,
}: IndicadorSlidenavProveedorPedidoDto) {
  return (
    <div
      tabIndex={0}
      className={cn(
        "group relative flex min-w-0 items-center gap-1 rounded-sm",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      aria-label={`${proveedor}: urgente ${urgente}, tintométrico ${tintometrico}, reposición ${reposicion}`}
    >
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs leading-tight",
          "group-hover:text-primary group-focus-within:text-primary"
        )}
      >
        {proveedor}
      </span>
      <ChevronRight
        className="size-3 shrink-0 text-muted-foreground group-hover:text-primary group-focus-within:text-primary"
        aria-hidden
      />
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none invisible absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2",
          "group-hover:visible group-focus-within:visible",
          "rounded-md border border-border bg-card p-2.5 text-card-foreground shadow-md"
        )}
      >
        <div className="grid min-w-[9rem] grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <FilaDetalle label="Urgente" valor={urgente} />
          <FilaDetalle label="Tintométrico" valor={tintometrico} />
          <FilaDetalle label="Reposición" valor={reposicion} />
        </div>
      </div>
    </div>
  );
}

function BotonCategoriaPendiente({
  label,
  className,
  onNavigate,
}: {
  label: string;
  className?: string;
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
        "w-full self-center text-center text-xs font-semibold uppercase tracking-wide",
        "rounded-sm text-foreground underline-offset-2",
        "hover:text-primary hover:underline",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {label}
    </button>
  );
}

/**
 * Fila **Pendientes** del dock de sesión (slidenav).
 * Label **PENDIENTES** centrado; badge = categorías con pendiente (Pedido y/o Transf.).
 * Hover o click: detalle lateral. Pedido lista proveedores; Transf. si la sucursal
 * es SUC. ORIGEN. Click **PEDIDO** → Generar Pedido; **TRANSF.** → Generar Transf.
 */
export default function SidebarMainAppArea({ className }: SidebarMainAppAreaProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [conteos, setConteos] = useState<IndicadorSlidenavDto>(VACIO);
  const [detalleOpen, setDetalleOpen] = useState(false);

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

  const hayPedidoPendiente = conteos.proveedoresPedido.length > 0;
  const hayTransfPendiente = conteos.hayTransfOrigen;
  const categoriasPendientes =
    (hayPedidoPendiente ? 1 : 0) + (hayTransfPendiente ? 1 : 0);
  const hayAlgunaPendiente = categoriasPendientes > 0;

  function irAGenerarPedido() {
    setDetalleOpen(false);
    router.push(GP_ROUTES.pedidoMercaderia.generarPedido);
  }

  function irAGenerarTransf() {
    setDetalleOpen(false);
    const sucursal = leerSucursalPreferida();
    router.push(hrefAbrirGenerarTransfDepositos(sucursal));
  }

  return (
    <Tooltip
      open={detalleOpen}
      onOpenChange={setDetalleOpen}
      delayDuration={150}
      disableHoverableContent={false}
    >
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setDetalleOpen((abierto) => !abierto);
          }}
          aria-expanded={detalleOpen}
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
              hayAlgunaPendiente
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
        className="pointer-events-auto overflow-visible border-border bg-card p-2.5 text-card-foreground"
      >
        <div
          className="grid min-w-[13.5rem] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1"
          aria-label="Detalle de pendientes"
        >
          <BotonCategoriaPendiente label="Transf." onNavigate={irAGenerarTransf} />
          <span className="text-xs tabular-nums leading-tight">
            {hayTransfPendiente ? "Pendiente" : ""}
          </span>
          <BotonCategoriaPendiente label="Pedido" onNavigate={irAGenerarPedido} />
          <div className="flex min-w-0 flex-col gap-1">
            {conteos.proveedoresPedido.map((p) => (
              <FilaProveedorPedido key={p.proveedorId} {...p} />
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
