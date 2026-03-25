"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import {
  getListaPreciosParaPedidoUrgente,
  getProveedoresParaPedidoUrgente,
} from "@/services/listaPrecios.service";
import {
  syncPedidoUrgenteEnvio,
  getItemsTablaEnviarPedido,
  getItemsYProveedorParaEnviar,
  type SucursalPedidoEnvio,
  type ItemPedidoUrgentePayload,
  upsertPedidoMercaderiaUrgenteItem,
  upsertPedidoTintometricoItems,
  type ItemPedidoTintometricoPayload,
  deletePedidoTintometricoItem,
} from "@/services/pedidosEnvio.service";
import { crearPedidoHistoriaSnapshot } from "@/services/pedidosHistoria.service";
import { generarPdfPedido } from "@/lib/generarPdfPedido";
import { formatDdMmHhMmArgentina } from "@/lib/fechaArgentina";
import { sendPedidoPdfViaWhatsApp } from "@/lib/whatsappApi";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/types";
import { PAGE_SIZE } from "@/lib/pagination";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { SUCURSAL_LABEL_PEDIDO, type SucursalPedido } from "@/lib/pedidos";
import {
  getSobreStockReposicionItems,
  type SobreStockReposicionItem,
} from "@/services/sobreStock.service";
import {
  getPedidoUrgenteDataParamsSchema,
  getEnviarPedidoTablaParamsSchema,
} from "@/lib/validations/pedidosLectura";

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

  const parsedParams = getPedidoUrgenteDataParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return {
      proveedores: [],
      productos: [],
      total: 0,
      totalPaginas: 0,
    };
  }
  const { sucursal = "", q = "", pagina = "1", proveedor = "" } = parsedParams.data;
  const sucursalValida = sucursal.trim();
  const proveedorValido = proveedor.trim();
  const qValida = q.trim().length >= 3;
  const tieneSucursal = !!sucursalValida;

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const [proveedores, result] = await Promise.all([
    getProveedoresParaPedidoUrgente(),
    tieneSucursal
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

/** Datos iniciales para la página Generar Pedido (filtros: proveedores). */
export async function getEnviarPedidoData() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { proveedores: [] };
  }
  const proveedores = await getProveedoresParaPedidoUrgente();
  return { proveedores };
}

/** Ítem de la tabla Generar Pedido: cant_pedir y descripción (descripcion_tienda o descripcion_proveedor). */
export type EnviarPedidoTablaItem = {
  cantPedir: number;
  descripcion: string;
};

/**
 * Datos de la tabla Generar Pedido. Sin filtros en URL: todos los ítems con cant_pedir > 0.
 * Cada filtro activo (sucursal, proveedor, tipo(s), búsqueda) acota el listado.
 */
export async function getEnviarPedidoTablaData(params: {
  sucursal: string;
  proveedor: string;
  tipos: string[];
  q?: string;
}): Promise<{ items: EnviarPedidoTablaItem[] }> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { items: [] };
  }
  const parsed = getEnviarPedidoTablaParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { items: [] };
  }
  const { sucursal, proveedor, tipos, q } = parsed.data;
  const sucursalFiltro =
    sucursal.trim() && SUCURSALES_VALIDAS.includes(sucursal as SucursalPedidoEnvio)
      ? sucursal.trim()
      : undefined;
  const tiposFiltro = tipos.length > 0 ? tipos : undefined;
  const { items } = await getItemsTablaEnviarPedido({
    sucursalCodigo: sucursalFiltro,
    proveedorId: proveedor.trim() || undefined,
    tipos: tiposFiltro,
    q,
  });
  return { items };
}

const comprobarItemsGenerarPedidoSchema = z.object({
  proveedorId: z.string().min(1, "Proveedor requerido."),
  sucursal: z.enum(["guaymallen", "maipu"]),
  tipos: z
    .array(z.enum(["URGENTE", "TINTOMETRICO", "REPOSICION"]))
    .min(1, "Al menos un tipo de pedido."),
});

/**
 * Indica si existen ítems con cantidad a pedir > 0 para generar el PDF (misma lógica que la tabla Generar Pedido).
 */
export async function comprobarItemsParaGenerarPedidoAction(
  raw: unknown
): Promise<ActionResult<{ hayItems: boolean }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }
  const parsed = comprobarItemsGenerarPedidoSchema.safeParse(raw);
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    const msg =
      f.proveedorId?.[0] ??
      f.sucursal?.[0] ??
      f.tipos?.[0] ??
      "Datos inválidos para comprobar ítems.";
    return { ok: false, error: msg };
  }
  const { proveedorId, sucursal, tipos } = parsed.data;
  const { items } = await getEnviarPedidoTablaData({
    sucursal,
    proveedor: proveedorId,
    tipos,
  });
  return { ok: true, data: { hayItems: items.length > 0 } };
}

const SUCURSALES_VALIDAS: SucursalPedidoEnvio[] = ["guaymallen", "maipu"];

const syncPedidoUrgenteEnvioSchema = z.object({
  sucursal: z.enum(["guaymallen", "maipu"]),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
        cant: z.number().int().min(0),
      })
    )
    .max(100_000),
});

const generarPdfEnviarPedidoSchema = z.object({
  proveedorId: z.string().min(1).max(128),
  sucursal: z.enum(["guaymallen", "maipu"]),
  tipos: z
    .array(z.enum(["URGENTE", "TINTOMETRICO", "REPOSICION"]))
    .min(1, "Al menos un tipo de pedido."),
  /**
   * Si `bloquearSiSobreStock` es true y hay ítems de REPOSICION con sobrestock,
   * no se genera el pedido hasta que `confirmarSobreStock` sea true.
   *
   * La UI debería manejar el modal y llamar nuevamente con confirmación.
   */
  bloquearSiSobreStock: z.boolean().optional().default(false),
  confirmarSobreStock: z.boolean().optional().default(false),
});

const getSobreStockReposicionParaModalSchema = z.object({
  proveedorId: z.string().min(1).max(128),
  sucursal: z.enum(["guaymallen", "maipu"]),
  tipos: z
    .array(z.enum(["URGENTE", "TINTOMETRICO", "REPOSICION"]))
    .min(1, "Al menos un tipo de pedido."),
});

export async function getSobreStockReposicionParaModalAction(
  raw: unknown
): Promise<
  ActionResult<{
    tieneSobreStock: boolean;
    items: SobreStockReposicionItem[];
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }

  const parsed = getSobreStockReposicionParaModalSchema.safeParse(raw);
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    const msg =
      f.proveedorId?.[0] ??
      f.sucursal?.[0] ??
      f.tipos?.[0] ??
      "Datos inválidos para obtener sobrestock.";
    return { ok: false, error: msg };
  }

  const { proveedorId, sucursal, tipos } = parsed.data;

  // Solo tiene sentido cuando se va a generar con REPOSICION.
  if (!tipos.includes("REPOSICION")) {
    return { ok: true, data: { tieneSobreStock: false, items: [] } };
  }

  const res = await getSobreStockReposicionItems({
    proveedorId: proveedorId.trim(),
    sucursal,
  });

  return { ok: true, data: res };
}

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
  const rawParsed = syncPedidoUrgenteEnvioSchema.safeParse({ sucursal, items });
  if (!rawParsed.success) {
    return { ok: false, error: "Datos inválidos para sincronizar el pedido urgente." };
  }
  const sucursalValida = rawParsed.data.sucursal;
  const payload: ItemPedidoUrgentePayload[] = rawParsed.data.items
    .filter((i) => i.cant > 0)
    .map((i) => ({ id: i.id.trim(), cant: i.cant }))
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

const TIPO_LABEL: Record<string, string> = {
  URGENTE: "Urgente",
  TINTOMETRICO: "Tintométrico",
  REPOSICION: "Reposición",
};

const pedidoTintometricoItemSchema = z.object({
  sucursalCodigo: z.enum(["guaymallen", "maipu"]),
  proveedorId: z.string().min(1, "Proveedor inválido."),
  codTienda: z.string().min(1, "Cod. Tienda requerido."),
  cantidad: z.number().int().min(1, "Cant. debe ser mayor a 0."),
  descripcion: z.string().min(1, "Descripción requerida."),
});

export async function upsertPedidoTintometricoItemsAction(
  items: ItemPedidoTintometricoPayload[]
): Promise<ActionResult<{ actualizados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "No hay ítems para guardar." };
  }

  const parsed = z.array(pedidoTintometricoItemSchema).safeParse(items);
  if (!parsed.success) {
    return { ok: false, error: "Datos de ítems tintométricos inválidos." };
  }

  const sucursal = parsed.data[0].sucursalCodigo;
  const todosMismaSucursal = parsed.data.every((i) => i.sucursalCodigo === sucursal);
  if (!todosMismaSucursal) {
    return { ok: false, error: "Todos los ítems deben ser de la misma sucursal." };
  }

  const { actualizados, error } = await upsertPedidoTintometricoItems(
    sucursal,
    parsed.data
  );
  if (error) {
    return { ok: false, error };
  }
  return { ok: true, data: { actualizados } };
}

const deleteTintometricoItemSchema = z.object({
  sucursalCodigo: z.enum(["guaymallen", "maipu"]),
  proveedorId: z.string().min(1, "Proveedor inválido."),
  codTienda: z.string().min(1, "Cod. Tienda requerido."),
});

export async function deletePedidoTintometricoItemAction(
  raw: z.infer<typeof deleteTintometricoItemSchema>
): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }

  const parsed = deleteTintometricoItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos para borrar el ítem." };
  }

  const result = await deletePedidoTintometricoItem(parsed.data);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: undefined };
}

/**
 * Genera el PDF del pedido y, si está configurado (token + sucursal.phone_number_id + proveedor.whatsapp),
 * lo envía por WhatsApp Cloud API sin abrir pestaña.
 */
export async function generarPdfEnviarPedidoAction(params: {
  proveedorId: string;
  sucursal: string;
  tipos: string[];
  bloquearSiSobreStock?: boolean;
  confirmarSobreStock?: boolean;
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
  const parsedParams = generarPdfEnviarPedidoSchema.safeParse(params);
  if (!parsedParams.success) {
    const flat = parsedParams.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors][0] ??
      "Seleccioná proveedor, sucursal y al menos un tipo de pedido.";
    return { ok: false, error: msg };
  }
  const {
    proveedorId,
    sucursal: sucursalValida,
    tipos,
    bloquearSiSobreStock,
    confirmarSobreStock,
  } = parsedParams.data;

  function sanitizeFilenamePart(s: string): string {
    // Reemplaza caracteres no válidos para nombres de archivo (Windows y, por compatibilidad, también para WhatsApp).
    return s.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim();
  }

  try {
    const [result, sucursalRow] = await Promise.all([
      getItemsYProveedorParaEnviar(proveedorId.trim(), sucursalValida as SucursalPedidoEnvio, tipos),
      prisma.sucursal.findUnique({
        where: { codigo: sucursalValida },
        select: { id: true, phoneNumberId: true },
      }),
    ]);
    const { items, proveedor } = result;
    if (!proveedor) {
      return { ok: false, error: "Proveedor no encontrado." };
    }
    if (items.length === 0) {
      return {
        ok: false,
        error: "No hay ítems para generar el pedido con la selección indicada.",
      };
    }

    // Validación opcional: bloqueo por sobrestock para REPOSICION.
    if (bloquearSiSobreStock && tipos.includes("REPOSICION")) {
      const sobreStockRes = await getSobreStockReposicionItems({
        proveedorId: proveedorId.trim(),
        sucursal: sucursalValida as SucursalPedidoEnvio,
      });

      if (sobreStockRes.items.length > 0 && !confirmarSobreStock) {
        return {
          ok: false,
          error: `SOBRESTOCK_REQUIERE_CONFIRMACION:${sobreStockRes.items.length}`,
        };
      }
    }

    const historiaRes = await crearPedidoHistoriaSnapshot({
      proveedorId: proveedorId.trim(),
      sucursalCodigo: sucursalValida as SucursalPedidoEnvio,
      tipos,
    });
    if (!historiaRes.success) {
      return { ok: false, error: historiaRes.error };
    }

    const tiposLabel = tipos.map((t) => TIPO_LABEL[t] ?? t).join(", ");
    const sucursalLabel =
      SUCURSAL_LABEL_PEDIDO[sucursalValida as SucursalPedido] ?? sucursalValida;
    const pdfBuffer = generarPdfPedido(
      items,
      proveedor.nombre,
      sucursalLabel,
      tiposLabel
    );
    const prefijoProveedor = sanitizeFilenamePart(proveedor.prefijo || "");
    const fechaStr = formatDdMmHhMmArgentina(new Date());
    const filename = `Nota Pedido - ${prefijoProveedor} - ${fechaStr}.pdf`;
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

    // Al "enviar" (generar y devolver el PDF), limpiar pedidos_mercaderia de los tipos
    // URGENTE/TINTOMETRICO para la sucursal configurada.
    const tiposBorrar = tipos.filter((t) => t === "URGENTE" || t === "TINTOMETRICO");
    if (sucursalRow?.id && tiposBorrar.length > 0) {
      await prisma.itemPedidoEnvio.deleteMany({
        where: {
          sucursalId: sucursalRow.id,
          tipoPedido: { in: tiposBorrar },
        },
      });
    }

    // Refrescar listados afectados para que no queden ítems viejos.
    revalidatePath("/pedidos/enviar");
    revalidatePath("/pedidos/urgente");
    revalidatePath("/pedidos/tintometrico");
    revalidatePath("/pedidos/reposicion");
    revalidatePath("/pedidos/historial");

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
