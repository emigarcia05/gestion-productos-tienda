/**
 * Carga pdf.js en servidor (API routes / Vercel) sin depender del import dinámico
 * `./pdf.worker.mjs` desde dentro del paquete (falla en serverless si el worker no está trazado).
 *
 * Precarga `WorkerMessageHandler` en `globalThis.pdfjsWorker` antes de usar `getDocument`.
 */
type PdfJsMain = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

declare global {
  var pdfjsWorker: { WorkerMessageHandler?: unknown } | undefined;
}

let loadPromise: Promise<PdfJsMain> | null = null;

export function getPdfJsServer(): Promise<PdfJsMain> {
  if (!loadPromise) {
    loadPromise = (async () => {
      if (!globalThis.pdfjsWorker?.WorkerMessageHandler) {
        const workerMod = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
        globalThis.pdfjsWorker = workerMod as { WorkerMessageHandler?: unknown };
      }
      return import("pdfjs-dist/legacy/build/pdf.mjs");
    })();
  }
  return loadPromise;
}
