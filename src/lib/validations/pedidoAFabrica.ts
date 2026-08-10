import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

export const productosPedidoAFabricaFiltrosSchema = z.object({
  proveedorId: prismaCuidSchema,
  pagina: z.coerce.number().int().min(1).optional().default(1),
});

export type ProductosPedidoAFabricaFiltrosInput = z.infer<
  typeof productosPedidoAFabricaFiltrosSchema
>;
