import {
  getIdDepositoGuaymallen,
  getIdDepositoMaipu,
} from "@/lib/duxApi";
import {
  putAjusteStockItemV2,
  type DuxPutItemResult,
} from "@/lib/duxItemsV2Api";
import { prisma } from "@/lib/prisma";

export function idDepositoDuxPorSucursal(
  sucursal: "guaymallen" | "maipu"
): number {
  return sucursal === "guaymallen"
    ? getIdDepositoGuaymallen()
    : getIdDepositoMaipu();
}

async function sucursalesHabilitadasDux(): Promise<{ id_sucursal: number }[]> {
  const rows = await prisma.sucursal.findMany({
    where: { idDux: { not: null } },
    select: { idDux: true },
  });
  const seen = new Set<number>();
  const out: { id_sucursal: number }[] = [];
  for (const row of rows) {
    const raw = (row.idDux ?? "").trim();
    if (!/^\d+$/.test(raw)) continue;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push({ id_sucursal: id });
  }
  return out;
}

export async function enviarPruebaPutAjusteStockDux(input: {
  sucursal: "guaymallen" | "maipu";
  usuario: number;
  codTienda: string;
  stock: number;
}): Promise<DuxPutItemResult> {
  const sucursalesHabilitadas = await sucursalesHabilitadasDux();
  if (sucursalesHabilitadas.length === 0) {
    throw new Error(
      "No hay sucursales con id DUX numérico (global_sucursales.id_dux)."
    );
  }
  return putAjusteStockItemV2({
    codItem: input.codTienda,
    stock: input.stock,
    idDeposito: idDepositoDuxPorSucursal(input.sucursal),
    idPersonal: input.usuario,
    sucursalesHabilitadas,
  });
}
