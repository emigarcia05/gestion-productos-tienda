import { z } from "zod";

export const guardarIvaComparacionPedidoSchema = z.object({
  usarValorConfigurado: z.boolean(),
  saldoPesos: z.coerce.number().finite(),
});

export type GuardarIvaComparacionPedidoInput = z.infer<typeof guardarIvaComparacionPedidoSchema>;
