"use server";

import { revalidatePath } from "next/cache";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { prismaCuidSchema } from "@/lib/validations/common";
import { z } from "zod";
import { generarPdfPedido } from "@/lib/generarPdfPedido";
import { formatDdMmHhMmArgentina } from "@/lib/fechaArgentina";
import { SUCURSAL_LABEL_PEDIDO, type SucursalPedido } from "@/lib/pedidos";
import * as pedidosHistoriaService from "@/services/pedidosHistoria.service";

/**
 * Wrapper de seguridad para Server Actions del módulo:
 *  - Garantiza que cualquier excepción no esperada (Neon, iron-session,
 *    revalidatePath, etc.) NO suba al cliente como mensaje genérico de
 *    "Server Components render…", sino como `ActionResult.error`.
 *  - Loggea un mensaje grepeable en Vercel Function Logs con el `scope`.
 */
async function ejecutarActionSegura<T>(
  scope: string,
  fn: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[pedidoHistoria][action][${scope}]`, msg);
    return { ok: false, error: "Error inesperado al procesar la solicitud." };
  }
}

const getPedidoHistoriaDetalleSchema = z.object({
  pedidoHistoriaId: prismaCuidSchema,
});

const actualizarCantRecibidaSchema = z.object({
  pedidoHistoriaItemId: prismaCuidSchema,
  cantRecibida: z.coerce.number().int().min(0, "Cant. inválida."),
});

const agregarItemSchema = z.object({
  pedidoHistoriaId: prismaCuidSchema,
  codTienda: z.string().min(1, "Cod. tienda inválido."),
  cantRecibida: z.coerce.number().int().min(0, "Cant. inválida."),
});

const marcarRegistradoSchema = z.object({
  pedidoHistoriaId: prismaCuidSchema,
  totalPedido: z.coerce.number().positive("Total inválido."),
});

const guardarRecepcionSchema = z.object({
  pedidoHistoriaId: prismaCuidSchema,
  items: z
    .array(
      z.object({
        id: z.preprocess(
          (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
          prismaCuidSchema.optional()
        ),
        codTienda: z.string().min(1, "Cod. tienda inválido."),
        cantPedida: z.coerce.number().int().min(0, "Cant. pedida inválida."),
        cantRecibida: z.coerce.number().int().min(0, "Cant. recibida inválida").nullable(),
      })
    )
    .min(1, "Debe existir al menos un ítem."),
});

const reabrirRecepcionSchema = z.object({
  pedidoHistoriaId: prismaCuidSchema,
});

const eliminarPedidoHistoriaSchema = z.object({
  pedidoHistoriaId: prismaCuidSchema,
});

const descargarPdfPedidoHistoriaSchema = z.object({
  pedidoHistoriaId: prismaCuidSchema,
});

const listarPedidosHistoriaSchema = z.object({
  pagina: z.coerce.number().int().min(1).optional().default(1),
  estado: z.enum(["PENDIENTE", "SIN RECEPCION", "RECEPCIONADO", "ALL"]).optional(),
  proveedorId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    prismaCuidSchema.optional()
  ),
  sucursalCodigo: z.enum(["guaymallen", "maipu"]).optional(),
  q: z.string().max(200).optional(),
});

export async function getPedidoHistoriaDetalleAction(
  params: unknown
): Promise<ActionResult<pedidosHistoriaService.PedidoHistoriaDetalle>> {
  return ejecutarActionSegura("getPedidoHistoriaDetalle", async () => {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.pedidos.acceso)) {
      return { ok: false, error: "Sin permisos para pedidos." };
    }

    const parsed = getPedidoHistoriaDetalleSchema.safeParse(params);
    if (!parsed.success) return { ok: false, error: "ID de pedido inválido." };

    const res = await pedidosHistoriaService.getPedidoHistoriaDetalle({
      pedidoHistoriaId: parsed.data.pedidoHistoriaId,
    });

    if (!res.success) return { ok: false, error: res.error };
    const wired =
      pedidosHistoriaService.serializarPedidoHistoriaDetalleParaCliente(res.data);
    try {
      // Última barrera: el flight de Actions/RSC debe recibir sólo datos JSON planos.
      const data = JSON.parse(
        JSON.stringify(wired)
      ) as pedidosHistoriaService.PedidoHistoriaDetalle;
      return { ok: true, data };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        "[pedidoHistoria][action][getPedidoHistoriaDetalle]",
        "fallo JSON.stringify/parse:",
        msg
      );
      return {
        ok: false,
        error:
          "No se pudo transmitir el detalle del pedido. Probá recargar la página.",
      };
    }
  });
}

export async function listarPedidosHistoriaAction(
  params: unknown
): Promise<
  ActionResult<{
    items: pedidosHistoriaService.PedidoHistoriaResumen[];
    total: number;
    totalPaginas: number;
    paginaActual: number;
  }>
> {
  return ejecutarActionSegura("listarPedidosHistoria", async () => {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.pedidos.acceso)) {
      return { ok: false, error: "Sin permisos para pedidos." };
    }

    const parsed = listarPedidosHistoriaSchema.safeParse(params);
    if (!parsed.success) return { ok: false, error: "Datos inválidos." };
    const estadoNormalizado =
      parsed.data.estado === "SIN RECEPCION" ? "PENDIENTE" : parsed.data.estado;

    const res = await pedidosHistoriaService.listarPedidosHistoria({
      pagina: parsed.data.pagina,
      estado: estadoNormalizado,
      proveedorId: parsed.data.proveedorId,
      sucursalCodigo: parsed.data.sucursalCodigo,
      q: parsed.data.q?.trim() || undefined,
    });

    if (!res.success) return { ok: false, error: res.error };
    return { ok: true, data: res.data };
  });
}

/** Regenera la nota de pedido PDF desde el snapshot del historial (mismo layout que al generar). */
export async function descargarPdfPedidoHistoriaAction(
  params: unknown
): Promise<ActionResult<{ pdfBase64: string; filename: string }>> {
  return ejecutarActionSegura("descargarPdfPedidoHistoria", async () => {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.pedidos.acceso)) {
      return { ok: false, error: "Sin permisos para pedidos." };
    }

    const parsed = descargarPdfPedidoHistoriaSchema.safeParse(params);
    if (!parsed.success) return { ok: false, error: "ID de pedido inválido." };

    const res = await pedidosHistoriaService.getPedidoHistoriaPdfPayload({
      pedidoHistoriaId: parsed.data.pedidoHistoriaId,
    });
    if (!res.success) return { ok: false, error: res.error };

    const { items, proveedorNombre, proveedorPrefijo, sucursalCodigo, generadoAt } =
      res.data;

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
    const fechaStr = formatDdMmHhMmArgentina(generadoAt);
    const filename = `Nota Pedido - ${prefijoProveedor} - ${fechaStr}.pdf`;
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    return { ok: true, data: { pdfBase64, filename } };
  });
}

export async function actualizarPedidoHistoriaItemCantRecibidaAction(
  params: unknown
): Promise<ActionResult<void>> {
  return ejecutarActionSegura("actualizarPedidoHistoriaItemCantRecibida", async () => {
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
  });
}

export async function agregarPedidoHistoriaItemAction(
  params: unknown
): Promise<ActionResult<{ idItem: string }>> {
  return ejecutarActionSegura("agregarPedidoHistoriaItem", async () => {
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
  });
}

export async function marcarPedidoHistoriaRegistradoAction(
  params: unknown
): Promise<ActionResult<void>> {
  return ejecutarActionSegura("marcarPedidoHistoriaRegistrado", async () => {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.pedidos.acceso)) {
      return { ok: false, error: "Sin permisos para pedidos." };
    }

    const parsed = marcarRegistradoSchema.safeParse(params);
    if (!parsed.success) return { ok: false, error: "Datos inválidos." };

    const res = await pedidosHistoriaService.marcarPedidoHistoriaRegistrado({
      pedidoHistoriaId: parsed.data.pedidoHistoriaId,
      totalPedido: parsed.data.totalPedido,
    });
    if (!res.success) return { ok: false, error: res.error };

    revalidatePath("/pedidos/historial");
    return { ok: true, data: undefined };
  });
}

export async function guardarRecepcionPedidoHistoriaAction(
  params: unknown
): Promise<ActionResult<void>> {
  return ejecutarActionSegura("guardarRecepcionPedidoHistoria", async () => {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.pedidos.acceso)) {
      return { ok: false, error: "Sin permisos para pedidos." };
    }

    const parsed = guardarRecepcionSchema.safeParse(params);
    if (!parsed.success) return { ok: false, error: "Datos inválidos." };

    const res = await pedidosHistoriaService.guardarRecepcionPedidoHistoria({
      pedidoHistoriaId: parsed.data.pedidoHistoriaId,
      items: parsed.data.items,
    });
    if (!res.success) return { ok: false, error: res.error };

    revalidatePath("/pedidos/historial");
    return { ok: true, data: undefined };
  });
}

export async function reabrirPedidoHistoriaRecepcionAction(
  params: unknown
): Promise<ActionResult<void>> {
  return ejecutarActionSegura("reabrirPedidoHistoriaRecepcion", async () => {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.pedidos.acceso)) {
      return { ok: false, error: "Sin permisos para pedidos." };
    }

    const parsed = reabrirRecepcionSchema.safeParse(params);
    if (!parsed.success) return { ok: false, error: "Datos inválidos." };

    const res = await pedidosHistoriaService.reabrirPedidoHistoriaRecepcion({
      pedidoHistoriaId: parsed.data.pedidoHistoriaId,
    });
    if (!res.success) return { ok: false, error: res.error };

    revalidatePath("/pedidos/historial");
    return { ok: true, data: undefined };
  });
}

export async function eliminarPedidoHistoriaAction(
  params: unknown
): Promise<ActionResult<void>> {
  return ejecutarActionSegura("eliminarPedidoHistoria", async () => {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.pedidos.acceso)) {
      return { ok: false, error: "Sin permisos para pedidos." };
    }

    const parsed = eliminarPedidoHistoriaSchema.safeParse(params);
    if (!parsed.success) return { ok: false, error: "Datos inválidos." };

    const res = await pedidosHistoriaService.eliminarPedidoHistoria({
      pedidoHistoriaId: parsed.data.pedidoHistoriaId,
    });
    if (!res.success) return { ok: false, error: res.error };

    revalidatePath("/pedidos/historial");
    return { ok: true, data: undefined };
  });
}

