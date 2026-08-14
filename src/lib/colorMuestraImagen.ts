/**
 * Muestreo de color desde canvas (cliente). La imagen no se persiste.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface RectSeleccion {
  x: number;
  y: number;
  w: number;
  h: number;
}

const RADIO_CLIC_DEFAULT = 8;

export function rgbToHex({ r, g, b }: RgbColor): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

export function formatRgbTuple({ r, g, b }: RgbColor): string {
  return `(${r},${g},${b})`;
}

/**
 * Promedia píxeles opacos en el rectángulo del bitmap del canvas.
 * Coordenadas en espacio del canvas (no CSS).
 */
function promedioRgbEnRect(
  ctx: CanvasRenderingContext2D,
  rect: RectSeleccion,
  canvasW: number,
  canvasH: number,
): RgbColor | null {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const w = Math.max(1, Math.min(Math.ceil(rect.w), canvasW - x));
  const h = Math.max(1, Math.min(Math.ceil(rect.h), canvasH - y));
  if (w <= 0 || h <= 0 || x >= canvasW || y >= canvasH) return null;

  const { data } = ctx.getImageData(x, y, w, h);
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 16) continue;
    sumR += data[i] ?? 0;
    sumG += data[i + 1] ?? 0;
    sumB += data[i + 2] ?? 0;
    count += 1;
  }
  if (count === 0) return null;
  return {
    r: Math.round(sumR / count),
    g: Math.round(sumG / count),
    b: Math.round(sumB / count),
  };
}

/** Clic puntual: promedio en un radio alrededor del punto. */
export function promedioRgbEnPunto(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  canvasW: number,
  canvasH: number,
  radio = RADIO_CLIC_DEFAULT,
): RgbColor | null {
  return promedioRgbEnRect(
    ctx,
    {
      x: cx - radio,
      y: cy - radio,
      w: radio * 2 + 1,
      h: radio * 2 + 1,
    },
    canvasW,
    canvasH,
  );
}
