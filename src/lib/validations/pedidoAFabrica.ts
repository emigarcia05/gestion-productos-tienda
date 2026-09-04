import { z } from "zod";
import { prismaCuidSchema } from "@/lib/validations/common";

const filtroOpcionalTexto = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

export const productosPedidoAFabricaFiltrosSchema = z.object({
  proveedorId: prismaCuidSchema,
  pagina: z.coerce.number().int().min(1).optional().default(1),
  /** `prod_tienda.marca` vía vínculo `cod_tienda`. */
  marca: filtroOpcionalTexto,
  /** `prod_tienda.rubro` vía vínculo. */
  rubro: filtroOpcionalTexto,
  /** `prod_tienda.sub_rubro` vía vínculo. */
  subRubro: filtroOpcionalTexto,
  /** Buscar en descripcion_tienda (vínculo) o descripcion_proveedor. */
  q: filtroOpcionalTexto,
  /**
   * SI = hay fila `prod_tienda` vía `cod_tienda`.
   * NO = sin vínculo. Ausente = sin filtrar.
   */
  prodVinculado: z.enum(["si", "no"]).optional(),
  /**
   * SI = **CANT. PED.** persistida > 0 (`prod_ped_merc` A FÁBRICA).
   * NO = sin cantidad o 0. Ausente = sin filtrar.
   */
  pedido: z.enum(["si", "no"]).optional(),
});

export type ProductosPedidoAFabricaFiltrosInput = z.infer<
  typeof productosPedidoAFabricaFiltrosSchema
>;
