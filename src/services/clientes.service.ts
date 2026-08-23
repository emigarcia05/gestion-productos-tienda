import { prisma } from "@/lib/prisma";
import {
  compararClientesParaListado,
  normalizarNombreCliente,
  type ClienteItem,
  type ClienteResumen,
} from "@/lib/envios";
import type { CrearClienteInput, EditarClienteInput } from "@/lib/validations/envios";
import type { ServiceResult } from "@/types/service.types";

const resumenSelect = {
  id: true,
  nombreCompleto: true,
  cel: true,
  tipo: true,
} as const;

const select = {
  ...resumenSelect,
  pintorAsociadoId: true,
  pintorAsociado: { select: resumenSelect },
} as const;

function mapResumen(row: ClienteResumen): ClienteResumen {
  return {
    id: row.id,
    nombreCompleto: normalizarNombreCliente(row.nombreCompleto),
    cel: row.cel.trim(),
    tipo: row.tipo,
  };
}

function mapRow(row: {
  id: string;
  nombreCompleto: string;
  cel: string;
  tipo: ClienteResumen["tipo"];
  pintorAsociadoId: string | null;
  pintorAsociado: ClienteResumen | null;
}): ClienteItem {
  return {
    ...mapResumen(row),
    pintorAsociadoId: row.pintorAsociadoId,
    pintorAsociado: row.pintorAsociado ? mapResumen(row.pintorAsociado) : null,
  };
}

function prismaErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2025") return "El cliente no existe.";
    if (code === "P2003") {
      return "No se puede eliminar: el cliente está asociado a un envío, a una dirección o como pintor de otro cliente.";
    }
  }
  return error instanceof Error ? error.message : fallback;
}

async function resolverPintorAsociadoId(input: {
  id?: string;
  tipo: CrearClienteInput["tipo"];
  pintorAsociadoId?: string | null;
}): Promise<ServiceResult<string | null>> {
  if (input.tipo === "PINTOR") {
    return { success: true, data: null };
  }
  const pintorAsociadoId = input.pintorAsociadoId ?? null;
  if (!pintorAsociadoId) {
    return { success: true, data: null };
  }
  if (input.id && pintorAsociadoId === input.id) {
    return { success: false, error: "El cliente no puede asociarse a sí mismo." };
  }
  const pintor = await prisma.cliente.findUnique({
    where: { id: pintorAsociadoId },
    select: { id: true, tipo: true },
  });
  if (!pintor) {
    return { success: false, error: "El pintor asociado no existe." };
  }
  if (pintor.tipo !== "PINTOR") {
    return { success: false, error: "El pintor asociado debe ser de tipo PINTOR." };
  }
  return { success: true, data: pintor.id };
}

export async function listarClientes(): Promise<ClienteItem[]> {
  try {
    const rows = await prisma.cliente.findMany({
      orderBy: [{ nombreCompleto: "asc" }, { createdAt: "asc" }],
      select,
    });
    return rows.map(mapRow).sort(compararClientesParaListado);
  } catch (e) {
    console.error("[clientes][listar]", e);
    return [];
  }
}

export async function crearCliente(
  input: CrearClienteInput
): Promise<ServiceResult<ClienteItem>> {
  try {
    const pintor = await resolverPintorAsociadoId(input);
    if (!pintor.success) return pintor;
    const row = await prisma.cliente.create({
      data: {
        nombreCompleto: normalizarNombreCliente(input.nombreCompleto),
        cel: input.cel.trim(),
        tipo: input.tipo,
        pintorAsociadoId: pintor.data,
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    console.error("[clientes][crear]", error);
    return { success: false, error: prismaErrorMessage(error, "No se pudo crear el cliente.") };
  }
}

export async function editarCliente(
  input: EditarClienteInput
): Promise<ServiceResult<ClienteItem>> {
  try {
    const usada = await prisma.enviosFinal.findFirst({
      where: input.tipo === "CONSUMIDOR_FINAL" ? { pintorId: input.id } : { clienteFinalId: input.id },
      select: { id: true },
    });
    if (usada) {
      return {
        success: false,
        error:
          "No se puede cambiar el tipo: el cliente ya está asociado a un envío con el tipo actual.",
      };
    }
    if (input.tipo === "CONSUMIDOR_FINAL") {
      const asociadoComoPintor = await prisma.cliente.findFirst({
        where: { pintorAsociadoId: input.id },
        select: { id: true },
      });
      if (asociadoComoPintor) {
        return {
          success: false,
          error: "No se puede cambiar a CONSUMIDOR FINAL: hay clientes que lo tienen como pintor asociado.",
        };
      }
    }
    const pintor = await resolverPintorAsociadoId(input);
    if (!pintor.success) return pintor;
    const row = await prisma.cliente.update({
      where: { id: input.id },
      data: {
        nombreCompleto: normalizarNombreCliente(input.nombreCompleto),
        cel: input.cel.trim(),
        tipo: input.tipo,
        pintorAsociadoId: pintor.data,
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    console.error("[clientes][editar]", error);
    return { success: false, error: prismaErrorMessage(error, "No se pudo actualizar el cliente.") };
  }
}

export async function eliminarCliente(id: string): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.cliente.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    console.error("[clientes][eliminar]", error);
    return { success: false, error: prismaErrorMessage(error, "No se pudo eliminar el cliente.") };
  }
}
