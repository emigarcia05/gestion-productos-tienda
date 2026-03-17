"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  getListaPreciosParaPedidoUrgente,
  getProveedoresParaPedidoUrgente,
} from "@/services/listaPrecios.service";
import {
  syncPedidoUrgenteEnvio,
  getItemsYProveedorParaEnviar,
  type SucursalPedidoEnvio,
  type ItemPedidoUrgentePayload,
  upsertPedidoMercaderiaUrgenteItem,
} from "@/services/pedidosEnvio.service";
import { generarPdfPedido } from "@/lib/generarPdfPedido";
import { sendPedidoPdfViaWhatsApp } from "@/lib/whatsappApi";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/types";
import { PAGE_SIZE } from "@/lib/pagination";
import { z } from "zod";

export async function getPedidoUrgenteData(params: {
  sucursal?: string;
  q?: string;
  pagina?: string;
  proveedor?: string;
  pedido?: string;
}) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return {
      proveedores: [],
      productos: [],
      total: 0,
      totalPaginas: 0,
    };
  }

  const { sucursal = "", q = "", pagina = "1", proveedor = "", pedido = "" } = params;
  const sucursalValida = sucursal.trim();
  const proveedorValido = proveedor.trim();
  const pedidoValido = pedido === "si";
  const qValida = q.trim().length >= 3;
  const tienenFiltrosNecesarios =
    !!sucursalValida && (!!proveedorValido || pedidoValido || qValida);

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const [proveedores, result] = await Promise.all([
    getProveedoresParaPedidoUrgente(),
    tienenFiltrosNecesarios
      ? getListaPreciosParaPedidoUrgente(
          sucursalValida,
          proveedorValido || undefined,
          qValida ? q : undefined,
          paginaNum,
          PAGE_SIZE
        )
      : Promise.resolve({ items: [], total: 0, totalPaginas: 0 }),
  ]);

  return {
    proveedores,
    productos: result.items,
    total: result.total,
    totalPaginas: result.totalPaginas,
  };
}

/** Datos iniciales para la página Enviar Pedido (filtros: proveedores). */
export async function getEnviarPedidoData() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { proveedores: [] };
  }
  const proveedores = await getProveedoresParaPedidoUrgente();
  return { proveedores };
}

/** Ítem de la tabla Enviar Pedido: cant_pedir y descripción (descripcion_tienda o descripcion_proveedor). */
export type EnviarPedidoTablaItem = {
  cantPedir: number;
  descripcion: string;
};

/**
 * Datos de la tabla Enviar Pedido. Solo devuelve ítems cuando están cargados los 3 filtros:
 * sucursal, proveedor y al menos un tipo de pedido.
 */
export async function getEnviarPedidoTablaData(params: {
  sucursal: string;
  proveedor: string;
  tipos: string[];
}): Promise<{ items: EnviarPedidoTablaItem[] }> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { items: [] };
  }
  const { sucursal, proveedor, tipos } = params;
  const sucursalValida =
    sucursal?.trim() && SUCURSALES_VALIDAS.includes(sucursal as SucursalPedidoEnvio)
      ? (sucursal as SucursalPedidoEnvio)
      : null;
  if (!sucursalValida || !proveedor?.trim() || !Array.isArray(tipos) || tipos.length === 0) {
    return { items: [] };
  }
  const { items } = await getItemsYProveedorParaEnviar(proveedor.trim(), sucursalValida, tipos);
  return {
    items: items.map((i) => ({ cantPedir: i.cantPedir, descripcion: i.descripcion })),
  };
}

const SUCURSALES_VALIDAS: SucursalPedidoEnvio[] = ["guaymallen", "maipu"];

/**
 * Sincroniza el pedido urgente a la tabla pedidos_envio.
 * Recibe sucursal + ítems (id lista precio, cantidad); solo se guardan cant > 0.
 * Reemplaza todos los ítems URGENTE de esa sucursal por el conjunto enviado.
 */
export async function syncPedidoUrgenteEnvioAction(
  sucursal: string,
  items: ItemPedidoUrgentePayload[]
): Promise<ActionResult<{ creados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }
  const sucursalValida = SUCURSALES_VALIDAS.includes(sucursal as SucursalPedidoEnvio)
    ? (sucursal as SucursalPedidoEnvio)
    : null;
  if (!sucursalValida) {
    return { ok: false, error: "Seleccioná una sucursal válida (Guaymallén o Maipú)." };
  }
  if (!Array.isArray(items)) {
    return { ok: false, error: "Ítems inválidos." };
  }
  const payload: ItemPedidoUrgentePayload[] = items
    .filter((i) => i && typeof i.id === "string" && typeof i.cant === "number" && i.cant > 0)
    .map((i) => ({ id: String(i.id).trim(), cant: Math.floor(Number(i.cant)) }))
    .filter((i) => i.id.length > 0);
  try {
    const { creados } = await syncPedidoUrgenteEnvio(sucursalValida, payload);
    return { ok: true, data: { creados } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar el pedido.";
    return { ok: false, error: message };
  }
}

const upsertPedidoUrgenteItemSchema = z.object({
  sucursal: z.enum(["guaymallen", "maipu"]),
  listaPrecioProveedorId: z.string().uuid("ID inválido"),
  cant: z.number().int().min(0),
});

export async function upsertPedidoUrgenteMercaderiaItemAction(raw: z.infer<typeof upsertPedidoUrgenteItemSchema>): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }
  const parsed = upsertPedidoUrgenteItemSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first = Object.values(msg).flat().find(Boolean);
    return { ok: false, error: (first as string) ?? "Datos inválidos." };
  }

  const result = await upsertPedidoMercaderiaUrgenteItem({
    sucursal: parsed.data.sucursal,
    listaPrecioProveedorId: parsed.data.listaPrecioProveedorId,
    cant: parsed.data.cant,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: undefined };
}

const SUCURSAL_LABEL: Record<string, string> = {
  guaymallen: "Guaymallén",
  maipu: "Maipú",
};

const TIPO_LABEL: Record<string, string> = {
  URGENTE: "Urgente",
  TINTOMETRICO: "Tintométrico",
  REPOSICION: "Reposición",
};

/**
 * Genera el PDF del pedido y, si está configurado (token + sucursal.phone_number_id + proveedor.whatsapp),
 * lo envía por WhatsApp Cloud API sin abrir pestaña.
 */
export async function generarPdfEnviarPedidoAction(params: {
  proveedorId: string;
  sucursal: string;
  tipos: string[];
}): Promise<
  ActionResult<{
    pdfBase64: string;
    whatsapp: string | null;
    nombreProveedor: string;
    filename: string;
    /** true si se envió por API (no hace falta descargar ni abrir wa.me). */
    sentViaWhatsApp: boolean;
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }
  const { proveedorId, sucursal, tipos } = params;
  if (!proveedorId?.trim() || !sucursal?.trim() || !Array.isArray(tipos) || tipos.length === 0) {
    return { ok: false, error: "Seleccioná proveedor, sucursal y al menos un tipo de pedido." };
  }
  const sucursalValida = SUCURSALES_VALIDAS.includes(sucursal as SucursalPedidoEnvio)
    ? sucursal
    : null;
  if (!sucursalValida) {
    return { ok: false, error: "Sucursal inválida." };
  }

  try {
    const [result, sucursalRow] = await Promise.all([
      getItemsYProveedorParaEnviar(proveedorId.trim(), sucursalValida, tipos),
      prisma.sucursal.findUnique({
        where: { codigo: sucursalValida },
        select: { phoneNumberId: true },
      }),
    ]);
    const { items, proveedor } = result;
    if (!proveedor) {
      return { ok: false, error: "Proveedor no encontrado." };
    }
    const tiposLabel = tipos.map((t) => TIPO_LABEL[t] ?? t).join(", ");
    const sucursalLabel = SUCURSAL_LABEL[sucursalValida] ?? sucursalValida;
    const pdfBuffer = generarPdfPedido(
      items,
      proveedor.nombre,
      sucursalLabel,
      tiposLabel
    );
    const filename = `pedido_${proveedor.prefijo}_${sucursalValida}_${Date.now()}.pdf`;
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    let sentViaWhatsApp = false;
    const phoneNumberId = sucursalRow?.phoneNumberId?.trim();
    if (phoneNumberId && proveedor.whatsapp?.trim()) {
      const sendResult = await sendPedidoPdfViaWhatsApp(
        phoneNumberId,
        proveedor.whatsapp,
        Buffer.from(pdfBuffer),
        filename
      );
      sentViaWhatsApp = sendResult.ok;
      if (!sendResult.ok) {
        return {
          ok: false,
          error: sendResult.error ?? "Error al enviar por WhatsApp.",
        };
      }
    }

    return {
      ok: true,
      data: {
        pdfBase64,
        whatsapp: proveedor.whatsapp,
        nombreProveedor: proveedor.nombre,
        filename,
        sentViaWhatsApp,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al generar el PDF.";
    return { ok: false, error: message };
  }
}
