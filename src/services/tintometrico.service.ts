import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const PROVEEDORES_TINTOMETRICOS = ["Merino", "Rex", "Garage"] as const;

export type ProveedorTintometrico = {
  id: string;
  nombre: string;
  prefijo: string;
};

export async function getProveedoresTintometricos(): Promise<ProveedorTintometrico[]> {
  const where: Prisma.ProveedorWhereInput = {
    OR: PROVEEDORES_TINTOMETRICOS.map((n) => ({
      nombre: { equals: n, mode: "insensitive" as const },
    })),
  };

  const rows = await prisma.proveedor.findMany({
    where,
    select: { id: true, nombre: true, prefijo: true },
    orderBy: { nombre: "asc" },
  });

  // Mantener orden esperado: Merino, Rex, Garage (si existen).
  const order = new Map(PROVEEDORES_TINTOMETRICOS.map((n, i) => [n.toLowerCase(), i]));
  return [...rows].sort((a, b) => {
    const ai = order.get(a.nombre.toLowerCase()) ?? 999;
    const bi = order.get(b.nombre.toLowerCase()) ?? 999;
    return ai - bi;
  });
}

export type BaseTintometricaRow = {
  id: string;
  codTienda: string;
  codExt: string;
  descripcionTienda: string;
  marca: string | null;
  rubro: string | null;
};

export async function buscarBasesTintometricas(
  q: string | undefined,
  take: number
): Promise<{ items: BaseTintometricaRow[]; total: number }> {
  const query = (q ?? "").trim();
  const andParts: Prisma.ListaPrecioTiendaWhereInput[] = [
    { rubro: { equals: "Tintometrico", mode: "insensitive" as const } },
  ];

  if (query.length >= 3) {
    const tokens = query.split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      andParts.push({
        AND: tokens.map((t) => ({
          OR: [
            { descripcionTienda: { contains: t, mode: "insensitive" as const } },
            { codTienda: { contains: t, mode: "insensitive" as const } },
            { codExt: { contains: t, mode: "insensitive" as const } },
            { marca: { contains: t, mode: "insensitive" as const } },
          ],
        })),
      });
    }
  }

  const where: Prisma.ListaPrecioTiendaWhereInput = andParts.length ? { AND: andParts } : {};

  const [rows, total] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      where,
      select: {
        id: true,
        codTienda: true,
        codExt: true,
        descripcionTienda: true,
        marca: true,
        rubro: true,
      },
      orderBy: [{ descripcionTienda: "asc" }, { codTienda: "asc" }],
      take,
    }),
    prisma.listaPrecioTienda.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      codTienda: r.codTienda,
      codExt: r.codExt,
      descripcionTienda: (r.descripcionTienda ?? "").trim(),
      marca: r.marca ?? null,
      rubro: r.rubro ?? null,
    })),
    total,
  };
}

