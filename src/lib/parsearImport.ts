/**
 * Convierte strings de precio con formato variado a número.
 * Soporta: "$6.399", "6.399,50", "6399.50", "6,399.50"
 */
function parsePrecio(raw: string): number {
  let s = raw.replace(/[$\s]/g, "");
  const tieneComa = s.includes(",");
  const tienePunto = s.includes(".");

  if (tieneComa && tienePunto) {
    const ultimaComa = s.lastIndexOf(",");
    const ultimoPunto = s.lastIndexOf(".");
    if (ultimaComa > ultimoPunto) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (tieneComa) {
    s = s.replace(",", ".");
  } else if (tienePunto) {
    const partes = s.split(".");
    if (partes.length === 2 && partes[1].length === 3) {
      s = s.replace(".", "");
    }
  }

  return parseFloat(s);
}

export interface FilaProducto {
  codProdProv: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
}

export type CampoDestino = "codProdProv" | "descripcion" | "precioLista" | "precioVentaSugerido" | "ignorar";

export interface MapeoColumnas {
  [indiceColumna: number]: CampoDestino;
}

/**
 * Parsea un CSV y devuelve las filas crudas (arrays de strings).
 * Si tieneEncabezados=true, la primera fila se devuelve como encabezados
 * y las demás como datos. Si es false, no hay encabezados.
 */
export function parsearCSVCrudo(raw: string, tieneEncabezados: boolean): {
  encabezados: string[] | null;
  filas: string[][];
} {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) throw new Error("El archivo está vacío.");

  const sep = detectarSeparador(lines[0]);
  const todas = lines.map((l) => dividirLinea(l, sep));

  if (tieneEncabezados) {
    if (todas.length < 2) throw new Error("El archivo solo tiene encabezados, sin datos.");
    return { encabezados: todas[0], filas: todas.slice(1) };
  }

  return { encabezados: null, filas: todas };
}

function detectarSeparador(linea: string): string {
  const conteos: Record<string, number> = {
    ",": (linea.match(/,/g) ?? []).length,
    ";": (linea.match(/;/g) ?? []).length,
    "|": (linea.match(/\|/g) ?? []).length,
    "\t": (linea.match(/\t/g) ?? []).length,
  };
  return Object.entries(conteos).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Divide una línea CSV respetando campos entre comillas.
 * Si el campo no está entre comillas, lo divide por el separador.
 */
function dividirLinea(linea: string, sep: string): string[] {
  const cols: string[] = [];
  let actual = "";
  let dentroComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"' || ch === "'") {
      dentroComillas = !dentroComillas;
    } else if (ch === sep && !dentroComillas) {
      cols.push(actual.trim());
      actual = "";
    } else {
      actual += ch;
    }
  }
  cols.push(actual.trim());
  return cols;
}

/**
 * Aplica el mapeo de columnas a las filas crudas y devuelve FilaProducto[].
 * Si una fila tiene más columnas que el encabezado (por comas dentro de la descripción),
 * une las columnas extras en el campo de descripción.
 */
export function aplicarMapeo(filas: string[][], mapeo: MapeoColumnas): FilaProducto[] {
  const numColsEsperadas = Math.max(...Object.keys(mapeo).map(Number)) + 1;

  return filas.map((colsOriginales, rowIdx) => {
    // Si hay más columnas de las esperadas, unir las extras en el campo descripción
    let cols = colsOriginales;
    if (cols.length > numColsEsperadas) {
      const idxDesc = Number(
        Object.entries(mapeo).find(([, v]) => v === "descripcion")?.[0] ?? -1
      );
      // Índice de la columna que sigue después de descripción en el mapeo original
      const extras = cols.length - numColsEsperadas;
      if (idxDesc >= 0) {
        const antes = cols.slice(0, idxDesc);
        const desc = cols.slice(idxDesc, idxDesc + 1 + extras).join(", ");
        const despues = cols.slice(idxDesc + 1 + extras);
        cols = [...antes, desc, ...despues];
      }
    }

    const get = (campo: CampoDestino): string => {
      const idx = Object.entries(mapeo).find(([, v]) => v === campo)?.[0];
      if (idx === undefined) return "";
      return cols[Number(idx)] ?? "";
    };

    const codProdProv = get("codProdProv").trim();
    const descripcion = get("descripcion").trim();
    const precioListaRaw = get("precioLista");
    const precioVentaRaw = get("precioVentaSugerido");

    if (!codProdProv) throw new Error(`Fila ${rowIdx + 1}: código de producto vacío.`);

    const precioLista = parsePrecio(precioListaRaw);
    const precioVentaSugerido = parsePrecio(precioVentaRaw);

    const precioListaFinal = isNaN(precioLista) || precioListaRaw === "" ? 0 : precioLista;
    const precioVentaFinal  = isNaN(precioVentaSugerido) || precioVentaRaw === "" ? 0 : precioVentaSugerido;

    return { codProdProv, descripcion, precioLista: precioListaFinal, precioVentaSugerido: precioVentaFinal };
  });
}
