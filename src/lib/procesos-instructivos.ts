import { PERMISOS } from "@/lib/permisos";
import type { Rol } from "@/lib/permisos";
import { puede } from "@/lib/permisos";

type PermisoRol = { simple: boolean; editor: boolean };

export interface PasoProcesoInstructivo {
  titulo: string;
  texto: string;
  img: string;
}

export interface ModuloProcesosDef {
  id: string;
  label: string;
}

export interface ProcesoInstructivoDef {
  id: string;
  moduloId: string;
  /** Etiqueta corta en el listado lateral (ej. Imp. Stock). */
  labelCorto: string;
  descripcion: string;
  permiso: PermisoRol;
  pasos: readonly PasoProcesoInstructivo[];
}

export const MODULOS_PROCESOS: readonly ModuloProcesosDef[] = [
  { id: "importacion-dux", label: "Importacion Datos en Dux" },
] as const;

export type ModuloProcesosId = (typeof MODULOS_PROCESOS)[number]["id"];

export const PROCESOS_INSTRUCTIVOS: readonly ProcesoInstructivoDef[] = [
  {
    id: "importar-stock",
    moduloId: "importacion-dux",
    labelCorto: "Imp. Stock",
    descripcion:
      "Pasos para cargar en DUX el archivo exportado desde Control Stock (ajuste de stock).",
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
    id: "importar-compra",
    moduloId: "importacion-dux",
    labelCorto: "Imp. Compra",
    descripcion:
      "Pasos para cargar en DUX el Excel generado al recepcionar un pedido (Historial Pedidos).",
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

export function listarProcesosVisiblesPorModulo(
  moduloId: string,
  rol: Rol
): ProcesoInstructivoDef[] {
  return PROCESOS_INSTRUCTIVOS.filter(
    (p) => p.moduloId === moduloId && puede(rol, p.permiso)
  );
}
