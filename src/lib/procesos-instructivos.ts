import { PERMISOS } from "@/lib/permisos";

type PermisoRol = { simple: boolean; editor: boolean };

export interface PasoProcesoInstructivo {
  titulo: string;
  texto: string;
  img: string;
}

export interface ProcesoInstructivoDef {
  id: string;
  titulo: string;
  descripcion: string;
  /** Módulo de origen (referencia para el usuario). */
  origen: string;
  permiso: PermisoRol;
  pasos: readonly PasoProcesoInstructivo[];
}

export const PROCESOS_INSTRUCTIVOS: readonly ProcesoInstructivoDef[] = [
  {
    id: "importar-stock",
    titulo: "Importar Excel De Control Stock",
    descripcion:
      "Pasos para cargar en DUX el archivo exportado desde Control Stock (ajuste de stock).",
    origen: "Lista Tienda · Control Stock",
    permiso: PERMISOS.stock.acceso,
    pasos: [
      { titulo: "Paso 1", texto: 'Abrir el módulo "Importar Datos"', img: "/importar_stock_1.png" },
      { titulo: "Paso 2", texto: 'Iniciar "Nueva Importación"', img: "/importar_stock_2.png" },
      { titulo: "Paso 3", texto: 'Seleccionar "Stock"', img: "/importar_stock_3.png" },
      { titulo: "Paso 4", texto: "Cargar el archivo Excel descargado", img: "/importar_stock_4.png" },
      { titulo: "Paso 5", texto: "Seleccionar todos los item", img: "/importar_stock_5.png" },
    ],
  },
  {
    id: "importar-aumentos",
    titulo: "Importar Excel De Control Aumentos",
    descripcion:
      "Pasos para cargar en DUX el archivo exportado desde Control Aumentos (variaciones de costo).",
    origen: "Lista Tienda · Control Aumentos",
    permiso: PERMISOS.tienda.controlAumentos,
    pasos: [
      { titulo: "Paso 1", texto: 'Abrir el módulo "Importar Datos"', img: "/importar_precios_1.png" },
      { titulo: "Paso 2", texto: 'Iniciar "Nueva Importacion"', img: "/importar_precios_2.png" },
      { titulo: "Paso 3", texto: 'Seleccionar "Producto"', img: "/importar_precios_3.png" },
      { titulo: "Paso 4", texto: "Cargar el archivo descargado", img: "/importar_precios_4.png" },
      { titulo: "Paso 5", texto: "Seleccionar todos los ítems y guardar", img: "/importar_precios_5.png" },
    ],
  },
  {
    id: "importar-recepcion",
    titulo: "Importar Excel De Recepción De Pedido",
    descripcion:
      "Pasos para cargar en DUX el Excel generado al recepcionar un pedido en Historial Pedidos.",
    origen: "Pedido De Mercadería · Historial Pedidos",
    permiso: PERMISOS.pedidos.acceso,
    pasos: [
      { titulo: "Paso 1", texto: 'Abrir el módulo "Importar Datos".', img: "/importar_compra_1.png" },
      { titulo: "Paso 2", texto: 'Iniciar "Nueva Importacion".', img: "/importar_compra_2.png" },
      { titulo: "Paso 3", texto: 'Seleccionar "Compra".', img: "/importar_compra_3.png" },
      { titulo: "Paso 4", texto: "Cargar el archivo descargado.", img: "/importar_compra_4.png" },
      { titulo: "Paso 5", texto: "Seleccionar todos los ítems y guardar.", img: "/importar_compra_5.png" },
    ],
  },
] as const;

export type ProcesoInstructivoId = (typeof PROCESOS_INSTRUCTIVOS)[number]["id"];

export function getProcesoInstructivoById(id: string): ProcesoInstructivoDef | undefined {
  return PROCESOS_INSTRUCTIVOS.find((p) => p.id === id);
}
