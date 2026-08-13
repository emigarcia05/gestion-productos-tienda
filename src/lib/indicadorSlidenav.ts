/** Evento de ventana: hay que recargar el indicador de pendientes del slidenav. */
export const EVENTO_INDICADOR_SLIDENAV = "indicador-slidenav-refresh";

/** Tras elegir usuario: avisar si hay transferencias pendientes. */
export const EVENTO_ADVERTIR_TRANSF_PENDIENTES =
  "indicador-advertir-transf-pendientes";

export function avisarIndicadorSlidenav(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_INDICADOR_SLIDENAV));
}

export function avisarAdvertirTransfPendientes(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_ADVERTIR_TRANSF_PENDIENTES));
}

