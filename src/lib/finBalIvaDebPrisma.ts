import { Prisma } from "@prisma/client";

/** La migración `20260527140000_fin_bal_iva_deb_import_imp_iva` debe estar aplicada en BD. */
export function esErrorColumnaImpIvaFaltante(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2022") {
      const col = String(e.meta?.column ?? e.meta?.column_name ?? "");
      return col.includes("imp_iva");
    }
  }
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    return msg.includes("imp_iva") && (msg.includes("does not exist") || msg.includes("unknown"));
  }
  return false;
}

export const MSG_MIGRACION_IMP_IVA_FALTANTE =
  "Falta aplicar la migración de base de datos (columna imp_iva). Ejecutá «npm run db:migrate-deploy» en el entorno de producción o redeployá con migrate en el build.";
