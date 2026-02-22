export interface FilaProducto {
  codProdProv: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
}

function normalizeRow(row: Record<string, unknown>): FilaProducto {
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const val = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
    return "";
  };

  const codProdProv = get("cod prod prov", "codprodprov", "cod_prod_prov", "codigo");
  const descripcion = get("descripcion", "descripción", "description", "desc");
  const precioListaRaw = get(
    "px lista proveedor", "pxlistaproveedor", "px_lista_proveedor",
    "preciolista", "precio_lista"
  );
  const precioVentaRaw = get(
    "px venta sugerido", "pxventasugerido", "px_venta_sugerido",
    "precioventasugerido", "precio_venta"
  );

  if (!codProdProv) throw new Error(`Fila sin código de producto: ${JSON.stringify(row)}`);

  const precioLista = parseFloat(precioListaRaw.replace(",", "."));
  const precioVentaSugerido = parseFloat(precioVentaRaw.replace(",", "."));

  if (isNaN(precioLista)) throw new Error(`Precio lista inválido en fila: ${codProdProv}`);
  if (isNaN(precioVentaSugerido)) throw new Error(`Precio venta inválido en fila: ${codProdProv}`);

  return { codProdProv, descripcion, precioLista, precioVentaSugerido };
}

/**
 * Parsea texto CSV o JSON y devuelve filas normalizadas.
 * Columnas CSV esperadas (case-insensitive, orden libre):
 *   COD PROD PROV | DESCRIPCION | PX LISTA PROVEEDOR | PX VENTA SUGERIDO
 */
export function parsearContenido(raw: string): FilaProducto[] {
  const trimmed = raw.trim();

  // ── JSON ──────────────────────────────────────────────────────────────────
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>[];
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map(normalizeRow);
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    throw new Error("El archivo debe tener encabezado y al menos una fila.");
  }

  const headers = lines[0].split(/[,;|\t]/).map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const cols = line.split(/[,;|\t]/).map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return normalizeRow(row);
  });
}
