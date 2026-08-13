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
  EVENTO_ADVERTIR_TRANSF_PENDIENTES,
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
  /** Clases en el contenedor del indicador. */
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

/**
 * Indicador compacto de slidenav: botón **Pendientes**.
 * El detalle se abre al costado con hover. Tras elegir usuario, si hay
 * transferencias pendientes se muestra un modal de advertencia.
 */
export default function SidebarMainAppArea({ className }: SidebarMainAppAreaProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [conteos, setConteos] = useState<IndicadorSlidenavDto>(VACIO);
  const [advertenciaOpen, setAdvertenciaOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function cargar(): Promise<IndicadorSlidenavDto> {
      const sucursal = leerSucursalPreferida();
      if (!sucursal) {
        if (!cancelled) setConteos(VACIO);
        return VACIO;
      }
      const res = await getIndicadorSlidenavAction({ sucursal });
      if (cancelled) return VACIO;
      const data = res.ok ? res.data : VACIO;
      setConteos(data);
      return data;
    }

    function onRefresh() {
      void cargar();
    }

    function onVisible() {
      if (document.visibilityState === "visible") void cargar();
    }

    function onAdvertirTransf() {
      void cargar().then((data) => {
        if (cancelled) return;
        if (data.emision > 0 || data.recepcion > 0) {
          setAdvertenciaOpen(true);
        }
      });
    }

    void cargar();
    window.addEventListener("focus", onRefresh);
    window.addEventListener(EVENTO_SUCURSAL_PREFERIDA, onRefresh);
    window.addEventListener(EVENTO_INDICADOR_SLIDENAV, onRefresh);
    window.addEventListener(EVENTO_ADVERTIR_TRANSF_PENDIENTES, onAdvertirTransf);
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(() => {
      void cargar();
    }, 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener(EVENTO_SUCURSAL_PREFERIDA, onRefresh);
      window.removeEventListener(EVENTO_INDICADOR_SLIDENAV, onRefresh);
      window.removeEventListener(
        EVENTO_ADVERTIR_TRANSF_PENDIENTES,
        onAdvertirTransf
      );
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [pathname]);

  const hayTransfPendiente = conteos.emision > 0 || conteos.recepcion > 0;

  function handleClickPendientes() {
    if (hayTransfPendiente) setAdvertenciaOpen(true);
  }

  return (
    <>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClickPendientes}
            aria-label="Pendientes"
            className={cn(
              "flex w-full min-w-0 items-center justify-between gap-1 rounded-lg px-2 py-1.5",
              "text-sidebar-foreground",
              "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              className
            )}
          >
            <span className="text-xs font-semibold tracking-wide">Pendientes</span>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          sideOffset={10}
          className="border-border bg-card p-2.5 text-card-foreground"
        >
          <div
            className="grid min-w-[13.5rem] grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1"
            aria-label="Detalle de pendientes"
          >
            <p className="row-span-3 self-center text-xs font-semibold tracking-wide">
              Pedido
            </p>
            <FilaDetalle label="Urgente" valor={conteos.urgente} />
            <FilaDetalle label="Tintométrico" valor={conteos.tintometrico} />
            <FilaDetalle label="Reposición" valor={conteos.reposicion} />

            <span className="col-span-3 my-1 h-px bg-primary" aria-hidden />

            <p className="row-span-2 self-center text-xs font-semibold tracking-wide">
              Transferencia
            </p>
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
                  router.push(GP_ROUTES.ayudaVendedor.transfDepositos);
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
