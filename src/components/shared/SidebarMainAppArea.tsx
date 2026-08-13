"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getIndicadorSlidenavAction,
  type IndicadorSlidenavDto,
} from "@/actions/stock";
import { EVENTO_INDICADOR_SLIDENAV } from "@/lib/indicadorSlidenav";
import {
  EVENTO_SUCURSAL_PREFERIDA,
  leerSucursalPreferida,
  sucursalPreferidaLabel,
} from "@/lib/sucursalPreferida";

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

function FilaIndicador({
  label,
  valor,
}: {
  label: string;
  valor: number;
}) {
  return (
    <p className="pl-2 text-xs leading-tight">
      {label} - <span className="tabular-nums">{valor}</span>
    </p>
  );
}

/**
 * Indicador de slidenav (reemplaza el logo): sucursal preferida + pendientes
 * de Generar Pedido y de transferencias Excel.
 */
export default function SidebarMainAppArea({ className }: SidebarMainAppAreaProps) {
  const pathname = usePathname();
  const [sucursalLabel, setSucursalLabel] = useState("SUCURSAL");
  const [conteos, setConteos] = useState<IndicadorSlidenavDto>(VACIO);

  useEffect(() => {
    let cancelled = false;

    async function cargar() {
      const sucursal = leerSucursalPreferida();
      if (!sucursal) {
        if (!cancelled) {
          setSucursalLabel("SUCURSAL");
          setConteos(VACIO);
        }
        return;
      }
      setSucursalLabel(sucursalPreferidaLabel(sucursal));
      const res = await getIndicadorSlidenavAction({ sucursal });
      if (cancelled) return;
      if (res.ok) setConteos(res.data);
      else setConteos(VACIO);
    }

    void cargar();
    const onVisible = () => {
      if (document.visibilityState === "visible") void cargar();
    };
    window.addEventListener("focus", cargar);
    window.addEventListener(EVENTO_SUCURSAL_PREFERIDA, cargar);
    window.addEventListener(EVENTO_INDICADOR_SLIDENAV, cargar);
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(() => {
      void cargar();
    }, 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", cargar);
      window.removeEventListener(EVENTO_SUCURSAL_PREFERIDA, cargar);
      window.removeEventListener(EVENTO_INDICADOR_SLIDENAV, cargar);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [pathname]);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 rounded-lg px-2 py-1.5",
        "text-sidebar-foreground",
        className
      )}
      aria-label="Indicador de pendientes por sucursal"
    >
      <p className="text-center text-sm font-semibold tracking-wide">
        {sucursalLabel}
      </p>
      <div className="flex flex-col gap-1.5 text-xs">
        <p className="font-semibold tracking-wide">Pedido</p>
        <FilaIndicador label="Urgente" valor={conteos.urgente} />
        <FilaIndicador label="Tintométrico" valor={conteos.tintometrico} />
        <FilaIndicador label="Reposición" valor={conteos.reposicion} />
        <p className="mt-1 font-semibold tracking-wide">Transferencia</p>
        <FilaIndicador label="Emisión" valor={conteos.emision} />
        <FilaIndicador label="Recepción" valor={conteos.recepcion} />
      </div>
    </div>
  );
}
