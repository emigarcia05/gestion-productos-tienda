/** Descarga en el navegador un PDF representado en base64 (mismo patrón que Generar Pedido). */
export function descargarPdfBase64(base64: string, filename: string): void {
  if (!base64?.trim()) {
    throw new Error("PDF vacío.");
  }
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
