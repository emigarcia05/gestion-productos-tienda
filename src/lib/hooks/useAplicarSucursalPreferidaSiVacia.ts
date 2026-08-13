"use client";

import { useEffect, useRef } from "react";
import {
  leerSucursalPreferida,
  type SucursalPreferida,
} from "@/lib/sucursalPreferida";

/**
 * Si no hay sucursal seleccionada, aplica la preferida del usuario
 * (`sessionStorage` / `sucursal_por_defecto`). El usuario puede cambiarla
 * manualmente después; solo rellena cuando está vacía.
 */
export function useAplicarSucursalPreferidaSiVacia(
  sucursalActual: string | null | undefined,
  aplicar: (codigo: SucursalPreferida) => void,
  estaHabilitada?: (codigo: SucursalPreferida) => boolean
): void {
  const aplicarRef = useRef(aplicar);
  const habilitadaRef = useRef(estaHabilitada);

  useEffect(() => {
    aplicarRef.current = aplicar;
    habilitadaRef.current = estaHabilitada;
  }, [aplicar, estaHabilitada]);

  useEffect(() => {
    if (sucursalActual) return;
    const preferida = leerSucursalPreferida();
    if (!preferida) return;
    if (habilitadaRef.current && !habilitadaRef.current(preferida)) return;
    aplicarRef.current(preferida);
  }, [sucursalActual]);
}
