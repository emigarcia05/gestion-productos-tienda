/**
 * One-shot: configura REF. (1 - GENERAL) en Px Listas según vínculo MER → GAR.
 *
 * Prioridad:
 *   1) Si el ítem tiene proveedor MER vinculado y precio de referencia > 0 → REF = competidor MER
 *   2) Si no, y tiene GAR vinculado con precio > 0 → REF = competidor GAR
 *   3) Si no aplica → se omite
 *
 * Sobre-escribe `competencia_id_px_lista_general` y copia PX a staging (misma lógica UI).
 *
 * Uso:
 *   npx tsx scripts/seed-px-listas-ref-mer-gar.ts
 *   npx tsx scripts/seed-px-listas-ref-mer-gar.ts --execute
 *   npm run db:seed-px-listas-ref-mer-gar
 *   npm run db:seed-px-listas-ref-mer-gar -- --execute
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  guardarCompetenciaRefPxListaGeneral,
  resolverPxReferenciaCompetenciaPxListas,
} from "../src/services/pxListasCompetenciaRef.service";

const PREFIJOS_PRIORIDAD = ["MER", "GAR"] as const;

function parseArgs(argv: string[]): { execute: boolean } {
  let execute = false;
  for (const arg of argv) {
    if (arg === "--execute") {
      execute = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Uso: tsx scripts/seed-px-listas-ref-mer-gar.ts [--execute]\n" +
          "  Sin --execute: dry-run (solo reporte).\n" +
          "  Con --execute: persiste FK + PX staging de 1 - GENERAL."
      );
      process.exit(0);
    }
  }
  return { execute };
}

async function resolverCompetenciaPorPrefijo(
  prefijo: string
): Promise<{
  prefijo: string;
  proveedorId: string;
  proveedorNombre: string;
  competenciaId: string;
  competenciaNombre: string;
} | null> {
  const proveedor = await prisma.proveedor.findFirst({
    where: { prefijo: { equals: prefijo, mode: "insensitive" } },
    select: { id: true, nombre: true, prefijo: true },
  });
  if (!proveedor) {
    console.warn(`⚠ Proveedor con prefijo ${prefijo} no encontrado.`);
    return null;
  }

  const competencias = await prisma.prodCompetencia.findMany({
    where: { idProveedor: proveedor.id },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  if (competencias.length === 0) {
    console.warn(
      `⚠ No hay prod_competencia con id_proveedor = ${proveedor.nombre} (${prefijo}).`
    );
    return null;
  }
  if (competencias.length > 1) {
    console.warn(
      `⚠ Varios competidores para ${prefijo}; se usa el primero: ${competencias
        .map((c) => c.nombre)
        .join(", ")}`
    );
  }

  const competencia = competencias[0]!;
  return {
    prefijo: (proveedor.prefijo ?? prefijo).toUpperCase(),
    proveedorId: proveedor.id,
    proveedorNombre: proveedor.nombre,
    competenciaId: competencia.id,
    competenciaNombre: competencia.nombre,
  };
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));

  console.log("── Seed REF. Px Listas (MER → GAR) ──");
  console.log(execute ? "Modo: EXECUTE (escribe BD)" : "Modo: DRY-RUN (sin escribir)");

  const resueltos = [];
  for (const prefijo of PREFIJOS_PRIORIDAD) {
    const r = await resolverCompetenciaPorPrefijo(prefijo);
    if (r) resueltos.push(r);
  }

  if (resueltos.length === 0) {
    throw new Error("No se pudo resolver ningún competidor MER/GAR. Abortado.");
  }

  for (const r of resueltos) {
    console.log(
      `OK ${r.prefijo}: proveedor=${r.proveedorNombre} → competencia=${r.competenciaNombre} (${r.competenciaId})`
    );
  }

  const idsProveedor = resueltos.map((r) => r.proveedorId);
  const vinculos = await prisma.listaPrecioProveedor.findMany({
    where: {
      idProveedor: { in: idsProveedor },
      codTiendaVinculo: { not: null },
      habilitado: true,
    },
    select: {
      codTiendaVinculo: true,
      idProveedor: true,
    },
  });

  const proveedoresPorCod = new Map<string, Set<string>>();
  for (const v of vinculos) {
    const cod = v.codTiendaVinculo;
    if (!cod) continue;
    const set = proveedoresPorCod.get(cod) ?? new Set<string>();
    set.add(v.idProveedor);
    proveedoresPorCod.set(cod, set);
  }

  const codTiendas = [...proveedoresPorCod.keys()].sort();
  console.log(`Ítems prod_tienda con vínculo MER y/o GAR: ${codTiendas.length}`);

  let aplicados = 0;
  let omitidosSinPx = 0;
  let errores = 0;
  let yaCorrectos = 0;
  const porPrefijo = new Map<string, number>();

  for (const codTienda of codTiendas) {
    const idsProv = proveedoresPorCod.get(codTienda)!;
    let elegido: (typeof resueltos)[number] | null = null;
    let pxRef: number | null = null;

    for (const candidato of resueltos) {
      if (!idsProv.has(candidato.proveedorId)) continue;
      const px = await resolverPxReferenciaCompetenciaPxListas(
        codTienda,
        candidato.competenciaId
      );
      if (px == null || !(px > 0)) continue;
      elegido = candidato;
      pxRef = px;
      break;
    }

    if (!elegido || pxRef == null) {
      omitidosSinPx += 1;
      continue;
    }

    const actual = await prisma.prodTienda.findUnique({
      where: { codTienda },
      select: { competenciaIdPxListaGeneral: true },
    });
    if (!actual) {
      omitidosSinPx += 1;
      continue;
    }

    const mismaFk =
      actual.competenciaIdPxListaGeneral === elegido.competenciaId;

    if (!execute) {
      if (mismaFk) yaCorrectos += 1;
      else {
        aplicados += 1;
        porPrefijo.set(
          elegido.prefijo,
          (porPrefijo.get(elegido.prefijo) ?? 0) + 1
        );
      }
      continue;
    }

    const res = await guardarCompetenciaRefPxListaGeneral(
      codTienda,
      elegido.competenciaId
    );
    if (!res.success) {
      errores += 1;
      console.error(`ERROR ${codTienda} (${elegido.prefijo}): ${res.error}`);
      continue;
    }
    if (mismaFk && !res.data.pxActualizado) {
      yaCorrectos += 1;
    } else {
      aplicados += 1;
      porPrefijo.set(
        elegido.prefijo,
        (porPrefijo.get(elegido.prefijo) ?? 0) + 1
      );
    }
  }

  console.log("── Resumen ──");
  console.log(`Candidatos (vínculo MER/GAR): ${codTiendas.length}`);
  console.log(
    `${execute ? "Aplicados" : "A aplicar"} (precio > 0): ${aplicados}`
  );
  for (const [pref, n] of [...porPrefijo.entries()].sort()) {
    console.log(`  · ${pref}: ${n}`);
  }
  console.log(`Omitidos (sin precio de referencia > 0): ${omitidosSinPx}`);
  console.log(`Ya con misma REF. (sin cambio de FK): ${yaCorrectos}`);
  if (execute) console.log(`Errores: ${errores}`);
  if (!execute) {
    console.log("Dry-run terminado. Reejecutá con --execute para persistir.");
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
