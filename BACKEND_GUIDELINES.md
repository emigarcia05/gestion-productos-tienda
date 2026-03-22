# Guía Backend — Next.js 16 App Router

Documento de referencia para desarrolladores y **asistentes IA** que crean o modifican Server Actions, servicios y validaciones. Sigue estas reglas para mantener seguridad, integridad de datos y arquitectura limpia.

---

## 1. Principios de implementación

### 1.1 Server Actions (`src/actions/`)

- **Ubicación**: Todas las Server Actions viven en `src/actions/`, con `"use server"` al inicio del archivo.
- **Firma**: Siempre `async`, con tipado estricto. **Prohibido `any`**.
- **Rol**: Son **controladores de entrada/salida**: validan sesión/rol, validan payload con Zod, delegan lógica a servicios, devuelven un formato de respuesta estándar.
- **No** contienen lógica de negocio compleja ni acceso directo a Prisma (salvo casos legacy documentados); esa lógica va en `src/services/`.

### 1.2 Seguridad y autorización

- **Sesión**: Se usa **iron-session** vía `@/lib/sesion`: `getSesion()`, `getRol()`, `esEditor()`.
- **Regla de oro**: Toda Action que **modifique datos** (crear, actualizar, eliminar) o exponga datos sensibles **debe** comprobar sesión/rol **al inicio**, antes de cualquier lógica.
- **Lecturas**: Las Actions de solo lectura pueden no comprobar rol si la página ya restringe acceso; para consistencia y futuras APIs, se recomienda comprobar acceso con `getRol()` + `puede(rol, PERMISOS.*)` cuando exista permiso definido en `@/lib/permisos`.
- **Helpers**: `esEditor()` para “solo editor”; para permisos granulares usar `getRol()` y `puede(rol, PERMISOS.modulo.accion)` desde `@/lib/permisos`.

### 1.3 Integridad de datos

- **Validación obligatoria**: Todo payload que toque la base de datos (IDs, FormData, objetos de entrada) **debe** validarse con **Zod (v4)** antes de usarse.
- **Dónde validar**: En la Action (recomendado) o en el servicio si la misma validación se reutiliza en varios puntos.
- **Método**: Usar `.safeParse()`. En caso de error, mapear a mensaje legible y devolver `{ ok: false, error: string }`.

### 1.4 Arquitectura limpia

- **Servicios** (`src/services/`): Encapsulan acceso a datos (Prisma, SQL raw) y lógica de negocio. Las Actions los invocan; no al revés.
- **Actions**: Orquestan: sesión → validación → servicio → revalidatePath → respuesta.

### 1.6 Listados de solo lectura (catálogos)

- Para catálogos de solo lectura (ej. `precios_tienda`), exponer búsquedas mediante:
  - **Servicio** (consulta Prisma) + **Action** con sesión/rol + Zod + `ActionResult`.
- Ejemplo aplicado: `buscarBasesTintometricasAction` (módulo Pedido Tintométrico) consulta `precios_tienda` filtrando por `rubro = "Tintometrico"` y búsqueda por descripción/códigos.

### 1.7 Filtros de búsqueda por texto (lecturas)

- Cuando se agrega un filtro de texto (ej. `q`) en un listado de lectura:
  - **Normalizar**: `q?.trim()` y tratar vacío como `undefined`.
  - **Prisma**: usar `contains` con `mode: "insensitive"` y `OR` entre campos relevantes (p. ej. `descripcionTienda` / `descripcionProveedor`).
  - **Ubicación**: la lógica del `where` vive en `src/services/` y la Action solo pasa `q` normalizada.
- **Historial de pedidos** (`listarPedidosHistoria`): `q` opcional; se parte en palabras (máx. 10, texto máx. 200 caracteres); cada palabra debe aparecer en `descripcion_tienda` de **`precios_tienda`** (`AND`); los `cod_tienda` distintos obtenidos filtran cabeceras con `items: { some: { codTienda: { in } } }` (misma fuente de descripción que `getPedidoHistoriaDetalle`). Zod en `listarPedidosHistoriaAction`: `q` con `.max(200).optional()`.

### 1.8 Fuente de costo final (`px_compra_final`)

- En listados/exportaciones donde el "costo" represente el valor final calculado para el proveedor (ej. **Control Aumentos**), usar como fuente **`px_compra_final`** de `precios_proveedores` (campo `pxCompraFinal` en Prisma).
- Evitar exportar un costo derivado de la tabla de tienda (`costo_compra`/`costoTienda`) si existe una columna final calculada en `precios_proveedores`.

### 1.9 Campos calculados de “Tabla Tienda” (prefijos/dif por mejor proveedor)

- En `getTiendaPageData` (listado “Comp. Proveedores”), cuando hay mejora por un proveedor **no-oficial**:
  - el “mejor proveedor” se define por el menor `px_compra_final` entre proveedores no-oficiales;
  - el “DIF.” se calcula como porcentaje entero de mejora vs `costo_compra` y se setea en `difMejorPrecioPctEntero` (ej. `-12%` en UI, renderizado como reducción);
  - si no existe proveedor que mejore el costo, los campos se devuelven como `null` para que la UI renderice vacío.

### 1.10 Margen sin IVA (Comp. Proveedores, `/tienda`)

- La columna **MARGEN S/ IVA** en la tabla usa `px_lista_tienda` → `precioLista` y `costo_compra` → `costo` en `ItemTiendaParaTabla`; el cálculo vive en `calcMargenSinIvaPct` (`src/lib/calculos.ts`): \(((pxLista/(1+\mathrm{IVA}/100))/\mathrm{costo})-1)\times 100\). El IVA por ítem viene de `porcIva` (hoy 21 en el mapeo de `getTiendaPageData`). No requiere campos nuevos en la Action: es derivado en el cliente.

### 1.5 Manejo de errores y respuestas

- **Formato estándar para el frontend**:  
  - **Actions que pueden fallar**: `ActionResult<T>` desde `@/lib/types`:  
    `{ ok: true, data: T } | { ok: false, error: string }`.  
  - **Servicios**: `ServiceResult<T>` desde `@/types` (o `@/types/service.types`):  
    `{ success: true, data: T } | { success: false, error: string }`.
- **No** lanzar errores al cliente desde Actions; capturar y devolver `{ ok: false, error: string }`.
- **Excepciones**: `sesion.ts` (activar/desactivar editor) puede devolver `{ ok, error? }` por conveniencia; el resto debe tender a `ActionResult` cuando haya flujo de éxito/error.

---

## 2. Esquemas de referencia

### 2.1 Action con sesión + Zod + servicio (patrón “perfecto”)

```ts
"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import { createProveedorSchema } from "@/lib/validations/proveedor";
import * as proveedorService from "@/services/proveedor.service";

export async function crearProveedor(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const raw = {
    nombre: (formData.get("nombre") as string) ?? "",
    prefijo: (formData.get("prefijo") as string) ?? "",
  };
  const parsed = createProveedorSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = first.nombre?.[0] ?? first.prefijo?.[0] ?? "Datos inválidos.";
    return { ok: false, error: msg };
  }

  try {
    const { id } = await proveedorService.createProveedor(parsed.data);
    revalidatePath("/proveedores");
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al crear el proveedor.";
    return { ok: false, error: message };
  }
}
```

### 2.2 Action con permiso granular (getRol + puede)

```ts
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export async function actualizarListaPreciosMasivoAction(
  ids: string[],
  data: ActualizacionMasivaListaPrecios
): Promise<ActionResult<{ actualizados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para edición masiva." };
  }
  const parsedIds = z.array(z.string().uuid()).safeParse(ids);
  if (!parsedIds.success) return { ok: false, error: "IDs inválidos." };
  const parsedData = actualizacionMasivaListaPreciosSchema.safeParse(data);
  if (!parsedData.success) return { ok: false, error: "Datos de actualización inválidos." };

  const result = await actualizarListaPreciosMasivo(parsedIds.data, parsedData.data);
  if (result.error) return { ok: false, error: result.error };
  revalidatePath("/proveedores/lista-precios");
  return { ok: true, data: { actualizados: result.actualizados } };
}
```

### 2.3 Esquema Zod (v4) típico

```ts
// src/lib/validations/proveedor.ts
import { z } from "zod";

export const createProveedorSchema = z.object({
  nombre: z.string().min(1).transform((s) => s.trim()).refine((s) => s.length >= 2, "Mín. 2 caracteres"),
  prefijo: z.string().min(1).transform((s) => s.trim().toUpperCase()).refine((s) => /^[A-Z]{3}$/.test(s), "3 letras A-Z"),
});
export type CreateProveedorFormData = z.infer<typeof createProveedorSchema>;
```

### 2.4 Tipos de respuesta estándar

```ts
// @/lib/types (para Actions)
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// @/types o @/types/service.types (para servicios)
export type ServiceResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### 2.5 Historial de pedidos (PedidoHistoria)

Este módulo agrega persistencia para el historial de pedidos generados por el flujo de “Generar Pedido”.

- Cabecera: `pedido_historia` (Prisma: `PedidoHistoria`)
  - `generado_at`: fecha/hora del snapshot (momento en que se arma el pedido y se guarda el detalle).
  - `estado`: `PEDIDO | RECIBIDO`.
    - `PEDIDO`: snapshot creado.
    - `RECIBIDO`: se setea cuando en un paso siguiente se exporta/registran los datos en DUX y el proceso finaliza OK.
  - `registrado_at`: fecha/hora cuando se cambia a `RECIBIDO` (nullable).
  - Relaciones: `proveedor_id -> proveedores.id` y `sucursal_id -> sucursales.id`.

- Items: `pedido_historia_items` (Prisma: `PedidoHistoriaItem`)
  - `pedido_historia_id -> pedidos_historia.id` (FK, `onDelete: CASCADE`).
  - `cod_tienda`: identificador del producto en la tabla `precios_tienda` (se guarda como texto).
  - Cantidades:
    - `cant_pedida`: snapshot inicial (cargado al generar).
    - `cant_recibida`: editable por UI (OK/Editar/Cesto). El “cesto” implica `cant_recibida = 0`.

Constraint:
- `UNIQUE (pedido_historia_id, cod_tienda)` para evitar duplicados de producto dentro de un mismo pedido.
- Índices: además de `(sucursal_id, generado_at)` y `(proveedor_id, generado_at)`, se agrega índice sobre `generado_at` para listar por fecha con buen rendimiento.

#### `generarPdfEnviarPedidoAction` — ítems vacíos

- Si **`getItemsYProveedorParaEnviar`** devuelve **0 ítems** para la combinación proveedor + sucursal + tipos, la Action responde **`{ ok: false, error: "No hay ítems para generar el pedido con la selección indicada." }`** **antes** de crear historial o borrar filas URGENTE/TINTOMÉTRICO (evita PDF vacío y borrados masivos indebidos).
- Tras éxito, **`revalidatePath`** incluye también **`/pedidos/reposicion`**.

### 2.6 Servicio `pedidosHistoria.service.ts`

Contratos de funciones (SSOT de lógica y acceso a Prisma) para mantener consistencia e integridad:

1. `listarPedidosHistoria({ pagina, estado?, proveedorId?, sucursalCodigo?, q? })`
   - Uso: obtener página de cabeceras para el módulo de historial (`/pedidos/historial`).
   - Con `q` no vacío: solo pedidos que tengan al menos un ítem cuyo `cod_tienda` figure en `precios_tienda` con descripción que contenga todas las palabras de `q` (insensible a mayúsculas).
   - Devuelve: `items` con `id`, `generadoAt`, `proveedorNombre`, `sucursalNombre`, `estado`, `registradoAt`, más `total`, `totalPaginas` y `paginaActual`.

2. `crearPedidoHistoriaSnapshot({ proveedorId, sucursalCodigo, tipos })`
   - Uso: llamada desde `generarPdfEnviarPedidoAction` para crear cabecera + items del snapshot justo antes de limpiar `pedidos_mercaderia` (cuando corresponda).
   - Crea `PedidoHistoria` con `estado = "PEDIDO"`.
   - Lee `ItemPedidoEnvio` filtrando por `idProveedor`, `sucursalId`, `tipoPedido IN tipos` y `cant_pedir > 0`.
   - Inserta `PedidoHistoriaItem` consolidando por `cod_tienda` (para respetar UNIQUE por `cod_tienda`).
   - Inicializa `cant_recibida = cant_pedida` para representar la suposición “llegó igual”.

3. `getPedidoHistoriaDetalle({ pedidoHistoriaId })`
   - Devuelve cabecera + lista de items ordenados por `codTienda`.
   - Incluye `generado_at`, `registrado_at`, `cant_pedida`, `cant_recibida` y `descripcionTienda` (resuelta desde `precios_tienda`) para renderizar la columna DESCRIPCIÓN en UI.

4. `agregarPedidoHistoriaItem({ pedidoHistoriaId, codTienda, cantRecibida })`
   - Reglas:
     - Solo permitido si el pedido está en estado `"PEDIDO"`.
     - Respeta UNIQUE(`pedido_historia_id`, `cod_tienda`): si el item ya existe devuelve error.
   - Inicializa `cant_pedida = cant_recibida = cantRecibida` (asumiendo igualdad para filas agregadas).

5. `actualizarPedidoHistoriaItemCantRecibida({ pedidoHistoriaItemId, cantRecibida })`
   - Reglas:
     - Solo permitido si el pedido asociado está en estado `"PEDIDO"`.
     - Actualiza únicamente `cant_recibida` (sin tocar `cant_pedida`).

6. `marcarPedidoHistoriaRegistrado({ pedidoHistoriaId })`
   - Transición: setea `estado = "RECIBIDO"` y `registrado_at` cuando el paso de export/registro en DUX termina OK.

7. `eliminarPedidoHistoria({ pedidoHistoriaId })`
   - Borra la fila `PedidoHistoria`; los `PedidoHistoriaItem` se eliminan en cascada (`onDelete: Cascade`).

---

### 2.7 Servicio `productosTienda.service.ts`

Contrato para resolver listados de productos en `precios_tienda` destinados a selección en UI (p. ej. “Agregar Productos” dentro del modal de historial de pedidos).

Función:
1. `buscarProductosTiendaPorDescripcion({ q?, take? })`
   - Devuelve `ServiceResult` con:
     - `items`: array de `{ id, codTienda, descripcionTienda }`
     - `total`: total de coincidencias (para mostrar conteo en el modal).
   - Búsqueda:
     - Si `q` está vacío, devuelve un subset ordenado por `descripcionTienda`.
     - Si `q` tiene valor, filtra por `descripcionTienda` usando coincidencia insensible a mayúsculas/minúsculas.

---

## 3. Diccionario de tipos

| Origen | Uso |
|--------|-----|
| `@/lib/types` | `ActionResult<T>` — respuestas de Server Actions |
| `@/types` o `@/types/service.types` | `ServiceResult<T>` — respuestas de servicios |
| `@/types/producto.types` | `ProductoCompleto`, `ProveedorResumen`, etc. |
| `@/types/components.types` | Props de modales, drawers, confirmaciones |
| `@/lib/permisos` | `Rol`, `PERMISOS`, función `puede(rol, permiso)` |
| `@/lib/sesion` | `SesionData`, `getSesion()`, `getRol()`, `esEditor()` |

Al extender tipos de dominio, preferir `src/types/*.ts`; para tipos ligados a validación, usar `z.infer<typeof schema>` en `src/lib/validations/*.ts`.

---

## 4. Checklist de autocorrección (para IAs)

Antes de entregar código nuevo o modificado, verificar:

- [ ] **Sesión/rol**: ¿Toda Action que modifica datos comprueba `esEditor()` o `getRol()` + `puede()` al inicio?
- [ ] **Zod**: ¿Todo payload de entrada (IDs, FormData, objetos) se valida con un esquema Zod antes de usarse en BD o servicios?
- [ ] **Sin `any`**: ¿El código evita `any` y usa tipos explícitos o inferidos?
- [ ] **ActionResult**: ¿Las Actions que pueden fallar devuelven `ActionResult<T>` con `{ ok, data? }` o `{ ok: false, error }`?
- [ ] **No throw al cliente**: ¿Los errores se capturan y se devuelven como `{ ok: false, error: string }` en lugar de lanzar?
- [ ] **Lógica en servicios**: ¿La lógica de negocio y el acceso a Prisma están en `src/services/` y no en la Action?
- [ ] **revalidatePath**: ¿Se llama a `revalidatePath` (o `revalidateTag`) tras mutaciones que afectan a rutas concretas?
- [ ] **Permisos**: Si existe un permiso en `PERMISOS` para la funcionalidad, ¿se usa `puede(rol, PERMISOS.*)` en lugar de solo `esEditor()` cuando aplique?

---

## 5. Resumen de auditoría (edición actual)

### 5.1 Cumplen bien

- **proveedores.ts**: `esEditor()`, Zod para crear/editar, `ActionResult`, servicios.
- **listaPrecios.ts**: `getRol()` + `puede()` para edición masiva; falta validación Zod del payload en la Action.
- **comparacionCategorias.ts**: `getRol()` + `puede()` en todas las Actions; falta Zod en parámetros (ids, nombres, etc.) y unificación de formato de respuesta (`ok`/`data`/`error`).

### 5.2 A mejorar

- **pedidos.ts**: Sin comprobación de sesión; datos mock. Cuando haya datos reales, añadir al menos verificación de acceso y, si hay escritura, validación Zod.
- **tienda.ts**: `getTiendaPageData` y `getControlAumentos` sin verificación de sesión (aceptable si la ruta ya está protegida); `convertirEnProveedor` correcto con `esEditor()`. Lógica de tienda muy cargada en la Action; considerar mover a servicio.
- **stock.ts**: Sin comprobación de sesión en `getControlStock` ni en `registrarImpresion`; `registrarImpresion` sin validación de `ids`.
- **syncListaPrecioTienda.ts**: La Action no comprueba rol; la sincronización con DUX debe restringirse a editores (`esEditor()` o `PERMISOS.tienda.acciones.sincronizar`).
- **importar.ts**: Usa `throw new Error` en lugar de `return { ok: false, error }`; no devuelve `ActionResult`. Falta validación Zod de `proveedorId`, `filasCrudas`, `mapeo`.
- **vinculos.ts**: `vincularProducto` / `desvincularProducto` correctos en sesión; falta validación Zod de IDs (UUIDs). Lógica de vinculación podría moverse a servicio.
- **productos.ts**: `esEditor()` correcto; sin Zod para `id`, `campos`, `campo`, `valor`; respuestas ya en formato `ActionResult`.
- **sesion.ts**: `activarModoEditor` recibe `clave` sin validación Zod (string no vacío); aceptable por contexto; respuesta ya coherente.

### 5.3 Reglas añadidas en esta guía

- Validar con Zod **todos** los payloads que afecten a la BD.
- Acción de sincronización DUX protegida por rol.
- Estandarizar respuestas de error: no `throw`, sí `ActionResult` con `error`.
- Documentar uso de `getRol()` + `puede()` para permisos granulares.
- PDF “Generar Pedido”: usar `src/lib/generarPdfPedido.ts` como SSOT para el layout. El PDF debe titular “Nota de Pedido”, incluir “Fecha” con formato `dddd de mmmm de aaaa` y una tabla con columnas `CANT.`, `COD.` y `DESCRIPCION` en ese orden. Los datos deben venir de `cant_pedir`, `cod_proveedor` (vacío si no existe) y `descripcion_proveedor` priorizando `descripcion_proveedor`, luego `tintometrico_descripcion` (y como fallback `descripcion_tienda`. El archivo exportado debe llamarse `Nota Pedido - {Prefijo Proveedor} - dd/mm hh:mm.pdf`.
- Al ejecutar el botón de **Generar Pedido** (server action `generarPdfEnviarPedidoAction`), limpiar de `pedidos_mercaderia` (ítems `tipo_de_pedido` `URGENTE` y/o `TINTOMETRICO`) para la `sucursal` enviada, y revalidar las rutas afectadas (`/pedidos/enviar`, `/pedidos/urgente`, `/pedidos/tintometrico`).

### 5.4 Cambios aplicados en esta auditoría

| Archivo / Área | Cambio |
|----------------|--------|
| `src/actions/syncListaPrecioTienda.ts` | Comprobación `esEditor()` al inicio; si no hay permiso, se devuelve resultado vacío con `errores: ["Sin permisos de editor."]`. |
| `src/actions/importar.ts` | `importarProductos` e `importarListaPreciosProveedor` devuelven `ImportActionResult` (éxito con `data` o error con `error`) en lugar de lanzar; try/catch en importar lista para devolver error controlado. |
| `src/actions/listaPrecios.ts` | `actualizarListaPreciosMasivoAction`: validación con `idsUuidSchema` y `actualizacionMasivaListaPreciosSchema` antes de llamar al servicio. |
| `src/lib/validations/listaPrecios.ts` | Nuevo: esquemas `idsUuidSchema` y `actualizacionMasivaListaPreciosSchema` para edición masiva. |
| `src/components/proveedores/ImportarModal.tsx` | Manejo de respuesta: comprueba `res.ok` y usa `res.data` o `res.error` según corresponda. |
| **Fase 2 (cierre de auditoría)** | |
| `src/actions/pedidos.ts` | `getPedidoUrgenteData`: comprobación `getRol()` + `puede(rol, PERMISOS.pedidos.acceso)`; si no hay acceso se devuelve estructura vacía (proveedores mock, productos [], total 0). |
| `src/actions/stock.ts` | `getControlStock`: comprobación `getRol()` + `puede(rol, PERMISOS.stock.acceso)`; retorno vacío si no hay acceso. `registrarExportacionExcelStock`: persiste `ultimaExportacionExcel` (ActionResult<void>), validación de `ids` con Zod (UUIDs), comprobación de acceso; componente muestra toast en error. Además, `getControlStock` soporta ordenamiento por `ultima_exportacion_excel` con `NULL` como “más antiguo”. |
| `src/actions/vinculos.ts` | `vincularProducto` y `desvincularProducto`: validación de IDs con `uuidSchema` antes de tocar Prisma. |
| `src/actions/productos.ts` | `editarProducto`: validación con `editarProductoSchema` (id + campos). `aplicarCampoMasivo`: validación con `aplicarCampoMasivoSchema` (proveedorId, campo, valor, q). |
| `src/actions/comparacionCategorias.ts` | Todas las acciones devuelven `ActionResult<T>` unificado; validación Zod para todos los parámetros (UUIDs, nombres, etc.) vía `src/lib/validations/comparacionCategorias.ts`; respuestas de error solo `{ ok: false, error }`; asignar/quitar asignación devuelven `data: { count }`. |
| `src/lib/validations/common.ts` | Nuevo: `uuidSchema`, `uuidsSchema`, `paramsPaginaSchema` reutilizables. |
| `src/lib/validations/productos.ts` | Nuevo: `camposEditablesProductoSchema`, `editarProductoSchema`, `campoMasivoSchema`, `aplicarCampoMasivoSchema`. |
| `src/lib/validations/comparacionCategorias.ts` | Nuevo: esquemas para CRUD categorías, subcategorías, presentaciones y asignación de productos. |
| Componentes comparación/stock | `ComparacionCategoriasClient`: uso de `res.data` en `getProductosPorPresentacionAction`. `AsignarProductosModal`: uso de `res.data?.count`. `TablaStock`: manejo de `registrarExportacionExcelStock` con toast en error. |
| Comp. Por Cat. | Nueva persistencia de `DTO. EXTRA` (0-99 o null) por ítem aislada en tabla `comparacion_dto_extra_items`, con Action `actualizarDtoExtraComparacionAction` y servicio `getProductosPorPresentacion` que devuelve `dtoExtraComparacion`. |

---

### 5.5 Migración de sucursal texto a relación por ID (pedidos_mercaderia)

| Archivo / Área | Cambio |
|----------------|--------|
| `prisma/schema.prisma` | `ItemPedidoEnvio`: reemplazo de `sucursalCodigo @map("sucursal")` por `sucursalId @map("sucursal_id")` y relación `Sucursal` por `id` (ya no por `codigo`). |
| `prisma/migrations/20260317213000_migrate_pedidos_mercaderia_sucursal_to_fk_id/migration.sql` | Migración de datos y esquema: crea `sucursal_id`, migra datos desde `sucursal` por join a `sucursales.codigo`, elimina `sucursal`, crea FK a `sucursales.id` e índice único nuevo por `sucursal_id`. |
| `src/services/pedidosEnvio.service.ts` | Todas las lecturas/escrituras en `itemPedidoEnvio` pasan a filtrar/persistir por `sucursalId`; helper central para resolver `codigo -> id` sin romper contratos de frontend. |
| `src/actions/reposicion.ts` | Consultas de configuración REPOSICIÓN pasan de `where.sucursalCodigo` a `where.sucursal.codigo` para mantener filtros por código en UI con relación en BD. |
| `src/services/listaPrecios.service.ts` | Consulta de estado URGENTE/REPOSICIÓN pasa de `sucursalCodigo` a relación `sucursal.codigo`. |
| `prisma/migrations/20260319091000_update_px_compra_final_sum_discounts/migration.sql` | `px_compra_final` pasa a descuentos acumulados (sumados): `dtoTotal = dto_proveedor + dto_marca + dto_rubro + dto_cantidad + dto_financiero` (capado 0-100), manteniendo `cx_transporte` como factor porcentual final. |
| `scripts/verify-pedidos-reposicion.ts` | Esquema esperado actualizado: `sucursal_id` y columnas actuales `reposicion_*`, `urgente_*`, `tintometrico_*`. |
| `src/services/pedidosEnvio.service.ts` | Regla de fallback en vinculación por `cod_ext`: si no existe vínculo a tienda, `cod_tienda = "1503"`; si falta código proveedor, `cod_proveedor = ""` (vacío). |
| `prisma/migrations/20260317223000_sync_cant_pedir_por_tipo_pedido/migration.sql` | Regla de negocio a nivel BD: `cant_pedir` se sincroniza automáticamente por `tipo_de_pedido` (`TINTOMETRICO -> tintometrio_cant_pedir`, `URGENTE -> urgente_cant_pedir`, `REPOSICION -> reposicion_cant_pedir`) con trigger `BEFORE INSERT OR UPDATE`. |
| `prisma/migrations/20260317232000_sync_reposicion_cant_pedir_por_forma_y_stock/migration.sql` | Regla de reposición a nivel BD: `reposicion_cant_pedir` se calcula por forma (`CANT_FIJA`/`CANT. FIJA` => `reposicion_cant_conf`; `CANT_MAXIMA`/`CANT. MAX.` => `reposicion_cant_conf - stock sucursal`) y luego `cant_pedir` toma ese valor para `REPOSICION`. |
| `prisma/migrations/20260318000000_add_sync_dux_status/migration.sql` | Nueva tabla `sync_dux_status` para persistir estado de sincronización DUX en BD (`running`, `phase`, `processed`, `total`, `error`, `last_completed_at`, `updated_at`) y soportar polling estable en sidebar. |
| `prisma/schema.prisma` | Nuevo modelo `SyncDuxStatus` (mapeo a `sync_dux_status`) para tipado fuerte y evitar SQL raw en lecturas/escrituras. |
| `src/lib/syncDuxStatusDb.ts` | Helper tipado de persistencia de estado DUX (start/progress/success/error + lectura) usando Prisma. `last_completed_at` se actualiza **solo en sync OK**; en error se mantiene `processed/total` (no se resetean al hacer update por conflicto). |
| `src/app/api/sync-lista-precios-tienda/route.ts` | `GET` y `POST` validan `esEditor()` antes de mutar; sigue evitando doble ejecución y persiste progreso/resultado vía helper. |
| `src/app/api/sync-lista-precios-tienda/status/route.ts` | `GET` lee estado desde BD y expone `lastCompletedAt` para UI de sidebar. |

---

### 5.6 Optimización de persistencia (lista precios)

| Archivo / Área | Cambio |
|----------------|--------|
| `src/services/listaPrecios.service.ts` | `upsertListaPrecios()`: optimiza el conteo `creados/actualizados` con un prefetch en chunks de `codProdProv`, evitando el `findUnique()` por fila (patrón N+1) sin cambiar la lógica final del `upsert`. |

## 6. Organización en Cursor (prompts y reglas persistentes)

- Archivo recomendado para prompts reutilizables: `.cursor/prompts.md`.
- Reglas persistentes activas en `.cursor/rules/`:
  - `manuales-obligatorios.mdc`: exige revisar guías frontend/backend antes de modificar código.
  - `flujo-fullstack-end-to-end.mdc`: estandariza ciclo de implementación y cierre con actualización documental.
- Si se crea o modifica una Server Action, servicio, validación Zod, contrato de respuesta o regla de seguridad, registrar el cambio en este documento y mantener coherencia con las reglas de `.cursor/rules/`.

*Última actualización: `generarPdfEnviarPedidoAction` rechaza generación sin ítems; `revalidatePath` de reposición tras generar pedido.*
