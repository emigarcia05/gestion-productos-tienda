"use client";

import { useEffect, useState, type ReactNode } from "react";
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
    <p className="whitespace-nowrap text-xs leading-tight">
      {label} - <span className="tabular-nums">{valor}</span>
    </p>
  );
}

function FilaCompacta({ etiqueta }: { etiqueta: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-1 px-1 py-0.5 text-xs font-semibold tracking-wide">
      <span>{etiqueta}</span>
      <ChevronRight className="size-3.5 shrink-0" aria-hidden />
    </div>
  );
}

function BloqueDetalle({
  titulo,
  filas,
}: {
  titulo: string;
  filas: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_auto] items-center gap-x-3 gap-y-0.5">
      <p className="self-center text-xs font-semibold tracking-wide">{titulo}</p>
      <div className="flex flex-col gap-0.5">{filas}</div>
    </div>
  );
}

/**
 * Indicador compacto de slidenav: Pedidos / Transferencias.
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

  function handleClickTransferencias() {
    if (hayTransfPendiente) setAdvertenciaOpen(true);
  }

  return (
    <>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex w-full min-w-0 flex-col gap-0.5 rounded-lg px-2 py-1.5",
              "text-sidebar-foreground",
              className
            )}
            aria-label="Indicador de pendientes"
          >
            <FilaCompacta etiqueta="Pedidos" />
            <button
              type="button"
              onClick={handleClickTransferencias}
              className={cn(
                "w-full rounded-md text-left",
                "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              )}
            >
              <FilaCompacta etiqueta="Transferencias" />
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          sideOffset={10}
          className="border-border bg-card p-2.5 text-card-foreground"
        >
          <div className="flex flex-col gap-2">
            <BloqueDetalle
              titulo="Pedido"
              filas={
                <>
                  <FilaDetalle label="Urgente" valor={conteos.urgente} />
                  <FilaDetalle label="Tintométrico" valor={conteos.tintometrico} />
                  <FilaDetalle label="Reposición" valor={conteos.reposicion} />
                </>
              }
            />
            <BloqueDetalle
              titulo="Transferencia"
              filas={
                <>
                  <FilaDetalle label="Emisión" valor={conteos.emision} />
                  <FilaDetalle label="Recepción" valor={conteos.recepcion} />
                </>
              }
            />
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
          <div className="mt-3 flex flex-col gap-1 text-sm text-foreground">
            <FilaDetalle label="Emisión" valor={conteos.emision} />
            <FilaDetalle label="Recepción" valor={conteos.recepcion} />
          </div>
        </AppModal>
      </Dialog>
    </>
  );
}
