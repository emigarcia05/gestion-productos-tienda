import { prisma } from "@/lib/prisma";

export interface CompetenciaParaCliente {
  id: string;
  nombre: string;
  web: string;
  urlBusqueda: string | null;
}

export async function listCompetencias(): Promise<CompetenciaParaCliente[]> {
  const rows = await prisma.prodCompetencia.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, web: true, urlBusqueda: true },
  });
  return rows;
}

export async function createCompetencia(data: {
  nombre: string;
  web: string;
  urlBusqueda?: string;
}): Promise<CompetenciaParaCliente> {
  const row = await prisma.prodCompetencia.create({
    data: {
      nombre: data.nombre.trim(),
      web: normalizeWebUrl(data.web),
      urlBusqueda: normalizeUrlBusqueda(data.urlBusqueda),
    },
    select: { id: true, nombre: true, web: true, urlBusqueda: true },
  });
  return row;
}

export async function updateCompetencia(data: {
  id: string;
  nombre: string;
  web: string;
  urlBusqueda?: string;
}): Promise<CompetenciaParaCliente> {
  const row = await prisma.prodCompetencia.update({
    where: { id: data.id },
    data: {
      nombre: data.nombre.trim(),
      web: normalizeWebUrl(data.web),
      urlBusqueda: normalizeUrlBusqueda(data.urlBusqueda),
    },
    select: { id: true, nombre: true, web: true, urlBusqueda: true },
  });
  return row;
}

/** Guarda plantilla de búsqueda tal cual (con `{q}`); vacío → null en BD. */
export function normalizeUrlBusqueda(url?: string | null): string | null {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
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
