import { z } from "zod";
import { prismaCuidOrUuidSchema } from "@/lib/validations/common";

const nombreFinAnaCosFinaTerminalSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un nombre.")
  .max(200, "El nombre es demasiado largo.");

export const crearFinAnaCosFinaTerminalSchema = z.object({
  nombre: nombreFinAnaCosFinaTerminalSchema,
});

export const editarFinAnaCosFinaTerminalSchema = z.object({
  id: prismaCuidOrUuidSchema,
  nombre: nombreFinAnaCosFinaTerminalSchema,
});

export const eliminarFinAnaCosFinaTerminalSchema = z.object({
  id: prismaCuidOrUuidSchema,
});

export type CrearFinAnaCosFinaTerminalInput = z.infer<typeof crearFinAnaCosFinaTerminalSchema>;
export type EditarFinAnaCosFinaTerminalInput = z.infer<typeof editarFinAnaCosFinaTerminalSchema>;
export type EliminarFinAnaCosFinaTerminalInput = z.infer<typeof eliminarFinAnaCosFinaTerminalSchema>;
