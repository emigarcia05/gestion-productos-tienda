import { z } from "zod";
import {
  ENVIOS_FORMA_PAGADO_VALUES,
  ENVIOS_PERSONA_TIPO_VALUES,
} from "@/lib/envios";
import {
  prismaCuidSchema,
  prismaIdOptionalNullableSchema,
} from "@/lib/validations/common";

const textoCortoSchema = (campo: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `Ingresá ${campo}.`)
    .max(max, `${campo.charAt(0).toUpperCase()}${campo.slice(1)} es demasiado largo.`);

const textoOpcionalSchema = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "El texto es demasiado largo.")
    .optional()
    .transform((v) => v ?? "");

const urlMapsSchema = z
  .string()
  .trim()
  .max(2048, "La URL de Maps es demasiado larga.")
  .optional()
  .transform((v) => v ?? "")
  .refine(
    (s) => s === "" || /^https?:\/\//i.test(s),
    "Ingresá una URL válida (http/https) o dejá el campo vacío."
  );

const pdfNombreSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el nombre del PDF.")
  .max(200, "El nombre del PDF es demasiado largo.")
  .refine((n) => n.toLowerCase().endsWith(".pdf"), "El archivo debe ser un PDF.");

/** Base64 de PDF (tope ~5 MB de archivo). */
const pdfBase64Schema = z
  .string()
  .min(1, "El PDF está vacío.")
  .max(7_000_000, "El PDF supera el tamaño máximo (5 MB).");

export const enviosPdfComprobanteSchema = z.object({
  nombre: pdfNombreSchema,
  base64: pdfBase64Schema,
});

export const crearEnviosPersonaSchema = z.object({
  nombre: textoCortoSchema("el nombre"),
  apellido: textoCortoSchema("el apellido"),
  cel: textoCortoSchema("el celular", 40),
  tipo: z.enum(ENVIOS_PERSONA_TIPO_VALUES),
});

export const editarEnviosPersonaSchema = crearEnviosPersonaSchema.extend({
  id: prismaCuidSchema,
});

export const eliminarEnviosPersonaSchema = z.object({
  id: prismaCuidSchema,
});

export const crearEnviosDireccionSchema = z.object({
  personaId: prismaCuidSchema,
  direccion: textoCortoSchema("la dirección", 400),
  numeracion: textoCortoSchema("la numeración", 40),
  urlMaps: urlMapsSchema,
  referencia: textoOpcionalSchema(2000),
});

export const editarEnviosDireccionSchema = crearEnviosDireccionSchema.extend({
  id: prismaCuidSchema,
});

export const eliminarEnviosDireccionSchema = z.object({
  id: prismaCuidSchema,
});

const envioPersonasCampos = {
  clienteFinalId: prismaIdOptionalNullableSchema,
  pintorId: prismaIdOptionalNullableSchema,
};

function refinePersonasEnvio(
  data: { clienteFinalId?: string | null; pintorId?: string | null },
  ctx: z.RefinementCtx
): void {
  if (!data.clienteFinalId && !data.pintorId) {
    ctx.addIssue({
      code: "custom",
      message: "Asociá al menos un cliente final o un pintor.",
      path: ["clienteFinalId"],
    });
  }
  if (data.clienteFinalId && data.pintorId && data.clienteFinalId === data.pintorId) {
    ctx.addIssue({
      code: "custom",
      message: "El cliente final y el pintor deben ser personas distintas.",
      path: ["pintorId"],
    });
  }
}

const envioFinalCamposBase = {
  ...envioPersonasCampos,
  direccionId: prismaCuidSchema,
  observacionEnvio: textoOpcionalSchema(5000),
  pagado: z.boolean(),
  formaPagado: z.enum(ENVIOS_FORMA_PAGADO_VALUES),
};

export const crearEnviosFinalSchema = z
  .object({
    ...envioFinalCamposBase,
    pdfComprobante: enviosPdfComprobanteSchema.optional(),
  })
  .superRefine(refinePersonasEnvio);

export const editarEnviosFinalSchema = z
  .object({
    id: prismaCuidSchema,
    ...envioFinalCamposBase,
    pdfComprobante: enviosPdfComprobanteSchema.optional(),
    quitarPdf: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    refinePersonasEnvio(data, ctx);
    if (data.pdfComprobante && data.quitarPdf) {
      ctx.addIssue({
        code: "custom",
        message: "No se puede adjuntar y quitar el PDF a la vez.",
        path: ["pdfComprobante"],
      });
    }
  });

export const eliminarEnviosFinalSchema = z.object({
  id: prismaCuidSchema,
});

export const enviosFinalIdSchema = z.object({
  id: prismaCuidSchema,
});

export type CrearEnviosPersonaInput = z.infer<typeof crearEnviosPersonaSchema>;
export type EditarEnviosPersonaInput = z.infer<typeof editarEnviosPersonaSchema>;
export type CrearEnviosDireccionInput = z.infer<typeof crearEnviosDireccionSchema>;
export type EditarEnviosDireccionInput = z.infer<typeof editarEnviosDireccionSchema>;
export type CrearEnviosFinalInput = z.infer<typeof crearEnviosFinalSchema>;
export type EditarEnviosFinalInput = z.infer<typeof editarEnviosFinalSchema>;
