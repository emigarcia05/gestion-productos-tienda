import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: "Formato de archivo no soportado. Usa CSV o Excel." },
        { status: 400 }
      );
    }

    // Registrar el log de importación
    const importLog = await prisma.importLog.create({
      data: {
        filename: file.name,
        status: "processing",
      },
    });

    // TODO: Parsear el archivo CSV/Excel y crear productos en bulk
    // Ejemplo con CSV (requiere instalar 'papaparse' o 'csv-parse'):
    //
    // const text = await file.text();
    // const rows = parseCSV(text);
    // const products = rows.map(row => ({
    //   name: row.nombre,
    //   price: parseFloat(row.precio),
    //   stock: parseInt(row.stock),
    //   category: row.categoria,
    //   sku: row.sku,
    //   description: row.descripcion,
    // }));
    // await prisma.product.createMany({ data: products, skipDuplicates: true });

    await prisma.importLog.update({
      where: { id: importLog.id },
      data: { status: "completed" },
    });

    return NextResponse.json({
      success: true,
      importLogId: importLog.id,
      message: `Archivo "${file.name}" recibido correctamente`,
    });
  } catch (error) {
    console.error("[API /import] Error:", error);
    return NextResponse.json(
      { error: "Error interno al procesar el archivo" },
      { status: 500 }
    );
  }
}
