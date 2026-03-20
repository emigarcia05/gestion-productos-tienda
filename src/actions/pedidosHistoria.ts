"use server";

import { revalidatePath } from "next/cache";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";
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

const listarPedidosHistoriaSchema = z.object({
  pagina: z.coerce.number().int().min(1).optional().default(1),
  estado: z.enum(["PEDIDO", "RECIBIDO"]).optional(),
  proveedorId: z.string().optional(),
  sucursalCodigo: z.enum(["guaymallen", "maipu"]).optional(),
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
  });

  if (!res.success) return { ok: false, error: res.error };
  return { ok: true, data: res.data };
}

export async function actualizarPedidoHistoriaItemCantRecibidaAction(
  params: z.infer<typeof actualizarCantRecibidaSchema>
): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin permisos para pedidos." };
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

  const parsed = marcarRegistradoSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await pedidosHistoriaService.marcarPedidoHistoriaRegistrado({
    pedidoHistoriaId: parsed.data.pedidoHistoriaId,
  });
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath("/pedidos/historial");
  return { ok: true, data: undefined };
}

