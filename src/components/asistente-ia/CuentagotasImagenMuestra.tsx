"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ImagePlus, Pipette, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cssPointToCanvasPoint,
  formatRgbTuple,
  normalizeRect,
  promedioRgbEnPunto,
  promedioRgbEnRect,
  rgbToHex,
  type RectSeleccion,
  type RgbColor,
} from "@/lib/colorMuestraImagen";
import { CALLOUT_WARNING_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const MIN_DRAG_PX = 4;
const MAX_CANVAS_DISPLAY = 640;

export interface CuentagotasImagenMuestraProps {
  color: RgbColor | null;
  onColorChange: (color: RgbColor | null) => void;
}

export default function CuentagotasImagenMuestra({
  color,
  onColorChange,
}: CuentagotasImagenMuestraProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [tieneImagen, setTieneImagen] = useState(false);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [selPreview, setSelPreview] = useState<RectSeleccion | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const clearImagen = useCallback(() => {
    revokeObjectUrl();
    imageRef.current = null;
    setTieneImagen(false);
    setDisplaySize({ w: 0, h: 0 });
    setSelPreview(null);
    dragOriginRef.current = null;
    onColorChange(null);
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (overlay) {
      const octx = overlay.getContext("2d");
      octx?.clearRect(0, 0, overlay.width, overlay.height);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onColorChange, revokeObjectUrl]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  function paintImageToCanvas(img: HTMLImageElement) {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const scale = Math.min(
      1,
      MAX_CANVAS_DISPLAY / img.naturalWidth,
      MAX_CANVAS_DISPLAY / img.naturalHeight,
    );
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    overlay.width = img.naturalWidth;
    overlay.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const octx = overlay.getContext("2d");
    octx?.clearRect(0, 0, overlay.width, overlay.height);

    setDisplaySize({ w, h });
    setTieneImagen(true);
  }

  function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    revokeObjectUrl();
    onColorChange(null);
    setSelPreview(null);

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      paintImageToCanvas(img);
    };
    img.onerror = () => {
      clearImagen();
    };
    img.src = url;
  }

  function drawSelectionOverlay(rect: RectSeleccion | null) {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const octx = overlay.getContext("2d");
    if (!octx) return;
    octx.clearRect(0, 0, overlay.width, overlay.height);
    if (!rect || rect.w < 1 || rect.h < 1) return;
    octx.strokeStyle = "rgba(0, 114, 187, 0.95)";
    octx.lineWidth = Math.max(2, Math.round(overlay.width / 400));
    octx.setLineDash([6, 4]);
    octx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    octx.fillStyle = "rgba(0, 114, 187, 0.15)";
    octx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  useEffect(() => {
    drawSelectionOverlay(selPreview);
  }, [selPreview]);

  function sampleFromRectOrPoint(rect: RectSeleccion, endX: number, endY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const isClick =
      rect.w < MIN_DRAG_PX && rect.h < MIN_DRAG_PX;
    const sampled = isClick
      ? promedioRgbEnPunto(ctx, endX, endY, canvas.width, canvas.height)
      : promedioRgbEnRect(ctx, rect, canvas.width, canvas.height);

    if (sampled) {
      onColorChange(sampled);
      setSelPreview(
        isClick
          ? {
              x: endX - 8,
              y: endY - 8,
              w: 17,
              h: 17,
            }
          : rect,
      );
    }
  }

  function toCanvasPoint(e: ReactPointerEvent<HTMLCanvasElement>) {
    return cssPointToCanvasPoint(e.clientX, e.clientY, e.currentTarget);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!tieneImagen) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toCanvasPoint(e);
    if (!pt) return;
    dragOriginRef.current = pt;
    setSelPreview({ x: pt.x, y: pt.y, w: 0, h: 0 });
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const origin = dragOriginRef.current;
    if (!origin) return;
    const pt = toCanvasPoint(e);
    if (!pt) return;
    setSelPreview(normalizeRect(origin.x, origin.y, pt.x, pt.y));
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    const origin = dragOriginRef.current;
    dragOriginRef.current = null;
    if (!origin) return;
    const pt = toCanvasPoint(e) ?? origin;
    const rect = normalizeRect(origin.x, origin.y, pt.x, pt.y);
    sampleFromRectOrPoint(rect, pt.x, pt.y);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  const hex = color ? rgbToHex(color) : null;

  return (
    <div className="flex shrink-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <Button
          type="button"
          className="h-10 px-4"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          Abrir Imagen Muestra
        </Button>
        {tieneImagen ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            onClick={clearImagen}
          >
            <X className="h-4 w-4" aria-hidden />
            Quitar Imagen
          </Button>
        ) : null}
      </div>

      {!tieneImagen ? (
        <p className="text-sm text-muted-foreground">
          La imagen se usa solo en el navegador para tomar el color; no se
          guarda en el servidor.
        </p>
      ) : (
        <>
          <p className={cn(CALLOUT_WARNING_CLASS, "shrink-0")}>
            <Pipette className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden />
            Seleccione la parte de la imagen donde desea buscar el color (clic o
            arrastre un área).
          </p>

          <div className="flex flex-wrap items-start gap-4">
            <div
              className="relative overflow-hidden rounded-md border border-border bg-muted/40"
              style={{ width: displaySize.w, height: displaySize.h }}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                aria-hidden
              />
              <canvas
                ref={overlayRef}
                className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => {
                  dragOriginRef.current = null;
                }}
                role="img"
                aria-label="Lienzo para seleccionar color de la imagen muestra"
              />
            </div>

            <div className="flex min-w-[12rem] flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Color Muestra</p>
              {color && hex ? (
                <>
                  <div
                    className="h-16 w-full rounded-md border border-border"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                  <p className="text-sm tabular-nums text-foreground">
                    RGB: {formatRgbTuple(color)}
                  </p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    HEX: {hex}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin color seleccionado.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
