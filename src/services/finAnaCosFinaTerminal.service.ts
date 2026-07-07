import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FIN_ANA_COS_FINA_PAGOS } from "@/lib/finAnaCosFina";
import type { FinAnaCosFinaTerminalItem } from "@/lib/finAnaCosFinaTerminales";
import type {
  CrearFinAnaCosFinaTerminalInput,
  EditarFinAnaCosFinaTerminalInput,
} from "@/lib/validations/finAnaCosFinaTerminal";

type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

function mapTerminal(row: { id: string; nombre: string; orden: number }): FinAnaCosFinaTerminalItem {
  return {
    id: row.id,
    nombre: row.nombre.toUpperCase(),
    orden: row.orden,
  };
}

function normalizarNombreTerminal(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

function mapDbError(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "P2002") return "Ya existe una terminal con ese nombre.";
    if (code === "P2025") return "Terminal no encontrada.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarFinAnaCosFinaTerminales(): Promise<FinAnaCosFinaTerminalItem[]> {
  const rows = await prisma.finAnaCosFinaTerminal.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, orden: true },
  });
  return rows.map(mapTerminal);
}

/** Semilla idempotente de terminales base si la tabla está vacía. */
export async function ensureFinAnaCosFinaTerminalesSeed(): Promise<void> {
  const count = await prisma.finAnaCosFinaTerminal.count();
  if (count > 0) return;

  const semilla: { id: string; nombre: string; orden: number }[] = [
    { id: "clfinacosfintermmp00001", nombre: "MERCADOPAGO", orden: 0 },
    { id: "clfinacosfintermpw00001", nombre: "PAYWAY", orden: 1 },
    { id: "clfinacosfintermnv00001", nombre: "NAVE", orden: 2 },
  ];

  await prisma.finAnaCosFinaTerminal.createMany({
    data: semilla,
    skipDuplicates: true,
  });
}

export async function crearFinAnaCosFinaTerminal(
  input: CrearFinAnaCosFinaTerminalInput
): Promise<ServiceResult<FinAnaCosFinaTerminalItem>> {
  const nombre = normalizarNombreTerminal(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }

  try {
    const maxOrden = await prisma.finAnaCosFinaTerminal.aggregate({ _max: { orden: true } });
    const orden = (maxOrden._max.orden ?? -1) + 1;

    const terminal = await prisma.$transaction(async (tx) => {
      const created = await tx.finAnaCosFinaTerminal.create({
        data: { nombre, orden },
        select: { id: true, nombre: true, orden: true },
      });

      await tx.finAnaCosFina.createMany({
        data: FIN_ANA_COS_FINA_PAGOS.map((pago) => ({
          terminalId: created.id,
          pago,
          habilitado: true,
          impCheque: false,
          arancel: new Prisma.Decimal(0),
          costoFinanciero: new Prisma.Decimal(0),
        })),
        skipDuplicates: true,
      });

      return created;
    });

    return { success: true, data: mapTerminal(terminal) };
  } catch (error: unknown) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear la terminal."),
    };
  }
}

export async function editarFinAnaCosFinaTerminal(
  input: EditarFinAnaCosFinaTerminalInput
): Promise<ServiceResult<FinAnaCosFinaTerminalItem>> {
  const nombre = normalizarNombreTerminal(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }

  try {
    const updated = await prisma.finAnaCosFinaTerminal.update({
      where: { id: input.id },
      data: { nombre },
      select: { id: true, nombre: true, orden: true },
    });
    return { success: true, data: mapTerminal(updated) };
  } catch (error: unknown) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo editar la terminal."),
    };
  }
}
