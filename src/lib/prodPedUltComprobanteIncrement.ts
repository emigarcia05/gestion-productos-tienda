/**
 * Incremento de correlativo **FACTURA** para `prod_ped_ult_comp` (Excel recepción pedidos).
 * Formato AFIP típico `L-#####-########` (último tramo +1 con carry al tramo medio).
 * **Comprobante_Compra** (sólo dígitos): incremento atómico en SQL en `exportRecepcionPedidoExcel.service.ts`.
 */

const RE_FACTURA_AFIP = /^([A-Za-z])-(\d+)-(\d+)$/;

function powBig10(exp: number): bigint {
  let out = BigInt(1);
  const ten = BigInt(10);
  for (let i = 0; i < exp; i++) out *= ten;
  return out;
}

/** `A-00000-00000027` → `A-00000-00000028`; carry del bloque final al bloque medio. */
export function incrementarUltimoComprobanteFacturaAfip(raw: string): string {
  const t = raw.trim();
  const m = RE_FACTURA_AFIP.exec(t);
  if (!m) {
    throw new Error(
      "FACTURA: formato no soportado (se espera L-#####-########, ej. A-00000-00000027)."
    );
  }
  const letra = m[1].toUpperCase();
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
    throw new Error("FACTURA: se superó el correlativo máximo del tramo medio.");
  }
  return `${letra}-${mid.toString().padStart(lenMid, "0")}-${last.toString().padStart(lenLast, "0")}`;
}
