import { z } from "zod";

export const campoDestinoIvaDebSchema = z.enum([
  "fechaEmision",
  "tipoComprobante",
  "puntoVenta",
  "numeroDesde",
  "numeroHasta",
  "codAutorizacion",
  "nroDocReceptor",
  "denominacionReceptor",
  "impTotal",
  "ignorar",
]);

export type CampoDestinoIvaDeb = z.infer<typeof campoDestinoIvaDebSchema>;

export const mapeoColumnasIvaDebSchema = z.record(
  z.string().regex(/^\d+$/, "Índice de columna inválido."),
  campoDestinoIvaDebSchema
);
