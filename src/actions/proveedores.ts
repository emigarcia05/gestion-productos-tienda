"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generarCodigoUnico } from "@/lib/codigos";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Listar ────────────────────────────────────────────────────────────────

export async function getProveedores() {
  return prisma.proveedor.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { productos: true } } },
  });
}

export async function getProveedorById(id: string) {
  return prisma.proveedor.findUnique({
    where: { id },
    include: {
      productos: { orderBy: { codProdProv: "asc" } },
      _count: { select: { productos: true } },
    },
  });
}

// ─── Crear ─────────────────────────────────────────────────────────────────

export async function crearProveedor(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const nombre = (formData.get("nombre") as string)?.trim();

  if (!nombre || nombre.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  }

  // Genera un codigoUnico que no exista aún
  let codigoUnico = generarCodigoUnico();
  let intentos = 0;
  while (intentos < 10) {
    const existe = await prisma.proveedor.findUnique({ where: { codigoUnico } });
    if (!existe) break;
    codigoUnico = generarCodigoUnico();
    intentos++;
  }

  try {
    const proveedor = await prisma.proveedor.create({
      data: { nombre, codigoUnico },
    });
    revalidatePath("/proveedores");
    return { ok: true, data: { id: proveedor.id } };
  } catch {
    return { ok: false, error: "No se pudo crear el proveedor." };
  }
}

// ─── Editar ────────────────────────────────────────────────────────────────

export async function editarProveedor(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const nombre = (formData.get("nombre") as string)?.trim();

  if (!nombre || nombre.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  }

  try {
    await prisma.proveedor.update({ where: { id }, data: { nombre } });
    revalidatePath("/proveedores");
    revalidatePath(`/proveedores/${id}`);
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo actualizar el proveedor." };
  }
}

// ─── Eliminar ──────────────────────────────────────────────────────────────

export async function eliminarProveedor(id: string): Promise<ActionResult> {
  try {
    await prisma.proveedor.delete({ where: { id } });
    revalidatePath("/proveedores");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo eliminar el proveedor." };
  }
}
