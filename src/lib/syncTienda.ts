import { prisma } from "@/lib/prisma";
import { fetchTodosLosItems } from "@/lib/duxApi";

export interface SyncResult {
  creados: number;
  actualizados: number;
  deshabilitados: number;
  totalApi: number;
  duracionMs: number;
}

export async function ejecutarSync(tipo: "auto" | "manual"): Promise<SyncResult> {
  const inicio = Date.now();

  const items = await fetchTodosLosItems();
  const totalApi = items.length;

  if (totalApi === 0) throw new Error("La API no devolvió ningún item.");

  // Traer todos los codItem existentes en una sola query
  const existentes = await prisma.itemTienda.findMany({
    select: { codItem: true },
  });
  const setExistentes = new Set(existentes.map((e) => e.codItem));
  const codItemsApi = new Set(items.map((i) => i.codItem));

  const paraCrear = items.filter((i) => !setExistentes.has(i.codItem));
  const paraActualizar = items.filter((i) => setExistentes.has(i.codItem));

  // Crear nuevos en lotes de 500
  let creados = 0;
  const LOTE = 500;
  for (let i = 0; i < paraCrear.length; i += LOTE) {
    const lote = paraCrear.slice(i, i + LOTE);
    const res = await prisma.itemTienda.createMany({
      data: lote,
      skipDuplicates: true,
    });
    creados += res.count;
  }

  // Actualizar existentes
  let actualizados = 0;
  for (const item of paraActualizar) {
    await prisma.itemTienda.update({
      where: { codItem: item.codItem },
      data: item,
    });
    actualizados++;
  }

  // Deshabilitar items que ya no están en la API
  const { count: deshabilitados } = await prisma.itemTienda.updateMany({
    where: {
      codItem: { notIn: Array.from(codItemsApi) },
      habilitado: true,
    },
    data: { habilitado: false },
  });

  const duracionMs = Date.now() - inicio;

  await prisma.syncLog.create({
    data: {
      tipo,
      status: "ok",
      creados,
      actualizados,
      deshabilitados,
      totalApi,
      duracionMs,
    },
  });

  return { creados, actualizados, deshabilitados, totalApi, duracionMs };
}
