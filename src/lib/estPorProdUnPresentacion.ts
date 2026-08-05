export type EstPorProdPosicionUnidad = "PREFIJO" | "SUFIJO";

/** Ítem del catálogo `est_por_prod_un_presentacion`. */
export type EstPorProdUnPresentacionItem = {
  id: string;
  /** Unidad en MAYÚSCULAS (p. ej. LTS, Nº). */
  unidad: string;
  posicionUnidad: EstPorProdPosicionUnidad;
  /** Si true, el valor numérico puede sumarse en estadísticas. */
  suma: boolean;
};

/** Formatea número + unidad según Prefijo/Sufijo (p. ej. `Nº 20` / `20 LTS`). */
export function formatearPresentacionConUnidad(
  numerica: number,
  unidad: Pick<EstPorProdUnPresentacionItem, "unidad" | "posicionUnidad">
): string {
  const n = Number.isInteger(numerica)
    ? String(numerica)
    : numerica.toLocaleString("es-AR", { maximumFractionDigits: 4 });
  const u = unidad.unidad.trim().toLocaleUpperCase("es-AR");
  if (!u) return n;
  return unidad.posicionUnidad === "PREFIJO" ? `${u} ${n}` : `${n} ${u}`;
}
