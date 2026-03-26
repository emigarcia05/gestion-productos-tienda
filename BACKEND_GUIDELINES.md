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
- **Lecturas (Server Actions)**: Aunque la ruta esté protegida en layout, **toda** Action invocable desde el cliente debe validar acceso con `getRol()` + `puede(rol, PERMISOS.*)` cuando exista permiso en `@/lib/permisos`, para evitar invocación directa sin pasar por la UI.
- **Escrituras con dos niveles**: Si el módulo da **acceso de lectura** a `simple` y `editor` (`PERMISOS.*.acceso` con ambos `true`) pero la operación es **crítica** (borrado, recepción, registro en sistemas externos), exigir además **`esEditor()`** tras el chequeo de `puede(rol, PERMISOS.*)` — patrón aplicado en **historial de pedidos** (mutaciones en `pedidosHistoria.ts`).
- **Importar** (`PERMISOS.importar.acceso`, solo editor en la matriz actual): comprobar **`puede(rol, PERMISOS.importar.acceso)`** y **`esEditor()`**, más validación Zod del payload (`@/lib/validations/importar.ts`).
- **Helpers**: `esEditor()` para “solo editor”; para permisos granulares usar `getRol()` y `puede(rol, PERMISOS.modulo.accion)` desde `@/lib/permisos`.
- **IDs de Prisma**: Los modelos usan **`cuid`** (no UUID) salvo tablas explícitas con `@default(uuid())` (p. ej. `ListaPrecioTienda`, `ListaPrecioProveedor`, `ItemPedidoEnvio`). Validar con `prismaCuidSchema` (`@/lib/validations/common`), `uuidSchema` o `z.string().min(1).max(128)` según el modelo; **no** mezclar `.uuid()` en IDs que sean `cuid`.
- **Lecturas con datos sensibles** (precios, vínculos, catálogos):
  - **Lista de precios** (`getListaPreciosFiltradaAction`, `getListaPreciosConOpcionesAction`): `getRol()` + `puede(rol, PERMISOS.listaPrecios.acciones.importarLista)`; entrada validada con `listaPreciosFiltrosLecturaSchema` (`@/lib/validations/listaPrecios`) — límites de longitud y `opciones` **estrictas** (`listaPreciosOpcionesFiltroSchema`).
  - **Catálogo de proveedores** (`getProveedores`, `getProveedoresPageData`): `getRol()` + al menos uno de `PERMISOS.proveedores.sugeridos`, `PERMISOS.proveedores.lista` o `PERMISOS.listaPrecios.acciones.importarLista`; parámetros de página con `proveedoresPageParamsSchema`.
  - **Vínculos tienda** (`getVinculos`, `listarProductosParaVincular` en `vinculos.ts`): `getRol()` + `puede(rol, PERMISOS.tienda.acceso)`; IDs de ítem tienda con `uuidSchema`; filtros de búsqueda acotados con Zod en la Action.
  - **Sincronización DUX lista tienda** (`sincronizarListaPrecioTiendaDux` y `GET`/`POST` de `/api/sync-lista-precios-tienda`): `getRol()` + `puede(rol, PERMISOS.tienda.acciones.sincronizar)`. En la matriz actual **`simple` y `editor`** tienen `sincronizar: true` (slidenav y cualquier cliente autenticado con sesión válida). El `GET` de estado (`/api/sync-lista-precios-tienda/status`) sigue sin chequeo de rol explícito en el route: cualquier sesión que pueda llamar la API ve el mismo progreso global.
- **Mutaciones sobre `Proveedor`**: validar `id` con `prismaCuidSchema` en editar/eliminar; `eliminarProveedor` delega en `deleteProveedor` del servicio (`ServiceResult`) y maneja restricciones FK (p. ej. historial de pedidos).
- **Lecturas de listados con filtros** (pedidos urgente/enviar, reposición, stock, tienda): además del permiso de módulo, validar el objeto de parámetros con esquemas dedicados (`@/lib/validations/pedidosLectura`, `reposicion`, `stock`, `tienda`) para acotar `q`, `pagina`, sucursales y arrays (`tipos`).

### 1.2.1 Activación de modo editor (`sesion.ts`)

- Entrada **`clave`**: validar con Zod (`z.string().min(1).max(500)`) antes de comparar con `EDITOR_PASSWORD`. Evita payloads anómalos y documenta el contrato.

### 1.3 Integridad de datos

- **Validación obligatoria**: Todo payload que toque la base de datos (IDs, FormData, objetos de entrada) **debe** validarse con **Zod (v4)** antes de usarse.
- **Dónde validar**: En la Action (recomendado) o en el servicio si la misma validación se reutiliza en varios puntos.
- **Método**: Usar `.safeParse()`. En caso de error, mapear a mensaje legible y devolver `{ ok: false, error: string }`.

### 1.3.1 Zona horaria de negocio (Argentina, UTC−3)

- **Módulo**: `@/lib/fechaArgentina` — `TIMEZONE_ARGENTINA = "America/Argentina/Buenos_Aires"` y helpers (`formatDdMmHhMmArgentina`, `formatFechaLargaNotaPedidoArgentina`, `formatFechaHoraCompletaArgentina`, `dateToIsoYmdArgentina`, sellos para nombres de archivo).
- **Por qué**: En servidor (p. ej. UTC en Vercel), `Date#getHours()` o `toLocaleDateString` sin `timeZone` muestran hora incorrecta en PDFs y nombres de archivo. Todo documento o UI que deba reflejar **hora Argentina** debe usar esos helpers o `Intl` con `timeZone: TIMEZONE_ARGENTINA`.
- **Solo fecha de calendario** (`YYYY-MM-DD` sin hora, p. ej. factura en Excel DUX): formatear **desde las partes del ISO** (ver `exportRecepcionPedidoExcel.service.ts`: `parseIsoYmdParts`) para no depender del TZ del runtime.

### 1.4 Arquitectura limpia

- **Servicios** (`src/services/`): Encapsulan acceso a datos (Prisma, SQL raw) y lógica de negocio. Las Actions los invocan; no al revés.
- **Actions**: Orquestan: sesión → validación → servicio → revalidatePath → respuesta.

- **Prisma / Neon**: `DATABASE_URL` en `.env` debe usar el **pooler** de Neon para el runtime (`src/lib/prisma.ts`). Para migraciones, definir además **`DIRECT_URL`** (host **sin** `-pooler`): `prisma.config.ts` usa `DIRECT_URL` si existe; si no, cae a `DATABASE_URL`. Plantilla: `.env.example`.
- **Migraciones ítems historial pedidos**: `20260322120000_*` y `20260322140000_*` son **idempotentes** (`to_regclass`) respecto de `pedidos_historia_items` / `pedidos_mercaderia_historial`. `20260322200000_*` renombra `pedidos_mercaderia_historial` → `pedidos_historial_mercaderia` si aún existe el nombre intermedio.

### 1.6 Listados de solo lectura (catálogos)

- Para catálogos de solo lectura (ej. `precios_tienda`), exponer búsquedas mediante:
  - **Servicio** (consulta Prisma) + **Action** con sesión/rol + Zod + `ActionResult`.
- Ejemplo aplicado: `buscarBasesTintometricasAction` (módulo Pedido Tintométrico) consulta `precios_tienda` filtrando por `rubro = "Tintometrico"` y búsqueda por descripción/códigos.

### 1.7 Filtros de búsqueda por texto (lecturas)

- Cuando se agrega un filtro de texto (ej. `q`) en un listado de lectura:
  - **Normalizar**: `q?.trim()` y tratar vacío como `undefined`.
  - **Prisma**: usar `contains` con `mode: "insensitive"` y `OR` entre campos relevantes (p. ej. `descripcionTienda` / `descripcionProveedor`).
  - **Ubicación**: la lógica del `where` vive en `src/services/` y la Action solo pasa `q` normalizada.
- **Historial de pedidos** (`listarPedidosHistoria`): `q` opcional; se parte en palabras (máx. 10, texto máx. 200 caracteres); cada palabra debe aparecer en `descripcion_tienda` de **`precios_tienda`** (`AND`); los `cod_tienda` distintos obtenidos filtran cabeceras con `items: { some: { codTienda: { in } } }` (misma fuente de descripción que `getPedidoHistoriaDetalle`). **`estado`**: `SIN RECEPCION` \| `RECEPCIONADO` \| **`ALL`** (sin filtrar por estado). La página `/pedidos/historial` **sin** query `estado` aplica por defecto filtro **`SIN RECEPCION`** (pendientes de recepción). Zod en `listarPedidosHistoriaAction`: `estado` incluye `ALL`; `q` con `.max(200).optional()`.

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
  const parsedIds = idsUuidSchema.safeParse(ids);
  if (!parsedIds.success) return { ok: false, error: "IDs inválidos." };
  const parsedData = actualizacionMasivaListaPreciosSchema.safeParse(data);
  if (!parsedData.success) return { ok: false, error: "Datos de actualización inválidos." };

  const result = await actualizarListaPreciosMasivo(parsedIds.data, parsedData.data);
  if (result.error) return { ok: false, error: result.error };
  revalidatePath("/proveedores/lista-precios");
  return { ok: true, data: { actualizados: result.actualizados } };
}
```

### 2.2.1 Action de solo lectura con datos sensibles (permiso + Zod)

```ts
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { listaPreciosFiltrosLecturaSchema } from "@/lib/validations/listaPrecios";

export async function getListaPreciosConOpcionesAction(/* ... */) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.importarLista)) {
    return { filas: [], total: 0, totalPaginas: 0, proveedoresDisponibles: [], marcasDisponibles: [], rubrosDisponibles: [] };
  }
  const parsed = listaPreciosFiltrosLecturaSchema.safeParse({ proveedorId, marcaNombre, rubroNombre, busqueda, habilitado, opciones, pagina });
  if (!parsed.success) return /* mismo vacío */;
  // delegar al servicio con parsed.data normalizado
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
  - `estado`: `SIN RECEPCION | RECEPCIONADO`.
    - `SIN RECEPCION`: snapshot creado (pendiente de recepción).
    - `RECEPCIONADO`: se setea cuando en un paso siguiente se exporta/registran los datos en DUX y el proceso finaliza OK.
  - `registrado_at`: fecha/hora cuando se cambia a `RECEPCIONADO` (nullable).
  - `total`: `NUMERIC(14,2)` nullable. Se persiste al registrar recepción para reimpresión y para recalcular el `PRECIO` unitario del Excel sin depender del input en UI.
  - Relaciones: `proveedor_id -> proveedores.id` y `sucursal_id -> sucursales.id`.

- Items: tabla física `pedidos_historial_mercaderia` (Prisma: `PedidoHistoriaItem`)
  - `pedido_historia_id -> pedidos_historia.id` (FK, `onDelete: CASCADE`).
  - `cod_tienda`: identificador del producto en la tabla `precios_tienda` (se guarda como texto).
  - Cantidades:
    - `cant_pedida`: snapshot inicial (cargado al generar).
    - `cant_recibida`: nullable; al generar el snapshot queda **sin valor** (`NULL`) hasta la recepción. En UI se edita con OK/Editar/Cesto; el “cesto” persiste `cant_recibida = 0`.

Constraint:
- `UNIQUE (pedido_historia_id, cod_tienda)` para evitar duplicados de producto dentro de un mismo pedido.
- Índices: además de `(sucursal_id, generado_at)` y `(proveedor_id, generado_at)`, se agrega índice sobre `generado_at` para listar por fecha con buen rendimiento.

**Retención automática (sin triggers ni cron)**  
- Regla: se eliminan filas de `pedidos_historia` cuyo `generado_at` es **anterior a 1 mes** (mes calendario vía `Date.setMonth` en el servidor, constante `MESES_RETENCION_PEDIDOS_HISTORIA` en `pedidosHistoria.service.ts`).  
- Las filas de `pedidos_historial_mercaderia` asociadas se borran por **FK `ON DELETE CASCADE`**; no hace falta borrar la tabla de ítems por separado.  
- La purga se ejecuta **al inicio de cada mutación** del historial en `pedidosHistoria.service.ts` (`crearPedidoHistoriaSnapshot`, `agregarPedidoHistoriaItem`, `actualizarPedidoHistoriaItemCantRecibida`, `marcarPedidoHistoriaRegistrado`, `reabrirPedidoHistoriaRecepcion`, `eliminarPedidoHistoria`). **No** corre en lecturas (`listar`, `getDetalle`, PDF): si no hay escrituras durante mucho tiempo, el dato antiguo permanece hasta la próxima escritura.

#### `generarPdfEnviarPedidoAction` — ítems vacíos

- Si **`getItemsYProveedorParaEnviar`** devuelve **0 ítems** para la combinación proveedor + sucursal + tipos, la Action responde **`{ ok: false, error: "No hay ítems para generar el pedido con la selección indicada." }`** **antes** de crear historial o borrar filas URGENTE/TINTOMÉTRICO (evita PDF vacío y borrados masivos indebidos).
- La misma llamada devuelve **`rows`** (filas crudas de `pedidos_mercaderia`) e **`items`** (forma PDF). El chequeo de sobrestock usa las filas **`REPOSICIÓN`** de `rows` pasadas a **`getSobreStockReposicionItems({ pedidoReposicionRows })`** para no desalinear una segunda consulta; `id_proveedor` en la query de envío va siempre **`.trim()`**.
- Tras éxito, **`revalidatePath`** incluye también **`/pedidos/reposicion`**.

#### `comprobarItemsParaGenerarPedidoAction`

- **Uso**: modal **Generar Pedido** (debounce en cliente ~320 ms) para saber si hay ítems antes de habilitar el botón.
- **Entrada** (Zod): `proveedorId`, `sucursal` (`guaymallen` \| `maipu`), `tipos` (array no vacío de `URGENTE` \| `TINTOMETRICO` \| `REPOSICION`).
- **Salida**: `ActionResult<{ hayItems: boolean }>` — reutiliza **`getEnviarPedidoTablaData`** con los tres datos completos (misma selección que vería la tabla de `/pedidos/enviar` si esos filtros estuvieran en la URL).

#### `getSobreStockReposicionParaModalAction` (modal sobrestock - reposición)

- **Uso**: action server-side para alimentar un modal/alerta en el flujo de **Generar Pedido** cuando la UI incluye **REPOSICION**.
- **Entrada (Zod)**: `proveedorId`, `sucursal` (`guaymallen` \| `maipu`), `tipos` (array no vacío de `URGENTE` \| `TINTOMETRICO` \| `REPOSICION`).
- **Salida**: `ActionResult<{ tieneSobreStock: boolean; items: SobreStockReposicionItem[] }>` donde cada ítem incluye:
  - `codExt`, `cantPedir` (línea de la sucursal que **genera** el pedido; solo `cant_pedir > 0`).
  - `stockSucursal` y `topeReposicion`: medidos en la sucursal indicada por `sucursalCodigoSobrestock` (desde `precios_tienda` + `reposicion_cant_conf` de la fila `ItemPedidoEnvio` **de esa sucursal** para el mismo proveedor y `cod_ext`).
  - `origenDeteccion`: `LOCAL` (excedente en la sucursal que pide) u `OTRA_SUCURSAL` (excedente en la otra tienda → aviso de posible **transferencia interna**).
  - **Reglas numéricas** (mismas para local y otra sucursal): ver `getSobreStockReposicionItems` en `sobreStock.service.ts` (`evaluarSobrestockEnValores`).
  - **Otra sucursal**: se buscan filas `REPOSICION` por `cod_ext` en la otra tienda **sin** filtrar por `id_proveedor` (mismo producto puede tener otro proveedor en la otra sucursal); tope con prioridad mismo proveedor → fila con tope &gt; 0 → primera fila; si no hay filas en la otra sucursal pero el pedido tiene tope, se usa ese tope como referencia frente al stock de la otra tienda.
- **Regla**: si `tipos` NO incluye `REPOSICION`, devuelve `{ tieneSobreStock: false, items: [] }` para evitar trabajo innecesario.

#### `generarPdfEnviarPedidoAction` (sobrestock en reposición, obligatorio)

- **Param opcional**: `confirmarSobreStock?: boolean` (default false).
- **Regla** (antes de `crearPedidoHistoriaSnapshot` y de cualquier persistencia de historial):
  - Si `tipos` incluye `REPOSICION` y `getSobreStockReposicionItems` devuelve al menos un ítem, y `confirmarSobreStock` es false, la Action responde `{ ok: false, error: "SOBRESTOCK_REQUIERE_CONFIRMACION:{cantidad}" }`.
  - Con `confirmarSobreStock === true`, se omite ese bloqueo y continúa el flujo normal (snapshot + PDF/WhatsApp + borrado de URGENTE/TINTOMETRICO). La UI debe mostrar el modal y reintentar solo con confirmación explícita del usuario.

#### Tabla `/pedidos/enviar` — `getItemsTablaEnviarPedido` / `getEnviarPedidoTablaData`

- **`getItemsTablaEnviarPedido`** (`pedidosEnvio.service.ts`): ítems `pedidos_mercaderia` con **`cant_pedir > 0`**. Filtros opcionales: código de sucursal, `id` proveedor, lista de tipos, texto `q` (descripción tienda/proveedor). Sin ningún filtro → todas las filas elegibles.
- **`getEnviarPedidoTablaData`**: delega en **`getItemsTablaEnviarPedido`** pasando lo que venga de la URL (vacío = sin acotar).

#### Pedido Urgente — listado

- **`getPedidoUrgenteData`**: con **sucursal** válida ya se llama a **`getListaPreciosParaPedidoUrgente`**; proveedor y `q` (≥ 3 caracteres) son opcionales para filtrar.

### 2.6 Servicio `pedidosHistoria.service.ts`

Contratos de funciones (SSOT de lógica y acceso a Prisma) para mantener consistencia e integridad:

1. `listarPedidosHistoria({ pagina, estado?, proveedorId?, sucursalCodigo?, q? })`
   - Uso: obtener página de cabeceras para el módulo de historial (`/pedidos/historial`).
  - `estado`: `SIN RECEPCION`, `RECEPCIONADO` o `ALL`. La UI por defecto envía/equivale a `SIN RECEPCION` si no hay parámetro en la URL.
   - Con `q` no vacío: solo pedidos que tengan al menos un ítem cuyo `cod_tienda` figure en `precios_tienda` con descripción que contenga todas las palabras de `q` (insensible a mayúsculas).
   - Devuelve: `items` con `id`, `generadoAt`, `proveedorNombre`, `sucursalNombre`, `estado`, `registradoAt`, más `total`, `totalPaginas` y `paginaActual`.

2. `crearPedidoHistoriaSnapshot({ proveedorId, sucursalCodigo, tipos })`
   - Uso: llamada desde `generarPdfEnviarPedidoAction` para crear cabecera + items del snapshot justo antes de limpiar `pedidos_mercaderia` (cuando corresponda).
   - Crea `PedidoHistoria` con `estado = "SIN RECEPCION"`.
   - Lee `ItemPedidoEnvio` filtrando por `idProveedor`, `sucursalId`, `tipoPedido IN tipos` y `cant_pedir > 0`.
   - Inserta `PedidoHistoriaItem` consolidando por `cod_tienda` (para respetar UNIQUE por `cod_tienda`).
   - Inserta cada ítem con `cant_recibida = NULL` hasta que en recepción se guarde la cantidad recibida.

3. `getPedidoHistoriaDetalle({ pedidoHistoriaId })`
   - Devuelve cabecera + lista de items ordenados por `codTienda`.
   - Incluye `generado_at`, `registrado_at`, `cant_pedida`, `cant_recibida` y `descripcionTienda` (resuelta desde `precios_tienda`) para renderizar la columna DESCRIPCIÓN en UI.

3b. `getPedidoHistoriaPdfPayload({ pedidoHistoriaId })`
   - Arma `ItemPedidoParaPdf[]` para **`generarPdfPedido`**: cantidades y `cod_tienda` desde ítems del snapshot; `cod_prod_proveedor` y descripción desde **`precios_proveedores`** (mismo proveedor) con fila de **`precios_tienda`** cuyo `cod_tienda` coincide (primer `cod_ext` estable). Action **`descargarPdfPedidoHistoriaAction`** devuelve `pdfBase64` + `filename` (prefijo proveedor y fecha/hora de `generado_at`).

4. `agregarPedidoHistoriaItem({ pedidoHistoriaId, codTienda, cantRecibida })`
   - Reglas:
     - Solo permitido si el pedido está en estado `"SIN RECEPCION"`.
     - Respeta UNIQUE(`pedido_historia_id`, `cod_tienda`): si el item ya existe devuelve error.
   - Inicializa `cant_pedida = cant_recibida = cantRecibida` (asumiendo igualdad para filas agregadas).

5. `actualizarPedidoHistoriaItemCantRecibida({ pedidoHistoriaItemId, cantRecibida })`
   - Reglas:
     - Solo permitido si el pedido asociado está en estado `"SIN RECEPCION"`.
     - Actualiza únicamente `cant_recibida` (sin tocar `cant_pedida`).

6. `marcarPedidoHistoriaRegistrado({ pedidoHistoriaId })`
  - Transición: setea `estado = "RECEPCIONADO"` y `registrado_at` cuando el paso de export/registro en DUX termina OK.

6b. `reabrirPedidoHistoriaRecepcion({ pedidoHistoriaId })`
   - Uso: habilitar corrección de recepción desde UI cuando el pedido ya está `RECEPCIONADO`.
   - Transición: setea `estado = "SIN RECEPCION"` y limpia `registrado_at = NULL`.
   - Idempotente: si ya está en `SIN RECEPCION`, responde éxito sin cambios.

7. `eliminarPedidoHistoria({ pedidoHistoriaId })`
   - Borra la fila `PedidoHistoria`; los `PedidoHistoriaItem` se eliminan en cascada (`onDelete: Cascade`).

8. **Purge por antigüedad** (interno, no exportado): `purgarPedidosHistoriaExpirados` — antes de las mutaciones anteriores elimina cabeceras con `generado_at` &lt; 1 mes; ítems en cascada. Ver bloque “Retención automática” en §2.5.

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

### 2.8 Servicio `duxCompras.service.ts` (DUX compras / comprobante)

Objetivo: resolver el “próximo comprobante” para la integración con DUX vía la API REST `WSERP/.../compras`.

Contrato (SSOT de lógica de negocio + integración externa):

1. `getSiguienteComprobanteDuxCompra({ fechaDesde, fechaHasta, idEmpresa })`
   - Entrada (validada con Zod):
     - `fechaDesde`: `string` formato `DD/MM/YYYY`
     - `fechaHasta`: `string` formato `DD/MM/YYYY`
     - `idEmpresa`: `number` entero positivo
   - Proceso:
     - Lee de DB las sucursales y resuelve `sucursales.id_dux` (columna `sucursales.idDux` en Prisma).
     - Para cada sucursal válida (id_dux numérico), llama a DUX `compras` **en serie** (no en paralelo) con:
       - `fechaDesde`, `fechaHasta`, `idEmpresa`, `idSucursal=<id_dux>` y `limit=1`.
     - Entre cada petición a `/compras` y la siguiente espera **al menos 5 s** (DUX responde `429` si se supera la frecuencia). Intervalo configurable con `DUX_COMPRAS_MIN_INTERVAL_MS` (ms; por defecto `5000`; `0` desactiva la espera solo para entornos de prueba).
     - Si tras recorrer sucursales no hay comprobantes válidos y se usa el fallback sin `idSucursal`, también espera ese intervalo **después** de la última consulta por sucursal.
     - Del set resultante toma el mayor `comprobante` numérico y calcula `siguienteComprobante = maxComprobante + 1` usando `BigInt`.
   - Salida:
     - `{ ultimoComprobante: string, siguienteComprobante: string, totalImporte: number, fechaComp? }`
   - Errores:
     - Si DUX no devuelve resultados o el comprobante no es numérico, lanza error en la service y la Action lo transforma a `ActionResult`.

Acceso desde UI/cliente:
- La `server action` `src/actions/duxCompras.ts#getSiguienteComprobanteDuxCompraAction` exige `esEditor()` y valida parámetros con el mismo esquema Zod.

---

### 2.9 Servicio `exportRecepcionPedidoExcel.service.ts` (Excel recepción 97-2003)

Objetivo: construir el payload (filas + filename) del Excel 97-2003 con formato DUX para una recepción de pedido.

Contrato (SSOT de integración + armado de filas):

1. `getExportRecepcionPedidoExcelPayload({ pedidoHistoriaId, fechaFacturaIso, idEmpresaCompras? })`
   - Entrada:
     - `pedidoHistoriaId`: `cuid()` del snapshot en `pedidos_historia`
     - `fechaFacturaIso`: `YYYY-MM-DD` (FECHA DE FACTURA desde el modal)
     - `idEmpresaCompras`: opcional; si no se pasa, se toma de `process.env.DUX_ID_EMPRESA_COMPRAS` o fallback `2482`.
   - Proceso:
     - Lee desde DB:
       - `pedidos_historia.proveedor.id_proveedor_dux` => columna `ID PROVEEDOR`
      - `pedidos_historia.sucursal.deposito` => columna `DEPOSITO`
       - `pedidos_historial_mercaderia.cod_tienda` y `cant_recibida` => `CÓDIGO PRODUCTO` y `CANTIDAD`
      - En el Excel, columnas `FECHA` y `FECHA IMPUTACION CONTABLE` se exportan en formato `DD-MM-AAAA`.
     - Filtra ítems con `cant_recibida != null`.
    - Consulta DUX `compras` para obtener el `siguienteComprobante` (ultimo + 1) y `totalImporte`.
    - Para recepción de pedido, calcula `PRECIO` con: `totalPedidoIngreso / sum(cant_recibida)` usando el monto del input **TOTAL PEDIDO** del modal.
    - Si no se recibe `totalPedidoIngreso`, usa fallback en este orden:
      1) `pedidos_historia.total` persistido al registrar recepción;
      2) `totalImporte` devuelto por DUX `/compras`.
   - Salida:
     - `{ sheetName, filename, rows }` donde `rows` ya tiene las claves/cabeceras exactas del Excel.

Notas:
- Este servicio prepara el payload; la generación binaria del `.xls` vive en la Action `src/actions/exportRecepcionPedidoExcel.ts` (usa `xlsx` con `bookType: "xls"`).
- Requiere la columna `sucursales.deposito` (TEXT), agregada en la migración `20260323090000_add_sucursales_deposito_column`.

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
| `@/lib/validations/importar.ts` | `importarProductosSchema`, `importarListaPreciosProveedorSchema`, mapeos de columnas CSV (índices numéricos como string, límites de filas/celdas). |
| `@/lib/validations/common.ts` | `uuidSchema`, `uuidsSchema`, `prismaCuidSchema`, `paramsPaginaSchema`. |
| `@/lib/validations/proveedores.ts` | `proveedoresPageParamsSchema` (query de página proveedores). |
| `@/lib/validations/pedidosLectura.ts` | `getPedidoUrgenteDataParamsSchema`, `getEnviarPedidoTablaParamsSchema`. |
| `@/lib/validations/reposicion.ts` | `sucursalReposicionSchema`, `getReposicionParamsSchema`, `productosReposicionSelectorSchema`. |
| `@/lib/validations/stock.ts` | `getControlStockParamsSchema`. |
| `@/lib/validations/tienda.ts` | `getTiendaPageParamsSchema`. |

Al extender tipos de dominio, preferir `src/types/*.ts`; para tipos ligados a validación, usar `z.infer<typeof schema>` en `src/lib/validations/*.ts`.

---

## 4. Checklist de autocorrección (para IAs)

Antes de entregar código nuevo o modificado, verificar:

- [ ] **Sesión/rol**: ¿Toda Action que modifica datos comprueba `esEditor()` o `getRol()` + `puede()` al inicio? ¿Las lecturas expuestas como Action comprueban `puede()` (incl. listas con precios, vínculos, proveedores)? ¿Las mutaciones sensibles en módulos con acceso compartido simple/editor exigen `esEditor()` además de `puede()`?
- [ ] **Zod**: ¿Todo payload de entrada (IDs, FormData, objetos, **y parámetros de lectura** con `q`/paginación/filtros) se valida con un esquema Zod antes de usarse en BD o servicios?
- [ ] **IDs**: ¿Los UUID y los `cuid` se validan con el esquema correcto (`uuidSchema` vs `prismaCuidSchema`) según el modelo Prisma?
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
- **listaPrecios.ts**: `getRol()` + `puede()` para edición masiva y para **lecturas** (`importarLista`); Zod en payload masivo y en filtros de lectura.
- **comparacionCategorias.ts**: `getRol()` + `puede()` en todas las Actions; Zod unificado vía `@/lib/validations/comparacionCategorias` y búsqueda de productos a asignar.

### 5.2 Estado tras auditoría de seguridad (2026-03)

- **`tienda.ts`**: `getTiendaPageData`, `getUltimoSync` y `getControlAumentos` comprueban `getRol()` + `puede()` (`PERMISOS.tienda.acceso` / `controlAumentos`). `convertirEnProveedor` valida IDs con Zod antes de Prisma.
- **`importar.ts`**: `puede(rol, PERMISOS.importar.acceso)` + `esEditor()`; payloads validados con `@/lib/validations/importar.ts` (`safeParse`).
- **`pedidosHistoria.ts`**: Lecturas y mutaciones (cantidades, agregar ítem, registrar en DUX, borrar) habilitadas para cualquier rol con `puede(rol, PERMISOS.pedidos.acceso)`.
- **`pedidos.ts`**: `generarPdfEnviarPedidoAction` y `syncPedidoUrgenteEnvioAction` usan esquemas Zod dedicados; permisos de pedidos al inicio.
- **`sesion.ts`**: `activarModoEditor` valida la clave con Zod.
- **`tintometrico.ts` / `productosTienda.ts`**: Límites en `q` y `take` para reducir abuso.
- **Pendientes de evolución** (no bloqueantes): mover lógica pesada de `tienda.ts` a servicios; revisar periódicamente nuevas Actions sin duplicar patrones anteriores (ver §5.8 y §1.2).

### 5.3 Reglas añadidas en esta guía

- Validar con Zod **todos** los payloads que afecten a la BD.
- Acción de sincronización DUX protegida por rol.
- Estandarizar respuestas de error: no `throw`, sí `ActionResult` con `error`.
- Documentar uso de `getRol()` + `puede()` para permisos granulares.
- PDF “Generar Pedido”: usar `src/lib/generarPdfPedido.ts` como SSOT para el layout. El PDF debe titular “Nota de Pedido”, incluir “Fecha” con formato `dddd de mmmm de aaaa` y una tabla con columnas `CANT.`, `COD.` y `DESCRIPCION` en ese orden; las filas van **ordenadas alfabéticamente** por el texto de **DESCRIPCION** (`localeCompare` `es`, `sensitivity: "base"`). Los datos deben venir de `cant_pedir`, `cod_proveedor` (vacío si no existe) y `descripcion_proveedor` priorizando `descripcion_proveedor`, luego `tintometrico_descripcion` (y como fallback `descripcion_tienda`. El archivo exportado debe llamarse `Nota Pedido - {Prefijo Proveedor} - dd/mm hh:mm.pdf`. Opción **`fechaDocumento`** en `generarPdfPedido`: al **volver a descargar** desde historial (`descargarPdfPedidoHistoriaAction`) usar `generado_at` del snapshot para encabezado y nombre de archivo, no la fecha actual.
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
| `src/app/api/sync-lista-precios-tienda/route.ts` | `GET` y `POST` validan `puede(rol, PERMISOS.tienda.acciones.sincronizar)` (simple y editor); evitan doble ejecución y persisten progreso/resultado vía helper. |
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

*Última actualización: 2026-03-25 — DUX `/compras`: `getSiguienteComprobanteDuxCompra` serializa llamadas y espera ≥5 s entre peticiones (`DUX_COMPRAS_MIN_INTERVAL_MS`) para evitar 429. Histórico: sync DUX rol `simple`; auditoría Server Actions 2026-03-23.*

---

### 5.7 Auditoría de seguridad — tabla de cambios (2026-03)

| Área | Cambio |
|------|--------|
| `src/actions/tienda.ts` | `getTiendaPageData`, `getUltimoSync`, `getControlAumentos`: `getRol` + `puede`. `convertirEnProveedor`: Zod `prismaIdParamSchema`. |
| `src/actions/importar.ts` | `puede(importar)` + `esEditor` + `importarProductosSchema` / `importarListaPreciosProveedorSchema`. |
| `src/lib/validations/importar.ts` | Esquemas de mapeo y límites de filas/celdas. |
| `src/actions/pedidosHistoria.ts` | Mutaciones con `esEditor()`; listado: `proveedorId` normalizado con Zod. |
| `src/actions/pedidos.ts` | `generarPdfEnviarPedidoSchema`, `syncPedidoUrgenteEnvioSchema`. |
| `src/actions/sesion.ts` | `activarModoEditorSchema` (Zod). |
| `src/actions/tintometrico.ts`, `productosTienda.ts` | Límites `q` / `take`. |
| `HistorialPedidosPageClient` + `historial/page.tsx` | Prop `esEditor` para ocultar acciones no permitidas al rol simple. |

### 5.8 Auditoría de seguridad — cierre 2026-03-23 (Server Actions + API sync)

| Área | Cambio |
|------|--------|
| `src/actions/listaPrecios.ts` | Lecturas: `puede(rol, PERMISOS.listaPrecios.acciones.importarLista)` + `listaPreciosFiltrosLecturaSchema` / opciones estrictas. |
| `src/lib/validations/listaPrecios.ts` | `listaPreciosOpcionesFiltroSchema`, `listaPreciosFiltrosLecturaSchema`. |
| `src/actions/proveedores.ts` | `getProveedores` / `getProveedoresPageData`: permiso compuesto (sugeridos \| lista \| importar lista); `editarProveedor` / `eliminarProveedor`: `prismaCuidSchema`; eliminación vía servicio. |
| `src/lib/validations/proveedores.ts` | `proveedoresPageParamsSchema`. |
| `src/services/proveedor.service.ts` | `deleteProveedor` con `ServiceResult` y errores FK. |
| `src/lib/validations/common.ts` | `prismaCuidSchema`. |
| `src/actions/vinculos.ts` | `getVinculos` / `listarProductosParaVincular`: `PERMISOS.tienda.acceso` + Zod. |
| `src/actions/syncListaPrecioTienda.ts` | `PERMISOS.tienda.acciones.sincronizar` (simple + editor desde 2026-03-25). |
| `src/app/api/sync-lista-precios-tienda/route.ts` | Misma comprobación que la Action. |
| `src/actions/tienda.ts` | `getTiendaPageData`: `getTiendaPageParamsSchema`; `convertirEnProveedor`: también `puede(tienda.acceso)`. |
| `src/lib/validations/tienda.ts` | `getTiendaPageParamsSchema`. |
| `src/actions/reposicion.ts` | Zod sucursal/params selector; `upsertReglaReposicion`: `idProveedor` con `prismaCuidSchema` y `codTienda` como clave de entrada. |
| `src/services/pedidosEnvio.service.ts` | Reposición: `upsertPedidoMercaderiaReposicionConfig` recibe `codTienda`, resuelve `codExt` desde `precios_tienda` y recién allí vincula con `precios_proveedores` por (`idProveedor`, `codExt`). |
| `src/lib/validations/reposicion.ts` | Esquemas de lectura reposición. |
| `src/actions/pedidos.ts` | `getPedidoUrgenteData` / `getEnviarPedidoTablaData`: `pedidosLectura` Zod. |
| `src/lib/validations/pedidosLectura.ts` | Nuevo. |
| `src/actions/stock.ts` | `getControlStock`: Zod params + validación sucursal. |
| `src/lib/validations/stock.ts` | Nuevo. |
| `src/actions/comparacionCategorias.ts` | `buscarProductosParaAsignarAction`: Zod en `proveedorId` / `q`. |
| `src/lib/validations/productos.ts` | `aplicarCampoMasivoSchema.proveedorId` → `cuid`; `editarProductoSchema.id` → string acotado (mock). |
