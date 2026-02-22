/**
 * Convierte strings de precio con formato variado a número.
 * Soporta: "$6.399", "6.399,50", "6399.50", "6,399.50"
 */
function parsePrecio(raw: string): number {
  // Quitar símbolo de moneda y espacios
  let s = raw.replace(/[$\s]/g, "");

  // Detectar formato: si tiene coma Y punto, el último separador es el decimal
  const tieneComa = s.includes(",");
  const tienePunto = s.includes(".");

  if (tieneComa && tienePunto) {
    // Ej: "6.399,50" → separador miles=punto, decimal=coma
    // Ej: "6,399.50" → separador miles=coma, decimal=punto
    const ultimaComa = s.lastIndexOf(",");
    const ultimoPunto = s.lastIndexOf(".");
    if (ultimaComa > ultimoPunto) {
      // formato europeo: 6.399,50
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // formato anglosajón: 6,399.50
      s = s.replace(/,/g, "");
    }
  } else if (tieneComa) {
    // Solo coma: puede ser decimal (1,5) o miles (6.399) — asumimos decimal
    s = s.replace(",", ".");
  } else if (tienePunto) {
    // Solo punto: si hay exactamente 3 dígitos después → miles, sino decimal
    const partes = s.split(".");
    if (partes.length === 2 && partes[1].length === 3) {
      // Ej: "6.399" → miles, no decimal
      s = s.replace(".", "");
    }
    // Ej: "6.50" → decimal, no tocar
  }

  return parseFloat(s);
}

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

  const codProdProv = get(
    "cod prod prov", "codprodprov", "cod_prod_prov",
    "cod. proveedor", "cod.proveedor", "cod proveedor", "codproveedor",
    "codigo", "code", "cod"
  );
  const descripcion = get(
    "descripcion", "descripción", "description", "desc"
  );
  const precioListaRaw = get(
    "px lista proveedor", "pxlistaproveedor", "px_lista_proveedor",
    "px. lista de compra", "px.listadecompra", "px lista de compra",
    "preciolista", "precio_lista", "precio lista"
  );
  const precioVentaRaw = get(
    "px venta sugerido", "pxventasugerido", "px_venta_sugerido",
    "px. venta sugerido", "px.ventasugerido",
    "precioventasugerido", "precio_venta", "precio venta"
  );

  if (!codProdProv) throw new Error(`Fila sin código de producto: ${JSON.stringify(row)}`);

  const precioLista = parsePrecio(precioListaRaw);
  const precioVentaSugerido = parsePrecio(precioVentaRaw);

  if (isNaN(precioLista)) throw new Error(`Precio lista inválido en fila: ${codProdProv}`);
  if (isNaN(precioVentaSugerido)) throw new Error(`Precio venta inválido en fila: ${codProdProv}`);

  return { codProdProv, descripcion, precioLista, precioVentaSugerido };
}

/**
 * Parsea texto CSV o JSON y devuelve filas normalizadas.
 * @param tieneEncabezados - si true, la primera fila se usa como encabezado;
 *   si false, se asume orden fijo: código, descripción, px lista, px venta
 */
export function parsearContenido(raw: string, tieneEncabezados = true): FilaProducto[] {
  const trimmed = raw.trim();

  // ── JSON ──────────────────────────────────────────────────────────────────
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>[];
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map(normalizeRow);
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 1) {
    throw new Error("El archivo está vacío.");
  }

  if (tieneEncabezados) {
    if (lines.length < 2) {
      throw new Error("El archivo debe tener encabezado y al menos una fila de datos.");
    }
    const headers = lines[0].split(/[,;|\t]/).map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cols = line.split(/[,;|\t]/).map((c) => c.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
      return normalizeRow(row);
    });
  } else {
    // Sin encabezados: orden fijo col 0=código, 1=descripción, 2=px lista, 3=px venta
    return lines.map((line) => {
      const cols = line.split(/[,;|\t]/).map((c) => c.trim());
      if (cols.length < 4) {
        throw new Error(`Fila con columnas insuficientes (se esperan 4): "${line}"`);
      }
      const row: Record<string, string> = {
        "cod prod prov": cols[0],
        "descripcion":   cols[1],
        "px lista proveedor": cols[2],
        "px venta sugerido":  cols[3],
      };
      return normalizeRow(row);
    });
  }
}
