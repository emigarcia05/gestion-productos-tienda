/**
 * WhatsApp Cloud API: subir media y enviar documento (pedido PDF).
 * Token: WHATSAPP_API_TOKEN. Phone Number ID por sucursal en BD.
 */

const API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

function getToken(): string | null {
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!token || token.length < 10) return null;
  return token;
}

/**
 * Sube un PDF a la API de WhatsApp y devuelve el media id.
 */
export async function uploadWhatsAppMedia(
  phoneNumberId: string,
  pdfBuffer: Buffer,
  filename: string
): Promise<{ id: string } | { error: string }> {
  const token = getToken();
  if (!token) return { error: "WHATSAPP_API_TOKEN no configurado." };

  const form = new FormData();
  const blob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
  form.append("file", blob, filename);
  form.append("type", "application/pdf");

  const res = await fetch(`${BASE_URL}/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const msg = err?.error?.message ?? res.statusText;
    return { error: `WhatsApp media: ${msg}` };
  }

  const data = (await res.json()) as { id?: string };
  if (!data?.id) return { error: "WhatsApp no devolvió media id." };
  return { id: data.id };
}

/**
 * Envía un mensaje de tipo documento al número indicado usando el media id.
 */
export async function sendWhatsAppDocument(
  phoneNumberId: string,
  toNumber: string,
  mediaId: string,
  filename: string
): Promise<{ messageId: string } | { error: string }> {
  const token = getToken();
  if (!token) return { error: "WHATSAPP_API_TOKEN no configurado." };

  const to = toNumber.replace(/\D/g, "");
  if (to.length < 10) return { error: "Número WhatsApp inválido." };

  const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "document",
      document: { id: mediaId, filename },
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const msg = err?.error?.message ?? res.statusText;
    return { error: `WhatsApp mensaje: ${msg}` };
  }

  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  const messageId = data?.messages?.[0]?.id;
  if (!messageId) return { error: "WhatsApp no devolvió message id." };
  return { messageId };
}

/**
 * Sube el PDF y envía el documento por WhatsApp. Devuelve ok o error.
 */
export async function sendPedidoPdfViaWhatsApp(
  phoneNumberId: string,
  toWhatsappNumber: string,
  pdfBuffer: Buffer,
  filename: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const upload = await uploadWhatsAppMedia(phoneNumberId, pdfBuffer, filename);
  if ("error" in upload) return { ok: false, error: upload.error };

  const send = await sendWhatsAppDocument(
    phoneNumberId,
    toWhatsappNumber,
    upload.id,
    filename
  );
  if ("error" in send) return { ok: false, error: send.error };

  return { ok: true };
}
