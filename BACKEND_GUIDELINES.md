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
- **Escrituras con dos niveles**: Si el módulo da **acceso de lectura** a `simple` y `editor` (`PERMISOS.*.acceso` con ambos `true`) pero la operación es **crítica** (p. ej. borrado o registro en sistemas externos), exigir además **`esEditor()`** tras el chequeo de `puede(rol, PERMISOS.*)`. Excepción documentada: en **historial de pedidos**, tanto **recepción** (guardar/corregir/marcar/reabrir/agregar ítems) como **eliminación de pedidos** están habilitadas para `simple` y `editor`.
- **Importar** (`PERMISOS.importar.acceso`, solo editor en la matriz actual): comprobar **`puede(rol, PERMISOS.importar.acceso)`** y **`esEditor()`**, más validación Zod del payload (`@/lib/validations/importar.ts`).
- **Helpers**: `esEditor()` para “solo editor”; para permisos granulares usar `getRol()` y `puede(rol, PERMISOS.modulo.accion)` desde `@/lib/permisos`.
- **IDs de Prisma**: Los modelos usan **`cuid`** (no UUID) salvo tablas explícitas con `@default(uuid())` (p. ej. `ListaPrecioTienda`, `ListaPrecioProveedor`, `ProdPedMerc2`). Validar con `prismaCuidSchema` (`@/lib/validations/common`), `uuidSchema` o `z.string().min(1).max(128)` según el modelo; **no** mezclar `.uuid()` en IDs que sean `cuid`.
- **Lecturas con datos sensibles** (precios, vínculos, catálogos):
  - **Lista de precios** (`getListaPreciosFiltradaAction`, `getListaPreciosConOpcionesAction`): `getRol()` + `puede(rol, PERMISOS.listaPrecios.acciones.importarLista)`; entrada validada con `listaPreciosFiltrosLecturaSchema` (`@/lib/validations/listaPrecios`) — límites de longitud y `opciones` **estrictas** (`listaPreciosOpcionesFiltroSchema`). En `getListaPreciosConTiendaFiltrada`, mapear siempre `px_vta_sugerido` a `pxVtaSugerido`; `opciones.soloPxSugerido` solo filtra filas (no controla si el campo se expone).
  - **Catálogo de proveedores** (`getProveedores`, `getProveedoresPageData`, `getProveedoresMercaderia`, `getProveedoresNoMercaderia`): `getRol()` + al menos uno de `PERMISOS.proveedores.sugeridos`, `PERMISOS.proveedores.lista` o `PERMISOS.listaPrecios.acciones.importarLista`; parámetros de página con `proveedoresPageParamsSchema`. `getProveedoresMercaderia` devuelve solo filas con `proveedor_mercaderia = true` y `getProveedoresNoMercaderia` su complemento (`= false`). Ambos reutilizan el índice `global_proveedores_proveedor_mercaderia_idx` (ver §1.11c).
  - **Vínculos tienda** (`getVinculos`, `listarProductosParaVincular` en `vinculos.ts`): `getRol()` + `puede(rol, PERMISOS.tienda.acceso)`; IDs de ítem tienda con `uuidSchema`; filtros de búsqueda acotados con Zod en la Action.
  - **Sincronización DUX lista tienda** (`sincronizarListaPrecioTiendaDux` y `GET`/`POST` de `/api/sync-lista-precios-tienda`): `getRol()` + `puede(rol, PERMISOS.tienda.acciones.sincronizar)`. En la matriz actual **`simple` y `editor`** tienen `sincronizar: true` (slidenav y cualquier cliente autenticado con sesión válida). El `GET` de estado (`/api/sync-lista-precios-tienda/status`) sigue sin chequeo de rol explícito en el route: cualquier sesión que pueda llamar la API ve el mismo progreso global. **Cancelación cooperativa:** `POST /api/sync-lista-precios-tienda/cancel` (mismo permiso) pone `running = false` en `sync_dux_status`; el servicio `syncListaPrecioTiendaFromDux` comprueba el flag entre lotes y aborta con `SyncListaPrecioTiendaCancelledError`. **No** se llama `setSyncDuxSuccessInDb`, por lo tanto **`last_completed_at` no cambia** (la cancelación no cuenta como “Últ. Act.”).
- **Mutaciones sobre `Proveedor`**: validar `id` con `prismaCuidSchema` en editar/eliminar; `eliminarProveedor` delega en `deleteProveedor` del servicio (`ServiceResult`) y maneja restricciones FK (p. ej. historial de pedidos, comprobantes proveedor).
- **`global_proveedores.id_proveedor_dux`**: índice **único** (`global_proveedores_id_proveedor_dux_key`). PostgreSQL permite varios `NULL`; cada valor no nulo debe ser único. Sirve como **FK referenciada** por `fin_compras_comprobante.id_proveedor` (mismo valor DUX; `onDelete: Restrict`): no se puede borrar un proveedor si tiene comprobantes vinculados.
- **Lecturas de listados con filtros** (pedidos urgente/enviar, reposición, stock, tienda): además del permiso de módulo, validar el objeto de parámetros con esquemas dedicados (`@/lib/validations/pedidosLectura`, `reposicion`, `stock`, `tienda`) para acotar `q`, `pagina`, sucursales y arrays (`tipos`).

### 1.2.1 Activación de modo editor (`sesion.ts`)

- Entrada **`clave`**: validar con Zod (`z.string().min(1).max(500)`) antes de comparar con `EDITOR_PASSWORD`. Evita payloads anómalos y documenta el contrato.
- **`volverModoSimple()`**: no exige rol previo; destruye la cookie de sesión (equivale a salir del modo editor). No hay payload que validar con Zod.

### 1.2.2 Checklist de seguridad por Server Action (obligatorio)

Cada función exportada desde `src/actions/*.ts` debe cumplir, en este orden:

1. **Autorización primero**: antes de parsear o tocar servicios, resolver `getRol()` y/o `esEditor()` y aplicar `puede(rol, PERMISOS.*)` según el módulo. Nunca confiar solo en que la página esté protegida en layout: las Actions son invocables directamente.
2. **Payload como `unknown` cuando venga del cliente**: usar `.safeParse()` de Zod; mensajes de error genéricos o el primer error de `flatten()` hacia `ActionResult`.
3. **IDs de Prisma**: `cuid` → `prismaCuidSchema`; UUID → `uuidSchema` o esquemas en `@/lib/validations/*`; no aceptar strings arbitrarios largos donde el modelo sea CUID.
4. **Delegación**: mutaciones y lecturas complejas en `src/services/`; la Action solo orquesta, revalida rutas y devuelve `ActionResult` / tipos acordados.
5. **Sin fugas en errores**: no exponer stack traces ni SQL al cliente; `{ ok: false, error: string }` controlado.

### 1.2.3 Gate doble: módulo + editor (mutaciones críticas)

- **Historial de pedidos — mutaciones** (`pedidosHistoria.ts`): con `puede(rol, PERMISOS.pedidos.acceso)` se habilitan para `simple` y `editor`: actualizar cantidad recibida, agregar ítem, marcar registrado, guardar recepción, reabrir recepción y eliminar cabecera. Lecturas/detalle/PDF conservan el mismo permiso `pedidos.acceso`.
- **Integraciones DUX / compras** (`comprobantesProveedor.ts`, `duxCompras.ts`): `puede(rol, PERMISOS.finanzas.acceso)` **y** `esEditor()` antes de llamar APIs externas o sync masivo (misma sensibilidad que otras escrituras financieras).
- **Catálogos finanzas balance** (`finBalGastosCatalogo.ts`, etc.): ya documentado — `finanzas.acceso` + `esEditor()` en mutaciones de catálogo maestro.

### 1.2.4 Acciones mock o legacy (`productos.ts`)

- `editarProducto` / `aplicarCampoMasivo`: permiso alineado a lista de precios — `puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)` (matriz actual: solo `editor`). Evita usar solo `esEditor()` sin anclar al permiso de producto del módulo.

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
- **URLs canónicas área Gestión De Productos (2026-03):** la navegación pública usa prefijo `/gestion-productos/...` (área/módulo/submódulo). Si una mutación impacta vistas de esa área, revalidar al menos la ruta canónica correspondiente. Se permiten revalidaciones adicionales sobre rutas legacy (`/proveedores`, `/tienda`, `/stock`, `/pedidos/*`) mientras existan redirects/rewrites de compatibilidad.

- **Prisma / Neon**: `DATABASE_URL` en `.env` debe usar el **pooler** de Neon para el runtime (`src/lib/prisma.ts`). Para migraciones, definir además **`DIRECT_URL`** (host **sin** `-pooler`): `prisma.config.ts` usa `DIRECT_URL` si existe; si no, cae a `DATABASE_URL`. Plantilla: `.env.example`.
- **Migraciones ítems historial pedidos**: `20260322120000_*` y `20260322140000_*` son **idempotentes** (`to_regclass`) respecto de `prod_ped_historial_items` / `prod_ped_merc_historial`. `20260322200000_*` renombra `prod_ped_merc_historial` → `prod_ped_historial_merc` si aún existe el nombre intermedio.

### 1.4.1 `stockeable` en `prod_precios_tienda` (API DUX ítems)

- **Columna** `prod_precios_tienda.stockeable` (`BOOLEAN NOT NULL`; migración `20260413120000_add_stockeable_prod_precios_tienda`: default `true` en filas existentes hasta la próxima sync).
- **Regla DUX**: En `src/lib/duxApi.ts`, `ItemDux.stockeable` se calcula **exclusivamente** con `ctd_disponible` por depósito. Debe existir la entrada de **Guaymallén** (`ID_STOCK_GUAYMALLEN`) y **Maipú** (`ID_STOCK_MAIPU`) y en **ambas** `ctd_disponible` debe ser **no nulo** (un `0` numérico o string numérico cuenta como informado). Si **cualquier** sucursal tiene `ctd_disponible` JSON `null` o falta la fila del depósito, `stockeable` es `false`. Los enteros `stock_maipu` / `stock_guaymallen` siguen tomándose de `stock_real` como hasta ahora.
- **Sync**: `syncListaPrecioTienda.service.ts` incluye `stockeable` en create/update del upsert. Desde 2026-05, el upsert de `prod_precios_tienda` se resuelve por **`cod_tienda`** (clave de negocio estable), no por `cod_ext` (dato mutable por cambios de proveedor). El bloque **`update` del upsert debe incluir `cod_ext`** igual que el `create`; si falta, DUX actualiza proveedor pero no el código externo.
- **Uso en negocio**: `getControlStock` restringe a `stockeable: true`; `getSobreStockOtraSucursalParaPedidoEnviar` no evalúa sobrestock para ítems con `stockeable: false`; `upsertPedidoMercaderiaReposicionConfig` rechaza configurar reposición por stock si el ítem no es stockeable. `getTiendaPageData` expone `stockeable` en `ItemTiendaParaTabla`.

### 1.6 Listados de solo lectura (catálogos)

- Para catálogos de solo lectura (ej. `prod_precios_tienda`), exponer búsquedas mediante:
  - **Servicio** (consulta Prisma) + **Action** con sesión/rol + Zod + `ActionResult`.
- Ejemplo aplicado: `buscarBasesTintometricasAction` (módulo Pedido Tintométrico) consulta `prod_precios_tienda` filtrando por `rubro = "Tintometrico"` y búsqueda por descripción/códigos.

### 1.7 Filtros de búsqueda por texto (lecturas)

- Cuando se agrega un filtro de texto (ej. `q`) en un listado de lectura:
  - **Normalizar**: `q?.trim()` y tratar vacío como `undefined`.
  - **Prisma**: usar `contains` con `mode: "insensitive"` y `OR` entre campos relevantes (p. ej. `descripcionTienda` / `descripcionProveedor`).
  - **Ubicación**: la lógica del `where` vive en `src/services/` y la Action solo pasa `q` normalizada.
- **Historial de pedidos** (`listarPedidosHistoria`): `q` opcional; se parte en palabras (máx. 10, texto máx. 200 caracteres); cada palabra debe aparecer en `descripcion_tienda` de **`prod_precios_tienda`** (`AND`); los `cod_tienda` distintos obtenidos filtran cabeceras con `items: { some: { codTienda: { in } } }` (misma fuente de descripción que `getPedidoHistoriaDetalle`). **`estado`**: `PENDIENTE` \| `RECEPCIONADO` \| **`ALL`** (sin filtrar por estado). La página `/pedidos/historial` **sin** query `estado` aplica por defecto filtro **`PENDIENTE`**. Compatibilidad legacy: se acepta `SIN RECEPCION` y se normaliza a `PENDIENTE`. Zod en `listarPedidosHistoriaAction`: `estado` incluye `ALL`; `q` con `.max(200).optional()`.

### 1.8 Fuente de costo final (`px_compra_final`)

- En listados/exportaciones donde el "costo" represente el valor final calculado para el proveedor (ej. **Control Aumentos**), usar como fuente **`px_compra_final`** de `prod_precios_provee` (campo `pxCompraFinal` en Prisma).
- Evitar exportar un costo derivado de la tabla de tienda (`costo_compra`/`costoTienda`) si existe una columna final calculada en `prod_precios_provee`.
- **Control Aumentos (Excel)**: el archivo de exportación se limita a las columnas **`CODIGO`** y **`COSTO`**; no incluir columnas auxiliares (por ejemplo proveedor o código externo) mientras no exista un nuevo requerimiento funcional.

### 1.9 Campos calculados de “Tabla Tienda” (prefijos/dif por mejor proveedor)

- En `getTiendaPageData` (listado “Comp. Proveedores”), cuando hay mejora por un proveedor **no-oficial**:
  - el “mejor proveedor” se define por el menor `px_compra_final` entre proveedores no-oficiales **con `habilitado = true`** en `prod_precios_provee`;
  - el “DIF.” se calcula como porcentaje entero de mejora vs `costo_compra` y se setea en `difMejorPrecioPctEntero` (ej. `-12%` en UI, renderizado como reducción);
  - si no existe proveedor que mejore el costo, los campos se devuelven como `null` para que la UI renderice vacío.

### 1.10 Margen sin IVA (Comp. Proveedores, `/tienda`)

- La columna **MARGEN S/ IVA** en la tabla usa `px_lista_tienda` → `precioLista` y `costo_compra` → `costo` en `ItemTiendaParaTabla`; el cálculo vive en `calcMargenSinIvaPct` (`src/lib/calculos.ts`): \(((pxLista/(1+\mathrm{IVA}/100))/\mathrm{costo})-1)\times 100\). El IVA por ítem viene de `porcIva` (hoy 21 en el mapeo de `getTiendaPageData`). No requiere campos nuevos en la Action: es derivado en el cliente.

### 1.11 Coeficiente Tintométrico por proveedor

- Persistencia en `global_proveedores.coeficiente_tintometrico` (`NUMERIC(12,6)`, `NOT NULL`, default `1`).
- Objetivo: centralizar la fórmula por proveedor para cálculos de tintométrico (p. ej. `montoIngresado * coeficienteTintometrico`).
- Alta/edición de proveedor: validar entrada con Zod (`coeficienteTintometrico > 0`, hasta 6 decimales) y persistir en `createProveedor` / `updateProveedor`.
- Lecturas de proveedores que alimentan cálculos (ej. `/tienda/tintometrico`) deben incluir el coeficiente en el payload.
- Tipos de pintura para rendimientos (`prod_rendimientos.tipo_pintura`, antes `tipos_pintura_rendimientos`): normalizar y persistir en MAYÚSCULAS desde la Action de alta/edición para mantener consistencia de filtros y catálogos.
- Edición masiva (modal en `Control Stock`):
  - Action `actualizarCoeficientesTintometricosAction(raw)` en `src/actions/proveedores.ts`.
  - Permisos: solo rol `editor`.
  - Validación: arreglo de `{ id, coeficienteTintometrico }` (`id` CUID válido + `coeficienteTintometrico` numérico finito `> 0`).
  - Servicio `updateCoeficientesTintometricos(items)` en `src/services/proveedor.service.ts` con `prisma.$transaction` para actualizar múltiple `proveedor`.
  - Revalidación de rutas dependientes de coeficiente: `/stock`, `/proveedores`, `/proveedores/lista`, `/proveedores/gestion`, `/tienda/tintometrico`, `/tienda/litros`.

### 1.11b Plazos de pago por proveedor (`plazos_pagos`)

- Persistencia: `global_proveedores.plazos_pagos` (`TEXT`, nullable). Formato canónico separado por comas, p. ej. `30,60,90` — **días** desde la fecha del comprobante de compra hasta cada vencimiento; *N* valores implican *N* cuotas con el total repartido en partes iguales (fechas/montos por cuota pueden calcularse en frontend).
- Valores permitidos por tramo: **30, 60, 90, 120, 150**; si hay varios, deben ir en **orden estrictamente creciente** (ej. `30,60`, no `60,30`).
- Validación Zod: `plazosPagosSchema` en `@/lib/validations/proveedor.ts`; incluido en `createProveedorSchema` / `updateProveedorSchema`. Vacío se guarda como `NULL`.
- Servicio: `createProveedor` / `updateProveedor` en `proveedor.service.ts`; listados `getProveedores` exponen `plazosPagos`.
- SQL manual (Neon): `scripts/neon-plazos-pagos-proveedores.sql`; migración Prisma `20260401120000_add_plazos_pagos_proveedores`.

### 1.11c Flag "Proveedor de Mercadería" (`proveedor_mercaderia`)

- Persistencia: `global_proveedores.proveedor_mercaderia` (`BOOLEAN`, `NOT NULL`, **default DB `false`**). Prisma: `proveedorMercaderia Boolean @default(false) @map("proveedor_mercaderia")`. Índice `global_proveedores_proveedor_mercaderia_idx` sobre la columna para acelerar el filtro.
- Semántica: marca al proveedor como "de mercadería". **Solo los `TRUE`** se listan en `/gestion-productos/proveedores/lista` (ruta legacy `/proveedores/lista`, tabla "Lista Proveedores" del módulo `LISTA PROVEEDORES`). Los `FALSE` siguen siendo proveedores válidos del sistema (aparecen en Px Sugeridos, Lista Px Proveedores, Comp. por Cat., sincronizaciones DUX, pedidos, etc.), pero quedan fuera del tablero de gestión de mercadería.
- Migración `20260418200000_add_proveedores_proveedor_mercaderia`:
  1. `ADD COLUMN "proveedor_mercaderia" BOOLEAN NOT NULL DEFAULT true` — **backfill** de todos los proveedores existentes a `true` (preserva el comportamiento previo: la lista no se vacía).
  2. `ALTER COLUMN "proveedor_mercaderia" SET DEFAULT false` — a partir de la migración los proveedores NUEVOS son **opt-in**: no aparecen en la lista hasta marcarlos explícitamente.
  3. `CREATE INDEX "global_proveedores_proveedor_mercaderia_idx" ON "global_proveedores"("proveedor_mercaderia")` (nombre físico actual; la migración original decía `proveedores`).
- Servicio `src/services/proveedor.service.ts`:
  - `ProveedorListItem.proveedorMercaderia: boolean` (nuevo campo, expuesto en todos los listados de proveedor).
  - `getProveedores()` sigue devolviendo **todos** los proveedores (alimenta múltiples vistas transversales).
  - **`getProveedoresMercaderia()`**: filtra `where: { proveedorMercaderia: true }` y reutiliza la misma lógica de conteos (helper privado `listarProveedoresInterno`).
  - **`getProveedoresNoMercaderia()`**: contraparte simétrica que filtra `where: { proveedorMercaderia: false }`. Alimenta la columna "PROVEEDORES" de `/finanzas/balance/gastos/catalogo`, donde se administra el **catálogo maestro de proveedores "no de mercadería"** (gastos operativos, servicios, impuestos, etc.) — de esta forma los proveedores de mercadería viven solo en su módulo y los de gastos en el suyo, sin mezcla visual.
- Action `src/actions/proveedores.ts`: `getProveedoresMercaderia()` con el mismo gate que `getProveedores` (`puedeConsultarCatalogoProveedores`). `getProveedoresNoMercaderia()` se consume hoy directamente desde el Server Component del catálogo (que ya verifica `PERMISOS.finanzas.acceso`); si a futuro se necesita invocar desde otros puntos, replicar el patrón agregando una Action equivalente con el gate apropiado.
- Consumidores actuales de las lecturas:
  - `getProveedoresMercaderia()`: `src/app/proveedores/lista/page.tsx`.
  - `getProveedoresNoMercaderia()`: `src/app/finanzas/balance/gastos/catalogo/page.tsx` (popula la 3ª columna "PROVEEDORES" del catálogo).
  - `getProveedores()`: call sites transversales que requieren el padrón completo sin filtrar (Px. Vta. Sugeridos, Lista Px Proveedores, Comp. por Cat., sincronizaciones DUX, pedidos, etc.).
- **Regla**: si se agrega una vista exclusiva de "mercadería" o de "no mercadería", consumir el helper correspondiente (`getProveedoresMercaderia` / `getProveedoresNoMercaderia`); no replicar el filtro en call sites. Usar `getProveedores()` solo cuando la vista realmente necesite **ambos** conjuntos.
- **Regla transversal Gestión Productos (2026-04-27):** todo backend que alimente filtros **PROVEEDOR** en rutas `/gestion-productos/*` debe restringir a `proveedor_mercaderia = true`. Aplicado en: `actions/proveedores.getProveedoresPageData` (filtro de `/proveedores`), `actions/vinculos.getProveedores` (modales de vínculos/comparación), `actions/tienda.getTiendaPageData` y `getProveedoresTintoLts`, `services/listaPrecios.getListaPreciosConTiendaFiltrada` / `getProveedoresParaPedidoUrgente`, `services/tintometrico.getProveedoresTintometricos`, y `app/pedidos/historial/page.tsx` (lista de proveedores del filtro).
- **Edición desde el modal "Nuevo/Editar Proveedor"** (`ProveedorForm.tsx` + `ProveedorModal.tsx`):
  - Campo **PROVEEDOR MERCADERÍA** (Select SI/NO) en el form, con hidden `<input name="proveedorMercaderia">` (`si` / `no`) para que viaje por `FormData`.
  - Default UX en alta: **SI** (el modal se abre desde la pantalla de mercadería, lo esperado es opt-in explícito). En edición precarga el valor persistido.
  - **Obligatorio** en alta y edición: el usuario debe elegir SI o NO; no se asume default si falta el campo. Validación: `proveedorMercaderiaFormSchema` en `src/lib/validations/proveedor.ts` (solo acepta `si` / `no` tras normalizar) dentro de `createProveedorSchema` / `updateProveedorSchema`.
  - **Prefijo**: opcional. `prefijoProveedorOpcionalSchema`: vacío → `null` en BD; si hay texto, exactamente 3 letras A-Z. Migración `20260421180000_global_proveedores_prefijo_nullable`: `prefijo` nullable; trigger `trg_lista_precios_set_cod_ext` usa `COALESCE(NULLIF(trim(p.prefijo), ''), p.codigo_unico)` para armar `cod_ext` cuando no hay prefijo.
  - Servicio `createProveedor` / `updateProveedor`: `CreateProveedorInput` / `UpdateProveedorInput` exigen **`proveedorMercaderia: boolean`**; si no hay prefijo, se genera `codigoUnico` interno único y se persiste `prefijo: null` (salvo colisión P2002 en `codigo_unico` → `PROVEEDOR_ERROR.CODIGO_UNICO_DUPLICADO`). Los listados (`listarProveedoresInterno`) exponen `prefijo: string` en UI como `p.prefijo ?? ""`.
  - Actions `crearProveedor` / `editarProveedor`: leen `formData`, validan con Zod y delegan al servicio; orden de mensajes de error de validación prioriza **nombre** y **proveedor mercadería** antes que prefijo.

### 1.12 Tipos de pintura y rendimientos (`/tienda/litros`)

- Tabla de negocio: `prod_rendimientos` (antes `tipos_pintura_rendimientos` — renombrada en migración `20260418280000_rename_tipos_pintura_rendimientos_a_prod_rendimientos`). Campos: `id` (UUID, `gen_random_uuid()`), `tipo_pintura` (VARCHAR; UNIQUE case-insensitive vía índice de expresión `ux_prod_rendimientos_tipo_lower` sobre `lower(tipo_pintura)`), `rendimiento` (INT, CHECK `prod_rendimientos_rendimiento_check`), `created_at`, `updated_at`. **No está modelada en `schema.prisma`**: todas las lecturas/escrituras son raw SQL (`$queryRaw` / `$executeRaw`) desde el Action.
- Lectura: `getTiposPinturaRendimientosAction()` (requiere `PERMISOS.tienda.tintoLts`).
- Escrituras (solo `editor`):
  - `upsertTipoPinturaRendimientoAction(raw)`:
    - crea o actualiza por `id` opcional,
    - valida `tipoPintura` requerido y `rendimiento` entero >= 0.
  - `deleteTipoPinturaRendimientoAction(id)`:
    - elimina fila por ID válido (CUID o UUID).
- Todas las mutaciones revalidan `/tienda/litros`.

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
  - `estado`: `PENDIENTE | RECEPCIONADO`.
    - `PENDIENTE`: snapshot creado (pendiente de recepción).
    - `RECEPCIONADO`: se setea cuando en un paso siguiente se exporta/registran los datos en DUX y el proceso finaliza OK.
  - `registrado_at`: fecha/hora cuando se cambia a `RECEPCIONADO` (nullable).
  - `total`: `NUMERIC(14,2)` nullable. Se persiste al registrar recepción para reimpresión y para recalcular el `PRECIO` unitario del Excel sin depender del input en UI.
  - Relaciones: `proveedor_id -> global_proveedores.id` y `sucursal_id -> global_sucursales.id`.

- Items: tabla física `prod_ped_historial_merc` (Prisma: `PedidoHistoriaItem`)
  - `pedido_historia_id -> prod_ped_historial.id` (FK, `onDelete: CASCADE`).
  - `cod_tienda`: identificador del producto en la tabla `prod_precios_tienda` (se guarda como texto).
  - Cantidades:
    - `cant_pedida`: snapshot inicial (cargado al generar).
    - `cant_recibida`: nullable; al generar el snapshot queda **sin valor** (`NULL`) hasta la recepción. En UI se edita con OK/Editar/Cesto; el “cesto” persiste `cant_recibida = 0`.

Constraint:
- `UNIQUE (pedido_historia_id, cod_tienda)` para evitar duplicados de producto dentro de un mismo pedido.
- Índices: además de `(sucursal_id, generado_at)` y `(proveedor_id, generado_at)`, se agrega índice sobre `generado_at` para listar por fecha con buen rendimiento.

**Retención automática (sin triggers ni cron)**
- Regla: se eliminan filas de `prod_ped_historial` según estado (evaluado por `generado_at`):
  - `PENDIENTE` (incluye legado `SIN RECEPCION`): **4 días o más**.
  - `RECEPCIONADO`: **30 días o más**.
- Implementación en `purgarPedidosHistoriaExpirados` (`src/services/pedidosHistoria.service.ts`) con ventanas por días (`Date.setDate`).
- Las filas de `prod_ped_historial_merc` asociadas se borran por **FK `ON DELETE CASCADE`**; no hace falta borrar la tabla de ítems por separado.
- La purga se ejecuta **al inicio de cada mutación** del historial en `pedidosHistoria.service.ts` (`crearPedidoHistoriaSnapshot`, `agregarPedidoHistoriaItem`, `actualizarPedidoHistoriaItemCantRecibida`, `marcarPedidoHistoriaRegistrado`, `reabrirPedidoHistoriaRecepcion`, `eliminarPedidoHistoria`). **No** corre en lecturas (`listar`, `getDetalle`, PDF): si no hay escrituras durante mucho tiempo, el dato antiguo permanece hasta la próxima escritura.

### 2.5a Comprobantes de compra DUX (`fin_compras_comprobante`, Prisma: `ComprobanteProveedor`)

Cabeceras persistidas desde la API **`/compras`** (mismo origen que `duxComprasApi.ts` / `duxCompras.service.ts`). La columna `id_proveedor` guarda el **mismo valor** que `global_proveedores.id_proveedor_dux` (FK).

| Columna (BD)           | Prisma               | API DUX (snake_case)   | Notas |
|------------------------|----------------------|-------------------------|--------|
| `id`                   | `id`                 | —                       | CUID, PK |
| `id_sucursal_empresa`  | `idSucursalEmpresa`  | `id_sucursal_empresa` (fallback `id_sucursal`) | Obligatorio en sync |
| `tipo_comp`            | `tipoComp`           | `tipo_comp` / `tipo_comprobante` | |
| `comprobante`          | `comprobante`        | `comprobante` | |
| `fecha_comp`           | `fechaComp`          | `fecha_comp` | `DATE`; string API `DD/MM/YYYY` |
| `id_proveedor`         | `idProveedor`        | `id_proveedor` | FK → `global_proveedores.id_proveedor_dux` |
| `total`                | `total`              | `total` | `NUMERIC(14,2)` |
| `monto_aplicado`       | `montoAplicado`      | `monto_aplicado` / `monto_pagado` | `NUMERIC(14,2)` |
| `controlado`           | `controlado`         | — | `BOOLEAN NOT NULL DEFAULT FALSE`; control interno post-sync |
| `created_at`           | `createdAt`          | — | |
| `updated_at`           | `updatedAt`          | — | |

- **Unicidad** (`fin_compras_comprobante_natural_ux`): `(id_sucursal_empresa, tipo_comp, comprobante, fecha_comp, id_proveedor)` — idempotencia del sync (`upsert`).
- **Índices**: `fecha_comp`, `id_proveedor`.
- **Sync** (`comprobantesProveedorDuxSync.service.ts`):
  - **Progreso en UI:** durante `sincronizarComprobantesProveedorDesdeDux` se actualiza la fila **`sync_dux_status.id = compras-proveedor-dux`** (`start` → `processed`/`total` por sucursal completada → `success` o `error`). El cliente hace polling con **`GET /api/sync-compras-proveedor-dux/status`** (sin auth explícito en el route, alineado a **`/api/sync-lista-precios-tienda/status`**). Los valores **X de Y** representan **sucursales DUX ya procesadas / total de sucursales** con `id_dux` numérico (no cantidad de comprobantes por página).
  - **Una petición (o ráfaga paginada) por cada** `global_sucursales.id_dux` numérico; entre sucursales respeta `DUX_COMPRAS_MIN_INTERVAL_MS` (igual que `getSiguienteComprobanteDuxCompra`).
  - **Ventana fija de consulta por sync**: `fechaDesde = hoy AR − 150 días` y `fechaHasta = hoy AR + 1 día` (sin depender de `MAX(fecha_comp)` persistida).
  - **Purga al finalizar cada sync**: `DELETE` lógico vía `deleteMany` donde `fecha_comp` &lt;= `fechaDesde` (purga inclusiva del borde de ventana para evitar arrastre de registros desactualizados); el conteo vuelve en `data.eliminadosAntiguos`.
  - **Paginación `/compras`**: la API DUX devuelve **como máximo 50** filas por GET (`DUX_COMPRAS_API_PAGE_LIMIT` en `duxComprasApi.ts`). `fetchComprasPagesAcumulado` usa `limit=50` y `offset=0,50,100…` hasta vacío o menos de 50 resultados. `DUX_COMPRAS_SYNC_LIMIT` (opcional) acota 1..50; `DUX_COMPRAS_SYNC_MAX_PAGES` default **500** (techo de seguridad, configurable). Entre páginas y entre sucursales se respeta `DUX_COMPRAS_MIN_INTERVAL_MS`.
  - **Omisiones**: filas sin `tipo_comp`, `fecha_comp` válida, `id_proveedor` que **no** exista en `global_proveedores.id_proveedor_dux`, o importes numéricos inválidos en `total` / `monto_aplicado`.
- **Action**: `sincronizarComprobantesProveedorDesdeDuxAction` (`src/actions/comprobantesProveedor.ts`) — solo **`esEditor()`**; devuelve `ActionResult` con resumen (`eliminadosAntiguos`, `upserts`, `omitidos`, `detalleSucursal` con `error?` por sucursal).
- **Deuda por proveedor (Finanzas — pantalla *Venc. Provee. Merc.*, ruta `/finanzas/deuda-proveedores`)**: `listarDeudaProveedores` en `src/services/deudaProveedores.service.ts` — por cada línea con saldo (`total > monto_aplicado`), **fecha de vencimiento** = `fecha_comp` + primer plazo en `global_proveedores.plazos_pagos` (CSV; si falta o no es numérico → **30** días; mínimo **1** día). **Hoy** = fecha en `America/Argentina/Buenos_Aires`. Columnas agregadas: **deuda total**, **vencida** (`fecha_venc` &lt; hoy), **5 / 30 / 45 / 60 DÍAS** según ventanas `hoy … hoy+5`, `hoy+6 … hoy+30`, `hoy+31 … hoy+45`, `≥ hoy+46`. Lectura en **Server Component** con `getRol()` + `PERMISOS.finanzas.acceso`.
- **Venc. por fecha (Finanzas)**: `listarVencimientosEnRango` + **`sumarSaldoVencimientosConFechaVencAnteriorA`** en `src/services/vencimientosPorFecha.service.ts` (misma CTE; **pendiente** = `total - monto_aplicado`); y **`listarVencimientosGastoFlujoEnRango`** + **`sumarPendienteGastosConFechaVencAnteriorA`** en `src/services/finBalGastoMensualBalance.service.ts` (imputaciones `fin_bal_gasto_mensual`, venc. desde devengo + **`fin_bal_gasto_final.plazo_pago_dias`** días; **pendiente** = fórmula devengado coherente con `/finanzas/balance/gastos`, corte = fecha de venc en ventana o &lt; hoy). El listado filtra `fecha_venc` en `[hoy, hoy + 150 días]` **inclusive** (compras) y venc. de gasto en el mismo rango. **VTOS ACUMULADOS** toma la suma de **ambos** orígenes con venc. &lt; hoy (compras: saldo; gastos: monto devengado pendiente a hoy) + la suma corrida del **vencimiento del día**; **SALDO** = **`CAJA DISPONIBLE - VTOS ACUMULADOS`**. La página `src/app/finanzas/venc-por-fecha/page.tsx` unifica en servidor: detalle del modal **una fila por obligación** (comprobante o imputación), con columna fija `MERCADERÍA` para compras. Paginado: **`pagina`**, `PAGE_SIZE = 100` (slice server-side). **CAJA DISPONIBLE** como antes (`fin_tesoreria_cajas`, `max(SALDO, 0)` en filas siguientes).
- **Control Comprobantes (Finanzas)**:
  - Lectura: `listarControlComprobantes()` en `src/services/controlComprobantes.service.ts` (join `fin_compras_comprobante` + `global_proveedores` + `global_sucursales`) devuelve: `fechaComp`, `proveedorNombre`, `sucursalNombre`, `comprobante`, `total`, `montoAplicado`, `controlado` y `vencimientoSaldo`.
  - `sucursalNombre`: se resuelve por `global_sucursales.id_dux = fin_compras_comprobante.id_sucursal_empresa`; si no hay match, usa fallback con el valor crudo `id_sucursal_empresa`.
  - Orden de listado: por `fecha_comp` ascendente (más antiguo → más reciente), y luego `proveedorNombre` + `comprobante`.
  - Regla de **VENCIMIENTO**: `vencimientoSaldo` = `total - monto_aplicado` **solo** cuando `saldo > 0` y `fecha_venc < hoy` (misma fórmula de `fecha_venc` por primer plazo `plazos_pagos`, default 30, mínimo 1); en caso contrario `0`.
  - Escritura: `actualizarControladoComprobanteAction(raw)` en `src/actions/controlComprobantes.ts` valida `{ id, controlado }` con Zod (`id` CUID), exige `getRol()+puede(PERMISOS.finanzas.acceso)` y `esEditor()`, delega en `actualizarControladoComprobante()`, y revalida `/finanzas` + `/finanzas/control-comprobantes`.
- **SQL / migraciones**: instalación nueva `scripts/neon-comprobantes-proveedor.sql`; evolución desde esquema anterior `20260330200000_fin_compras_comprobante_dux_campos` (renombres + `id_sucursal_empresa` + unique) y `20260417123000_add_controlado_to_fin_compras_comprobante` (`controlado BOOLEAN NOT NULL DEFAULT FALSE`). **Histórico**: la migración `20260418260000_rename_prod_comp_y_comprobantes` incluyó inicialmente `fin_compras_comprobante → prod_comp_provee`, pero fue **revertida** por `20260418270000_revert_rename_fin_compras_comprobante` manteniendo el nombre original — el prefijo `prod_comp_*` queda reservado exclusivamente al dominio "Comparación por Categoría".

### 2.5b Movimientos de finanzas por sucursal (`movimientos_finanzas`) + cheques (`movimientos_finanzas_cheques`)

Modelo de datos para registrar movimientos con monto y sucursal:

- **Cabecera** (`MovimientoFinanzas` → tabla `movimientos_finanzas`):
  - `nombre`: texto del movimiento.
  - `tipo_gasto` (Prisma `tipoGasto`): enum `TipoMovimientoFinanzas` = `EFECTIVO | BANCO | CHEQUE`.
  - `sucursal_id`: FK a `global_sucursales.id`.
  - `monto`: `DECIMAL(14,2)`.
- **Detalle de cheques** (`MovimientoFinanzasCheque` → tabla `movimientos_finanzas_cheques`):
  - relación 1:N por `movimiento_finanzas_id` (FK con `ON DELETE CASCADE`).
  - `fecha_cobro`: `DATE`.
  - `monto`: `DECIMAL(14,2)` (permite múltiples cheques con importes distintos por movimiento).
- **Índices**:
  - `movimientos_finanzas(sucursal_id, tipo_gasto)` — índice `movimientos_finanzas_sucursal_id_tipo_gasto_idx` (migración `20260418140000_rename_movimientos_finanzas_tipo_to_tipo_gasto`; antes `tipo`).
  - `movimientos_finanzas_cheques(movimiento_finanzas_id, fecha_cobro)`
- **Migración**: `prisma/migrations/20260402110000_add_movimientos_finanzas_y_cheques/migration.sql` + `prisma/migrations/20260418140000_rename_movimientos_finanzas_tipo_to_tipo_gasto/migration.sql`.
- **Sucursal "CORPORATIVO"**: suele vivir en `global_sucursales` con `codigo = 'corporativo'`, `pedido = FALSE` e `id_dux = NULL` para imputaciones sin sucursal física. Queda fuera de selectores de pedidos porque **todas** las páginas de pedidos filtran `where: { pedido: true, codigo: { in: ["guaymallen", "maipu"] } }` (`src/app/pedidos/urgente/page.tsx`, `src/app/pedidos/reposicion/page.tsx`, `src/app/pedidos/enviar/page.tsx`) y los syncs DUX filtran por `idDux` numérico (`duxCompras.service.ts`, `comprobantesProveedorDuxSync.service.ts`). Migración histórica `prisma/migrations/20260418150000_seed_sucursal_corporativo/migration.sql` insertó un id fijo `'suc_corporativo'`; **`listarSucursalesParaGastos()`** incluye esa fila si **`centro_costo` y `genera_balance`** son true. Zod: `globalSucursalIdSchema` en `@/lib/validations/common.ts` acepta UUID, CUID o el literal `suc_corporativo` para `sucursalId` en gastos / gasto final.
- **Flag `global_sucursales.centro_costo`** (Prisma: `Sucursal.centroCosto`, `BOOLEAN NOT NULL DEFAULT FALSE`): marca si la sucursal se considera **centro de costo** para reportes de balance / imputación contable. **Ortogonal a `pedido`**: `pedido` rige la participación en flujos de pedidos de mercadería; `centro_costo` sólo tiñe lecturas contables. Una sucursal puede ser `pedido = true, centro_costo = true` (ej. GUAYMALLEN / MAIPU si corresponde), `pedido = false, centro_costo = true` (ej. CORPORATIVO si se decide imputar contra él) o combinaciones opuestas. No hay UI de edición de sucursales: el flag se gestiona por **seed / UPDATE manual** en la DB (mismo canal que el resto de atributos de `global_sucursales`). Sin índice (cardinalidad = 2; se lee como payload, no como predicado masivo). Registros preexistentes quedan en `false` al aplicar la migración; marcar con `UPDATE global_sucursales SET centro_costo = TRUE WHERE codigo IN (...);` cuando se defina la política funcional. Migración: `prisma/migrations/20260418250000_add_sucursales_centro_costo/migration.sql` (SQL histórico sobre tabla `sucursales`, hoy `global_sucursales`).
- **Servicio**: `src/services/movimientosFinanzas.service.ts`
  - `listarMovimientosFinanzas()`: lista ordenada por `createdAt` descendente, con `include: { sucursal: { select: { nombre: true } } }`; `nombre` se devuelve en MAYÚSCULAS; `monto` convertido a `number`.
  - `listarSucursalesParaGastos()`: `prisma.sucursal.findMany({ where: { centroCosto: true, generaBalance: true }, select: { id, nombre }, orderBy: { nombre: "asc" } })` — `global_sucursales.centro_costo` **y** `genera_balance`. Migración `20260423180000_add_genera_balance_global_sucursales`: columna `genera_balance` NOT NULL default false + `UPDATE … SET genera_balance = true WHERE centro_costo = true` para no romper listados existentes. Alta/edición de **gasto final** exige ambos flags en `finBalGastosCatalogo.service.ts`; el cliente del catálogo **fusiona** la sucursal actual al editar una fila cuya sucursal ya no cumpla el filtro, para que el `Select` siga mostrando el valor hasta migrar.
  - `crearMovimientoFinanzas(input)`: alta con `nombre` normalizado a MAYÚSCULAS y `monto` `Decimal(14,2)`; maneja `P2003` (sucursal inválida) como `ServiceResult.error`.
- **Actions**: `src/actions/movimientosFinanzas.ts`
  - `crearMovimientoFinanzasAction(raw)`: gate `PERMISOS.finanzas.acceso` + `esEditor()`; Zod `crearMovimientoFinanzasSchema`; revalida `/finanzas` y `/finanzas/balance/gastos`.
  - Validación con Zod en `src/lib/validations/movimientosFinanzas.ts` (`tipoMovimientoFinanzasSchema`, `montoMovimientoFinanzasSchema`, `crearMovimientoFinanzasSchema`; `nombre` `trim + toUpperCase`, `sucursalId` **`globalSucursalIdSchema`** (UUID, CUID o literal `suc_corporativo`), `monto` numérico finito con tope `< 1e12`).
- **Página Balance · Gastos** (`/finanzas/balance/gastos`): ver en §2.5e la rama **`fin_bal_gasto_mensual`** + `finBalGastoMensualBalance.service.ts`. El modelo `movimientos_finanzas` y `crearMovimientoFinanzasAction` siguen disponibles para otros flujos; la grilla principal de esa página ya no los usa.

### 2.5f Balance mensual (`/finanzas/balance/mensual`) y ventas de balance (`fin_bal_vtas`)

- **Rutas**: `src/app/finanzas/balance/mensual/page.tsx` (redirect desde `/finanzas/balance`); cliente `src/components/finanzas/FinanzasBalanceMensualPageClient.tsx`. Permiso: `PERMISOS.finanzas.acceso`; edición de ventas además **`esEditor()`** (misma regla que **Balance · Ventas**).
- **Datos en servidor (por mes/año calendario Argentina)**: en paralelo se cargan `listarImputacionesMensualesBalance({ mes, anio })` (`finBalGastoMensualBalance.service.ts`), `listarSucursalesGeneraBalanceParaVtas()` y `listarFinBalVtasPorMesAnio(mes, anio)` (`finBalVtas.service.ts`). El resumen se arma con **`resumenBalanceMensualDesdeFilas(filas, ventasPorNombre, sucursalesGeneranBalance)`** en `src/lib/balanceMensual.ts`.
- **Reglas de negocio del resumen** (`balanceMensual.ts`):
  - **Global**: suma todas las imputaciones del mes; **ventas** del global = suma de ventas cargadas en sucursales con `genera_balance` (no es un registro aparte en `fin_bal_vtas`).
  - **Por sucursal**: entran **todas** las sucursales con `genera_balance = true` (aunque no tengan imputaciones ese mes), más cualquier nombre con `genera_balance` que solo aparezca en filas de gasto; costos de sucursales `centro_costo` y **sin** `genera_balance` se reparten en partes **iguales** entre las que sí generan balance.
  - Clasificación **costos variables / fijos** por texto del tipo de gasto (`VARIABLE` / `FIJO`; si no coincide, se trata como fijo).
  - **Exportado para UI o informes**: `fmtMargenContribucionPct(p)` (porcentaje sobre ventas o `—`); `puntoEquilibrioVentasPesos(b)` — ventas en pesos necesarias para cubrir costos fijos con el ratio actual `(resultadoOperativo / ventas)`; devuelve `null` si no es calculable.
- **Tabla `fin_bal_vtas`** (Prisma `FinBalVtas`): montos enteros por **`sucursal_id` + `mes` + `anio`**. **`@@unique([sucursalId, mes, anio])`** (`fin_bal_vtas_sucursal_mes_anio_ux`); migración **`20260427120000_fin_bal_vtas_unique_sucursal_mes_anio`** deduplica antes del unique. **`crearFinBalVtas`** en `finBalVtas.service.ts` hace **`upsert`** (misma acción alinea **Balance · Ventas** y balance mensual). Validación: `crearFinBalVtasSchema` en `@/lib/validations/finBalVtas.ts`. La sucursal debe tener **`genera_balance`** (validado en servicio).
- **Actions** (`src/actions/finBalVtas.ts`): mutaciones con `esEditor()`; tras crear/eliminar ventas, **`revalidatePath`** de `/finanzas/balance/vtas` y **`/finanzas/balance/mensual`**.
- **Modal de edición de ventas** (solo editor): `src/components/finanzas/EditarVentasBalanceMensualModal.tsx`; persiste vía `crearFinBalVtasAction`.
- **Histórico MC / PE en pantalla**: hoy la UI muestra **—** hasta definir fuente (mes anterior, promedio, tabla nueva, etc.).

### 2.5c Cajas de tesorería (`fin_tesoreria_cajas`, Prisma: `CajaTesoreria`)

Modelo para persistir saldos de cajas con tipo cerrado y trazabilidad de última modificación del saldo.

- **Tabla**: `fin_tesoreria_cajas`
  - `id` (`TEXT`, PK; Prisma `cuid()`).
  - `nombre_caja` (`TEXT`, único).
  - `titular` (`TEXT`, obligatorio).
  - `tipo_caja` (enum PostgreSQL/Prisma `TipoCajaTesoreria`: `DIGITAL | EFECTIVO | CHEQUE`).
  - `monto` (`INTEGER`, default `0`; saldo sin decimales).
  - `ult_actualizacion` (`TIMESTAMP`): última vez que cambió el saldo.
  - `created_at`, `updated_at` (`TIMESTAMP`).
- **Índices**:
  - único compuesto en (`nombre_caja`, `titular`) — permite repetir nombre si cambia el titular;
  - índice por `tipo_caja`.
- **Regla de negocio en BD**:
  - trigger `fin_tesoreria_cajas_set_timestamps` + función `set_fin_tesoreria_cajas_timestamps`:
    - siempre actualiza `updated_at` en `UPDATE`;
    - actualiza `ult_actualizacion` **solo** si `monto` cambia (`IS DISTINCT FROM`), preservando el valor previo cuando se edita otro campo.
- **Migración**: `prisma/migrations/20260414130000_add_fin_tesoreria_cajas/migration.sql`.
  - Relación con sucursal (histórico): `prisma/migrations/20260414143000_add_sucursal_to_fin_tesoreria_cajas/migration.sql`.
  - Ajuste de enum: `prisma/migrations/20260414152000_rename_tipo_caja_tesoreria_values/migration.sql` (`BANCO -> DIGITAL`, `OTRA -> CHEQUE`).
  - Alta de titular: `prisma/migrations/20260414180000_add_titular_to_fin_tesoreria_cajas/migration.sql`.
  - Baja de sucursal en cajas: `prisma/migrations/20260414190000_drop_sucursal_id_from_fin_tesoreria_cajas/migration.sql`.
  - Unicidad por nombre+titular: `prisma/migrations/20260414193000_unique_nombre_titular_fin_tesoreria_cajas/migration.sql`.
- **Servicio**: `src/services/cajasTesoreria.service.ts`
  - `listarCajasTesoreria()`: lectura ordenada por `nombre_caja`.
  - `crearCajaTesoreria(input)`: alta con validación de unicidad manejada como `ServiceResult`.
  - `editarCajaTesoreria(input)`: edición de `nombre`, `titular`, `tipo` y `monto`.
  - `eliminarCajaTesoreria(id)`: baja por ID.
- **Actions**: `src/actions/cajasTesoreria.ts`
  - Lectura `listarCajasTesoreriaAction`: requiere `getRol()` + `puede(rol, PERMISOS.finanzas.acceso)`.
  - Mutaciones (`crear`, `editar`, `eliminar`): requieren permiso de finanzas + `esEditor()`.
  - Validación con Zod en `src/lib/validations/cajasTesoreria.ts`.
  - `titular` queda restringido por whitelist (alta y edición): `SUC. GUAYMALLEN`, `SUC. MAIPU`, `WALTER GARCIA`, `FERNANDO PANAIA`, `EMILIANO GARCIA`, `VANESA GARCIA` (constante compartida `src/lib/cajasTesoreriaTitulares.ts`).
  - `nombre_caja` y `titular` se normalizan y persisten en MAYÚSCULAS en servicio (`crearCajaTesoreria`/`editarCajaTesoreria`), y la lectura también expone esos campos en MAYÚSCULAS para UI consistente.
  - Revalidación de rutas: `/finanzas` y `/finanzas/tesoreria`.

### 2.5e Catálogo jerárquico de gastos para Balance (`fin_bal_gasto_tipo` → `fin_bal_gasto_rubro` → `fin_bal_cat_gasto`)

Jerarquía de catálogos para Finanzas → Balance → Gastos. Relación canónica:

```text
fin_bal_gasto_tipo (1) ──── (N) fin_bal_gasto_rubro (1) ──── (N) fin_bal_cat_gasto (1) ──── (N) fin_bal_gasto_final
   FinBalGastoTipo             FinBalGastoRubro                   FinBalGasto                    FinBalGastoFinal
                                                                                                      ├── FK → global_proveedores
                                                                                                      └── FK → global_sucursales
```

- **Tabla raíz** `fin_bal_gasto_tipo` (Prisma: `FinBalGastoTipo`):
  - `id` (`TEXT`, PK; `cuid()` en app).
  - `nombre` (`TEXT`, **único global** — `fin_bal_gasto_tipo_nombre_key`).
  - `created_at`, `updated_at` (`TIMESTAMP(3)`).
  - Relación inversa: `rubros FinBalGastoRubro[]`.
- **Tabla intermedia** `fin_bal_gasto_rubro` (Prisma: `FinBalGastoRubro`):
  - `id` (`TEXT`, PK; `cuid()` en app).
  - `nombre` (`TEXT`).
  - `tipo_id` (`TEXT`, FK → `fin_bal_gasto_tipo.id`, `onDelete: Restrict`, `onUpdate: Cascade`).
  - `created_at`, `updated_at` (`TIMESTAMP(3)`).
  - Unicidad compuesta `@@unique([tipoId, nombre])` (map `fin_bal_gasto_rubro_tipo_nombre_ux`): el mismo nombre puede existir en **distintos tipos**.
  - Índice en `tipo_id` (`fin_bal_gasto_rubro_tipo_id_idx`).
  - Relación inversa: `gastos FinBalGasto[]`.
- **Tabla hoja** `fin_bal_cat_gasto` (Prisma: `FinBalGasto`, `@@map("fin_bal_cat_gasto")`):
  - `id` (`TEXT`, PK; `cuid()` en app).
  - `nombre` (`TEXT`).
  - `rubro_id` (`TEXT`, FK → `fin_bal_gasto_rubro.id`, `onDelete: Restrict`, `onUpdate: Cascade`).
  - `created_at`, `updated_at` (`TIMESTAMP(3)`).
  - Unicidad compuesta `@@unique([rubroId, nombre])` (map `fin_bal_cat_gasto_rubro_nombre_ux`): el nombre del gasto es **único por rubro**.
  - Índice en `rubro_id` (`fin_bal_cat_gasto_rubro_id_idx`).
  - **Bajas (2026-04-21)**: se eliminaron `proveedor_id` y `gasto_mensual` del catálogo hoja; el detalle por proveedor y sucursal vive en **`fin_bal_gasto_final`**.
  - **Baja `repite_monto` (2026-04-18)**: ver migraciones `20260418220000` / `20260418240000`; el comportamiento previsto pasa a `movimientos_finanzas`.
- **Tabla** `fin_bal_gasto_final` (Prisma: `FinBalGastoFinal`):
  - `id` (`TEXT`, PK), `gasto_id` → `fin_bal_cat_gasto.id` (`onDelete: Cascade`), `proveedor_id` → `global_proveedores.id` (`onDelete: Restrict`), `sucursal_id` → `global_sucursales.id` (`onDelete: Restrict`).
  - `gasto_mensual` (`BOOLEAN NOT NULL DEFAULT FALSE`).
  - Varias filas pueden compartir la misma terna `gasto_id` + `proveedor_id` + `sucursal_id` (cada una con su `id` e imputaciones `fin_bal_gasto_mensual` propias). Migraciones `20260423120000_drop_fin_bal_gasto_final_gasto_proveedor_sucursal_ux` y **`20260425180000_ensure_drop_fin_bal_gasto_final_unique_triple`** (idempotente: `DROP INDEX` + `ALTER TABLE … DROP CONSTRAINT IF EXISTS`) eliminan el índice/constraint único previo. **Regla de negocio:** si ya existe al menos otra fila con esa terna, la nueva o editada debe llevar **COMENTARIOS** no vacío y **distinto** (trim + mayúsculas `es-AR`, misma normalización que Zod) al resto de filas hermanas; `validarComentariosParaTriplaGastoFinalRepetida` en `finBalGastosCatalogo.service.ts` (`crearFinBalGastoFinal` / `editarFinBalGastoFinal`).
  - Índices en `gasto_id`, `proveedor_id`, `sucursal_id`. La columna **PROVEEDORES** en `/finanzas/balance/gastos/catalogo` sigue siendo CRUD autónomo de `global_proveedores` (`proveedor_mercaderia = false`); los gastos finales consumen ese listado y **`listarSucursalesParaGastos()`** (sucursales con `centro_costo` y `genera_balance`) para el select de sucursal.
  - `dia_devengado` (`INTEGER`, CHECK 1–28): día del mes en que se devenga el gasto; en **gasto mensual** lo elige el usuario en el catálogo; en **gasto único** (`gasto_mensual = false`) en **alta** se fija al día calendario actual en Argentina vía `diaDevengadoFinBalDesdeCalendarioArgentina()` (máx. 28). Si se pasa de mensual a único en **edición**, se recalcula igual ese día.
  - `plazo_pago_dias` (`INTEGER`): plazo de pago en días entre la fecha del gasto (devengo) y la fecha de pago/vencimiento. En alta/edición se valida como **obligatorio** en rango **1..30** (UI: **PLAZO DE PAGO**).
- **Tabla** `fin_bal_gasto_mensual` (Prisma: `FinBalGastoMensual`): imputación por mes/año ligada a `fin_bal_gasto_final` (`gasto_final_id`, `mes` 1–12, `anio`, `monto` y `pagado` enteros ≥ 0, `pagado ≤ monto`). UNIQUE `(gasto_final_id, mes, anio)`. Migración `20260421200000_add_fin_bal_gasto_mensual`.
- **Pantalla** `/finanzas/balance/gastos` (no confundir con el catálogo):
  - **Servicio** `src/services/finBalGastoMensualBalance.service.ts`: `mesAnioCalendarioArgentina()`, `mesAnteriorCalendario()`; `listarPeriodosConImputacionesEnDb()` (`groupBy` `anio`+`mes` sobre `fin_bal_gasto_mensual`) devuelve años y meses **solo** si existen filas en BD (útil para informes u operaciones; **los Select Mes/Año en la pantalla** listan **12 meses** y años **2026–2046**, coherentes con `mesAnioQuerySchema`). `listarImputacionesMensualesBalance({ mes, anio })` expone cada fila con `gastoFinalId` + nombres; **devengado acumulado** hasta hoy = \(\min(\textit{valor}, \text{redondeo de } (\textit{valor} / \textit{días del mes}) \times \textit{días calendario desde devengo hasta hoy inclusive})\). **Valor** para la fórmula: `monto` del mes actual si &gt; 0; si no, último `monto` de un mes estrictamente anterior para el mismo `gasto_final_id`. **`montoDevengadoPendiente`** (columna **DEVENGADO**: pendiente de pago sobre ese devengado) = \(\max(0, \textit{devengado acumulado} - \textit{pagado})\). **Vencimiento** (`fechaVencimientoGastoBalanceDesdeDevengoIso`): mismo día del mes calendario siguiente al devengo (ej. devengo 01/04/2026 → vence 01/05/2026). **`montoVencido`**: si hoy (AR) ≥ fecha de vencimiento, \(\max(0, \textit{monto}-\textit{pagado})\); si no, 0. `obtenerMontoImputacionMesAnterior({ gastoFinalId, mes, anio })` devuelve el `monto` persistido en el **mes calendario inmediato anterior** (para el botón **Repetir Ult. Monto** en UI). `actualizarMontoFinBalGastoMensual` / `eliminarFinBalGastoMensual` mutan `fin_bal_gasto_mensual` (validación `monto ≥ pagado`).
  - **Carga del mes** (`cargarImputacionesMensualesDesdeCatalogo`): por cada `fin_bal_gasto_final` con `gasto_mensual = true` sin fila para `(mes, anio)`, crea `fin_bal_gasto_mensual` con `monto = 0` y `pagado = 0`.
  - **Actions** `src/actions/finBalGastoMensualBalance.ts`: `cargarFinBalGastoMensualMesAction({ mes, anio }?)` (editor; default mes actual si se omite), `editarMontoFinBalGastoMensualAction`, `eliminarFinBalGastoMensualAction`, `obtenerMontoMesAnteriorFinBalGastoMensualAction` (lectura con permiso finanzas). Revalidan `/finanzas` y `/finanzas/balance/gastos`.
  - **Validaciones** `src/lib/validations/finBalGastoMensualBalance.ts`: `mesAnioQuerySchema`, `editarMontoFinBalGastoMensualSchema`, `eliminarFinBalGastoMensualSchema`, `obtenerMontoMesAnteriorSchema`.
  - **Página** `src/app/finanzas/balance/gastos/page.tsx`: `searchParams` opcionales `mes` / `anio` (`mesAnioQuerySchema`: **mes** 1–12, **anio** 2026–2046). Si **no** vienen `mes` ni `anio` en la URL, **`redirect`** a `?mes=&anio=` con **mes y año calendario actuales en Argentina** (`mesAnioCalendarioArgentina` + año acotado al rango). Si el parse falla (valores fuera de rango), **`redirect`** al mismo default. Sin **redirect** por periodo sin filas en BD. Lista con `listarImputacionesMensualesBalance`.
  - **Venc. Provee. Gastos** (`/finanzas/vencimientos-gastos`): lectura en **Server Component** con `getRol()` + `PERMISOS.finanzas.acceso` (igual que otras pantallas de Finanzas). **`listarObligacionesGastoVencidasNoMercaderia()`** en `finBalGastoMensualBalance.service.ts` devuelve `hoyIso` (calendario Argentina), `proveedores` (agregado por nombre de proveedor con `proveedorMercaderia === false`, solo imputaciones con **fecha de vencimiento** estrictamente anterior a hoy y **pendiente a hoy** &gt; 0) y `detalleLineas` (mismo shape que `FlujoFondoDetalleDiaFila` para **`TablaFlujoDeFondoDetalleDia`**). Sin Action dedicada: el servicio se invoca solo desde el Server Component.
- **Integridad referencial**:
  - `onDelete: Restrict` en ambas FKs: no se puede borrar un tipo con rubros asociados ni un rubro con gastos asociados. Si se necesita baja en cascada, cambiar explícitamente a `Cascade` en la migración correspondiente y documentarlo.
- **Convención de normalización**: al persistir desde service/action, aplicar `trim + toUpperCase` sobre `nombre` (alineado a `fin_tesoreria_cajas`, `movimientos_finanzas.nombre`).
- **Errores a mapear** (Prisma → `ServiceResult`):
  - `P2002` (unique violation): “Ya existe un rubro con ese nombre para el tipo seleccionado.” / para gasto: “Ya existe un gasto con ese nombre en ese rubro.”
  - `P2003` (FK violation): “Tipo/Rubro inválido.” En `gasto`, si el meta apunta a `rubro`, “El rubro seleccionado no existe.”
  - `P2025` (registro no encontrado): “Registro no encontrado.”
- **Migraciones**:
  - `prisma/migrations/20260418170000_add_fin_bal_gasto_tipo/migration.sql` (tabla raíz).
  - `prisma/migrations/20260418180000_add_fin_bal_gasto_rubro_y_gasto/migration.sql` (rubro + gasto + FKs).
  - `prisma/migrations/20260418210000_add_fin_bal_gasto_proveedor_id/migration.sql` (FK opcional a `proveedores` con `onDelete: SET NULL` + índice; tabla referenciada hoy `global_proveedores`).
  - `prisma/migrations/20260418220000_add_fin_bal_gasto_flags_mensual_repite/migration.sql` (alta de `gasto_mensual` + `repite_monto`, `BOOLEAN NOT NULL DEFAULT FALSE`). Se conserva por inmutabilidad del historial Prisma.
  - `prisma/migrations/20260418240000_drop_fin_bal_gasto_repite_monto/migration.sql` (baja de la columna `repite_monto`; `gasto_mensual` se mantiene). Idempotente (`DROP COLUMN IF EXISTS`).
  - `prisma/migrations/20260418230000_fin_bal_gasto_unique_rubro_nombre_proveedor/migration.sql` (histórico: UNIQUE triple + parcial; **supersedido** por la migración 20260421140000 que unifica en `(rubro_id, nombre)` al renombrar la tabla).
  - `prisma/migrations/20260421140000_fin_bal_cat_gasto_sin_proveedor_mensual/migration.sql` (baja FK/columnas `proveedor_id` y `gasto_mensual`, dedupe por `(rubro_id, nombre)`, `fin_bal_gasto` → `fin_bal_cat_gasto`, constraints/índices renombrados, UNIQUE `fin_bal_cat_gasto_rubro_nombre_ux`).
  - `prisma/migrations/20260421150000_add_fin_bal_gasto_provee/migration.sql` (histórico: alta `fin_bal_gasto_provee`; **supersedido** por `20260421160000`).
  - `prisma/migrations/20260421160000_fin_bal_gasto_final_rename_add_sucursal/migration.sql` (`fin_bal_gasto_provee` → `fin_bal_gasto_final`, columna `sucursal_id` + FK `global_sucursales`, UNIQUE `(gasto_id, proveedor_id, sucursal_id)`, rename de PK/FKs/índices).
- **Validaciones Zod**: `src/lib/validations/finBalGastosCatalogo.ts`
  - `crearFinBalGastoTipoSchema`, `editarFinBalGastoTipoSchema`, `eliminarFinBalGastoTipoSchema`.
  - `crearFinBalGastoRubroSchema`, `editarFinBalGastoRubroSchema`, `eliminarFinBalGastoRubroSchema`.
  - `crearFinBalGastoSchema`, `editarFinBalGastoSchema`, `eliminarFinBalGastoSchema`.
  - `crearFinBalGastoFinalSchema`, `editarFinBalGastoFinalSchema`, `eliminarFinBalGastoFinalSchema`: en alta/edición de gasto final, `gastoId` y `proveedorId` usan **`prismaCuidOrUuidSchema`**; **`sucursalId`** usa **`globalSucursalIdSchema`** (UUID, CUID o literal `suc_corporativo`); el `id` de la fila `fin_bal_gasto_final` y eliminación siguen con **`prismaCuidSchema`**; `gastoMensual`, `diaDevengado`.
  - `nombre` en todos: `trim + toUpperCase`, `min(1)`, `max(120)`.
  - IDs de tipo/rubro/gasto de jerarquía: `prismaCuidSchema`.
  - `crearFinBalGastoSchema` / `editarFinBalGastoSchema`: solo `nombre` + `rubroId` (+ `id` en edición).
- **Servicio** (`src/services/finBalGastosCatalogo.service.ts`)
  - **Lecturas** (no devuelven `ServiceResult`; siempre exitosas, consumidas desde Server Components):
    - `listarFinBalGastoTipos()` → `FinBalGastoTipoItem[]` ordenados por `nombre` asc.
    - `listarFinBalGastoRubrosPorTipo(tipoId)` → `FinBalGastoRubroItem[]` filtrados por `tipoId`.
    - `listarFinBalGastosPorRubro(rubroId)` → `FinBalGastoItem[]` filtrados por `rubroId`.
    - `listarFinBalGastosJerarquia()` → `FinBalGastoJerarquiaTipo[]` (árbol Tipo → Rubros → Gastos + `asignacionesFinales[]` por gasto en un roundtrip con `include` anidado + orden por proveedor y sucursal).
  - **Tipos expuestos** — `FinBalGastoItem`: `id`, `nombre`, `rubroId`, `createdAt`, `updatedAt`. En jerarquía, cada gasto es `FinBalGastoJerarquiaGasto` con `asignacionesFinales: FinBalGastoFinalItem[]` (`id`, `gastoId`, `proveedorId`, `sucursalId`, `gastoMensual`, `proveedor`, `sucursal`).
  - **Escrituras** (todas devuelven `ServiceResult<T>`):
    - Tipo: `crearFinBalGastoTipo`, `editarFinBalGastoTipo`, `eliminarFinBalGastoTipo`.
    - Rubro: `crearFinBalGastoRubro`, `editarFinBalGastoRubro`, `eliminarFinBalGastoRubro`.
    - Gasto: `crearFinBalGasto`, `editarFinBalGasto`, `eliminarFinBalGasto`.
    - Gasto final: `crearFinBalGastoFinal`, `editarFinBalGastoFinal`, `eliminarFinBalGastoFinal`.
  - **Mapeo de errores** (helper `mapDbError`):
    - `P2002` → mensaje contextual por nivel; en `gasto`: "Ya existe un gasto con ese nombre en ese rubro."
    - `P2003` en `eliminar*Tipo` / `eliminar*Rubro` → mensaje "No se puede eliminar: tiene rubros/gastos asociados".
    - `P2003` en `crear*Rubro` / `crear*Gasto` → mensaje "El tipo/rubro seleccionado no existe".
    - `P2025` → mensaje "Tipo/Rubro/Gasto no encontrado".
- **Actions** (`src/actions/finBalGastosCatalogo.ts`)
  - Todas las mutaciones exigen `puede(rol, PERMISOS.finanzas.acceso)` + `esEditor()` vía helper `requireEditorFinanzas()` (catálogos maestros solo editables por editor).
  - Validan `raw: unknown` con los esquemas Zod correspondientes (`safeParse`).
  - Delegan en el servicio y mapean `ServiceResult` → `ActionResult`.
  - Tras cada mutación exitosa, llaman a `revalidateBalancePaths()` que ejecuta `revalidatePath('/finanzas')`, `revalidatePath('/finanzas/balance/gastos')` y `revalidatePath('/finanzas/balance/gastos/catalogo')`.
  - Exportan: `crearFinBalGastoTipoAction`, `editarFinBalGastoTipoAction`, `eliminarFinBalGastoTipoAction`, `crearFinBalGastoRubroAction`, `editarFinBalGastoRubroAction`, `eliminarFinBalGastoRubroAction`, `crearFinBalGastoAction`, `editarFinBalGastoAction`, `eliminarFinBalGastoAction`, `crearFinBalGastoFinalAction`, `editarFinBalGastoFinalAction`, `eliminarFinBalGastoFinalAction`.
  - Las **lecturas** NO son Actions: se consumen directamente desde Server Components importando el servicio (mismo patrón que `listarMovimientosFinanzas` / `listarCajasTesoreria`).

### 2.5d Catálogo finanzas — rubros y gastos (ELIMINADO 2026-04-18)

> **Baja**: las tablas `finanzas_rubros` y `finanzas_gastos`, junto con el enum PostgreSQL `TipoCostoGasto`, fueron **eliminadas** el 2026-04-18 sin reemplazo. El catálogo no se estaba usando como FK desde `movimientos_finanzas` (los nombres de gasto vivían como texto libre en `movimientos_finanzas.nombre`), por lo que la baja no impacta datos existentes de Balance.
>
> - **Migración de baja**: `prisma/migrations/20260418160000_drop_finanzas_rubros_y_gastos_catalogo/migration.sql` — `DROP TABLE IF EXISTS "finanzas_gastos" CASCADE; DROP TABLE IF EXISTS "finanzas_rubros" CASCADE; DROP TYPE IF EXISTS "TipoCostoGasto";` (idempotente). La migración original de alta (`20260418120000_add_finanzas_rubros_y_gastos_catalogo`) se conserva por inmutabilidad del historial Prisma.
> - **Código eliminado**:
>   - Modelos Prisma `FinanzasRubro` y `FinanzasGasto` + enum `TipoCostoGasto` en `prisma/schema.prisma`.
>   - Servicio `src/services/finanzasGastosCatalogo.service.ts`.
>   - Action `src/actions/finanzasGastosCatalogo.ts` (incluye `crearGastoCatalogoAction`).
>   - Validaciones `src/lib/validations/finanzasGastosCatalogo.ts` (`tipoCostoGastoSchema`, `crearGastoCatalogoSchema`).
>   - Componente `src/components/finanzas/CrearGastoCatalogoModal.tsx`.
>   - Prop `rubros` y botón **Crear Gasto** en `src/app/finanzas/balance/gastos/page.tsx` y `src/components/finanzas/FinanzasBalanceGastosPageClient.tsx`.
> - **Consecuencia histórica**: la vista `/finanzas/balance/gastos` dejó de usar solo `movimientos_finanzas`; hoy lista **`fin_bal_gasto_mensual`** del mes (Argentina) y el botón **Cargar Datos Mes.** genera filas desde `fin_bal_gasto_final` con `gasto_mensual = true` (ver §2.5e).

#### `generarPdfEnviarPedidoAction` — ítems vacíos

- Si **`getItemsYProveedorParaEnviar`** devuelve **0 ítems** para la combinación proveedor + sucursal + tipos, la Action responde **`{ ok: false, error: "No hay ítems para generar el pedido con la selección indicada." }`** **antes** de crear historial o borrar filas URGENTE/TINTOMÉTRICO (evita PDF vacío y borrados masivos indebidos).
- La misma llamada devuelve **`rows`** (filas resueltas desde `prod_ped_merc`) e **`items`** (forma PDF). El chequeo de sobrestock en la **otra sucursal** usa **`rows` completas** (mismas que el PDF) en **`getSobreStockOtraSucursalParaPedidoEnviar`**: solo entran líneas con **`cod_tienda`**; el proveedor se resuelve por tipo (LP / tintométrico / reposición) y va siempre **`.trim()`** donde aplique.
- Tras éxito, **`revalidatePath`** incluye también **`/pedidos/reposicion`**.

#### `prod_ped_merc` — modelo `ProdPedMerc2` (canónico)

- **Tintométrico**: varias líneas pueden compartir `cod_tienda` y diferir por código de fórmula. El correlato con `cod_ext` de la era legada vive en **`urgente_cod_ext`** (`buildCodExtTintometrico` en `src/lib/pedidosTintometrico.ts`). Borrado: `deletePedidoTintometricoItem` por `id` o por `(sucursal, proveedor, cod_ext persistido)`. Para recepción/historial, `getItemsYProveedorParaEnviar` resuelve `cod_tienda` desde ese `cod_ext` (`parseCodTiendaFromCodExtTintometrico`) y lo valida contra `prod_precios_tienda`.
- **Migraciones**: `20260429183000_add_prod_ped_merc_2` (crea `prod_ped_merc_2`); `20260429200000_copy_prod_ped_merc_to_prod_ped_merc_2` (copia desde el legado); `20260430103000_drop_prod_ped_merc_legacy` (borra el legado homónimo); `20260430120000_rename_prod_ped_merc_2_to_prod_ped_merc` (nombre final `prod_ped_merc`).
- **Propósito**: única tabla de ítems de pedido de mercadería en runtime (`REPOSICION` \| `URGENTE` \| `TINTOMETRICO`).
- **Columnas**: `id` (TEXT, default `gen_random_uuid()::text`), `tipo_de_pedido` (CHECK: `REPOSICION` \| `URGENTE` \| `TINTOMETRICO`), `sucursal_id` → FK `global_sucursales.id` (`ON DELETE RESTRICT`), `urgente_cod_ext`, `urgente_cant_pedir`, `tintometrico_descripcion`, `tintometrio_cant_pedir`, **`tintometrico_proveedor`**, `reposicion_forma_pedido`, `reposicion_punto_pedido`, `reposicion_cant_conf`, **`reposicion_cant_pedir`**, **`reposicion_cod_tienda`**. (Migraciones previas hicieron backfill desde la tabla legada `prod_ped_merc` antes de `20260430103000_drop_prod_ped_merc_legacy`.)
- **Índices**: `(sucursal_id, tipo_de_pedido)`; `(reposicion_cod_tienda)`.
- **Prisma**: `ProdPedMerc2` → `@@map("prod_ped_merc")`; relación inversa en `Sucursal.itemsProdPedMerc2`. **Lectura en app**: la tabla previa **Generar Pedido** (`getItemsTablaEnviarPedido` en `pedidosEnvio.service.ts`) arma filas desde `prod_ped_merc` con resolución de proveedor/descripción/cantidad por tipo (incluye `habilitado = true` en `prod_precios_provee` para cruces por `cod_ext`; reposición: misma regla de stock que `upsertPedidoMercaderiaReposicionConfig`, `stock <= punto`).

#### `comprobarItemsParaGenerarPedidoAction`

- **Uso**: modal **Generar Pedido** (debounce en cliente ~320 ms) para saber si hay ítems antes de habilitar el botón.
- **Entrada** (Zod): `proveedorId`, `sucursal` (`guaymallen` \| `maipu`), `tipos` (array no vacío de `URGENTE` \| `TINTOMETRICO` \| `REPOSICION`).
- **Salida**: `ActionResult<{ hayItems: boolean }>` — reutiliza **`getEnviarPedidoTablaData`** con los tres datos completos (misma selección que vería la tabla de `/pedidos/enviar` si esos filtros estuvieran en la URL).

#### `getSobreStockReposicionParaModalAction` (modal sobrestock — otra sucursal)

- **Uso**: action server-side para alimentar el modal en **Generar Pedido** tras `SOBRESTOCK_REQUIERE_CONFIRMACION`.
- **Entrada (Zod)**: `proveedorId`, `sucursal` (`guaymallen` \| `maipu`), `tipos` (array no vacío de `URGENTE` \| `TINTOMETRICO` \| `REPOSICION`).
- **Salida**: `ActionResult<{ tieneSobreStock: boolean; items: SobreStockReposicionItem[] }>` donde cada ítem incluye:
  - `codExt`, `cantPedir` (línea de la sucursal que **genera** el pedido; solo `cant_pedir > 0`).
  - `stockSucursal` y `topeReposicion`: medidos en la **otra** sucursal (`sucursalCodigoSobrestock`), desde `prod_precios_tienda` por `cod_tienda` de la línea y tope resuelto con filas `REPOSICION` en esa otra tienda.
  - `origenDeteccion`: en este flujo siempre **`OTRA_SUCURSAL`** (excedente en la otra tienda → aviso de posible **transferencia interna**).
  - **Reglas numéricas**: ver `getSobreStockOtraSucursalParaPedidoEnviar` en `sobreStock.service.ts` (`evaluarSobrestockEnValores`).
  - **Otra sucursal**: se buscan filas `REPOSICION` por `cod_tienda` en la otra tienda **sin** depender de `cod_ext` persistido; tope con prioridad mismo proveedor → fila con tope &gt; 0 → primera fila; si no hay filas en la otra sucursal pero la línea del pedido tiene `reposicion_cant_conf > 0`, se usa ese tope como referencia frente al stock de la otra tienda.
- **Datos**: reutiliza **`getItemsYProveedorParaEnviar`** con los mismos `proveedorId`, `sucursal` y `tipos` que el modal, luego **`getSobreStockOtraSucursalParaPedidoEnviar`** sobre esas `rows` (alineado al PDF).

#### `generarPdfEnviarPedidoAction` (sobrestock otra sucursal, obligatorio)

- **Param opcional**: `confirmarSobreStock?: boolean` (default false).
- **Param opcional**: `ajustesSobreStock?: { idItemPedidoEnvio: string; cantPedir: number }[]` (el campo `idItemPedidoEnvio` es el **`id` de `prod_ped_merc`**; nombre histórico en API).
- **Regla** (antes de `crearPedidoHistoriaSnapshot` y de cualquier persistencia de historial):
  - Si `getSobreStockOtraSucursalParaPedidoEnviar` devuelve al menos un ítem y `confirmarSobreStock` es false, la Action responde `{ ok: false, error: "SOBRESTOCK_REQUIERE_CONFIRMACION:{cantidad}" }`.
  - Con `confirmarSobreStock === true`, se omite ese bloqueo y continúa el flujo normal (snapshot + PDF/WhatsApp + borrado de URGENTE/TINTOMETRICO). La UI debe mostrar el modal y reintentar solo con confirmación explícita del usuario.
  - Si la UI envía `ajustesSobreStock`, los ajustes se aplican **antes** de releer ítems para snapshot/PDF. El PDF y `prod_ped_historial` persisten la cantidad ya ajustada desde el modal.

#### Tabla `/pedidos/enviar` — `getItemsTablaEnviarPedido` / `getEnviarPedidoTablaData`

- **`getItemsTablaEnviarPedido`** (`pedidosEnvio.service.ts`): ítems desde **`prod_ped_merc`** con cantidad a pedir resuelta **`> 0`** por tipo (incluye `reposicion_cant_pedir` o fórmula de stock). Filtros opcionales: código de sucursal, `id` proveedor, lista de tipos, texto `q` (descripción tienda/proveedor). Sin ningún filtro → todas las filas elegibles.
- **`getEnviarPedidoTablaData`**: delega en **`getItemsTablaEnviarPedido`** pasando lo que venga de la URL (vacío = sin acotar).

#### Pedido Urgente — listado

- **`getPedidoUrgenteData`**: con **sucursal** válida ya se llama a **`getListaPreciosParaPedidoUrgente`**; proveedor y `q` (≥ 3 caracteres) son opcionales para filtrar. El parámetro `pedido` soporta `cualquier`, `urgente` y `reposicion`: para `urgente/cualquier` filtra por pares (`id_proveedor`, `cod_ext`) y para `reposicion` filtra por `cod_tienda` configurado en **`prod_ped_merc`** (`reposicion_cod_tienda`).
- **Comparación por menor costo en doble click (Pedido Urgente):** `getListaPreciosParaPedidoUrgente` expone por fila `estaVinculadoTienda` + `sugerenciaProveedorMenorCosto` cuando, para el mismo `id_lista_precios_tienda`, existe otro `prod_precios_provee` habilitado con costo menor (costo = `px_compra_final` o fallback `calcPxCompraFinal`). Esto habilita en frontend el cartel de desvío a proveedor más barato antes del modal de cantidad.

### 2.6 Servicio `pedidosHistoria.service.ts`

Contratos de funciones (SSOT de lógica y acceso a Prisma) para mantener consistencia e integridad:

1. `listarPedidosHistoria({ pagina, estado?, proveedorId?, sucursalCodigo?, q? })`
   - Uso: obtener página de cabeceras para el módulo de historial (`/pedidos/historial`).
  - `estado`: `PENDIENTE`, `RECEPCIONADO` o `ALL`. La UI por defecto envía/equivale a `PENDIENTE` si no hay parámetro en la URL.
   - Con `q` no vacío: solo pedidos que tengan al menos un ítem cuyo `cod_tienda` figure en `prod_precios_tienda` con descripción que contenga todas las palabras de `q` (insensible a mayúsculas).
   - Devuelve: `items` con `id`, `generadoAt`, `proveedorNombre`, `sucursalNombre`, `estado`, `registradoAt`, más `total`, `totalPaginas` y `paginaActual`.

2. `crearPedidoHistoriaSnapshot({ proveedorId, sucursalCodigo, tipos })`
   - Uso: llamada desde `generarPdfEnviarPedidoAction` para crear cabecera + items del snapshot justo antes de limpiar **`prod_ped_merc`** (URGENTE/TINTOMÉTRICO cuando corresponda).
   - Crea `PedidoHistoria` con `estado = "PENDIENTE"`.
   - Reutiliza **`getItemsYProveedorParaEnviar`** (mismas filas que el PDF): datos desde **`prod_ped_merc`** con proveedor y cantidades ya resueltas.
  - Consolidación por `cod_tienda` para `PedidoHistoriaItem` (fallback `1503` solo si no se puede resolver un código válido en alguna línea).
   - Inserta `PedidoHistoriaItem` consolidando por `cod_tienda` (para respetar UNIQUE por `cod_tienda`).
   - Inserta cada ítem con `cant_recibida = NULL` hasta que en recepción se guarde la cantidad recibida.

3. `getPedidoHistoriaDetalle({ pedidoHistoriaId })`
   - Devuelve cabecera + lista de items ordenados por `codTienda`.
   - Incluye `generado_at`, `registrado_at`, `cant_pedida`, `cant_recibida` y `descripcionTienda` (resuelta desde `prod_precios_tienda`) para renderizar la columna DESCRIPCIÓN en UI.

3b. `getPedidoHistoriaPdfPayload({ pedidoHistoriaId })`
   - Arma `ItemPedidoParaPdf[]` para **`generarPdfPedido`**: cantidades y `cod_tienda` desde ítems del snapshot; `cod_prod_proveedor` y descripción desde **`prod_precios_provee`** (mismo proveedor) con fila de **`prod_precios_tienda`** cuyo `cod_tienda` coincide (primer `cod_ext` estable). Action **`descargarPdfPedidoHistoriaAction`** devuelve `pdfBase64` + `filename` (prefijo proveedor y fecha/hora de `generado_at`).

4. `agregarPedidoHistoriaItem({ pedidoHistoriaId, codTienda, cantRecibida })`
   - Reglas:
     - Permitido también sobre cabeceras en estado `"RECEPCIONADO"` cuando la UI está en flujo de corrección de recepción.
     - Respeta UNIQUE(`pedido_historia_id`, `cod_tienda`): si el item ya existe devuelve error.
   - Inicializa `cant_pedida = cant_recibida = cantRecibida` (asumiendo igualdad para filas agregadas).

5. `actualizarPedidoHistoriaItemCantRecibida({ pedidoHistoriaItemId, cantRecibida })`
   - Reglas:
     - Permitido también sobre cabeceras en estado `"RECEPCIONADO"` cuando se corrige una recepción.
     - Actualiza únicamente `cant_recibida` (sin tocar `cant_pedida`).

5b. `guardarRecepcionPedidoHistoria({ pedidoHistoriaId, items })`
   - Uso: persistencia consolidada al final del flujo (botones **Registrar En Dux** / **Guardar Corrección**).
   - Entrada: snapshot completo del modal (`id?`, `codTienda`, `cantPedida`, `cantRecibida`).
   - Reglas:
     - Si `id` existe, actualiza la fila.
     - Si no hay `id` (ítem nuevo agregado en cliente), crea la fila.
     - Si una fila existente no llega en payload, se elimina.
     - Validar duplicados en payload y pertenencia de IDs al pedido antes de escribir.

6. `marcarPedidoHistoriaRegistrado({ pedidoHistoriaId })`
  - Transición: setea `estado = "RECEPCIONADO"` y `registrado_at` cuando el paso de export/registro en DUX termina OK.

6b. `reabrirPedidoHistoriaRecepcion({ pedidoHistoriaId })`
   - Uso: habilitar corrección de recepción desde UI cuando el pedido ya está `RECEPCIONADO`.
   - Transición: setea `estado = "PENDIENTE"` y limpia `registrado_at = NULL`.
   - Idempotente: si ya está en `PENDIENTE`, responde éxito sin cambios.

7. `eliminarPedidoHistoria({ pedidoHistoriaId })`
   - Borra la fila `PedidoHistoria`; los `PedidoHistoriaItem` se eliminan en cascada (`onDelete: Cascade`).

8. **Purge por antigüedad** (interno, no exportado): `purgarPedidosHistoriaExpirados` — antes de las mutaciones anteriores elimina cabeceras por estado (`PENDIENTE` >= 4 días, `RECEPCIONADO` >= 30 días); ítems en cascada. Ver bloque “Retención automática” en §2.5.

---

### 2.6b Servicio `pedidosEnvio.service.ts` (ajustes de sobrestock pre-generación)

Contrato para aplicar ajustes de cantidades confirmadas en el modal de sobrestock antes de generar el pedido:

1. `ajustarCantidadesParaGenerarPedido({ proveedorId, sucursalCodigo, tipos, ajustes })`
   - Entrada:
     - `proveedorId`: proveedor del pedido en generación.
     - `sucursalCodigo`: `guaymallen | maipu`.
     - `tipos`: tipos incluidos en el pedido (`URGENTE | TINTOMETRICO | REPOSICION`).
     - `ajustes`: `{ idItemPedidoEnvio, cantPedir }[]` confirmados por el usuario.
   - Reglas:
     - Valida que **todos** los IDs pertenezcan al scope (`proveedorId + sucursal + tipos`).
     - Si falta algún ID, devuelve error y no aplica cambios parciales.
     - Persiste en transacción `cant_pedir` y el campo específico por tipo (`urgente_cant_pedir`, `tintometrio_cant_pedir`, `reposicion_cant_pedir`).
   - Orquestación:
     - Se invoca desde `generarPdfEnviarPedidoAction` cuando llega `confirmarSobreStock: true` con `ajustesSobreStock`.
     - Debe ejecutarse antes de `getItemsYProveedorParaEnviar` y de `crearPedidoHistoriaSnapshot`.

---

### 2.7 Servicio `productosTienda.service.ts`

Contrato para resolver listados de productos en `prod_precios_tienda` destinados a selección en UI (p. ej. “Agregar Productos” dentro del modal de historial de pedidos).

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
     - Lee de DB las sucursales y resuelve `global_sucursales.id_dux` (columna `Sucursal.idDux` en Prisma).
    - Para cada sucursal válida (id_dux numérico), llama a DUX `compras` **en serie** (no en paralelo) con:
      - `fechaDesde`, `fechaHasta`, `idEmpresa`, `idSucursal=<id_dux>` y `limit=10`.
     - Entre cada petición a `/compras` y la siguiente espera **al menos 5 s** (DUX responde `429` si se supera la frecuencia). Intervalo configurable con `DUX_COMPRAS_MIN_INTERVAL_MS` (ms; por defecto `5000`; `0` desactiva la espera solo para entornos de prueba).
     - Si tras recorrer sucursales no hay comprobantes válidos y se usa el fallback sin `idSucursal`, también espera ese intervalo **después** de la última consulta por sucursal.
    - Del set resultante toma el mayor `comprobante` numérico y calcula `siguienteComprobante = maxComprobante + 5` usando `BigInt`.
   - Salida:
     - `{ ultimoComprobante: string, siguienteComprobante: string, totalImporte: number, fechaComp? }`
   - Errores:
     - Si DUX no devuelve resultados o el comprobante no es numérico, lanza error en la service y la Action lo transforma a `ActionResult`.

Acceso desde UI/cliente:
- La `server action` `src/actions/duxCompras.ts#getSiguienteComprobanteDuxCompraAction` exige `esEditor()` y valida parámetros con el mismo esquema Zod.

Persistencia de listados completos de `/compras` (campos extendidos en `duxComprasApi.mapCompra`): ver **§2.5a** y `sincronizarComprobantesProveedorDesdeDux` en `comprobantesProveedorDuxSync.service.ts`.

---

### 2.9 Servicio `exportRecepcionPedidoExcel.service.ts` (Excel recepción 97-2003)

Objetivo: construir el payload (filas + filename) del Excel 97-2003 con formato DUX para una recepción de pedido.

Contrato (SSOT de integración + armado de filas):

1. `getExportRecepcionPedidoExcelPayload({ pedidoHistoriaId, fechaFacturaIso, idEmpresaCompras? })`
   - Entrada:
     - `pedidoHistoriaId`: `cuid()` del snapshot en `prod_ped_historial`
     - `fechaFacturaIso`: `YYYY-MM-DD` (FECHA DE FACTURA desde el modal)
     - `idEmpresaCompras`: opcional; si no se pasa, se toma de `process.env.DUX_ID_EMPRESA_COMPRAS` o fallback `2482`.
   - Proceso:
     - Lee desde DB:
       - `prod_ped_historial.proveedor.id_proveedor_dux` => columna `ID PROVEEDOR`
      - `prod_ped_historial.sucursal.deposito` => columna `DEPOSITO`
       - `prod_ped_historial_merc.cod_tienda` y `cant_recibida` => `CÓDIGO PRODUCTO` y `CANTIDAD`
     - En el Excel, `FECHA` se exporta en formato `DD-MM-AAAA` con **fecha ingresada + 1 día** (si el usuario carga `2026-04-14`, `FECHA` sale `15-04-2026`). `FECHA IMPUTACION CONTABLE` se exporta con la fecha ingresada original (`14-04-2026` en el ejemplo).
    - Para resolver `COMPROBANTE` (DUX `/compras`), usar ventana fija en Argentina: `fechaHasta = hoy AR + 1 día` y `fechaDesde = hoy AR - 5 días`, sin usar `fechaFacturaIso`.
    - La resolución del comprobante mantiene la lógica del servicio DUX: una consulta por sucursal válida (`id_dux`) y `limit=10` por consulta.
    - Filtra ítems con `cant_recibida > 0` (no se exportan filas con `CANTIDAD = 0`).
    - Columna **`PRECIO INCLUYE IVA`**: siempre el literal **`SI`** en todas las filas del Excel de recepción.
    - Consulta DUX `compras` para obtener el `siguienteComprobante` (ultimo + 5) y `totalImporte`.
    - Para recepción de pedido, calcula `PRECIO` con: `totalPedidoIngreso / sum(cant_recibida)` usando el monto del input **TOTAL PEDIDO** del modal.
    - Si no se recibe `totalPedidoIngreso`, usa fallback en este orden:
      1) `prod_ped_historial.total` persistido al registrar recepción;
      2) `totalImporte` devuelto por DUX `/compras`.
   - Salida:
     - `{ sheetName, filename, rows }` donde `rows` ya tiene las claves/cabeceras exactas del Excel.

Notas:
- Este servicio prepara el payload; la generación binaria del `.xls` vive en la Action `src/actions/exportRecepcionPedidoExcel.ts` (usa `xlsx` con `bookType: "xls"`).
- Requiere la columna `global_sucursales.deposito` (TEXT), agregada en la migración `20260323090000_add_sucursales_deposito_column` (SQL histórico sobre `sucursales`).

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
| `@/lib/validations/common.ts` | `uuidSchema`, `uuidsSchema`, `prismaCuidSchema`, `prismaCuidOrUuidSchema` (UUID o CUID para FKs legacy), `globalSucursalIdSchema` (UUID, CUID o literal `suc_corporativo` para `global_sucursales.id`), `paramsPaginaSchema`. |
| `@/lib/validations/proveedores.ts` | `proveedoresPageParamsSchema` (query de página proveedores). |
| `@/lib/validations/pedidosLectura.ts` | `getPedidoUrgenteDataParamsSchema`, `getEnviarPedidoTablaParamsSchema`. |
| `@/lib/validations/reposicion.ts` | `sucursalReposicionSchema`, `reposicionFormaPedidoSchema` (`CANT_FIJA` \| `CANT_MAXIMA`), `getReposicionParamsSchema`, `productosReposicionSelectorSchema`. |
| `@/lib/validations/stock.ts` | `getControlStockParamsSchema`. |
| `@/lib/validations/tienda.ts` | `getTiendaPageParamsSchema`. |
| `@/lib/validations/cajasTesoreria.ts` | `crearCajaTesoreriaSchema`, `editarCajaTesoreriaSchema`, `eliminarCajaTesoreriaSchema`, `tipoCajaTesoreriaSchema`. |
| `@/lib/validations/movimientosFinanzas.ts` | `crearMovimientoFinanzasSchema`, `tipoMovimientoFinanzasSchema`, `montoMovimientoFinanzasSchema`; `sucursalId` → `globalSucursalIdSchema`. |
| `@/lib/validations/finBalGastosCatalogo.ts` | CRUD de la jerarquía `fin_bal_gasto_tipo / rubro / gasto` + `fin_bal_gasto_final`: `crear*Schema`, `editar*Schema`, `eliminar*Schema` (incluye `*FinBalGastoFinal*`). `nombre` con `trim + toUpperCase`; jerarquía con `prismaCuidSchema`; gasto final: `gastoId`/`proveedorId` con `prismaCuidOrUuidSchema`, **`sucursalId` con `globalSucursalIdSchema`**; `gastoMensual` boolean; `diaDevengado` (1–28) y `vencimiento` (0–3650 días). |
| `@/lib/validations/finBalGastoMensualBalance.ts` | `fin_bal_gasto_mensual`: `mesAnioQuerySchema`, `cargarImputacionesMesParamsSchema`, `editarMontoFinBalGastoMensualSchema`, `eliminarFinBalGastoMensualSchema`, `obtenerMontoMesAnteriorSchema`. |

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

- **`tienda.ts`**: `getTiendaPageData`, `getUltimoSync` y `getControlAumentos` comprueban `getRol()` + `puede()` (`PERMISOS.tienda.acceso` / `controlAumentos`). `convertirEnProveedor` conserva validación Zod pero devuelve error funcional (cambio manual de proveedor en BD deshabilitado). `cambiarAProveedorMenorCostoAction` (masiva) exige `esEditor()`, recibe IDs validados con Zod, selecciona candidato no oficial con **menor costo y `habilitado = true`** y devuelve solo payload para exportar **Act. Proveedor** / **Act. Margen**; **no** actualiza `prod_precios_tienda`.
- **`syncListaPrecioTienda.service.ts`**: deduplica por `cod_tienda` dentro de cada chunk y hace `upsert` con `where: { codTienda }`; en **`update`** se persisten **todas** las columnas sincronizadas desde DUX, incluido **`cod_ext`**. Si DUX cambia `cod_ext`/`proveedor` para el mismo `cod_tienda`, la misma fila se actualiza (no se crea otra por `cod_ext`). Al finalizar la sync elimina de `prod_precios_tienda` los `cod_tienda` que ya no llegaron en la corrida actual desde DUX.
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
- PDF “Generar Pedido”: usar `src/lib/generarPdfPedido.ts` como SSOT para el layout. El PDF debe titular “Nota de Pedido”, incluir “Fecha” con formato `dddd de mmmm de aaaa` y una tabla con columnas `CANT.`, `COD.` y `DESCRIPCION` en ese orden; las filas van **ordenadas alfabéticamente** por el texto de **DESCRIPCION** (`localeCompare` `es`, `sensitivity: "base"`). Los datos deben venir de `cant_pedir`, `cod_proveedor` (vacío si no existe) y `descripcion_proveedor` priorizando `descripcion_proveedor`, luego `tintometrico_descripcion` (y como fallback `descripcion_tienda`). El archivo exportado debe llamarse `Nota Pedido - {Prefijo Proveedor} - dd/mm hh:mm.pdf`. Opción **`fechaDocumento`** en `generarPdfPedido`: al **volver a descargar** desde historial (`descargarPdfPedidoHistoriaAction`) usar `generado_at` del snapshot para encabezado y nombre de archivo, no la fecha actual. En celdas `COD.` y `DESCRIPCION`, el texto debe hacer wrap en múltiples líneas dentro de la columna y **no** truncarse con `...`.
- Al ejecutar el botón de **Generar Pedido** (server action `generarPdfEnviarPedidoAction`), limpiar **`prod_ped_merc`** (tipos `URGENTE` y/o `TINTOMETRICO`) para la `sucursal` enviada, y revalidar las rutas afectadas (`/pedidos/enviar`, `/pedidos/urgente`, `/pedidos/tintometrico`).

### 5.4 Cambios aplicados en esta auditoría

| Archivo / Área | Cambio |
|----------------|--------|
| `src/services/pedidosEnvio.service.ts`, `src/services/sobreStock.service.ts`, `src/services/listaPrecios.service.ts` | **Circuito REPOSICIÓN por `cod_tienda` (2026-04-28):** no se persiste el `cod_ext` **comercial** de catálogo en reposición; la clave de negocio es `cod_tienda`. Por el unique de BD `(id_proveedor, tipo, sucursal, cod_ext)`, cada fila guarda un **surrogado** estable `REPO_TIENDA:{cod_tienda}` (no es el `cod_ext` de `prod_precios_tienda`). La resolución para PDF/envío usa `cod_tienda` → catálogo vigente. `getItemsYProveedorParaEnviar` recompone filas REPOSICIÓN con proveedor/código vigentes, `getSobreStockOtraSucursalParaPedidoEnviar` usa topes por `cod_tienda`, y `getListaPreciosParaPedidoUrgente` filtra reposición por `cod_tienda`. Migración `20260429120000_reposicion_cod_ext_surrogate`: dedupe + normalización de filas ya existentes. |
| `prisma/migrations/20260429001000_reposicion_sync_por_cod_tienda/migration.sql` | (Histórico: aplicaba sobre la tabla legada `prod_ped_merc`.) Se redefine `sync_pedidos_mercaderia_cant_pedir` y el trigger `trg_sync_reposicion_on_precios_tienda_stock` para que REPOSICIÓN recalcule por `cod_tienda` (no por `cod_ext`) en `BEFORE INSERT/UPDATE` de pedidos mercadería y en cambios de stock en `prod_precios_tienda`. Tras `20260430103000_drop_prod_ped_merc_legacy` la función/trigger asociados a la tabla legada se eliminan; la lógica equivalente en runtime usa **`prod_ped_merc`**. |
| `src/services/pedidosEnvio.service.ts` | `upsertPedidoMercaderiaReposicionConfig`: validación de `reposicion_punto_pedido` admite `0` (solo rechaza `< 0`). Persistencia REPOSICIÓN por `cod_tienda`: `prod_precios_tienda.cod_tienda` → `cod_ext` + proveedor vigentes; al guardar se eliminan otras filas **`prod_ped_merc`** `REPOSICION` para la misma `sucursal + cod_tienda` con proveedor/cod_ext obsoletos. |
| `src/actions/syncListaPrecioTienda.ts` | Comprobación `esEditor()` al inicio; si no hay permiso, se devuelve resultado vacío con `errores: ["Sin permisos de editor."]`. |
| `src/actions/importar.ts` | `importarProductos` e `importarListaPreciosProveedor` devuelven `ImportActionResult` (éxito con `data` o error con `error`) en lugar de lanzar; try/catch en importar lista para devolver error controlado. |
| `src/actions/listaPrecios.ts` | `actualizarListaPreciosMasivoAction`: validación con `idsUuidSchema` y `actualizacionMasivaListaPreciosSchema` antes de llamar al servicio. |
| `src/lib/validations/listaPrecios.ts` | Nuevo: esquemas `idsUuidSchema` y `actualizacionMasivaListaPreciosSchema` para edición masiva. |
| `src/components/proveedores/ImportarModal.tsx` | Manejo de respuesta: comprueba `res.ok` y usa `res.data` o `res.error` según corresponda. |
| **Fase 2 (cierre de auditoría)** | |
| `src/actions/pedidos.ts` | `getPedidoUrgenteData`: comprobación `getRol()` + `puede(rol, PERMISOS.pedidos.acceso)`; si no hay acceso se devuelve estructura vacía (proveedores mock, productos [], total 0). |
| `src/actions/stock.ts` | `getControlStock`: comprobación `getRol()` + `puede(rol, PERMISOS.stock.acceso)`; retorno vacío si no hay acceso. `registrarExportacionExcelStock`: persiste `ultimaExportacionExcel` (ActionResult<void>), validación de `ids` con Zod (UUIDs), comprobación de acceso; componente muestra toast en error. Además, `getControlStock` soporta ordenamiento por `ultima_exportacion_excel` con `NULL` como “más antiguo”. |
| `src/actions/vinculos.ts` | `vincularProducto` y `desvincularProducto`: validación de IDs con `uuidSchema` antes de tocar Prisma. `desvincularProducto` bloquea eliminar el vínculo oficial cuando el ítem tiene más de un vínculo (oficial + alternativo): primero debe cambiarse el proveedor oficial y recién luego desvincular. |
| `src/actions/productos.ts` | `editarProducto`: validación con `editarProductoSchema` (id + campos). `aplicarCampoMasivo`: validación con `aplicarCampoMasivoSchema` (proveedorId, campo, valor, q). |
| `src/actions/comparacionCategorias.ts` | Todas las acciones devuelven `ActionResult<T>` unificado; validación Zod para todos los parámetros (UUIDs, nombres, etc.) vía `src/lib/validations/comparacionCategorias.ts`; respuestas de error solo `{ ok: false, error }`; asignar/quitar asignación devuelven `data: { count }`. |
| `src/lib/validations/common.ts` | Nuevo: `uuidSchema`, `uuidsSchema`, `paramsPaginaSchema` reutilizables. |
| `src/lib/validations/productos.ts` | Nuevo: `camposEditablesProductoSchema`, `editarProductoSchema`, `campoMasivoSchema`, `aplicarCampoMasivoSchema`. |
| `src/lib/validations/comparacionCategorias.ts` | Nuevo: esquemas para CRUD categorías, subcategorías, presentaciones y asignación de productos. |
| Componentes comparación/stock | `ComparacionCategoriasClient`: uso de `res.data` en `getProductosPorPresentacionAction`. `AsignarProductosModal`: uso de `res.data?.count`. `TablaStock`: manejo de `registrarExportacionExcelStock` con toast en error. |
| Comp. Por Cat. | Nueva persistencia de `DTO. EXTRA` (0-99 o null) por ítem aislada en tabla `prod_comp_dto_extra` (antes `comparacion_dto_extra_items`), con Action `actualizarDtoExtraComparacionAction` y servicio `getProductosPorPresentacion` que devuelve `dtoExtraComparacion`. |

---

### 5.5 Histórico: sucursal por ID en pedidos mercadería (antes `prod_ped_merc`)

| Archivo / Área | Cambio |
|----------------|--------|
| `prisma/schema.prisma` | Modelo canónico **`ProdPedMerc2`** → tabla **`prod_ped_merc`** (`@@map`). El legado `ItemPedidoEnvio` / columnas viejas se eliminó con `20260430103000_drop_prod_ped_merc_legacy`; el rename `prod_ped_merc_2` → `prod_ped_merc` en `20260430120000_rename_prod_ped_merc_2_to_prod_ped_merc`. |
| `prisma/migrations/20260317213000_migrate_prod_ped_merc_sucursal_to_fk_id/migration.sql` | Migración de datos y esquema: crea `sucursal_id`, migra datos desde `sucursal` por join a `sucursales.codigo` (hoy `global_sucursales.codigo`), elimina `sucursal`, crea FK a `sucursales.id` (hoy `global_sucursales.id`) e índice único nuevo por `sucursal_id`. |
| `src/services/pedidosEnvio.service.ts` | Lecturas/escrituras en **`prodPedMerc2`** por `sucursalId`; helper para resolver `codigo -> id` sin romper contratos de frontend (p. ej. `idItemPedidoEnvio` en payloads = id de fila en `prod_ped_merc`). |
| `src/actions/reposicion.ts` | Consultas de configuración REPOSICIÓN pasan de `where.sucursalCodigo` a `where.sucursal.codigo` para mantener filtros por código en UI con relación en BD. |
| `src/services/listaPrecios.service.ts` | Consulta de estado URGENTE/REPOSICIÓN pasa de `sucursalCodigo` a relación `sucursal.codigo`. |
| `prisma/migrations/20260319091000_update_px_compra_final_sum_discounts/migration.sql` | `px_compra_final` pasa a descuentos acumulados (sumados): `dtoTotal = dto_proveedor + dto_marca + dto_rubro + dto_cantidad + dto_financiero` (capado 0-100), manteniendo `cx_transporte` como factor porcentual final. |
| `scripts/verify-pedidos-reposicion.ts` | Esquema esperado actualizado: `sucursal_id` y columnas actuales `reposicion_*`, `urgente_*`, `tintometrico_*`. |
| `src/services/pedidosEnvio.service.ts` | Regla de fallback en vinculación por `cod_ext`: si no existe vínculo a tienda, `cod_tienda = "1503"`; si falta código proveedor, `cod_proveedor = ""` (vacío). |
| `src/services/pedidosEnvio.service.ts` | `upsertPedidoMercaderiaUrgenteItem`: para persistir `cod_tienda` y `descripcion_tienda` usar la relación `listaPrecioProveedor.listaPrecioTienda` (vinculación explícita) y no lookup directo por `cod_ext` en `prod_precios_tienda`; esto evita descripciones erróneas en historial cuando el producto vinculado no coincide con el cod_ext oficial. |
| `prisma/migrations/20260317223000_sync_cant_pedir_por_tipo_pedido/migration.sql` | Regla de negocio a nivel BD: `cant_pedir` se sincroniza automáticamente por `tipo_de_pedido` (`TINTOMETRICO -> tintometrio_cant_pedir`, `URGENTE -> urgente_cant_pedir`, `REPOSICION -> reposicion_cant_pedir`) con trigger `BEFORE INSERT OR UPDATE`. |
| `prisma/migrations/20260317232000_sync_reposicion_cant_pedir_por_forma_y_stock/migration.sql` | Regla de reposición a nivel BD: `reposicion_cant_pedir` según forma y stock (versión inicial; ver migración canonical). |
| `prisma/migrations/20260330120000_reposicion_forma_pedido_canonical/migration.sql` | `reposicion_forma_pedido` solo admite **`CANT_FIJA`** o **`CANT_MAXIMA`** (normaliza legados `CANT. FIJA` / `CANT. MAX.`). Trigger: `CANT_FIJA` => `reposicion_cant_pedir = reposicion_cant_conf`; `CANT_MAXIMA` => `GREATEST(0, reposicion_cant_conf - stock sucursal)`; luego `cant_pedir` para `REPOSICION`. |
| `prisma/migrations/20260330153000_reposicion_punto_stock_trigger/migration.sql` | Reposición con condición inicial por punto: solo calcula pedido cuando `stock_sucursal <= reposicion_punto_pedido`; fuera de ese caso `reposicion_cant_pedir = 0`. Mantiene formas canónicas (`CANT_FIJA` / `CANT_MAXIMA`) y agrega trigger `AFTER UPDATE` en `prod_precios_tienda` (`stock_maipu`, `stock_guaymallen`) para forzar recálculo de ítems REPOSICION tras sincronización DUX. |
| `prisma/migrations/20260318000000_add_sync_dux_status/migration.sql` | Nueva tabla `sync_dux_status` para persistir estado de sincronización DUX en BD (`running`, `phase`, `processed`, `total`, `error`, `last_completed_at`, `updated_at`) y soportar polling estable en sidebar. |
| `prisma/schema.prisma` | Nuevo modelo `SyncDuxStatus` (mapeo a `sync_dux_status`) para tipado fuerte y evitar SQL raw en lecturas/escrituras. |
| `src/lib/syncDuxStatusDb.ts` | Helper tipado de persistencia de estado DUX (start/progress/success/error + lectura) usando Prisma. `last_completed_at` se actualiza **solo en sync OK**; en error se mantiene `processed/total` (no se resetean al hacer update por conflicto). |
| `src/app/api/sync-lista-precios-tienda/route.ts` | `GET` y `POST` validan `puede(rol, PERMISOS.tienda.acciones.sincronizar)` (simple y editor); evitan doble ejecución y persisten progreso/resultado vía helper. Ante `SyncListaPrecioTiendaCancelledError` limpia estado con `clearListaPrecioTiendaSyncRunningStateInDb` y responde `200` con `cancelled: true` **sin** tocar `lastCompletedAt`. |
| `src/app/api/sync-lista-precios-tienda/cancel/route.ts` | `POST`: mismo permiso; `requestCancelListaPrecioTiendaSyncInDb` (solo si `running`) para señalar cancelación sin actualizar `lastCompletedAt`. |
| `src/app/api/sync-lista-precios-tienda/status/route.ts` | `GET` lee estado desde BD y expone `lastCompletedAt` para UI de sidebar. |

---

### 5.6 Optimización de persistencia (lista precios)

| Archivo / Área | Cambio |
|----------------|--------|
| `src/services/listaPrecios.service.ts` | `upsertListaPrecios()`: optimiza el conteo `creados/actualizados` con un prefetch en chunks de `codProdProv`, evitando el `findUnique()` por fila (patrón N+1) sin cambiar la lógica final del `upsert`. |
| `prisma/migrations/20260413120000_add_stockeable_prod_precios_tienda/migration.sql` | Columna `stockeable` en `prod_precios_tienda` (default `true` para legado). |
| `src/lib/duxApi.ts` | `ItemDux.stockeable` y `mapItem`: ambos depósitos DUX con `ctd_disponible` no nulo → `true`. |
| `src/services/syncListaPrecioTienda.service.ts` | Upsert persiste `stockeable`. |
| `src/actions/stock.ts`, `src/services/sobreStock.service.ts`, `src/services/pedidosEnvio.service.ts`, `src/actions/tienda.ts`, `src/components/tienda/TablaTienda.tsx` | Lecturas/filtros y reglas de reposición alineadas al flag. |

### 5.9 Tienda — módulo `Px. Tinto / Cal. Lts.` (lectura por rol)

| Archivo / Área | Cambio |
|----------------|--------|
| `src/lib/permisos.ts` | Nuevo permiso `PERMISOS.tienda.tintoLts` (`simple: true`, `editor: true`) para habilitar el submódulo sin abrir acceso a `Comp. Proveedores`. |
| `src/actions/tienda.ts` | Nueva action de lectura `getProveedoresTintoLts()` con `getRol()` + `puede(rol, PERMISOS.tienda.tintoLts)`; devuelve `nombre`, `prefijo`, `coeficienteTintometrico` para cálculo frontend sin persistencia. |

## 6. Organización en Cursor (prompts y reglas persistentes)

- Archivo recomendado para prompts reutilizables: `.cursor/prompts.md`.
- `.cursor/prompts.md` incluye el bloque **Dream Team de 5 agentes** con perfiles de arquitectura backend, frontend y auditoría; usar el perfil de backend/auditor backend cuando la tarea afecte `src/actions/`, `src/services/`, Prisma, seguridad o integraciones.
- Reglas persistentes activas en `.cursor/rules/`:
  - `manuales-obligatorios.mdc`: exige revisar guías frontend/backend antes de modificar código.
  - `flujo-fullstack-end-to-end.mdc`: estandariza ciclo de implementación y cierre con actualización documental.
- Si se crea o modifica una Server Action, servicio, validación Zod, contrato de respuesta o regla de seguridad, registrar el cambio en este documento y mantener coherencia con las reglas de `.cursor/rules/`.

*Última actualización (2026-04-24): **Balance mensual** y **`fin_bal_vtas`** (resumen, upsert, unique, revalidaciones, helpers `fmtMargenContribucionPct` / `puntoEquilibrioVentasPesos`) — ver **§2.5f**.*

*Última actualización (2026-04-21): `global_proveedores.prefijo` **opcional** (NULL permitido; unique PostgreSQL). Alta sin prefijo: servicio genera `codigo_unico` tipo `Z`+hex; importación de lista usa `prefijo` efectivo = prefijo trim o `codigo_unico`. Migración `20260421180000_global_proveedores_prefijo_nullable` + función `trg_lista_precios_set_cod_ext` con `COALESCE(NULLIF(trim(p.prefijo), ''), p.codigo_unico)` para `cod_ext`. Zod: `prefijoProveedorOpcionalSchema`, `proveedorMercaderiaFormSchema` (SI/NO obligatorio desde form). Ver §1.11c.*

*Última actualización: 2026-04-21 — **rename** de catálogos maestros: `marcas` → `prod_marcas`, `proveedores` → `global_proveedores`, `sucursales` → `global_sucursales` (migración `20260421120000_rename_marcas_proveedores_sucursales`). Incluye renames de PK/uniques/índices y del CHECK de prefijo; coexiste el unique legado `global_proveedores_nombre_legacy_ux` (antes `idx_proveedores_nombre`) junto a `global_proveedores_nombre_key`. Se recrean `sync_pedidos_mercaderia_cant_pedir` (lee `global_sucursales`) y `trg_lista_precios_set_cod_ext` (lee `global_proveedores`). Prisma: `@@map` en `Marca`, `Proveedor`, `Sucursal` + `map:` en uniques y en `@@index([proveedorMercaderia])`. Raw SQL y comentarios alineados en services/actions listados en el diff del commit. — 2026-04-18 — **rename masivo** de 7 tablas al esquema de prefijado por dominio (`prod_*` para productos/pedidos/precios; `fin_*` para finanzas). Migración `20260418290000_rename_7_tablas_prod_fin`: (1) `pedidos_historia` → `prod_ped_historial`, (2) `pedidos_historial_mercaderia` → `prod_ped_historial_merc`, (3) `pedidos_mercaderia` → `prod_ped_merc`, (4) `precios_proveedores` → `prod_precios_provee`, (5) `precios_tienda` → `prod_precios_tienda`, (6) `cajas_tesoreria` → `fin_tesoreria_cajas`, (7) `comprobantes_proveedor` → `fin_compras_comprobante`. Cada rename incluyó `ALTER TABLE … RENAME TO` + renames explícitos de PK, FKs, índices y unique constraints (PostgreSQL no los auto-renombra al renombrar la tabla). Estrategia defensiva con `IF EXISTS` en todos los renames de constraints/índices: si algún nombre difiere de la convención por historia, se saltan silenciosamente — la tabla sigue funcional porque PostgreSQL resuelve FKs por OID, no por nombre. **Funciones plpgsql recreadas** con los nombres nuevos: `sync_pedidos_mercaderia_cant_pedir()` (referenciaba `precios_tienda` en su cuerpo) ahora usa `prod_precios_tienda`; `sync_reposicion_on_precios_tienda_stock_change()` (referenciaba `pedidos_mercaderia`) ahora usa `prod_ped_merc`. Los triggers siguen a la tabla automáticamente (sus nombres quedan desalineados — cosmético, funcional OK; se renombran en la misma migración vía `ALTER TRIGGER … RENAME TO …`). **`@@map` actualizados** en `schema.prisma` (7 tablas) + 2 unique nombrados (`cajas_tesoreria_nombre_titular_ux` → `fin_tesoreria_cajas_nombre_titular_ux`; `comprobantes_proveedor_natural_ux` → `fin_compras_comprobante_natural_ux`). **Nombres TypeScript sin cambios** (modelos Prisma `PedidoHistoria`, `PedidoHistoriaItem`, `ItemPedidoEnvio`, `ListaPrecioProveedor`, `ListaPrecioTienda`, `CajaTesoreria`, `ComprobanteProveedor` y todos sus Action/Service consumidores se mantienen — el rename afecta solo nombres físicos vía `@@map(...)`). Raw SQL actualizado en: services (`deudaProveedores`, `controlComprobantes`, `vencimientosPorFecha`, `listaPrecios`, `vinculosPorCodExt`), actions (`tienda`), scripts de verificación/simulación y `scripts/ensure-comparacion-dto-extra-items.js`. Script de bootstrap `scripts/neon-comprobantes-proveedor.sql` → `scripts/neon-fin-compras-comprobante.sql` (archivo viejo queda como redirector DEPRECADO). **Motivación**: unificar el prefijado por dominio que ya se había iniciado con `prod_comp_*` y `prod_rendimientos`, y el `fin_bal_*` / `movimientos_finanzas`. Con este batch, la base queda dividida limpiamente: `prod_*` para productos/pedidos/precios, `fin_*` para finanzas/tesorería/compras; los maestros de sucursal/proveedor pasaron luego a `global_*` y el catálogo de marcas a `prod_marcas` (ver entrada 2026-04-21). **Contradicción con revert anterior resuelta**: dos días atrás se había revertido el rename `comprobantes_proveedor` → `prod_comp_provee` porque `prod_comp_*` se reservó al dominio "Comparación por Categoría"; ahora la tabla pasa a `fin_compras_comprobante` (prefijo `fin_*`, domino correcto). Sin pérdida de datos: los registros de las 7 tablas persisten intactos. Rollback: migración inversa con los nombres viejos. — **rename** de la tabla de catálogo de rendimientos por tipo de pintura: `tipos_pintura_rendimientos` → `prod_rendimientos`. Migración `20260418280000_rename_tipos_pintura_rendimientos_a_prod_rendimientos`: `ALTER TABLE … RENAME TO` + renames de PK (`tipos_pintura_rendimientos_pkey` → `prod_rendimientos_pkey`), del índice UNIQUE case-insensitive con expresión `LOWER(tipo_pintura)` (`ux_tipos_pintura_rendimientos_tipo_lower` → `ux_prod_rendimientos_tipo_lower`) y del CHECK sobre `rendimiento` (`tipos_pintura_rendimientos_rendimiento_check` → `prod_rendimientos_rendimiento_check`). La tabla **no está modelada en `schema.prisma`** (se usa exclusivamente vía `$queryRaw` / `$executeRaw` en `src/actions/tiposPinturaRendimientos.ts`), por lo que no hubo `@@map(...)` que actualizar; sí se actualizaron las 4 raw SQL del Action (SELECT listado, UPDATE, INSERT, DELETE). **Nombres TypeScript sin cambios**: el archivo `tiposPinturaRendimientos.ts`, los exports `getTiposPinturaRendimientosAction`, `upsertTipoPinturaRendimientoAction`, `deleteTipoPinturaRendimientoAction`, y el tipo `TipoPinturaRendimiento` se mantienen — el rename afecta solo la capa física en PostgreSQL. Consumidor UI: `/tienda/litros` (Cálculo de Lts + modal Editar Rendimientos). Sin pérdida de datos. Rollback: inverso `ALTER … RENAME TO …` a los nombres originales. — **revert parcial del rename masivo** del mismo día: la tabla de comprobantes DUX **vuelve a su nombre original `comprobantes_proveedor`** (no se queda como `prod_comp_provee`). Migración `20260418270000_revert_rename_comprobantes_proveedor`: `ALTER TABLE prod_comp_provee RENAME TO comprobantes_proveedor` + rename inverso de PK, FK, índices `_fecha_comp_idx`, `_id_proveedor_idx` y del UNIQUE con `map:` explícito (`prod_comp_provee_natural_ux` → `comprobantes_proveedor_natural_ux`). **Nota**: este nombre original `comprobantes_proveedor` fue reemplazado definitivamente el mismo día por `fin_compras_comprobante` (migración `20260418290000_rename_7_tablas_prod_fin`, ver entrada más reciente arriba). `schema.prisma` restaurado en ese momento a `@@map("comprobantes_proveedor")` / `map: "comprobantes_proveedor_natural_ux"`. Raw SQL de `controlComprobantes.service.ts`, `vencimientosPorFecha.service.ts` y `deudaProveedores.service.ts` vuelto a `FROM comprobantes_proveedor` en ese momento. Script de bootstrap `scripts/neon-prod-comp-provee.sql` → `scripts/neon-comprobantes-proveedor.sql` (contenido restaurado). Comentarios en `src/lib/duxComprasApi.ts`, `src/actions/comprobantesProveedor.ts` y `schema.prisma` restaurados al nombre original en ese momento. **Motivación**: el prefijo `prod_comp_*` queda reservado exclusivamente al dominio "Comparación por Categoría" (lectura `prod[ucto]_comp[aración]`) y no debe mezclarse con tablas del dominio "Comprobantes DUX". Los 4 renames de comparación (`prod_comp_cat`, `prod_comp_sub_cat`, `prod_comp_presentaciones`, `prod_comp_dto_extra`) **se mantienen**. Sin pérdida de datos (los 475 comprobantes DUX persisten intactos durante ambos renames). — **rename masivo** de 5 tablas (migración `20260418260000_rename_prod_comp_y_comprobantes`) — inicialmente incluyó los 5 renames, pero la migración de revert anterior deja vigentes **solo 4** en producción: `comparacion_categorias` → `prod_comp_cat`, `comparacion_subcategorias` → `prod_comp_sub_cat`, `comparacion_presentaciones` → `prod_comp_presentaciones`, `comparacion_dto_extra_items` → `prod_comp_dto_extra`. Cada rename incluyó `ALTER TABLE … RENAME TO` + renames explícitos de PK, FKs e índices (PostgreSQL no los auto-renombra al renombrar la tabla). Los nombres de los **modelos Prisma** (y el API TS `prisma.categoriaComparacion.*`, `prisma.subcategoriaComparacion.*`, etc.) **no cambiaron**: el rename afecta solo nombres físicos vía `@@map(...)`. **Limpieza colateral**: eliminado `prisma/rename_comparacion_tables.sql` (script huérfano de un rename histórico que dejó las constraints con nombres desalineados — `categorias_comparacion_pkey`, `subcategorias_comparacion_categoria_id_fkey`, etc. — ahora ya alineados al prefijo `prod_comp_*`); `scripts/ensure-comparacion-dto-extra-items.js` actualizado para usar `prod_comp_dto_extra`. — **alta** del flag `sucursales.centro_costo` (Prisma `Sucursal.centroCosto`, `BOOLEAN NOT NULL DEFAULT FALSE`). Migración `20260418250000_add_sucursales_centro_costo` (`ALTER TABLE "sucursales" ADD COLUMN "centro_costo" BOOLEAN NOT NULL DEFAULT FALSE`). Concepto **ortogonal a `pedido`**: `pedido` gobierna participación en flujos de pedidos de mercadería; `centro_costo` marca a la sucursal como centro de imputación contable en reportes/balance. Sin índice (cardinalidad 2, se lee como payload). Sin UI de edición (no hay formulario de alta/edición de sucursales): el flag se administra por seed / UPDATE manual, igual que el resto de atributos del maestro `sucursales`. Sin backfill automático: los registros preexistentes quedan en `false` (opt-in explícito); cuando se defina la política funcional se marcan con `UPDATE sucursales SET centro_costo = TRUE WHERE codigo IN (...)`. Sin cambios en Zod/service/action (ningún consumidor filtra todavía por este flag). Ver §2.5b. — **baja** de la columna `fin_bal_gasto.repite_monto` (introducida horas antes en `20260418220000_add_fin_bal_gasto_flags_mensual_repite`). Migración `20260418240000_drop_fin_bal_gasto_repite_monto` (`ALTER TABLE … DROP COLUMN IF EXISTS`). Se saca el campo `repiteMonto` del schema Prisma, de `FinBalGastoItem`, de los Zod `crear/editar*Schema`, de la capa de servicio (writes y reads) y del modal `CrearEditarFinBalCatalogoItemModal` (Select `REPITE MONTO` + estado + prop `repiteMontoInicial`); la meta del gasto en la columna GASTOS deja de mostrar el badge "Repite monto". **`gasto_mensual` se conserva**. El caso de uso ("recordar último monto") se moverá a `movimientos_finanzas` cuando aplique. Sin impacto productivo: los gastos existentes tenían el valor `DEFAULT FALSE`. — **cambio de regla de unicidad** en `fin_bal_gasto`: de `UNIQUE (rubro_id, nombre)` a `UNIQUE (rubro_id, nombre, proveedor_id)` (Prisma `@@unique([rubroId, nombre, proveedorId])`, map `fin_bal_gasto_rubro_nombre_proveedor_ux`). Ahora dentro de un mismo rubro el `nombre` puede repetirse si el `proveedor` es distinto. Para cubrir el caso "dos gastos sin proveedor con el mismo nombre en el mismo rubro" (que el UNIQUE estándar no bloquea porque PostgreSQL trata `NULL ≠ NULL`), la migración agrega **adicionalmente** un UNIQUE parcial `fin_bal_gasto_rubro_nombre_sin_prov_ux ON (rubro_id, nombre) WHERE proveedor_id IS NULL`, que vive solo en SQL (Prisma 7.4.1 no soporta índices parciales ni `NULLS NOT DISTINCT` en `@@unique`). Migración `20260418230000_fin_bal_gasto_unique_rubro_nombre_proveedor` (compatible con datos existentes — el constraint previo era más restrictivo). `mapDbError` de `gasto` diferencia el mensaje de `P2002` leyendo `meta.target` / `meta.constraint` (si contiene `sin_prov` → "Ya existe un gasto sin proveedor con ese nombre…", si no → "Ya existe un gasto con ese nombre y ese proveedor…"). — **alta** de los flags `fin_bal_gasto.gasto_mensual` y `fin_bal_gasto.repite_monto` (ambos `BOOLEAN NOT NULL DEFAULT FALSE`). Migración `20260418220000_add_fin_bal_gasto_flags_mensual_repite` (idempotente: `ADD COLUMN … DEFAULT FALSE` x2). Schema Prisma: `gastoMensual` / `repiteMonto` en `FinBalGasto`. Zod: nuevo helper local `booleanFlagSchema` (union `string | boolean | null | undefined` → `boolean`; acepta `"si"/"sí"/"true"/"1"` como `true`) en `crearFinBalGastoSchema` y `editarFinBalGastoSchema`. Servicio: `FinBalGastoItem` expone `gastoMensual` / `repiteMonto` (siempre `boolean`); `crearFinBalGasto` / `editarFinBalGasto` los persisten; `listarFinBalGastosPorRubro` y `listarFinBalGastosJerarquia` los incluyen en el payload. Los registros preexistentes quedan en `false` (opt-in explícito desde el modal del catálogo). Sin índices: cardinalidad baja + el catálogo se lee siempre vía jerarquía rubro→gasto. — **alta** del helper `getProveedoresNoMercaderia()` en `src/services/proveedor.service.ts` (contraparte simétrica de `getProveedoresMercaderia()`): filtra `where: { proveedorMercaderia: false }` reutilizando `listarProveedoresInterno` y el índice `global_proveedores_proveedor_mercaderia_idx`. La página `/finanzas/balance/gastos/catalogo` ahora consume `getProveedoresNoMercaderia()` en lugar de `getProveedores()` para popular la columna "PROVEEDORES" con el catálogo maestro de **proveedores no-mercadería** (gastos operativos / servicios / impuestos), dejando los de mercadería circunscriptos a su propio módulo. La página previamente consumía `getProveedores()` cuando la columna se introdujo (histórico abajo). — **extensión** del flag `proveedor_mercaderia` al modal **Nuevo/Editar Proveedor** (`ProveedorForm.tsx` + `ProveedorModal.tsx`): Select SI/NO controlado + hidden `<input name="proveedorMercaderia">` para `FormData`; `proveedorMercaderiaSchema` (union string/boolean/null/undef → boolean) en `createProveedorSchema` y `updateProveedorSchema`; `CreateProveedorInput.proveedorMercaderia?` y `UpdateProveedorInput.proveedorMercaderia?` opcionales (undefined = no tocar). Default UX en alta: "SI". Consumidores del modal (`TablaProveedoresLista`, `TablaProveedoresGestion`) propagan el valor persistido a `ProveedorParaModal.proveedorMercaderia` para precarga en edición. — **alta** de `fin_bal_gasto.proveedor_id` (FK opcional a `proveedores`, `BOOLEAN NULLable`, `onDelete: SET NULL`, `onUpdate: CASCADE`, índice `fin_bal_gasto_proveedor_id_idx`). Migración `20260418210000_add_fin_bal_gasto_proveedor_id`. Schema Prisma: campo `proveedorId` + relación `proveedor Proveedor?` en `FinBalGasto` y relación inversa `finBalGastos FinBalGasto[]` en `Proveedor`. Zod (`crearFinBalGastoSchema` / `editarFinBalGastoSchema`) acepta `proveedorIdOpcionalSchema` (union de `prismaCuidSchema | ""` | `null` | `undefined` → normalizado a `string | null`). Servicio: `FinBalGastoItem` expone `proveedorId` + `proveedor: { id, nombre } | null` (expandido en lecturas vía `include: { proveedor: { select: { id, nombre } } }`); `mapDbError` distingue P2003 en gasto por `meta.field_name` / `meta.constraint` entre proveedor y rubro. UI: Select opcional "PROVEEDOR" (con opción "SIN PROVEEDOR") en modal de alta/edición de gasto (`CrearEditarFinBalCatalogoItemModal`); la columna 3 de `/finanzas/balance/gastos/catalogo` muestra el nombre del proveedor (o "Sin proveedor") como meta bajo el nombre del gasto; la página del catálogo carga proveedores vía `getProveedores()` en paralelo con la jerarquía. — **alta** de `global_proveedores.proveedor_mercaderia` (`BOOLEAN NOT NULL DEFAULT false` en schema final; backfill a `true` para existentes, índice `global_proveedores_proveedor_mercaderia_idx`). Migración `20260418200000_add_proveedores_proveedor_mercaderia`. Nueva lectura `getProveedoresMercaderia` en servicio y action; `/gestion-productos/proveedores/lista` filtra por `proveedor_mercaderia = true` (ver §1.11c). — **alta** de la jerarquía `fin_bal_gasto_tipo` → `fin_bal_gasto_rubro` → `fin_bal_gasto` (migraciones `20260418170000_add_fin_bal_gasto_tipo` y `20260418180000_add_fin_bal_gasto_rubro_y_gasto`), con FKs `onDelete: Restrict`, nombre único global en tipo y único por padre en rubro/gasto. Incluye capa completa backend: validaciones Zod (`finBalGastosCatalogo.ts`), servicio con lectura jerárquica + CRUD 3 niveles (`finBalGastosCatalogo.service.ts`) y Actions con gate `PERMISOS.finanzas.acceso` + `esEditor()` (`actions/finBalGastosCatalogo.ts`). **Baja** previa del catálogo `finanzas_rubros` / `finanzas_gastos` y enum `TipoCostoGasto` (migración `20260418160000_drop_finanzas_rubros_y_gastos_catalogo`); se eliminaron servicio, action, validaciones y modal asociados; `/finanzas/balance/gastos` queda solo con alta de movimientos en `movimientos_finanzas`. Histórico: `cajas_tesoreria` (2026-04-14, hoy `fin_tesoreria_cajas`), `precios_tienda.stockeable` (2026-04-13, hoy `prod_precios_tienda`), Finanzas 2026-04-02; reposición por punto/stock + DUX compras throttle.*

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
| `src/actions/reposicion.ts` | Zod sucursal/params selector; `upsertReglaReposicion`: `idProveedor` con `prismaCuidSchema` y `codTienda` como clave de entrada; `puntoReposicion` entero **≥ 0**; `cant` entero **≥ 1**. |
| `src/services/pedidosEnvio.service.ts` | Reposición: `upsertPedidoMercaderiaReposicionConfig` recibe `codTienda`, resuelve `codExt` desde `prod_precios_tienda` y recién allí vincula con `prod_precios_provee` por (`idProveedor`, `codExt`). |
| `src/lib/validations/reposicion.ts` | Esquemas de lectura reposición + forma canónica `reposicionFormaPedidoSchema`. |
| `src/actions/pedidos.ts` | `getPedidoUrgenteData` / `getEnviarPedidoTablaData`: `pedidosLectura` Zod. |
| `src/lib/validations/pedidosLectura.ts` | Nuevo. |
| `src/actions/stock.ts` | `getControlStock`: Zod params + validación sucursal. |
| `src/lib/validations/stock.ts` | Nuevo. |
| `src/actions/comparacionCategorias.ts` | `buscarProductosParaAsignarAction`: Zod en `proveedorId` / `q`. |
| `src/lib/validations/productos.ts` | `aplicarCampoMasivoSchema.proveedorId` → `cuid`; `editarProductoSchema.id` → string acotado (mock). |

### 5.9 Sucursales habilitadas para Pedido De Mercadería (2026-04-15)

- En `global_sucursales` se eliminó `phone_number_id` y se agregó `pedido` (`BOOLEAN NOT NULL DEFAULT TRUE`; migración histórica sobre tabla `sucursales`).
- Migración: `20260415113000_replace_phone_number_id_with_pedido_in_sucursales`.
- Regla de servicio/action: cualquier flujo de `pedidos` que opere por sucursal debe verificar `sucursal.pedido = true`.
- Si la sucursal no está habilitada:
  - lecturas/filtros devuelven vacío;
  - mutaciones responden `ok: false` con mensaje de sucursal no habilitada.

### 5.10 Exportación Excel de Recepción — distribución de precios (2026-04-15)

- Servicio: `src/services/exportRecepcionPedidoExcel.service.ts`.
- Regla nueva: en lugar de usar un único precio promedio para todos los ítems, se calculan **precios unitarios diferenciales** por fila para acercar la suma matricial al total ingresado:
  - objetivo: minimizar `|totalObjetivo - Σ(cantidad * precioUnitario)|`;
  - ajuste por ítem en pasos de `0.01`, con tope de `±0.10` respecto al precio base;
  - tolerancia final permitida en exportación: `0.10`.
- Si no se logra quedar dentro de la tolerancia, el servicio devuelve error y no genera payload de Excel.
