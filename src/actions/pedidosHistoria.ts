"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";
import { generarPdfPedido } from "@/lib/generarPdfPedido";
import { SUCURSAL_LABEL_PEDIDO, type SucursalPedido } from "@/lib/pedidos";
import * as pedidosHistoriaService from "@/services/pedidosHistoria.service";

const getPedidoHistoriaDetalleSchema = z.object({
  pedidoHistoriaId: z.string().min(1, "ID inválido."),
});

const actualizarCantRecibidaSchema = z.object({
  pedidoHistoriaItemId: z.string().min(1, "ID inválido."),
  cantRecibida: z.coerce.number().int().min(0, "Cant. inválida."),
});

const agregarItemSchema = z.object({
  pedidoHistoriaId: z.string().min(1, "ID inválido."),
  codTienda: z.string().min(1, "Cod. tienda inválido."),
  cantRecibida: z.coerce.number().int().min(0, "Cant. inválida."),
});

const marcarRegistradoSchema = z.object({
  pedidoHistoriaId: z.string().min(1, "ID inválido."),
});

const eliminarPedidoHistoriaSchema = z.object({
  pedidoHistoriaId: z.string().min(1, "ID inválido."),
});

const descargarPdfPedidoHistoriaSchema = z.object({
  pedidoHistoriaId: z.string().min(1, "ID inválido."),
});

const listarPedidosHistoriaSchema = z.object({
  pagina: z.coerce.number().int().min(1).optional().default(1),
  estado: z.enum(["PEDIDO", "RECIBIDO", "ALL"]).optional(),
  proveedorId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).max(128).optional()
  ),
  sucursalCodigo: z.enum(["guaymallen", "maipu"]).optional(),
  q: z.string().max(200).optional(),
});

export async function getPedidoHistoriaDetalleAction(
  params: z.infer<typeof getPedidoHistoriaDetalleSchema>
): Promise<ActionResult<pedidosHistoriaService.PedidoHistoriaDetalle>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }

  const parsed = getPedidoHistoriaDetalleSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const res = await pedidosHistoriaService.getPedidoHistoriaDetalle({
    pedidoHistoriaId: parsed.data.pedidoHistoriaId,
  });

  if (!res.success) return { ok: false, error: res.error };
  return { ok: true, data: res.data };
}

export async function listarPedidosHistoriaAction(
  params: z.infer<typeof listarPedidosHistoriaSchema>
): Promise<
  ActionResult<{
    items: pedidosHistoriaService.PedidoHistoriaResumen[];
    total: number;
    totalPaginas: number;
    paginaActual: number;
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }

  const parsed = listarPedidosHistoriaSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await pedidosHistoriaService.listarPedidosHistoria({
    pagina: parsed.data.pagina,
    estado: parsed.data.estado,
    proveedorId: parsed.data.proveedorId,
    sucursalCodigo: parsed.data.sucursalCodigo,
    q: parsed.data.q?.trim() || undefined,
  });

  if (!res.success) return { ok: false, error: res.error };
  return { ok: true, data: res.data };
}

/** Regenera la nota de pedido PDF desde el snapshot del historial (mismo layout que al generar). */
export async function descargarPdfPedidoHistoriaAction(
  params: z.infer<typeof descargarPdfPedidoHistoriaSchema>
): Promise<ActionResult<{ pdfBase64: string; filename: string }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }

  const parsed = descargarPdfPedidoHistoriaSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const res = await pedidosHistoriaService.getPedidoHistoriaPdfPayload({
    pedidoHistoriaId: parsed.data.pedidoHistoriaId,
  });
  if (!res.success) return { ok: false, error: res.error };

  const { items, proveedorNombre, proveedorPrefijo, sucursalCodigo, generadoAt } =
    res.data;

  function pad2(n: number): string {
    return String(n).padStart(2, "0");
  }
  function fmtDdMmHHmm(d: Date): string {
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const hh = pad2(d.getHours());
    const min = pad2(d.getMinutes());
    return `${dd}/${mm} ${hh}:${min}`;
  }
  function sanitizeFilenamePart(s: string): string {
    return s.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim();
  }

  const sucursalLabel =
    SUCURSAL_LABEL_PEDIDO[sucursalCodigo as SucursalPedido] ?? sucursalCodigo;
  const pdfBuffer = generarPdfPedido(
    items,
    proveedorNombre,
    sucursalLabel,
    "",
    { fechaDocumento: generadoAt }
  );
  const prefijoProveedor = sanitizeFilenamePart(proveedorPrefijo || "");
  const fechaStr = fmtDdMmHHmm(generadoAt);
  const filename = `Nota Pedido - ${prefijoProveedor} - ${fechaStr}.pdf`;
  const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

  return { ok: true, data: { pdfBase64, filename } };
}

export async function actualizarPedidoHistoriaItemCantRecibidaAction(
  params: z.infer<typeof actualizarCantRecibidaSchema>
): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede modificar la recepción." };
  }

  const parsed = actualizarCantRecibidaSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await pedidosHistoriaService.actualizarPedidoHistoriaItemCantRecibida({
    pedidoHistoriaItemId: parsed.data.pedidoHistoriaItemId,
    cantRecibida: parsed.data.cantRecibida,
  });

  if (!res.success) return { ok: false, error: res.error };

  revalidatePath("/pedidos/historial");
  return { ok: true, data: undefined };
}

export async function agregarPedidoHistoriaItemAction(
  params: z.infer<typeof agregarItemSchema>
): Promise<ActionResult<{ idItem: string }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede agregar ítems al pedido." };
  }

  const parsed = agregarItemSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await pedidosHistoriaService.agregarPedidoHistoriaItem({
    pedidoHistoriaId: parsed.data.pedidoHistoriaId,
    codTienda: parsed.data.codTienda,
    cantRecibida: parsed.data.cantRecibida,
  });

  if (!res.success) return { ok: false, error: res.error };

  revalidatePath("/pedidos/historial");
  return { ok: true, data: { idItem: res.data.idItem } };
}

export async function marcarPedidoHistoriaRegistradoAction(
  params: z.infer<typeof marcarRegistradoSchema>
): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede registrar en DUX." };
  }

  const parsed = marcarRegistradoSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await pedidosHistoriaService.marcarPedidoHistoriaRegistrado({
    pedidoHistoriaId: parsed.data.pedidoHistoriaId,
  });
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath("/pedidos/historial");
  return { ok: true, data: undefined };
}

export async function eliminarPedidoHistoriaAction(
  params: z.infer<typeof eliminarPedidoHistoriaSchema>
): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede borrar pedidos del historial." };
  }

  const parsed = eliminarPedidoHistoriaSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await pedidosHistoriaService.eliminarPedidoHistoria({
    pedidoHistoriaId: parsed.data.pedidoHistoriaId,
  });
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath("/pedidos/historial");
  return { ok: true, data: undefined };
}

