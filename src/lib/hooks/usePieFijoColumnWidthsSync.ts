"use client";

import { type RefObject, useLayoutEffect } from "react";

/**
 * Alineación pixel-perfect entre tabla con scroll y segunda tabla de pie (TOTAL):
 * copia anchos medidos de cada `th` de la tabla superior a cada `col` del `colgroup` inferior,
 * escalando si el contenedor del pie y el área scroll no coinciden (barra vertical, gutter, etc.).
 */
export function usePieFijoColumnWidthsSync(
  active: boolean,
  scrollPortRef: RefObject<HTMLElement | null>,
  footerTableRef: RefObject<HTMLTableElement | null>,
  /** Columnas visibles del header (ej. cambio ACCIONES / rol): fuerza nueva medición. */
  columnSignature: number | string = ""
): void {
  useLayoutEffect(() => {
    if (!active) return;

    function sync(): void {
      const scrollEl = scrollPortRef.current;
      const footerTable = footerTableRef.current;
      if (!scrollEl || !footerTable) return;

      const sourceTable = scrollEl.querySelector<HTMLTableElement>('[data-slot="table"]');
      const thList = sourceTable?.querySelectorAll<HTMLTableCellElement>("thead tr th");
      const colList = footerTable.querySelectorAll("colgroup col");

      if (!thList?.length || !colList.length || thList.length !== colList.length) return;

      const measured = [...thList].map((th) => th.getBoundingClientRect().width);
      if (!measured.some((w) => w > 0)) return;

      /** Ancho del bloque que envuelve la tabla del pie (mismo ancho útil que debe cubrir el colgroup). */
      const footerHost =
        footerTable.closest<HTMLElement>('[data-slot="table-container"]') ?? footerTable.parentElement;
      const footerW = footerHost?.getBoundingClientRect().width ?? footerTable.getBoundingClientRect().width;
      const sourceW = sourceTable.getBoundingClientRect().width;
      const scale = sourceW > 0 ? footerW / sourceW : 1;

      let assigned = 0;
      const n = measured.length;
      for (let i = 0; i < n - 1; i++) {
        const w = measured[i] * scale;
        const col = colList[i];
        if (col instanceof HTMLElement) {
          col.style.width = `${w}px`;
        }
        assigned += w;
      }
      const last = colList[n - 1];
      if (last instanceof HTMLElement) {
        last.style.width = `${Math.max(0, footerW - assigned)}px`;
      }
    }

    sync();

    const scrollEl = scrollPortRef.current;
    const ro = new ResizeObserver(() => sync());
    if (scrollEl) ro.observe(scrollEl);
    const footerEl = footerTableRef.current;
    if (footerEl) {
      const host = footerEl.closest<HTMLElement>('[data-slot="table-container"]') ?? footerEl.parentElement;
      if (host) ro.observe(host);
    }

    window.addEventListener("resize", sync);
    requestAnimationFrame(sync);
    document.fonts?.ready?.then(() => sync()).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [active, scrollPortRef, footerTableRef, columnSignature]);
}
