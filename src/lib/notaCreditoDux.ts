/** Alta de nota de crédito / débito de compra en DUX. */
export const DUX_NUEVA_NOTA_CREDITO_DEBITO_COMPRA_URL =
  "https://erp.duxsoftware.com.ar/pages/compras/gestionNotaCreditoDebitoCompra/nuevoNotaCreditoDebitoCompra.faces";

/** Nombre de ventana: reusa la misma pestaña (no `_blank`). Sin `noopener` para poder enfocarla. */
export const DUX_NOTA_CREDITO_WINDOW_NAME = "dux-nota-credito";

let duxNotaCreditoWin: Window | null = null;

function esPestañaEnBlanco(win: Window): boolean {
  try {
    const href = win.location.href;
    return href === "about:blank" || href === "";
  } catch {
    return false;
  }
}

/** Abre (o reusa) el importador de NC en DUX. Llamar en el clic de **Generar Nota Crédito**. */
export function abrirDuxNotaCreditoTab(): void {
  if (typeof window === "undefined") return;
  duxNotaCreditoWin = window.open(
    DUX_NUEVA_NOTA_CREDITO_DEBITO_COMPRA_URL,
    DUX_NOTA_CREDITO_WINDOW_NAME
  );
}

/**
 * Trae al frente la pestaña DUX ya abierta. No pasa la URL: no recarga el formulario.
 * Si el usuario la cerró, vuelve a abrir DUX.
 */
export function enfocarDuxNotaCreditoTab(): void {
  if (typeof window === "undefined") return;

  if (duxNotaCreditoWin && !duxNotaCreditoWin.closed) {
    duxNotaCreditoWin.focus();
    return;
  }

  const win = window.open("", DUX_NOTA_CREDITO_WINDOW_NAME);
  if (!win || win.closed) {
    abrirDuxNotaCreditoTab();
    return;
  }

  if (esPestañaEnBlanco(win)) {
    win.location.href = DUX_NUEVA_NOTA_CREDITO_DEBITO_COMPRA_URL;
  }
  duxNotaCreditoWin = win;
  win.focus();
}
