/**
 * Incremento de correlativos en `prod_ped_ult_comp`.
 * Formato típico `L-#####-########` (último tramo +1 con carry al tramo medio).
 * **Comprobante_Compra** (sólo dígitos): incremento atómico en SQL en `exportRecepcionPedidoExcel.service.ts`.
 */

const RE_LETRA_GUION = /^([A-Za-z])-(\d+)-(\d+)$/;

/** Fila fija **NOTA_CREDITO** (`X-00000-########`). */
export const PROD_PED_ULT_COMP_ID_NOTA_CREDITO = 3;
/** Letra fija del correlativo de nota de crédito. */
export const NOTA_CREDITO_LETRA = "X";

function powBig10(exp: number): bigint {
  let out = BigInt(1);
  const ten = BigInt(10);
  for (let i = 0; i < exp; i++) out *= ten;
  return out;
}

function incrementarLetraGuionBloques(
  raw: string,
  letraOut: string,
  etiqueta: string
): string {
  const t = raw.trim();
  const m = RE_LETRA_GUION.exec(t);
  if (!m) {
    throw new Error(
      `${etiqueta}: formato no soportado (se espera L-#####-########, ej. ${letraOut}-00000-00000001).`
    );
  }
  const lenMid = m[2].length;
  const lenLast = m[3].length;
  const mod = powBig10(lenLast);
  let mid = BigInt(m[2]);
  let last = BigInt(m[3]) + BigInt(1);
  while (last >= mod) {
    last -= mod;
    mid += BigInt(1);
  }
  const midMax = powBig10(lenMid) - BigInt(1);
  if (mid > midMax) {
    throw new Error(`${etiqueta}: se superó el correlativo máximo del tramo medio.`);
  }
  return `${letraOut}-${mid.toString().padStart(lenMid, "0")}-${last.toString().padStart(lenLast, "0")}`;
}

/** `A-00000-00000027` → `A-00000-00000028`; carry del bloque final al bloque medio. */
export function incrementarUltimoComprobanteFacturaAfip(raw: string): string {
  const t = raw.trim();
  const m = RE_LETRA_GUION.exec(t);
  const letra = m ? m[1].toUpperCase() : "A";
  return incrementarLetraGuionBloques(raw, letra, "FACTURA");
}

/** `X-00000-00000002` → `X-00000-00000003` (letra siempre `X`). */
export function incrementarNumeroNotaCredito(raw: string): string {
  return incrementarLetraGuionBloques(raw, NOTA_CREDITO_LETRA, "NOTA_CREDITO");
}
