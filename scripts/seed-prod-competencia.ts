/**
 * Alta inicial de competidores en prod_competencia.
 *
 * Uso:
 *   npx tsx scripts/seed-prod-competencia.ts
 *
 * Editar el array COMPETIDORES con nombre, web y (opcional) urlBusqueda
 * antes de ejecutar. Re-ejecutar actualiza por nombre (upsert lógico).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  createCompetencia,
  normalizeUrlBusqueda,
  normalizeWebUrl,
} from "../src/services/competencia.service";

/** Completar con los competidores reales de la tienda. */
const COMPETIDORES: {
  nombre: string;
  web: string;
  /** Plantilla opcional, ej. https://competidor.com/catalogo?buscar={q} */
  urlBusqueda?: string;
}[] = [
  // { nombre: "Pinturería Ejemplo", web: "https://www.ejemplo.com.ar", urlBusqueda: "https://www.ejemplo.com.ar/buscar?q={q}" },
];

async function main() {
  if (COMPETIDORES.length === 0) {
    console.log(
      "Sin filas en COMPETIDORES. Editá scripts/seed-prod-competencia.ts y volvé a ejecutar."
    );
    return;
  }

  for (const c of COMPETIDORES) {
    const existente = await prisma.prodCompetencia.findUnique({
      where: { nombre: c.nombre.trim() },
    });
    if (existente) {
      await prisma.prodCompetencia.update({
        where: { id: existente.id },
        data: {
          web: normalizeWebUrl(c.web),
          urlBusqueda: normalizeUrlBusqueda(c.urlBusqueda),
        },
      });
      console.log(`Actualizado: ${c.nombre}`);
    } else {
      await createCompetencia(c);
      console.log(`Creado: ${c.nombre}`);
    }
  }

  const total = await prisma.prodCompetencia.count();
  console.log(`Listo. Total competidores en BD: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
