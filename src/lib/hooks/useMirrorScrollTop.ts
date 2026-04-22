"use client";

import { type RefObject, useLayoutEffect } from "react";

/**
 * Iguala `mirror.scrollTop` al de `source` en cada scroll del origen e inicialmente.
 * Útil para dos paneles verticalmente paralelos sin mostrar dos barras (el espejo puede llevar `no-scrollbar`).
 */
export function useMirrorScrollTop(
  active: boolean,
  sourceRef: RefObject<HTMLElement | null>,
  mirrorRef: RefObject<HTMLElement | null>
): void {
  useLayoutEffect(() => {
    if (!active) return;
    const src = sourceRef.current;
    const mir = mirrorRef.current;
    if (!src || !mir) return;

    function mirror(): void {
      mir.scrollTop = src.scrollTop;
    }

    mirror();
    src.addEventListener("scroll", mirror, { passive: true });

    const ro = new ResizeObserver(() => mirror());
    ro.observe(src);

    return () => {
      src.removeEventListener("scroll", mirror);
      ro.disconnect();
    };
  }, [active, sourceRef, mirrorRef]);
}
