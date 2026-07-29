/**
 * PDF cliente: aproximación de código Alba desde imagen + respuesta IA.
 * Una sola hoja A4 con bandas: título 5% · imagen 30% · colores 30% · texto 15% · logo 20%.
 * Estética alineada a tokens de la app (primary #0072BB, margen sólido, cards, tablas Balance).
 */
import { jsPDF } from "jspdf";
import type { RgbColor } from "@/lib/colorMuestraImagen";
import { formatRgbTuple, rgbToHex } from "@/lib/colorMuestraImagen";
import type { CoincidenciaAlbaPdf } from "@/lib/parseRespuestaIaCoincidencias";

/** Tokens de marca / UI (globals.css). */
const PRIMARY = { r: 0, g: 114, b: 187 }; // #0072BB
const PRIMARY_FG = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 }; // texto de datos (legibilidad)
const BORDER = { r: 226, g: 232, b: 240 }; // --gris-inset / border
const CARD = { r: 255, g: 255, b: 255 };
const MUTED_FILL = { r: 241, g: 245, b: 249 }; // --muted / --secondary
const ROW_ALT = { r: 244, g: 248, b: 252 }; // fila alterna (PDF aumentos)
const ACCENT_TINT = { r: 224, g: 242, b: 254 }; // --accent #e0f2fe
const DIVIDER_SOFT = { r: 186, g: 218, b: 244 }; // #bae4f4 (PDF aumentos)

const TITLE =
  "APROXIMACIÓN DE CÓDIGO DESDE UNA IMAGEN DIGITAL" as const;
const SUBTITLE_COINCIDENCIAS = "Código con mayor coincidencia digital" as const;

const TITLE_MAS_INFORMACION = "MÁS INFORMACIÓN" as const;

/** Aviso bajo las coincidencias (bloque “Más Información”). */
export const DISCLAIMER_APROXIMACION_CODIGO_P1 =
  "Esta herramienta busca el código de pintura más cercano comparando digitalmente una sección de tu foto con nuestra carta de colores.";

export const DISCLAIMER_APROXIMACION_CODIGO_P2 =
  "Tené en cuenta que los resultados son una guía y aproximación digital, por lo que el color final puede variar. Para apreciar el tono real con mayor precisión, te recomendamos acercarte a nuestras sucursales y consultar la carta de colores en persona.";

/** @deprecated Preferir P1/P2; se mantiene unido por compatibilidad. */
export const DISCLAIMER_APROXIMACION_CODIGO = `${DISCLAIMER_APROXIMACION_CODIGO_P1} ${DISCLAIMER_APROXIMACION_CODIGO_P2}`;

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

function setFill(
  doc: jsPDF,
  c: { r: number; g: number; b: number },
): void {
  doc.setFillColor(c.r, c.g, c.b);
}

function setStroke(
  doc: jsPDF,
  c: { r: number; g: number; b: number },
): void {
  doc.setDrawColor(c.r, c.g, c.b);
}

function setText(
  doc: jsPDF,
  c: { r: number; g: number; b: number },
): void {
  doc.setTextColor(c.r, c.g, c.b);
}

/** Card suave: fondo + borde redondeado (estilo `bg-card` / `border-border`). */
function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { fill?: { r: number; g: number; b: number }; radius?: number },
): void {
  const radius = opts?.radius ?? 2.5;
  setFill(doc, opts?.fill ?? CARD);
  setStroke(doc, BORDER);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, radius, radius, "FD");
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
      // Swatch y recuadro de muestra más grandes (legibles en el PDF).
      const swatch = Math.max(140, Math.round(ladoMenor * 0.42));
      const gapFlecha = Math.max(32, Math.round(swatch * 0.18));
      const panelPadX = Math.max(18, Math.round(swatch * 0.12));
      const fontSize = Math.max(22, Math.round(swatch * 0.18));
      const lineGap = Math.round(fontSize * 1.35);
      const textBlockH = lineGap * 2 + Math.round(fontSize * 0.6);
      const panelPadBottom = Math.max(14, Math.round(swatch * 0.08));

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

      const imgY = Math.round((canvasH - naturalH) / 2);
      ctx.drawImage(img, 0, imgY, naturalW, naturalH);

      const box = Math.max(28, Math.round(ladoMenor * 0.075));
      const bx = Math.max(0, Math.min(naturalW - box, muestra.x - box / 2));
      const by = Math.max(
        0,
        Math.min(naturalH - box, muestra.y - box / 2),
      );

      ctx.strokeStyle = "#0072BB";
      ctx.lineWidth = Math.max(3, Math.round(box / 6));
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
      const radius = Math.max(6, Math.round(swatch * 0.08));
      ctx.fillStyle = hex;
      ctx.strokeStyle = "#0072BB";
      ctx.lineWidth = Math.max(2, Math.round(swatch * 0.025));
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(sx, sy, swatch, swatch, radius);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(sx, sy, swatch, swatch);
        ctx.strokeRect(sx, sy, swatch, swatch);
      }

      ctx.fillStyle = "#000000";
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
  /** Margen sólido #0072BB que enmarca toda la hoja. */
  const marginBand = 7;
  const contentPad = 3;
  const marginX = marginBand + contentPad;
  const marginY = marginBand + contentPad;
  const contentW = pageW - marginX * 2;
  const contentH = pageH - marginY * 2;
  const innerX = marginBand;
  const innerY = marginBand;
  const innerW = pageW - marginBand * 2;
  const innerH = pageH - marginBand * 2;

  // Fondo: margen primary + panel interior blanco.
  setFill(doc, PRIMARY);
  doc.rect(0, 0, pageW, pageH, "F");
  setFill(doc, CARD);
  doc.rect(innerX, innerY, innerW, innerH, "F");

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

  // —— Título (5%): sin fondo; tipografía mayor; centrado H/V en su banda ——
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(doc, PRIMARY);
  const titleLines = doc.splitTextToSize(TITLE, contentW - 4);
  const titleLineH = 5.5;
  const titleBlockH = titleLines.length * titleLineH;
  const titleY = yTitle + (hTitle - titleBlockH) / 2 + titleLineH;
  doc.text(titleLines, pageW / 2, titleY, { align: "center" });

  // —— Imagen muestra (30%): card con borde suave ——
  const imgCardPad = 3;
  const imgCardX = marginX;
  const imgCardY = yImage + 1.5;
  const imgCardW = contentW;
  const imgCardH = hImage - 3;
  drawCard(doc, imgCardX, imgCardY, imgCardW, imgCardH, { radius: 3 });

  const maxImgW = imgCardW - imgCardPad * 2;
  const maxImgH = imgCardH - imgCardPad * 2;
  const imgScale = Math.min(
    maxImgW / imagenAnotada.width,
    maxImgH / imagenAnotada.height,
  );
  const drawW = imagenAnotada.width * imgScale;
  const drawH = imagenAnotada.height * imgScale;
  const imgX = imgCardX + imgCardPad + (maxImgW - drawW) / 2;
  const imgY = imgCardY + imgCardPad + (maxImgH - drawH) / 2;
  doc.addImage(imagenAnotada.dataUrl, "JPEG", imgX, imgY, drawW, drawH);

  // —— Cuadro colores (30%): subtítulo + tabla estilo Balance ——
  const colorsPad = 2;
  let cy = yColors + colorsPad;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, PRIMARY);
  const subtitleCenterX = marginX + contentW / 2;
  doc.text(SUBTITLE_COINCIDENCIAS, subtitleCenterX, cy + 3.2, {
    align: "center",
  });
  cy += 6;

  const tableX = marginX;
  const tableW = contentW;
  const tableBottom = yColors + hColors - colorsPad;
  const tableH = Math.max(18, tableBottom - cy);
  drawCard(doc, tableX, cy, tableW, tableH, { radius: 2.5 });

  const sw = 8;
  const innerPad = 3;
  // 5 columnas: Color | Nombre | Código | Aprox. Digital | URL
  const colSwatch = tableX + innerPad;
  const colNombre = colSwatch + sw + 3.5;
  const colCodigo = tableX + 55;
  const colSim = tableX + 88;
  const colLink = tableX + 118;
  const linkMaxW = tableX + tableW - innerPad - colLink;
  const headerH = 7;
  const rowsAreaTop = cy + headerH;
  const rowsAreaBottom = cy + tableH - 1.5;
  const rowsAreaH = Math.max(16, rowsAreaBottom - rowsAreaTop);
  const rowH = rowsAreaH / 5;

  // Cabecera tabla: primary + texto blanco (patrón Balance / tablas marca).
  setFill(doc, PRIMARY);
  doc.roundedRect(tableX, cy, tableW, headerH, 2.5, 2.5, "F");
  setFill(doc, PRIMARY);
  doc.rect(tableX, cy + headerH - 2.5, tableW, 2.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  setText(doc, PRIMARY_FG);
  const headY = cy + 4.6;
  doc.text("COLOR", colSwatch, headY);
  doc.text("NOMBRE", colNombre, headY);
  doc.text("CÓDIGO", colCodigo, headY);
  doc.text("APROX. DIGITAL", colSim, headY);
  doc.text("URL", colLink, headY);

  const LINK_LABEL = "Ver color en la página oficial";

  const filas = [...informe.coincidencias];
  while (filas.length < 5) {
    filas.push({
      nombre: "—",
      codigo: "—",
      similitud: "—",
      url: null,
      rgb: null,
      hex: null,
    });
  }

  for (let i = 0; i < 5; i += 1) {
    const row = filas[i]!;
    const rowTop = rowsAreaTop + i * rowH;
    const swatchY = rowTop + (rowH - sw) / 2;
    const textY = rowTop + rowH / 2 + 1.1;

    if (i % 2 === 1) {
      setFill(doc, ROW_ALT);
      doc.rect(tableX + 0.4, rowTop, tableW - 0.8, rowH, "F");
    }

    if (i < 4) {
      setStroke(doc, DIVIDER_SOFT);
      doc.setLineWidth(0.2);
      doc.line(
        tableX + innerPad,
        rowTop + rowH,
        tableX + tableW - innerPad,
        rowTop + rowH,
      );
    }

    const fill = row.rgb ?? (row.hex ? hexToRgb(row.hex) : null);
    if (fill) {
      setFill(doc, fill);
      doc.roundedRect(colSwatch, swatchY, sw, sw, 1.2, 1.2, "F");
    } else {
      setFill(doc, MUTED_FILL);
      doc.roundedRect(colSwatch, swatchY, sw, sw, 1.2, 1.2, "F");
    }
    setStroke(doc, BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(colSwatch, swatchY, sw, sw, 1.2, 1.2, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(doc, BLACK);
    const nombreLines = doc.splitTextToSize(
      row.nombre,
      colCodigo - colNombre - 2,
    );
    doc.text(nombreLines[0] ?? row.nombre, colNombre, textY);
    doc.setFont("helvetica", "bold");
    doc.text(row.codigo, colCodigo, textY);
    doc.setFont("helvetica", "normal");
    doc.text(row.similitud, colSim, textY);

    doc.setFontSize(6.5);
    if (row.url) {
      setText(doc, PRIMARY);
      const linkLines = doc.splitTextToSize(LINK_LABEL, linkMaxW);
      const linkText = linkLines[0] ?? LINK_LABEL;
      doc.textWithLink(linkText, colLink, textY, { url: row.url });
      const linkW = doc.getTextWidth(linkText);
      setStroke(doc, PRIMARY);
      doc.setLineWidth(0.25);
      doc.line(colLink, textY + 0.6, colLink + linkW, textY + 0.6);
    } else {
      setText(doc, BLACK);
      doc.text("—", colLink, textY);
    }
  }

  // —— Más Información (15%): callout sin barra lateral ——
  const calloutPad = 3;
  const calloutX = marginX;
  const calloutY = yText + 1.5;
  const calloutW = contentW;
  const calloutH = hText - 3;
  drawCard(doc, calloutX, calloutY, calloutW, calloutH, {
    fill: ACCENT_TINT,
    radius: 2.5,
  });

  const textMaxW = calloutW - calloutPad * 2;
  const textX = calloutX + calloutPad;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, PRIMARY);
  const infoTitleY = calloutY + calloutPad + 3.5;
  doc.text(TITLE_MAS_INFORMACION, calloutX + calloutW / 2, infoTitleY, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, BLACK);
  const lineH = 4;
  const p1Lines = doc.splitTextToSize(DISCLAIMER_APROXIMACION_CODIGO_P1, textMaxW);
  const p2Lines = doc.splitTextToSize(DISCLAIMER_APROXIMACION_CODIGO_P2, textMaxW);
  const paraGap = 2.2;
  const bodyH =
    p1Lines.length * lineH + paraGap + p2Lines.length * lineH;
  const bodyTop =
    infoTitleY +
    3 +
    Math.max(0, (calloutH - (infoTitleY - calloutY) - 3 - bodyH - calloutPad) / 2);

  doc.text(p1Lines, textX, bodyTop + lineH);
  doc.text(
    p2Lines,
    textX,
    bodyTop + p1Lines.length * lineH + paraGap + lineH,
  );

  // —— Logo (20%): divisor suave + logo centrado ——
  setStroke(doc, DIVIDER_SOFT);
  doc.setLineWidth(0.45);
  doc.line(marginX + contentW * 0.2, yLogo + 2, marginX + contentW * 0.8, yLogo + 2);

  if (logo?.dataUrl && logo.naturalW > 0) {
    const logoPad = 5;
    const maxLogoW = Math.min(56, contentW * 0.45);
    const maxLogoH = hLogo - logoPad * 2 - 2;
    const logoScale = Math.min(
      maxLogoW / logo.naturalW,
      maxLogoH / logo.naturalH,
    );
    const logoW = logo.naturalW * logoScale;
    const logoHDrawn = logo.naturalH * logoScale;
    const logoX = (pageW - logoW) / 2;
    const logoYDrawn = yLogo + 4 + (hLogo - 4 - logoHDrawn) / 2;
    const format = logo.dataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
    doc.addImage(logo.dataUrl, format, logoX, logoYDrawn, logoW, logoHDrawn);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
