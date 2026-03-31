import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface DeudaProveedorFila {
  idProveedorDux: string;
  nombre: string;
  deuda: Prisma.Decimal;
}

/**
 * Proveedores con saldo de deuda > 0: suma por proveedor de (total − monto_aplicado) en `comprobantes_proveedor`.
 */
export async function listarDeudaProveedores(): Promise<DeudaProveedorFila[]> {
  const rows = await prisma.$queryRaw<DeudaProveedorFila[]>`
    SELECT
      p.id_proveedor_dux AS "idProveedorDux",
      p.nombre AS nombre,
      SUM(c.total - c.monto_aplicado) AS deuda
    FROM comprobantes_proveedor c
    INNER JOIN proveedores p ON p.id_proveedor_dux = c.id_proveedor
    GROUP BY p.id_proveedor_dux, p.nombre
    HAVING SUM(c.total - c.monto_aplicado) > 0
    ORDER BY SUM(c.total - c.monto_aplicado) DESC
  `;
  return rows;
}
