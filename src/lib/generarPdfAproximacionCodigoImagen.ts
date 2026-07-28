/**
 * PDF cliente: aproximación de código Alba desde imagen + respuesta IA.
 * Una sola hoja A4 con bandas: título 5% · imagen 30% · colores 30% · texto 15% · logo 20%.
 */
import { jsPDF } from "jspdf";
import type { RgbColor } from "@/lib/colorMuestraImagen";
import { formatRgbTuple, rgbToHex } from "@/lib/colorMuestraImagen";
import type { CoincidenciaAlbaPdf } from "@/lib/parseRespuestaIaCoincidencias";

const PRIMARY = { r: 0, g: 114, b: 187 }; // #0072BB
const TITLE =
  "Aproximación de código desde una imagen digital" as const;

/** Aviso legal / comercial bajo las coincidencias (pie del informe). */
export const DISCLAIMER_APROXIMACION_CODIGO =
  "La elección es una comparación digital de colores con el taco digital de Alba. Debe tomarse como una aproximación y referencia del color. El color final en pintura puede variar. Para una mayor aproximación es recomendable acercarse a alguno de nuestros locales para ver el taco en persona.";

export interface LogoTiendaColorPdf {
  dataUrl: string;
  naturalW: number;
  naturalH: number;
}

export interface MuestraColorPdf {
  color: RgbColor;
  /** Coordenadas en píxeles del bitmap original. */
  x: number;
  y: number;
}

export interface InformeAproximacionCodigoImagen {
  /** data URL JPEG/PNG de la imagen original (sin anotar). */
  imagenDataUrl: string;
  imagenNaturalW: number;
  imagenNaturalH: number;
  muestra: MuestraColorPdf;
  coincidencias: CoincidenciaAlbaPdf[];
}

function hexToRgb(hex: string): RgbColor {
  const h = hex.replace(/^#/, "");
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Compone la imagen (a la izquierda) con recuadro de muestra, flecha y
 * swatch grande (~30% del lado menor de la foto) + RGB/HEX legibles.
 * Solo navegador (canvas).
 */
export interface ImagenAnotadaPdf {
  dataUrl: string;
  width: number;
  height: number;
}

export function componerImagenConMuestra(
  imagenDataUrl: string,
  naturalW: number,
  naturalH: number,
  muestra: MuestraColorPdf,
): Promise<ImagenAnotadaPdf> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ladoMenor = Math.min(naturalW, naturalH);
      const swatch = Math.max(96, Math.round(ladoMenor * 0.3));
      const gapFlecha = Math.max(28, Math.round(swatch * 0.2));
      const panelPadX = Math.max(16, Math.round(swatch * 0.12));
      const fontSize = Math.max(18, Math.round(swatch * 0.2));
      const lineGap = Math.round(fontSize * 1.35);
      const textBlockH = lineGap * 2 + Math.round(fontSize * 0.6);
      const panelPadBottom = Math.max(12, Math.round(swatch * 0.08));

      const padRight = gapFlecha + swatch + panelPadX * 2;
      const canvasW = naturalW + padRight;
      const minHForSwatch = panelPadBottom + swatch + textBlockH + panelPadBottom;
      const canvasH = Math.max(naturalH, minHForSwatch);

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo crear el canvas del PDF."));
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Foto pegada a la izquierda (sin margen).
      const imgY = Math.round((canvasH - naturalH) / 2);
      ctx.drawImage(img, 0, imgY, naturalW, naturalH);

      const box = Math.max(14, Math.round(ladoMenor * 0.035));
      const bx = Math.max(0, Math.min(naturalW - box, muestra.x - box / 2));
      const by = Math.max(
        0,
        Math.min(naturalH - box, muestra.y - box / 2),
      );

      ctx.strokeStyle = "#0072BB";
      ctx.lineWidth = Math.max(2, Math.round(box / 7));
      ctx.strokeRect(bx, by + imgY, box, box);

      const sx = naturalW + gapFlecha;
      const syMax = canvasH - swatch - textBlockH - panelPadBottom;
      const sy = Math.max(
        panelPadBottom,
        Math.min(syMax, imgY + muestra.y - swatch / 2),
      );

      const fromX = bx + box;
      const fromY = by + imgY + box / 2;
      const toX = sx;
      const toY = sy + swatch / 2;

      ctx.strokeStyle = "#0072BB";
      ctx.lineWidth = Math.max(3, Math.round(swatch * 0.025));
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      const angle = Math.atan2(toY - fromY, toX - fromX);
      const ah = Math.max(12, Math.round(swatch * 0.12));
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - ah * Math.cos(angle - Math.PI / 6),
        toY - ah * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        toX - ah * Math.cos(angle + Math.PI / 6),
        toY - ah * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fillStyle = "#0072BB";
      ctx.fill();

      const hex = rgbToHex(muestra.color);
      ctx.fillStyle = hex;
      ctx.fillRect(sx, sy, swatch, swatch);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = Math.max(2, Math.round(swatch * 0.02));
      ctx.strokeRect(sx, sy, swatch, swatch);

      ctx.fillStyle = "#0f172a";
      ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const textX = sx + swatch / 2;
      const textY = sy + swatch + Math.round(fontSize * 0.35);
      ctx.fillText(formatRgbTuple(muestra.color), textX, textY);
      ctx.fillText(hex, textX, textY + lineGap);

      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        width: canvasW,
        height: canvasH,
      });
    };
    img.onerror = () =>
      reject(new Error("No se pudo cargar la imagen para el PDF."));
    img.src = imagenDataUrl;
  });
}

export function generarPdfAproximacionCodigoImagen(
  informe: InformeAproximacionCodigoImagen,
  imagenAnotada: ImagenAnotadaPdf,
  logo?: LogoTiendaColorPdf | null,
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const marginY = 10;
  const contentW = pageW - marginX * 2;
  const contentH = pageH - marginY * 2;

  // Bandas fijas (una sola hoja A4).
  const hTitle = contentH * 0.05;
  const hImage = contentH * 0.3;
  const hColors = contentH * 0.3;
  const hText = contentH * 0.15;
  const hLogo = contentH * 0.2;

  const yTitle = marginY;
  const yImage = yTitle + hTitle;
  const yColors = yImage + hImage;
  const yText = yColors + hColors;
  const yLogo = yText + hText;

  // —— Título (5%) ——
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(PRIMARY.r, PRIMARY.g, PRIMARY.b);
  const titleLines = doc.splitTextToSize(TITLE, contentW);
  const titleLineH = 4.5;
  const titleBlockH = titleLines.length * titleLineH;
  const titleY =
    yTitle + Math.max(titleLineH, (hTitle - titleBlockH) / 2 + titleLineH);
  doc.text(titleLines, pageW / 2, titleY, { align: "center" });

  // —— Imagen muestra (30%) ——
  const imgPad = 2;
  const maxImgW = contentW - imgPad * 2;
  const maxImgH = hImage - imgPad * 2;
  const imgScale = Math.min(
    maxImgW / imagenAnotada.width,
    maxImgH / imagenAnotada.height,
  );
  const drawW = imagenAnotada.width * imgScale;
  const drawH = imagenAnotada.height * imgScale;
  const imgX = marginX + imgPad;
  const imgY = yImage + imgPad + (maxImgH - drawH) / 2;
  doc.addImage(imagenAnotada.dataUrl, "JPEG", imgX, imgY, drawW, drawH);

  // —— Cuadro colores referencia (30%) ——
  const colorsPad = 2;
  let cy = yColors + colorsPad;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Coincidencias más cercanas", marginX, cy + 3.5);
  cy += 7;

  const sw = 9;
  const colSwatch = marginX;
  const colNombre = marginX + sw + 4;
  const colCodigo = marginX + 78;
  const colSim = marginX + 130;
  const headerH = 5;
  const rowsAreaTop = cy + headerH;
  const rowsAreaBottom = yColors + hColors - colorsPad;
  const rowsAreaH = Math.max(20, rowsAreaBottom - rowsAreaTop);
  const rowH = rowsAreaH / 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("COLOR", colSwatch, cy + 3);
  doc.text("NOMBRE", colNombre, cy + 3);
  doc.text("CÓDIGO", colCodigo, cy + 3);
  doc.text("APROX. DIGITAL", colSim, cy + 3);
  cy += headerH;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, cy - 1, pageW - marginX, cy - 1);

  const filas = [...informe.coincidencias];
  while (filas.length < 5) {
    filas.push({ nombre: "—", codigo: "—", similitud: "—", rgb: null, hex: null });
  }

  for (let i = 0; i < 5; i += 1) {
    const row = filas[i]!;
    const rowTop = rowsAreaTop + i * rowH;
    const swatchY = rowTop + (rowH - sw) / 2;
    const textY = rowTop + rowH / 2 + 1.2;

    const fill = row.rgb ?? (row.hex ? hexToRgb(row.hex) : null);
    if (fill) {
      doc.setFillColor(fill.r, fill.g, fill.b);
      doc.rect(colSwatch, swatchY, sw, sw, "F");
    } else {
      doc.setFillColor(248, 250, 252);
      doc.rect(colSwatch, swatchY, sw, sw, "F");
    }
    doc.setDrawColor(148, 163, 184);
    doc.rect(colSwatch, swatchY, sw, sw, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const nombreLines = doc.splitTextToSize(
      row.nombre,
      colCodigo - colNombre - 3,
    );
    doc.text(nombreLines[0] ?? row.nombre, colNombre, textY);
    doc.text(row.codigo, colCodigo, textY);
    doc.text(row.similitud, colSim, textY);
  }

  // —— Texto descriptivo (15%) ——
  const textPad = 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const disclaimerLines = doc.splitTextToSize(
    DISCLAIMER_APROXIMACION_CODIGO,
    contentW,
  );
  const lineH = 3.8;
  const textBlockH = disclaimerLines.length * lineH;
  const textStartY =
    yText + textPad + Math.max(0, (hText - textPad * 2 - textBlockH) / 2) + lineH;
  doc.text(disclaimerLines, marginX, textStartY);

  // —— Logo (20%), centrado ——
  if (logo?.dataUrl && logo.naturalW > 0) {
    const logoPad = 4;
    const maxLogoW = Math.min(56, contentW * 0.45);
    const maxLogoH = hLogo - logoPad * 2;
    const logoScale = Math.min(
      maxLogoW / logo.naturalW,
      maxLogoH / logo.naturalH,
    );
    const logoW = logo.naturalW * logoScale;
    const logoHDrawn = logo.naturalH * logoScale;
    const logoX = (pageW - logoW) / 2;
    const logoYDrawn = yLogo + (hLogo - logoHDrawn) / 2;
    const format = logo.dataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
    doc.addImage(logo.dataUrl, format, logoX, logoYDrawn, logoW, logoHDrawn);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
