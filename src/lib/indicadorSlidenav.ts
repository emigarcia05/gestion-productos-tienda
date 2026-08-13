/** Evento de ventana: hay que recargar el indicador de pendientes del slidenav. */
export const EVENTO_INDICADOR_SLIDENAV = "indicador-slidenav-refresh";

export function avisarIndicadorSlidenav(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_INDICADOR_SLIDENAV));
}

