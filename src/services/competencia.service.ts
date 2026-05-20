import { prisma } from "@/lib/prisma";

export interface CompetenciaParaCliente {
  id: string;
  nombre: string;
  web: string;
  ultimaComparacionAt: string | null;
}

export async function listCompetencias(): Promise<CompetenciaParaCliente[]> {
  const rows = await prisma.prodCompetencia.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      web: true,
      ultimaComparacionAt: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    ultimaComparacionAt: r.ultimaComparacionAt?.toISOString() ?? null,
  }));
}

export async function createCompetencia(data: {
  nombre: string;
  web: string;
}): Promise<CompetenciaParaCliente> {
  const row = await prisma.prodCompetencia.create({
    data: {
      nombre: data.nombre.trim(),
      web: normalizeWebUrl(data.web),
    },
    select: {
      id: true,
      nombre: true,
      web: true,
      ultimaComparacionAt: true,
    },
  });
  return mapCompetenciaRow(row);
}

export async function updateCompetencia(data: {
  id: string;
  nombre: string;
  web: string;
}): Promise<CompetenciaParaCliente> {
  const row = await prisma.prodCompetencia.update({
    where: { id: data.id },
    data: {
      nombre: data.nombre.trim(),
      web: normalizeWebUrl(data.web),
    },
    select: {
      id: true,
      nombre: true,
      web: true,
      ultimaComparacionAt: true,
    },
  });
  return mapCompetenciaRow(row);
}

function mapCompetenciaRow(row: {
  id: string;
  nombre: string;
  web: string;
  ultimaComparacionAt: Date | null;
}): CompetenciaParaCliente {
  return {
    ...row,
    ultimaComparacionAt: row.ultimaComparacionAt?.toISOString() ?? null,
  };
}

export async function deleteCompetencia(id: string): Promise<void> {
  await prisma.prodCompetencia.delete({ where: { id } });
}

export function normalizeWebUrl(web: string): string {
  const trimmed = web.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/+$/, "");
  }
  return `https://${trimmed.replace(/\/+$/, "")}`;
}
