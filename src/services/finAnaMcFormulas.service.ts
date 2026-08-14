import { prisma } from "@/lib/prisma";
import {
  FIN_ANA_MC_FORMULA_CODIGOS,
  FIN_ANA_MC_FORMULA_DEFAULTS,
  type FinAnaMcFormulaCodigo,
  type FinAnaMcFormulaItem,
} from "@/lib/finAnaMcFormulas";

function toItem(row: {
  codigo: string;
  etiqueta: string;
  valor: { toNumber?: () => number } | number | string;
  orden: number;
}): FinAnaMcFormulaItem | null {
  if (!(FIN_ANA_MC_FORMULA_CODIGOS as readonly string[]).includes(row.codigo)) {
    return null;
  }
  const valorRaw =
    typeof row.valor === "number"
      ? row.valor
      : typeof row.valor === "string"
        ? Number(row.valor)
        : Number(row.valor.toNumber?.() ?? row.valor);
  if (!Number.isFinite(valorRaw)) return null;
  return {
    codigo: row.codigo as FinAnaMcFormulaCodigo,
    etiqueta: row.etiqueta,
    valor: valorRaw,
    orden: row.orden,
  };
}

/** Semilla idempotente de parámetros de fórmula MC. */
export async function ensureFinAnaMcFormulasSeed(): Promise<void> {
  const existentes = await prisma.finAnaMcFormula.findMany({
    select: { codigo: true },
  });
  const set = new Set(existentes.map((row) => row.codigo));
  const faltantes = FIN_ANA_MC_FORMULA_CODIGOS.filter((codigo) => !set.has(codigo));
  if (faltantes.length === 0) return;

  await prisma.finAnaMcFormula.createMany({
    data: faltantes.map((codigo) => {
      const def = FIN_ANA_MC_FORMULA_DEFAULTS[codigo];
      return {
        codigo,
        etiqueta: def.etiqueta,
        valor: def.valor,
        orden: def.orden,
      };
    }),
    skipDuplicates: true,
  });
}

export async function listarFormulasMargenContribucion(): Promise<
  FinAnaMcFormulaItem[]
> {
  await ensureFinAnaMcFormulasSeed();
  const rows = await prisma.finAnaMcFormula.findMany({
    orderBy: [{ orden: "asc" }, { codigo: "asc" }],
    select: { codigo: true, etiqueta: true, valor: true, orden: true },
  });

  const items: FinAnaMcFormulaItem[] = [];
  for (const row of rows) {
    const item = toItem(row);
    if (item) items.push(item);
  }

  // Completar faltantes en memoria si la BD quedó incompleta.
  for (const codigo of FIN_ANA_MC_FORMULA_CODIGOS) {
    if (items.some((item) => item.codigo === codigo)) continue;
    const def = FIN_ANA_MC_FORMULA_DEFAULTS[codigo];
    items.push({ codigo, etiqueta: def.etiqueta, valor: def.valor, orden: def.orden });
  }

  return items.sort((a, b) => a.orden - b.orden || a.codigo.localeCompare(b.codigo));
}
