import { z } from "zod";
import {
  globalSucursalIdSchema,
  listaPreciosCodTiendaSchema,
} from "@/lib/validations/common";

const sucursalCodigoSchema = z.enum(["guaymallen", "maipu"]);

export const listarHistorialTransfDepositosProductoSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
});

export const registrarTransferenciasDepositosSchema = z
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

export const conteosIndicadorSlidenavSchema = z.object({
  sucursal: sucursalCodigoSchema,
});

export const parSucursalesTransfDepositosSchema = z
  .object({
    sucOrigenId: globalSucursalIdSchema,
    sucDestinoId: globalSucursalIdSchema,
  })
  .refine((v) => v.sucOrigenId !== v.sucDestinoId, {
    message: "Origen y destino deben ser distintos.",
    path: ["sucDestinoId"],
  });
