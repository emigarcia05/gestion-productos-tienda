/**
 * Orden y suma de correlativos devueltos por DUX en `/compras`.
 * - **Sólo dígitos** (p. ej. comprobantes de compra internos): `1234568936`
 * - **Factura AFIP** (típico): `A-00000-00000001` (letra + punto de venta + número)
 */

const RE_SOLO_DIGITOS = /^\d+$/;
/** Formato `L-PPPPP-NNNNNNNN` (guiones; padding variable en cada tramo). */
const RE_AFIP_TRIPLO = /^([A-Za-z])-(\d+)-(\d+)$/;

export type ComprobanteDuxSortKey =
  | { kind: "digit"; value: bigint }
  | { kind: "afip"; letter: number; medio: bigint; ultimo: bigint };

export function parseComprobanteDuxSortKey(raw: string): ComprobanteDuxSortKey | null {
  const s = raw.trim();
  if (!s) return null;
  if (RE_SOLO_DIGITOS.test(s)) return { kind: "digit", value: BigInt(s) };
  const m = RE_AFIP_TRIPLO.exec(s);
  if (m) {
    return {
      kind: "afip",
      letter: m[1].toUpperCase().charCodeAt(0),
      medio: BigInt(m[2]),
      ultimo: BigInt(m[3]),
    };
  }
  return null;
}

function sortKeyRepr(k: ComprobanteDuxSortKey): string {
  if (k.kind === "digit") return `0|${k.value.toString()}`;
  return `1|${k.letter}|${k.medio.toString()}|${k.ultimo.toString()}`;
}

/** `>0` si a > b, `<0` si a < b, `0` si iguales. */
export function compareComprobanteDuxSortKey(a: ComprobanteDuxSortKey, b: ComprobanteDuxSortKey): number {
  if (a.kind === "digit" && b.kind === "digit") {
    if (a.value < b.value) return -1;
    if (a.value > b.value) return 1;
    return 0;
  }
  if (a.kind === "afip" && b.kind === "afip") {
    if (a.letter !== b.letter) return a.letter - b.letter;
    if (a.medio < b.medio) return -1;
    if (a.medio > b.medio) return 1;
    if (a.ultimo < b.ultimo) return -1;
    if (a.ultimo > b.ultimo) return 1;
    return 0;
  }
  return sortKeyRepr(a).localeCompare(sortKeyRepr(b), "es", { numeric: true, sensitivity: "base" });
}

export function comprobanteDuxEsOrdenableParaCorrelativo(raw: string): boolean {
  return parseComprobanteDuxSortKey(raw) != null;
}

/**
 * Suma un entero no negativo al último comprobante (misma forma que el original).
 * - Dígitos: aritmética `BigInt`.
 * - AFIP: incrementa el **último tramo** numérico; conserva ancho con `padStart` mientras quepa.
 */
export function incrementarComprobanteDux(base: string, delta: number): string {
  const inc = Math.max(0, Math.floor(delta));
  const t = base.trim();
  if (!t) throw new Error("Comprobante vacío.");
  if (RE_SOLO_DIGITOS.test(t)) {
    return (BigInt(t) + BigInt(inc)).toString();
  }
  const m = RE_AFIP_TRIPLO.exec(t);
  if (!m) {
    throw new Error(
      "Formato de comprobante no soportado para incrementar (se espera sólo dígitos o L-PPPPP-NNNNNNNN)."
    );
  }
  const letra = m[1];
  const medio = m[2];
  const ultimo = m[3];
  const wUlt = ultimo.length;
  const siguiente = BigInt(ultimo) + BigInt(inc);
  const siguienteStr = siguiente.toString();
  const ultimoOut =
    siguienteStr.length <= wUlt
      ? siguienteStr.padStart(wUlt, "0")
      : siguienteStr;
  return `${letra}-${medio}-${ultimoOut}`;
}
