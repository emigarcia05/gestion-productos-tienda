/**
 * Genera muestras JPG sólidas a partir del HEX oficial (no inventa el color).
 * Nombre: CODIGO.jpg → "34YY 76/084" → 34YY76084.jpg
 */
import fs from "node:fs/promises";
import path from "node:path";
import jpeg from "jpeg-js";
import { ALBA_CONFIG } from "./config";
import type { CatalogColor } from "./types";
import { codigoToFileStem, hexToRgb } from "./utils";

export interface ImageResult {
  written: number;
  skipped: number;
  errors: string[];
}

export async function writeSwatchJpeg(
  outFile: string,
  hex: string,
): Promise<void> {
  const rgb = hexToRgb(hex);
  if (!rgb) throw new Error(`HEX inválido: ${hex}`);

  const size = ALBA_CONFIG.swatchSize;
  const frameData = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    frameData[o] = rgb.r;
    frameData[o + 1] = rgb.g;
    frameData[o + 2] = rgb.b;
    frameData[o + 3] = 255;
  }

  const encoded = jpeg.encode(
    { data: frameData, width: size, height: size },
    ALBA_CONFIG.jpegQuality,
  );
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, encoded.data);
}

/**
 * Escribe todas las muestras para colores con código + HEX.
 * onProgress: callback opcional para logs (done, totalConCodigo).
 */
export async function downloadAllSwatches(
  colors: CatalogColor[],
  imagesDir: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ImageResult> {
  const errors: string[] = [];
  let written = 0;
  let skipped = 0;

  await fs.mkdir(imagesDir, { recursive: true });

  const withCode = colors.filter((c) => c.codigo);
  const total = withCode.length;
  let done = 0;

  // Reutilizar buffer de píxeles entre muestras (mismo tamaño).
  const size = ALBA_CONFIG.swatchSize;
  const frameData = Buffer.alloc(size * size * 4);

  for (const color of withCode) {
    done++;
    if (!color.hex) {
      skipped++;
      errors.push(`Sin HEX para codigo ${color.codigo} (${color.nombre})`);
      onProgress?.(done, total);
      continue;
    }

    const stem = codigoToFileStem(color.codigo);
    const filePath = path.join(imagesDir, `${stem}.jpg`);
    try {
      const rgb = hexToRgb(color.hex);
      if (!rgb) throw new Error(`HEX invalido: ${color.hex}`);
      for (let i = 0; i < size * size; i++) {
        const o = i * 4;
        frameData[o] = rgb.r;
        frameData[o + 1] = rgb.g;
        frameData[o + 2] = rgb.b;
        frameData[o + 3] = 255;
      }
      const encoded = jpeg.encode(
        { data: frameData, width: size, height: size },
        ALBA_CONFIG.jpegQuality,
      );
      await fs.writeFile(filePath, encoded.data);
      written++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Imagen ${stem}.jpg: ${msg}`);
    }
    onProgress?.(done, total);
  }

  // Colores sin código oficial
  skipped += colors.length - withCode.length;

  return { written, skipped, errors };
}
