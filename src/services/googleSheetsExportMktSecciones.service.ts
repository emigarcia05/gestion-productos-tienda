import { isoYmdFromPrismaDateOnly } from "@/lib/fechaArgentina";
import { prisma } from "@/lib/prisma";
import {
  openGoogleSheetsClient,
  replaceGoogleSheetTabValues,
} from "@/lib/googleSheetsWrite";
import type { ServiceResult } from "@/types/service.types";

/** Pestañas del spreadsheet fijo de Marketing (orden de escritura). */
export const GOOGLE_SHEET_TABS_MKT = {
  indice: "Indice",
  publicaciones: "Publicaciones",
  redes: "Publicaciones Redes",
  secciones: "Publicaciones Secciones",
  ideas: "Publicaciones Ideas",
  tipoContenido: "Publi Tipo Contenido",
  contenidoMultimedia: "Contenido Multimedia",
  contenidoMultimediaTipo: "Contenido Multimedia Tipo",
  coloresMarca: "Colores Marca",
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
 * Diccionario estático del export (SSOT): catálogo hoja↔tabla + relaciones.
 * Formato tabular plano para humanos e IA.
 */
export function buildMktGoogleSheetsIndiceValues(): string[][] {
  const T = GOOGLE_SHEET_TABS_MKT;
  return [
    [
      "seccion",
      "hoja_sheet",
      "tabla_db",
      "grano",
      "pk",
      "columnas",
      "descripcion",
    ],
    [
      "CATALOGO",
      T.indice,
      "(metadatos)",
      "documento",
      "—",
      "seccion + campos según bloque",
      "Mapa de hojas, tablas DB y relaciones del export Marketing. Regenerado en cada export.",
    ],
    [
      "CATALOGO",
      T.publicaciones,
      "mkt_publi + mkt_publi_redes",
      "1 fila por publicacion x red",
      "id (+ red_id en sheet)",
      "id,red_id,tipo_contenido_id,idea_detalle_id,fecha,publicacion,contenido_url",
      "Hechos de publicacion. En DB redes es N:M (puente mkt_publi_redes); en sheet se expande una fila por red.",
    ],
    [
      "CATALOGO",
      T.redes,
      "mkt_publi_tipo_redes",
      "1 fila = 1 red",
      "id",
      "id,red_social_nombre",
      "Catalogo de redes sociales.",
    ],
    [
      "CATALOGO",
      T.secciones,
      "mkt_publi_ideas_secciones",
      "1 fila = 1 seccion",
      "id",
      "id,idea_nombre,idea_resumen",
      "Secciones/agrupadores de ideas.",
    ],
    [
      "CATALOGO",
      T.ideas,
      "mkt_publi_ideas_detalle",
      "1 fila = 1 idea",
      "id",
      "id,seccion_id,detalle,usada",
      "Ideas detalle. usada = TRUE/FALSE. seccion_id → Publicaciones Secciones.id.",
    ],
    [
      "CATALOGO",
      T.tipoContenido,
      "mkt_publi_tipo_contenido",
      "1 fila = 1 tipo",
      "id",
      "id,contenido_nombre",
      "Catalogo de tipos de contenido de publicacion.",
    ],
    [
      "CATALOGO",
      T.contenidoMultimedia,
      "mkt_contenido_drive_url",
      "1 fila = 1 archivo",
      "id",
      "id,nombre,descripcion,url,tipo_id",
      "Base multimedia (URLs Drive). tipo_id → Contenido Multimedia Tipo.id.",
    ],
    [
      "CATALOGO",
      T.contenidoMultimediaTipo,
      "mkt_contenido_drive_tipo",
      "1 fila = 1 tipo",
      "id",
      "id,tipo",
      "Catalogo de tipos de contenido multimedia.",
    ],
    [
      "CATALOGO",
      T.coloresMarca,
      "mkt_colores_marca",
      "1 fila = 1 color",
      "id",
      "id,nombre,descripcion,cod_hexadecimales",
      "Paleta de colores de marca. cod_hexadecimales: codigos #RRGGBB separados por coma.",
    ],
    [],
    [
      "seccion",
      "desde_hoja",
      "desde_columna",
      "hacia_hoja",
      "hacia_columna",
      "cardinalidad",
      "nota",
    ],
    [
      "RELACION",
      T.publicaciones,
      "red_id",
      T.redes,
      "id",
      "N:1",
      "En DB N:M via mkt_publi_redes; en sheet cada red es una fila del mismo id de publicacion.",
    ],
    [
      "RELACION",
      T.publicaciones,
      "tipo_contenido_id",
      T.tipoContenido,
      "id",
      "N:1",
      "FK obligatoria a Publi Tipo Contenido.",
    ],
    [
      "RELACION",
      T.publicaciones,
      "idea_detalle_id",
      T.ideas,
      "id",
      "N:1",
      "FK opcional (puede estar vacia).",
    ],
    [
      "RELACION",
      T.ideas,
      "seccion_id",
      T.secciones,
      "id",
      "N:1",
      "FK obligatoria a Publicaciones Secciones.",
    ],
    [
      "RELACION",
      T.contenidoMultimedia,
      "tipo_id",
      T.contenidoMultimediaTipo,
      "id",
      "N:1",
      "FK obligatoria (onDelete Restrict).",
    ],
  ];
}

/**
 * Exporta catálogos y hechos de Marketing al spreadsheet fijo (todas las pestañas).
 * Sobrescribe cada pestaña (crea si no existe). Primera pestaña: Indice (diccionario).
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
      coloresMarca,
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
      prisma.mktColoresMarca.findMany({
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          codHexadecimales: true,
        },
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
      }),
    ]);

    const tabsPayload: { title: string; values: string[][] }[] = [
      {
        title: GOOGLE_SHEET_TABS_MKT.indice,
        values: buildMktGoogleSheetsIndiceValues(),
      },
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
      {
        title: GOOGLE_SHEET_TABS_MKT.coloresMarca,
        values: [
          ["id", "nombre", "descripcion", "cod_hexadecimales"],
          ...coloresMarca.map((r) => [
            r.id,
            r.nombre,
            r.descripcion ?? "",
            r.codHexadecimales,
          ]),
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
      const filasDatos =
        tab.title === GOOGLE_SHEET_TABS_MKT.indice
          ? tab.values.filter((row) => row.length > 0 && row[0] !== "seccion").length
          : Math.max(0, tab.values.length - 1);
      tabs.push({
        sheetTitle: tab.title,
        filasDatos,
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
