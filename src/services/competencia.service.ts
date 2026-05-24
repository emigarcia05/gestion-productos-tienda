import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseCompetenciaConfigExtraccion,
  type CompetenciaConfigExtraccion,
} from "@/lib/competenciaConfigExtraccion";

export interface CompetenciaParaCliente {
  id: string;
  nombre: string;
  web: string;
  idProveedor: string | null;
  ultimaComparacionAt: string | null;
  configExtraccion: CompetenciaConfigExtraccion | null;
}

const competenciaSelect = {
  id: true,
  nombre: true,
  web: true,
  idProveedor: true,
  ultimaComparacionAt: true,
  configExtraccion: true,
} as const;

export async function listCompetencias(): Promise<CompetenciaParaCliente[]> {
  const rows = await prisma.prodCompetencia.findMany({
    orderBy: { nombre: "asc" },
    select: competenciaSelect,
  });
  return rows.map(mapCompetenciaRow);
}

export async function createCompetencia(data: {
  nombre: string;
  web: string;
  idProveedor?: string | null;
  configExtraccion?: CompetenciaConfigExtraccion | null;
}): Promise<CompetenciaParaCliente> {
  const row = await prisma.prodCompetencia.create({
    data: {
      nombre: data.nombre.trim(),
      web: normalizeWebUrl(data.web),
      idProveedor: data.idProveedor ?? null,
      configExtraccion: toJsonInput(data.configExtraccion),
    },
    select: competenciaSelect,
  });
  return mapCompetenciaRow(row);
}

export async function updateCompetencia(data: {
  id: string;
  nombre: string;
  web: string;
  idProveedor?: string | null;
  configExtraccion?: CompetenciaConfigExtraccion | null;
}): Promise<CompetenciaParaCliente> {
  const row = await prisma.prodCompetencia.update({
    where: { id: data.id },
    data: {
      nombre: data.nombre.trim(),
      web: normalizeWebUrl(data.web),
      ...(data.idProveedor !== undefined ? { idProveedor: data.idProveedor } : {}),
      ...(data.configExtraccion !== undefined
        ? { configExtraccion: toJsonInput(data.configExtraccion) }
        : {}),
    },
    select: competenciaSelect,
  });
  return mapCompetenciaRow(row);
}

function toJsonInput(
  config: CompetenciaConfigExtraccion | null | undefined
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (config === undefined) return undefined;
  if (config == null || config.reglas.length === 0) return Prisma.DbNull;
  return config as Prisma.InputJsonValue;
}

function mapCompetenciaRow(row: {
  id: string;
  nombre: string;
  web: string;
  idProveedor: string | null;
  ultimaComparacionAt: Date | null;
  configExtraccion: unknown;
}): CompetenciaParaCliente {
  return {
    id: row.id,
    nombre: row.nombre,
    web: row.web,
    idProveedor: row.idProveedor,
    ultimaComparacionAt: row.ultimaComparacionAt?.toISOString() ?? null,
    configExtraccion: parseCompetenciaConfigExtraccion(row.configExtraccion),
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
