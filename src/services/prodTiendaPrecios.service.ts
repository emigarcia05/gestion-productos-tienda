import { getIdPrecioListaPrincipal } from "@/lib/duxApi";
import { prisma } from "@/lib/prisma";

export { getIdPrecioListaPrincipal };

/** Precio de una lista DUX para un producto tienda, o null si no existe fila. */
export async function getPrecioLista(
  codTienda: string,
  idLista: number
): Promise<number | null> {
  const row = await prisma.prodTiendaPrecio.findUnique({
    where: { codTienda_idLista: { codTienda, idLista } },
    select: { precio: true },
  });
  return row != null ? Number(row.precio) : null;
}

/** Precio de la lista principal DUX (`DUX_ID_PRECIO_LISTA` / 56994) para un producto. */
export async function getPrecioListaPrincipal(codTienda: string): Promise<number | null> {
  return getPrecioLista(codTienda, getIdPrecioListaPrincipal());
}

/** Mapa id_lista → precio para un `cod_tienda`. */
export async function getPreciosPorCodTienda(
  codTienda: string
): Promise<Map<number, number>> {
  const rows = await prisma.prodTiendaPrecio.findMany({
    where: { codTienda },
    select: { idLista: true, precio: true },
  });
  const map = new Map<number, number>();
  for (const r of rows) {
    map.set(r.idLista, Number(r.precio));
  }
  return map;
}

/** Mapa cod_tienda → precio de lista principal (0 si no hay fila). */
export async function buildMapPrecioListaPrincipal(
  codTiendas: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (codTiendas.length === 0) return map;
  const idLista = getIdPrecioListaPrincipal();
  const rows = await prisma.prodTiendaPrecio.findMany({
    where: { codTienda: { in: codTiendas }, idLista },
    select: { codTienda: true, precio: true },
  });
  for (const r of rows) {
    map.set(r.codTienda, Number(r.precio));
  }
  return map;
}
