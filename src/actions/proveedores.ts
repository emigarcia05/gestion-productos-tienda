"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generarCodigoUnico } from "@/lib/codigos";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";

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
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const nombre = (formData.get("nombre") as string)?.trim();
  const sufijo = (formData.get("sufijo") as string)?.trim().toUpperCase();

  if (!nombre || nombre.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  }
  if (!sufijo || sufijo.length !== 3 || !/^[A-Z]{3}$/.test(sufijo)) {
    return { ok: false, error: "El sufijo debe tener exactamente 3 letras (sin números ni símbolos)." };
  }

  const sufijoExiste = await prisma.proveedor.findUnique({ where: { sufijo } });
  if (sufijoExiste) {
    return { ok: false, error: `El sufijo "${sufijo}" ya está en uso.` };
  }

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
      data: { nombre, codigoUnico, sufijo },
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
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const nombre = (formData.get("nombre") as string)?.trim();
  const sufijo = (formData.get("sufijo") as string)?.trim().toUpperCase();

  if (!nombre || nombre.length < 2) {
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  }
  if (!sufijo || sufijo.length !== 3 || !/^[A-Z]{3}$/.test(sufijo)) {
    return { ok: false, error: "El sufijo debe tener exactamente 3 letras (sin números ni símbolos)." };
  }

  const sufijoExiste = await prisma.proveedor.findFirst({
    where: { sufijo, NOT: { id } },
  });
  if (sufijoExiste) {
    return { ok: false, error: `El sufijo "${sufijo}" ya está en uso.` };
  }

  try {
    await prisma.proveedor.update({ where: { id }, data: { nombre, sufijo } });
    revalidatePath("/proveedores");
    revalidatePath(`/proveedores/${id}`);
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo actualizar el proveedor." };
  }
}

// ─── Eliminar ──────────────────────────────────────────────────────────────

export async function eliminarProveedor(id: string): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  try {
    await prisma.proveedor.delete({ where: { id } });
    revalidatePath("/proveedores");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo eliminar el proveedor." };
  }
}
