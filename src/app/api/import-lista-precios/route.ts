import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import { aplicarMapeoListaPrecios, type MapeoColumnasListaPrecios } from "@/lib/parsearImport";
import * as proveedorService from "@/services/proveedor.service";
import * as listaPreciosService from "@/services/listaPrecios.service";
import {
  startImportInDb,
  setImportProgressInDb,
  setImportResultInDb,
  setImportErrorInDb,
} from "@/lib/importProgressDb";

export const maxDuration = 300;

interface ImportBody {
  proveedorId: string;
  filasCrudas: string[][];
  mapeo: MapeoColumnasListaPrecios;
  precioEnDolares: boolean;
  habilitado?: boolean;
}

/**
 * POST: Ejecuta la importación de lista de precios en segundo plano.
 * El cliente puede cerrar el modal y ver el progreso en la sidebar (GET .../status).
 */
export async function POST(request: Request) {
  if (!(await esEditor())) {
    return NextResponse.json({ ok: false, error: "Sin permisos de editor." }, { status: 403 });
  }

  let body: ImportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON inválido." }, { status: 400 });
  }

  const { proveedorId, filasCrudas, mapeo, precioEnDolares, habilitado } = body;
  if (!proveedorId || !Array.isArray(filasCrudas) || !filasCrudas.length) {
    return NextResponse.json(
      { ok: false, error: "Faltan proveedorId o filasCrudas." },
      { status: 400 }
    );
  }

  const proveedores = await proveedorService.getProveedores();
  const proveedor = proveedores.find((p) => p.id === proveedorId);
  if (!proveedor) {
    return NextResponse.json({ ok: false, error: "Proveedor no encontrado." }, { status: 404 });
  }

  const filas = aplicarMapeoListaPrecios(filasCrudas, mapeo ?? {});
  if (filas.length === 0) {
    return NextResponse.json({ ok: false, error: "No hay filas válidas para importar." }, { status: 400 });
  }

  await startImportInDb(filas.length);

  try {
    const { creados, actualizados, errores } = await listaPreciosService.upsertListaPrecios(
      proveedorId,
      proveedor.prefijo,
      filas,
      precioEnDolares ?? false,
      habilitado ?? true,
      {
        onProgress(processed, total) {
          void setImportProgressInDb(processed, total);
        },
      }
    );

    await setImportResultInDb({ creados, actualizados, eliminados: 0, errores });

    revalidatePath("/proveedores");
    revalidatePath("/proveedores/lista-precios");
    revalidatePath("/proveedores/lista");
    revalidatePath("/proveedores/gestion");

    return NextResponse.json({ ok: true, creados, actualizados, errores });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await setImportErrorInDb(message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
