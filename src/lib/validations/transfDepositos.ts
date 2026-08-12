import { z } from "zod";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";

const sucursalCodigoSchema = z.enum(["guaymallen", "maipu"]);

export const registrarControlTransfDepositosSchema = z
  .object({
    codTienda: listaPreciosCodTiendaSchema,
    origen: sucursalCodigoSchema,
    destino: sucursalCodigoSchema,
    cantidad: z.coerce.number().int().positive().max(1_000_000),
    /** Segunda confirmación tras advertencia de duplicado reciente. */
    forzar: z.boolean().optional().default(false),
  })
  .refine((v) => v.origen !== v.destino, {
    message: "Origen y destino deben ser distintos.",
    path: ["destino"],
  });

export type RegistrarControlTransfDepositosInput = z.infer<
  typeof registrarControlTransfDepositosSchema
>;

export const listarHistorialTransfDepositosProductoSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
});

export const encolarTransferenciasPendientesSchema = z
  .object({
    origen: sucursalCodigoSchema,
    destino: sucursalCodigoSchema,
    items: z
      .array(
        z.object({
          codTienda: listaPreciosCodTiendaSchema,
          cantidad: z.coerce.number().int().positive().max(1_000_000),
        })
      )
      .min(1)
      .max(500),
  })
  .refine((v) => v.origen !== v.destino, {
    message: "Origen y destino deben ser distintos.",
    path: ["destino"],
  });

export const exportarPendientesTransfDepositosSchema = z
  .object({
    tipo: z.enum(["transferir", "recibir"]),
    origen: sucursalCodigoSchema,
    destino: sucursalCodigoSchema,
  })
  .refine((v) => v.origen !== v.destino, {
    message: "Origen y destino deben ser distintos.",
    path: ["destino"],
  });
