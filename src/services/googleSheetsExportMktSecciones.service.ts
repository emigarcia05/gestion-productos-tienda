import { isoYmdFromPrismaDateOnly } from "@/lib/fechaArgentina";
import { prisma } from "@/lib/prisma";
import {
  openGoogleSheetsClient,
  replaceGoogleSheetTabValues,
} from "@/lib/googleSheetsWrite";
import type { ServiceResult } from "@/types/service.types";

/** Pestañas del spreadsheet fijo de Marketing (orden de escritura). */
export const GOOGLE_SHEET_TABS_MKT = {
  publicaciones: "Publicaciones",
  redes: "Publicaciones Redes",
  secciones: "Publicaciones Secciones",
  ideas: "Publicaciones Ideas",
  tipoContenido: "Publi Tipo Contenido",
  contenidoMultimedia: "Contenido Multimedia",
  contenidoMultimediaTipo: "Contenido Multimedia Tipo",
} as const;

export type ExportMktGoogleSheetsTabResult = {
  sheetTitle: string;
  filasDatos: number;
};

export type ExportMktGoogleSheetsResult = {
  spreadsheetId: string;
  url: string;
  tabs: ExportMktGoogleSheetsTabResult[];
};

function boolSheet(value: boolean): string {
  return value ? "TRUE" : "FALSE";
}

/**
 * Exporta catálogos y hechos de Marketing al spreadsheet fijo (todas las pestañas).
 * Sobrescribe cada pestaña (crea si no existe).
 */
export async function exportarMktAGoogleSheets(): Promise<
  ServiceResult<ExportMktGoogleSheetsResult>
> {
  const client = openGoogleSheetsClient();
  if (!client.ok) return { success: false, error: client.error };

  const { config, sheets, url } = client.data;

  try {
    const [
      secciones,
      redes,
      tiposContenido,
      ideas,
      publicaciones,
      contenidoMultimedia,
      contenidoMultimediaTipos,
    ] = await Promise.all([
      prisma.mktPublicacionIdeaSeccion.findMany({
        select: { id: true, ideaNombre: true, ideaResumen: true },
        orderBy: { ideaNombre: "asc" },
      }),
      prisma.mktPublicacionRed.findMany({
        select: { id: true, redSocialNombre: true },
        orderBy: { redSocialNombre: "asc" },
      }),
      prisma.mktPublicacionContenidoTipo.findMany({
        select: { id: true, contenidoNombre: true },
        orderBy: { contenidoNombre: "asc" },
      }),
      prisma.mktPublicacionIdeaDetalle.findMany({
        select: { id: true, seccionId: true, detalle: true, usada: true },
        orderBy: [{ seccionId: "asc" }, { id: "asc" }],
      }),
      prisma.mktPublicacion.findMany({
        select: {
          id: true,
          tipoContenidoId: true,
          ideaDetalleId: true,
          fecha: true,
          publicacion: true,
          contenidoUrl: true,
          redes: { select: { redId: true } },
        },
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
      }),
      prisma.mktContenidoUrlDrive.findMany({
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          url: true,
          tipoId: true,
        },
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
      }),
      prisma.mktContenidoDriveTipo.findMany({
        select: { id: true, tipo: true },
        orderBy: { tipo: "asc" },
      }),
    ]);

    const tabsPayload: { title: string; values: string[][] }[] = [
      {
        title: GOOGLE_SHEET_TABS_MKT.publicaciones,
        values: [
          [
            "id",
            "red_id",
            "tipo_contenido_id",
            "idea_detalle_id",
            "fecha",
            "publicacion",
            "contenido_url",
          ],
          // Una fila por red (1 publicación × N redes).
          ...publicaciones.flatMap((r) => {
            const base = [
              r.id,
              "", // red_id placeholder replaced below
              r.tipoContenidoId,
              r.ideaDetalleId ?? "",
              isoYmdFromPrismaDateOnly(r.fecha),
              r.publicacion ?? "",
              r.contenidoUrl ?? "",
            ];
            const redIds =
              r.redes.length > 0 ? r.redes.map((x) => x.redId) : [""];
            return redIds.map((redId) => {
              const row = [...base];
              row[1] = redId;
              return row;
            });
          }),
        ],
      },
      {
        title: GOOGLE_SHEET_TABS_MKT.redes,
        values: [
          ["id", "red_social_nombre"],
          ...redes.map((r) => [r.id, r.redSocialNombre]),
        ],
      },
      {
        title: GOOGLE_SHEET_TABS_MKT.secciones,
        values: [
          ["id", "idea_nombre", "idea_resumen"],
          ...secciones.map((r) => [r.id, r.ideaNombre, r.ideaResumen ?? ""]),
        ],
      },
      {
        title: GOOGLE_SHEET_TABS_MKT.ideas,
        values: [
          ["id", "seccion_id", "detalle", "usada"],
          ...ideas.map((r) => [r.id, r.seccionId, r.detalle, boolSheet(r.usada)]),
        ],
      },
      {
        title: GOOGLE_SHEET_TABS_MKT.tipoContenido,
        values: [
          ["id", "contenido_nombre"],
          ...tiposContenido.map((r) => [r.id, r.contenidoNombre]),
        ],
      },
      {
        title: GOOGLE_SHEET_TABS_MKT.contenidoMultimedia,
        values: [
          ["id", "nombre", "descripcion", "url", "tipo_id"],
          ...contenidoMultimedia.map((r) => [
            r.id,
            r.nombre,
            r.descripcion ?? "",
            r.url ?? "",
            r.tipoId,
          ]),
        ],
      },
      {
        title: GOOGLE_SHEET_TABS_MKT.contenidoMultimediaTipo,
        values: [
          ["id", "tipo"],
          ...contenidoMultimediaTipos.map((r) => [r.id, r.tipo]),
        ],
      },
    ];

    const tabs: ExportMktGoogleSheetsTabResult[] = [];
    for (const tab of tabsPayload) {
      await replaceGoogleSheetTabValues(
        sheets,
        config.spreadsheetId,
        tab.title,
        tab.values
      );
      tabs.push({
        sheetTitle: tab.title,
        filasDatos: Math.max(0, tab.values.length - 1),
      });
    }

    return {
      success: true,
      data: {
        spreadsheetId: config.spreadsheetId,
        url,
        tabs,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido al exportar a Google Sheets.";
    return {
      success: false,
      error: `No se pudo exportar a Google Sheets: ${message}`,
    };
  }
}
