# Guía Backend — Next.js 16 App Router

Documento de referencia para desarrolladores y **asistentes IA** que crean o modifican Server Actions, servicios y validaciones. Sigue estas reglas para mantener seguridad, integridad de datos y arquitectura limpia.

---

## 1. Principios de implementación

### 1.1 Server Actions (`src/actions/`)

- **Ubicación**: Todas las Server Actions viven en `src/actions/`, con `"use server"` al inicio del archivo.
- **Restricción de exports (Next.js)**: en esos módulos las Server Actions deben ser **`export async function`** (o un default equivalente según doc). **No** re-exportar valores de runtime (strings, `export { CONSTANTE }`, instancias Zod, etc.); eso dispara `invalid-use-server-value`. Los `export type` son sólo tipos y no cuentan como valor en runtime; si hace falta un literal compartido, importarlo desde **`src/services/`** o **`src/lib/`**.
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
- **IDs de Prisma**: Los modelos usan **`cuid`** (no UUID) salvo tablas explícitas con `@default(uuid())` (p. ej. `ProdPedMerc2`, `prod_rendimientos`). Validar con `prismaCuidSchema`, `uuidSchema` o `listaPreciosCodExtSchema` / `listaPreciosCodTiendaSchema` según el modelo; **no** mezclar `.uuid()` donde el identificador ya no sea UUID. Claves naturales: **`prod_precios_provee.cod_ext`**, **`prod_tienda.cod_tienda`** (PK).
- **Lecturas con datos sensibles** (precios, vínculos, catálogos):
  - **Lista de precios** (`getListaPreciosConOpcionesAction`, `actualizarListaPreciosMasivoAction`): `getRol()` + lectura según módulo — `PERMISOS.proveedores.listaPrecios` (grilla lista precios) o `PERMISOS.proveedores.sugeridos` si `opciones.soloPxSugerido`; mutaciones con `PERMISOS.listaPrecios.acciones.edicionMasiva`; payload **`unknown`** → `listaPreciosFiltrosLecturaSchema` o `{ ids, data }` / `{ filtros, data }` con Zod (edición masiva por filtro = todos los ítems, sin paginación). **`proveedorId`** en filtros: `prismaCuidSchema.optional()` (no `z.string().max(128)`). En `getListaPreciosConTiendaFiltrada`, mapear siempre `px_vta_sugerido` a `pxVtaSugerido`; `opciones.soloPxSugerido` solo filtra filas.
  - **Catálogo de proveedores** (`getProveedores`, `getProveedoresPageData`, `getProveedoresMercaderia`, `getProveedoresNoMercaderia`): `getRol()` + al menos uno de `PERMISOS.proveedores.sugeridos`, `PERMISOS.proveedores.lista` o `PERMISOS.listaPrecios.acciones.importarLista`; parámetros de página con `proveedoresPageParamsSchema`. `getProveedoresMercaderia` devuelve solo filas con `proveedor_mercaderia = true` y `getProveedoresNoMercaderia` su complemento (`= false`). Ambos reutilizan el índice `global_proveedores_proveedor_mercaderia_idx` (ver §1.11c).
  - **Vínculos tienda** (`getVinculos`, `listarProductosParaVincular` en `vinculos.ts`): `getRol()` + `puede(rol, PERMISOS.tienda.acceso)` (**solo editor**); ítem tienda por `cod_tienda` (`listaPreciosCodTiendaSchema`); línea lista proveedor por `cod_ext` (`listaPreciosCodExtSchema`). Filtros de búsqueda acotados con Zod en la Action cuando aplique.
  - **Sincronización DUX lista tienda** (`GET`/`POST` `/api/sync-lista-precios-tienda`, más `syncProgressStore` / jobs internos que llaman `syncListaPrecioTiendaFromDux`): `getRol()` + `puede(rol, PERMISOS.tienda.acciones.sincronizar)` en **POST**, **GET** bloqueante, **cancel**, **`GET …/status`** (helpers en `@/lib/apiRouteAuth`). En la matriz actual **`simple` y `editor`** tienen `sincronizar: true`. Sin sesión válida o sin permiso → `403` en todas esas rutas (no hay “progreso global” público por URL). **Cancelación cooperativa:** `POST /api/sync-lista-precios-tienda/cancel` (mismo permiso) pone `running = false` en `sync_dux_status`; el servicio `syncListaPrecioTiendaFromDux` comprueba el flag entre lotes y aborta con `SyncListaPrecioTiendaCancelledError`. **No** se llama `setSyncDuxSuccessInDb`, por lo tanto **`last_completed_at` no cambia** (la cancelación no cuenta como “Últ. Act.”). **No** existe Server Action paralela para el mismo trabajo (evitar superficie invocable desde el cliente sin uso en UI). **Eliminado** el mock **`/api/sync-tienda`**. Progreso UI en **`SyncStatusIndicator`** + **`DuxSyncStyleButton`** (ver `FRONTEND_GUIDELINES` § SSOT progreso API DUX).
- **Mutaciones sobre `Proveedor`**: validar `id` con `prismaCuidSchema` en editar/eliminar; `eliminarProveedor` delega en `deleteProveedor` del servicio (`ServiceResult`) y maneja restricciones FK (p. ej. historial de pedidos, comprobantes proveedor).
- **`global_proveedores.id_proveedor_dux`**: índice **único** (`global_proveedores_id_proveedor_dux_key`). PostgreSQL permite varios `NULL`; cada valor no nulo debe ser único. Sirve como **FK referenciada** por `fin_compras_comprobante.id_proveedor` (mismo valor DUX; `onDelete: Restrict`): no se puede borrar un proveedor si tiene comprobantes vinculados.
- **Lecturas de listados con filtros** (pedidos urgente/enviar, reposición, stock, tienda): además del permiso de módulo, validar el objeto de parámetros con esquemas dedicados (`@/lib/validations/pedidosLectura`, `pedidosMutaciones`, `reposicion`, `stock`, `tienda`) para acotar `q`, `pagina`, sucursales, `proveedorId` (CUID) y arrays (`tipos`).

### 1.2.1 Activación de modo editor (`sesion.ts`)

- Entrada **`clave`**: validar con Zod (`z.string().min(1).max(500)`) antes de comparar con `EDITOR_PASSWORD`. Evita payloads anómalos y documenta el contrato.
- **`volverModoSimple()`**: no exige rol previo; destruye la cookie de sesión (equivale a salir del modo editor). No hay payload que validar con Zod.

- **Arranque por sesión de navegador** (`src/middleware.ts` + `src/lib/sesion-arranque.ts`): la cookie **`tienda-app-arranque`** es de **sesión de navegador** (sin `maxAge`). En la **primera** petición de documento de esa sesión, si existía la cookie iron-session del rol (`gestion-rol`), el middleware la **elimina** y añade la cabecera interna **`x-tienda-forzar-rol-simple`** al request para ese ciclo; **`getRol()`** devuelve **`"simple"`** al detectarla (el `Set-Cookie` de borrado no aplica aún a `cookies()` en el mismo render). Así, al abrir la app tras cerrar el navegador, el arranque no conserva modo editor de la cookie anterior. Las rutas **`/api/*`** quedan fuera del `matcher` del middleware para no alterar el orden de llamadas API en herramientas externas.

### 1.2.2 Checklist de seguridad por Server Action (obligatorio)

Cada función exportada desde `src/actions/*.ts` debe cumplir, en este orden:

1. **Autorización primero**: antes de parsear o tocar servicios, resolver `getRol()` y/o `esEditor()` y aplicar `puede(rol, PERMISOS.*)` según el módulo. Nunca confiar solo en que la página esté protegida en layout: las Actions son invocables directamente.
2. **Payload como `unknown` cuando venga del cliente**: usar `.safeParse()` de Zod; mensajes de error genéricos o el primer error de `flatten()` hacia `ActionResult`.
3. **IDs de Prisma**: `cuid` → `prismaCuidSchema`; UUID → `uuidSchema` o esquemas en `@/lib/validations/*`; no aceptar strings arbitrarios largos donde el modelo sea CUID.
4. **Delegación**: mutaciones y lecturas complejas en `src/services/`; la Action solo orquesta, revalida rutas y devuelve `ActionResult` / tipos acordados.
5. **Sin fugas en errores**: no exponer stack traces ni SQL al cliente; `{ ok: false, error: string }` controlado.

### 1.2.3 Gate doble: módulo + editor (mutaciones críticas)

- **Historial de pedidos — mutaciones** (`pedidosHistoria.ts`): con `puede(rol, PERMISOS.pedidos.acceso)` se habilitan para `simple` y `editor`: **guardar recepción** (`guardarRecepcionPedidoHistoriaAction`), **marcar registrado**, **eliminar cabecera** y **descargar PDF**. Lecturas (listado RSC, detalle modal) usan servicio directo o **`GET /api/pedidos-historia/[id]/detalle`** — no Server Actions de lectura.
- **Integraciones DUX / compras** (`comprobantesProveedor.ts`; sync masivo vía `comprobantesProveedorDuxSync.service.ts` + `duxComprasApi.ts`): `puede(rol, PERMISOS.finanzas.acceso)` **y** `esEditor()` antes de llamar APIs externas o sync masivo desde **Server Actions** (misma sensibilidad que otras escrituras financieras).
- **Catálogos finanzas balance** (`finBalGastosCatalogo.ts`, etc.): ya documentado — `finanzas.acceso` + `esEditor()` en mutaciones de catálogo maestro.

### 1.2.4 Edición inline en `/proveedores` (`productos.ts`)

- `editarProducto` / `aplicarCampoMasivo`: permiso `puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)`; payload `unknown` + Zod; solo `habilitado` (descuentos vía motor §1.8d). Revalida `/proveedores` y `/proveedores/lista-precios`.

### 1.2.5 Auditoría de seguridad — patrones obligatorios (cierre 2026-05)

Tras la auditoría 2026-05, todas las Server Actions de `src/actions/*.ts` cumplen un patrón homogéneo. Documentado para fijar la línea base y servir de checklist para futuras IAs:

**A. Firma de payloads provenientes del cliente**
- Toda Action invocable desde el cliente que reciba un objeto/array de datos **debe** declarar el parámetro como `unknown` (o `string` cuando el dato sea un solo ID/string controlado).
- Está prohibido tipar la firma con `z.infer<typeof X>` u otros tipos derivados que la “pinten” como segura: el cliente puede ignorar el tipo TS y mandar cualquier cosa por la red. La validación **siempre** se hace dentro de la Action con `schema.safeParse(raw)`.
- Excepción tolerada (alineado a Next.js): firmas que reciben `FormData` (la propia API estándar) o tipos primitivos individuales (`id: string`) — pero igual deben pasar por Zod (`prismaCuidSchema`, `uuidSchema`, etc.) antes de tocar BD.

**B. Gate doble “módulo + editor” en mutaciones de submódulos sensibles**
- Convención: cada submódulo cuyo permiso de acceso sea `simple/editor` o `editor` debe exigir **`puede(rol, PERMISOS.<modulo>.<accion>)` antes** de `esEditor()` cuando la Action sea de escritura. El orden importa: el primer chequeo es el del **módulo** (rechaza acceso conceptual), el segundo es el de **escritura** (rechaza modo solo-lectura).
- Ejemplos confirmados (no son los únicos):
  - **Vínculos tienda** (`vinculos.ts`): lecturas (`getVinculos`, `listarProductosParaVincular`) con `puede(rol, PERMISOS.tienda.acceso)` (**solo editor**). `vincularProducto` y `desvincularProducto` exigen además `esEditor()`.
  - **Tipos de pintura / rendimientos** (`tiposPinturaRendimientos.ts`): `upsertTipoPinturaRendimientoAction` y `deleteTipoPinturaRendimientoAction` exigen `puede(rol, PERMISOS.tienda.tintoLts) + esEditor()` (gate consistente con la lectura `getTiposPinturaRendimientosAction`).
  - **Comparación categorías** (`comparacionCategorias.ts`): mutaciones (CRUD + asignar/quitar/dto-extra) ancladas a `puede(rol, PERMISOS.comparacionCategorias.editar)`.

**C. IDs validados por modelo Prisma**
- En filtros de listado (`q`/paginación/IDs opcionales), **`proveedorId`** debe usar `prismaCuidSchema.optional()` (Prisma `Proveedor` usa `cuid()`) — no `z.string().min(1).max(128)`. Aplicado en `listarParaVincularFiltrosSchema` (`vinculos.ts`) y lecturas de historial en RSC (`pedidos/historial/page.tsx`).
- Reglas vigentes (referencia rápida):
  - **CUID** (`Proveedor`, `PedidoHistoria`, `PedidoHistoriaItem`, `Marca`, `Sucursal`, `FinBalGastoTipo`, `FinBalGastoRubro`, `FinBalGasto`, `FinBalGastoFinal`, `FinBalGastoMensual`, `CajaTesoreria`, `ComprobanteProveedor`, `FinTesoreriaCheque`): `prismaCuidSchema`.
  - **`cod_ext` / `cod_tienda`** (`prod_precios_provee`, `prod_precios_tienda`, payloads históricos que usaban UUID): `listaPreciosCodExtSchema`, `listaPreciosCodTiendaSchema` o listas (`listaPreciosCodExtListSchema`) en `@/lib/validations/common`.
  - **UUID** (`ProdPedMerc2`, `prod_rendimientos`, …): `uuidSchema`.
  - **Mixto / FK legacy / sucursal seed**: `prismaCuidOrUuidSchema` o `globalSucursalIdSchema`.

**D. Sin throw al cliente**
- Toda Action **debe** envolver llamadas a Prisma / servicios que puedan lanzar (incluso lecturas) en `try/catch` y devolver `{ ok: false, error: string }` con un mensaje legible.
- Lecturas que devuelven un shape vacío (no `ActionResult`) deben caer al shape vacío también ante excepción (ej. `getPedidoUrgenteData`, `getControlStock`, `getTiendaPageData`): no propagar stack traces.
- `actions/comparacionCategorias.ts` (lecturas), `actions/vinculos.ts` (`vincularProducto` / `desvincularProducto`), `actions/stock.ts` (`registrarExportacionExcelStock`) y `actions/pedidos.ts` (`getPedidoUrgenteData`, `comprobarItemsParaGenerarPedidoAction`) ya cumplen este contrato tras 2026-05.

**E. Anti-patrón: una Action no debe llamar a otra Action**
- Si una Action necesita reutilizar lógica de otra, **delegar al servicio común** (no invocar la Action vecina). Las Actions son orquestadores I/O; encadenarlas duplica chequeos de sesión y mezcla niveles de validación.
- Ejemplo aplicado (2026-05): `comprobarItemsParaGenerarPedidoAction` ahora invoca `getItemsTablaEnviarPedido` (servicio) en lugar de `getEnviarPedidoTablaData` (Action vecina).

**F. Helpers de gate compartidos**
- Cuando un archivo tiene varias Actions con el mismo gate, definir un helper local que devuelva `{ ok: false; error: string } | null` (ej. `requireEditorFinanzas` en `finBalGastosCatalogo.ts` y `finBalGastoMensualBalance.ts`).
- **Anti-patrón**: helpers tipo `canEdit() => () => Promise<boolean>` (doble función arrow). Se reemplazó por `tienePermisoEditar(): Promise<boolean>` en `comparacionCategorias.ts`.

### 1.2.6 Superficie mínima y variables de entorno (post-auditoría 2026-05-10)

- **Server Actions huérfanas**: si una Action no tiene call sites (`grep`/`tsserver`), **eliminarla** o integrarla de inmediato. Duplicar la misma operación ya cubierta por **Route Handler** (`app/api/…`) aumenta vectores CSRF/UI sin beneficio — preferir una sola entrada con el mismo gate (`getRol` + `puede`).

### 1.2.7 Auditoría backend — seguridad y depuración (2026-06-04)

**Depuración aplicada (no reintroducir):**

| Eliminado | Motivo |
|-----------|--------|
| `getListaPreciosFiltradaAction` | Sin call sites; cubierta por `getListaPreciosConOpcionesAction`. |
| `getUltimoSync` (`tienda.ts`) | Sin call sites; sync usa `sync_dux_status` / API route. |
| `countVinculosConUrlCompetenciaAction` | Sin call sites; conteo en `competenciaPxSugerido.service` vía route sync. |
| `MarcacionPxListaCelda` + `pxListasMarcacion.service.ts` | UI sin uso tras retiro de tabla `prod_precios_tienda_marcacion`. |

**Contrato de payloads (refuerzo 2026-06):**

- Lecturas/mutaciones desde cliente: parámetro **`raw: unknown`** + `.safeParse()` con esquema en `@/lib/validations/*` (ej. `getListaPreciosConOpcionesAction`, `actualizarListaPreciosMasivoAction`, `editarProducto`, `aplicarCampoMasivo`, `buscarProductosParaAsignarAction`).
- El cliente pasa **un objeto** acorde al esquema (no argumentos posicionales sueltos en Actions nuevas).
- **`listaPreciosFiltrosLecturaSchema.proveedorId`**: `prismaCuidSchema.optional()`.
- **`buscarProductosAsignarSchema.proveedorId`**: `prismaCuidSchema.optional()`.

**Gates corregidos:**

| Action | Gate |
|--------|------|
| `crearProveedor` / `editarProveedor` / `eliminarProveedor` | `puede(rol, PERMISOS.proveedores.acciones.nuevoProveedor)` (antes solo `esEditor()` genérico). |
| `actualizarCoeficientesTintometricosAction` | `puede(rol, PERMISOS.stock.acceso)` **y** `esEditor()` + `try/catch`. |

**Tipado:** sin `any` en `src/` (TS 5.9).

**Integración real `/proveedores` (2026-06-04, eficiencia/DRY):**

- **`getProveedoresPageData`**: delega en `getProductosProveedoresPageFiltrados` (`listaPrecios.service.ts`) — misma query que lista-precios (`getListaPreciosConTiendaFiltrada`), sin `MOCK_PRODUCTOS`.
- **`productos.ts`**: `editarProducto` / `aplicarCampoMasivo` solo permiten **`disponible`→`habilitado`**; descuentos gobernados por motor §1.8d.
- **Tipo compartido:** `ProductoProveedoresPage` en `src/lib/productoProveedoresPage.ts` (mapper desde `FilaListaPrecioParaCliente`).
- **`FilaListaPrecioParaCliente`**: incluye `codProdProveedor`, `habilitado` y `proveedor.codigoUnico` para todas las lecturas de lista.
- **`proveedoresPageParamsSchema`**: `proveedor` = `prismaCuidSchema.optional()`; `pagina` numérica acotada.

**Herramientas de auditoría:**

- Tablas Prisma: `node scripts/audit-schema-usage.mjs` (o `npm run db:audit-schema`)
- Columnas escalares sin match en `src/`: `node scripts/audit-schema-columns.mjs` (o `npm run db:audit-schema-columns`)
- Server Actions huérfanas: `node scripts/audit-actions-usage.mjs` (o `grep` del nombre fuera de `src/actions/`).
- **Lógica solo servidor**: integraciones sensibles que **no** deben exponerse como Server Actions invocables desde el navegador se mantienen en `src/services/` y solo las invocan Actions ya autorizadas. **No** re-exportar valores de runtime desde archivos `"use server"` (usar `@/lib/validations/*` o servicios sin `"use server"`).
- **Catálogo de ENV**: todas las lecturas documentadas `process.env.*` deben estar listadas en **`.env.example`** (aunque sean opcionales), con una línea corta por variable. Valores obligatorios en producción (`SESSION_SECRET`, `DATABASE_URL`) deben estar comentados como tales al lado del ejemplo.
- **Google Sheets (service account)**: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (normalizar `\n` literales vía `normalizeGooglePrivateKey` en `@/lib/googleSheets.ts`), `GOOGLE_SHEETS_SPREADSHEET_ID`. Auth JWT scope `spreadsheets`. Probe: `probarConexionGoogleSheets` escribe marca en `A1`. Helpers: `@/lib/googleSheetsWrite.ts` (`ensureGoogleSheetTab`, `replaceGoogleSheetTabValues`). Export Marketing (una sola acción, sobrescribe todas las pestañas; orden): `exportarMktAGoogleSheets` — **Indice** (diccionario estático `buildMktGoogleSheetsIndiceValues`: bloques **CATALOGO** hoja↔tabla_db/grano/pk/columnas y **RELACION** joins/cardinalidad; regenerado en cada export); **Publicaciones** (`mkt_publi` + N:M: **una fila por red** — mismos `id`/`fecha`/…, distinto `red_id`; columnas `id`, `red_id`, `tipo_contenido_id`, `idea_detalle_id`, `fecha` ISO `YYYY-MM-DD`, `publicacion`, `contenido_url`); **Publicaciones Redes** (`mkt_publi_tipo_redes`: `id`, `red_social_nombre`); **Publicaciones Secciones** (`mkt_publi_ideas_secciones`: `id`, `idea_nombre`, `idea_resumen`); **Publicaciones Ideas** (`mkt_publi_ideas_detalle`: `id`, `seccion_id`, `detalle`, `usada`); **Publi Tipo Contenido** (`mkt_publi_tipo_contenido`: `id`, `contenido_nombre`); **Contenido Multimedia** (`mkt_contenido_drive_url`: `id`, `nombre`, `descripcion`, `url`, `tipo_id`); **Contenido Multimedia Tipo** (`mkt_contenido_drive_tipo`: `id`, `tipo`); **Colores Marca** (`mkt_colores_marca`: `id`, `nombre`, `descripcion`, `cod_hexadecimales`). Booleans (`usada`) como `TRUE`/`FALSE`. Actions solo `esEditor()`: `probarConexionGoogleSheetsAction`, `exportarMktGoogleSheetsAction`. Script: `npm run test:google-sheets`. El Sheet debe estar compartido como **Editor** con el `client_email` de la service account.
- **`z.record` con IDs**: mapas cliente→servidor cuyas claves sean FK Prisma (`cuid`) deben tiparse con `z.record(prismaCuidSchema, …)` más un tope de cardinalidad (`superRefine` / `max`) para evitar payloads enormes (aplicado en `cargarImputacionesMesParamsSchema.ivaPorGastoFinalId`).
- **Route Handlers (`app/api/…`)**: compartir gates con `src/lib/apiRouteAuth.ts` (`guardTiendaListaPreciosSincronizar`, `guardFinanzasLectura`, `guardListaPreciosImportarEsEditor`) para que **GET de estado** y **POST** usen el mismo criterio (evita filtrar solo mutaciones y dejar el poll expuesto).

### 1.2.8 Auditoría backend — seguridad y depuración (2026-06-30)

**Cierre:** 151 Server Actions exportadas; `node scripts/audit-actions-usage.mjs` → **0 huérfanas**. Sin `any` en `src/`. ESLint `src/actions src/services src/lib --max-warnings 0` ✓.

**Server Actions eliminadas (sin call sites — no reintroducir):**

| Archivo | Eliminadas | SSOT vigente |
|---------|------------|--------------|
| `pedidosHistoria.ts` | `listarPedidosHistoriaAction`, `getPedidoHistoriaDetalleAction`, `actualizarPedidoHistoriaItemCantRecibidaAction`, `agregarPedidoHistoriaItemAction`, `reabrirPedidoHistoriaRecepcionAction` | Listado: RSC `pedidos/historial/page.tsx` → `listarPedidosHistoria` (servicio). Detalle: `fetchPedidoHistoriaDetalle` → `GET /api/pedidos-historia/[id]/detalle`. Mutaciones: `guardarRecepcionPedidoHistoriaAction`, `marcarPedidoHistoriaRegistradoAction`, `eliminarPedidoHistoriaAction`, `descargarPdfPedidoHistoriaAction`. |
| `importar.ts` | `importarListaPreciosProveedor` | `POST /api/import-lista-precios` + `importarListaPreciosProveedorSchema` (Zod). |
| `pedidos.ts` | `syncPedidoUrgenteEnvioAction` | `upsertPedidoUrgenteMercaderiaItemAction`. |
| `finBalVtas.ts` | `listarFinBalVtasAction`, `listarSucursalesGeneraBalanceParaVtasAction`, `crearFinBalVtasAction` | Lecturas RSC + `listarFinBalVtasPorMesAnioAction` / `guardarFinBalVtasCargaPeriodoAction`. |
| `cajasTesoreria.ts` | `listarCajasTesoreriaAction`, `listarFinTesoreriaTipoCajaAction`, `listarCajasTesoreriaTipoDigitalAction` | RSC/servicios; conservar `listarCajasTesoreriaTipoBancoAction` (modal acreditar cheque). |
| `competenciaPrecios.ts` | `getCompetenciaPreciosListAction` | `getPxListasPageData` (`pxListas.ts` + `pxListasPage.service.ts`). |
| `comparacionCategorias.ts` | `getArbolCategoriasAction`, `getPresentacionesConLabelAction`, `getPresentacionesParaGestionAction` | RSC importa servicios (`categoriasComparacion.service.ts`). |
| `finBalPosicionIvaComparacionPedido.ts` | `getEstadoIvaComparacionPedidoAction` | Lectura en página RSC / servicio. |

**Servicios / validaciones / libs eliminados:**

| Eliminado | Motivo |
|-----------|--------|
| `competenciaPreciosList.service.ts` | Reemplazado por `pxListasPage.service.ts` + `pxListasRows.service.ts`. |
| `syncPedidoUrgenteEnvio` + `syncPedidoUrgenteEnvioSchema` | Sin call sites tras unificación envío urgente. |
| `crearFinBalVtas` + `crearFinBalVtasSchema` | Alta de ventas vía `guardarFinBalVtasCargaPeriodo`. |
| `getPresentacionesConLabel`, `getPresentacionesParaGestion` (`categoriasComparacion.service.ts`) | Solo las Actions huérfanas las invocaban. |
| `competenciaPreciosFiltros.ts`, `competenciaPreciosFiltrosQuery.ts`, `competenciaPreciosFiltrosSchema` | Filtros legacy Px Competencia; Px Listas usa `@/lib/pxListasFiltros` + `getPxListasPageParamsSchema`. |

**Correcciones de seguridad:**

| Área | Cambio |
|------|--------|
| `vinculos.ts` | Anti-patrón §1.2.5.E corregido: dejó de importar `@/actions/proveedores`; `getProveedoresMercaderia` desde `proveedor.service` con gate `PERMISOS.tienda.acceso`. |
| `vinculos.ts` | `listarParaVincularFiltrosSchema.proveedorId` → `prismaCuidSchema.optional()`. |
| `pxListasPrecios.ts` | `getPxListasPreciosPageData(params: unknown)` + `getPxListasPreciosPageParamsSchema.safeParse()`. |
| `POST /api/import-lista-precios` | Body validado con `importarListaPreciosProveedorSchema` (`proveedorId`: `prismaCuidSchema`; límites filas/celdas). |
| `importar.ts` (validaciones) | `importarProductosSchema` / `importarListaPreciosProveedorSchema`: `proveedorId` con `prismaCuidSchema` (antes `z.string().max(128)` local). |

**Patrones a mantener:**

- **Una sola entrada por operación:** import lista → API route; sync DUX → API route; detalle historial pedido → API route; listados pesados → RSC + servicio.
- **Script de regresión:** `node scripts/audit-actions-usage.mjs` antes de cerrar PRs que toquen `src/actions/`.
- **Serialización fechas historial:** `serializarPedidoHistoriaDetalleParaCliente` en wire (API route); tipo `PedidoHistoriaDetalle` admite `Date | string`.

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

### 1.4.1 `stockeable` (derivado de `prod_tienda_stock`, sin columna en `prod_tienda`)

- **Sin columna en BD**: `prod_tienda.stockeable` eliminada (`20260604170000_drop_prod_tienda_stockeable`). La regla vive en **`prod_tienda_stock.ctd_disponible`** por depósito.
- **Regla DUX**: `computeStockeableDesdeStocks` / `buildMapStockeable` en `prodTiendaStock.service.ts` (parseo en `duxApi.ts`): `ctd_disponible` **no nulo** en **Guaymallén** y **Maipú** (`getIdDepositoGuaymallen()` / `getIdDepositoMaipu()`). Filtro Prisma: `whereProdTiendaStockeable()`.
- **Sync**: `syncListaPrecioTienda.service.ts` persiste `ctd_disponible` en **`prod_tienda_stock`**; **no** escribe flag en `prod_tienda`. Catálogo ítem: `rubro`, `subRubro`, `marca`, `idMarca`, `descripcionTienda`, `costoCompra`, `lastSync` (§1.4.2–1.4.5).
- **Uso en negocio**: `getControlStock` → `whereProdTiendaStockeable()`; reposición/pedidos/tienda/sobrestock → `buildMapStockeable` / `isStockeableCodTienda`; UI sigue recibiendo `stockeable: boolean` en tipos cliente.

### 1.4.2 Vinculación tienda ↔ proveedor 100 % manual (`prod_tienda.proveedor` congelado; `cod_ext` eliminado)

- A partir de **2026-05-28** la vinculación tienda ↔ proveedor dejó de depender de DUX. La única relación vigente es **`prod_precios_provee.cod_tienda`** (vínculo manual creado desde **Vínculos Con Proveedores**, action `vincularProducto`).
- **Columna `prod_tienda.cod_ext` eliminada** (migración **`20260606120000_drop_prod_tienda_cod_ext`**): dejó de sincronizarse en 2026-05-28 y ya no tenía lecturas en app. **`descripcion_tienda`** para listados de proveedor se resuelve vía relación **`prod_precios_provee.prodTienda`** (`cod_tienda_vinculo`), no por coincidencia de `cod_ext`.
- **`prod_tienda.proveedor`**: sigue congelado (sync **no** escribe). Solo se usa como espejo DUX histórico en **`costoListaTienda.service.ts`** (`proveedorTextoCoincideConDux` entre candidatos habilitados).
- **Sync DUX** (`syncListaPrecioTienda.service.ts`): no persiste `cod_ext` ni `proveedor`. Sin auto-vinculación por `cod_ext`.
- **Filtro PROV. VINC.** (`getTiendaPageData` en `src/actions/tienda.ts`): la query `?proveedor=<idProveedor>` matchea **`listaPreciosProveedores: { some: { idProveedor, habilitado: true } }`** (CUID del proveedor); URLs legacy con texto se ignoran silenciosamente (parseo `prismaCuidSchema.safeParse`).
- **Pedido Reposición** (`pedidosReposicionProveedor.service.ts`): `elegirListaPrecioProveedorReposicion` solo opera sobre vínculos manuales (`lpPorCodTienda`); sin vínculos → `null`. `codExt` en UI/reposición sale de **`prod_precios_provee`**, no de `prod_tienda`.
- **Cx/Px Tienda** (`costoListaTienda.service.ts → resolverCostoCxPxParaFila`): FK persistida → único candidato habilitado → match DUX (`proveedorTextoCoincideConDux` vs `prod_tienda.proveedor`) → espejo DUX (`costo_compra`, `proveedor`).
- **Cx Compra / Tienda** (`getTiendaPageData`): `ItemTiendaParaTabla.codigoExterno` queda **`null`** (no hay `cod_ext` en tienda).
- **Control de Aumentos**: módulo eliminado por completo en este mismo cleanup (página `/tienda/aumentos`, servicio `controlAumentos.service.ts`, componentes `TablaAumentos` / `AumentosPageWithActions` / `ExportarAumentosButton`, interfaces `ItemAumento` / `GrupoAumento` / `ControlAumentosData`, redirects en `next.config.ts` y CSS exclusivo `--altura-paneles-aumentos` / `.paneles-aumentos`). Será reimplementado más adelante.

### 1.4.3 Listas de precio DUX (`prod_tienda` + `prod_tienda_listas_precios` + `prod_tienda_precios`)

- **Tabla producto tienda**: SQL **`prod_tienda`**. Prisma **`ProdTienda`**. PK **`cod_tienda`**. Sin **`px_lista_tienda`** (DROP `20260604130000`).
- **Catálogo listas DUX**: **`prod_tienda_listas_precios`** — PK `id_lista`, `nombre_lista`. Modelo **`ProdTiendaListaPrecio`**. Sync: upsert por cada `precios[]` del ítem; al cerrar la corrida, **elimina** listas no vistas (y antes sus filas en `prod_tienda_precios`).
- **Precios por lista** (origen de verdad DUX): **`prod_tienda_precios`** — PK `(cod_tienda, id_lista)`, `precio DECIMAL(14,4)`, FK → `prod_tienda` ON DELETE CASCADE, FK → `prod_tienda_listas_precios` ON DELETE RESTRICT. Modelo **`ProdTiendaPrecio`**. El sync **sobrescribe** `precio` en cada corrida.
- **Edición manual Px Listas (staging hasta Act. Px)**: **`prod_tienda_precios_edicion`** — PK `(cod_tienda, id_lista)`, `precio DECIMAL(14,4)`, `updated_at`. Modelo **`ProdTiendaPrecioEdicion`**. En UI el usuario edita **PX. CALC.** (entero) o **MARG. MAN.** (%); al guardar (blur) se persiste el PX en staging y el otro campo se deriva (`calcPxListaDesdeMargenSinIvaPct` / `calcMargenSinIvaPct` vía `margenDesdePrecioDux`). Si el PX coincide con DUX, se elimina staging. Mutaciones: `guardarPxListaMargenEdicionAction` → `guardarPrecioListaEdicionDesdeMargen`; `guardarPxListaPrecioEdicionAction` → `guardarPrecioListaEdicionDesdePx` (`pxListasPrecioEdicion.service.ts`); `null` elimina la fila staging. **Act. Px** (`exportarPxListasMargenAction`): exporta Excel por lista (**CODIGO**, **PORC UTILIDAD** = margen % numérico con formato celda es-AR `#.##0,0000`) y **elimina** las filas exportadas (`limpiarPreciosEdicionTrasActPx`). **Pendiente / filtro Actualizar:** `celdaRequiereActualizar` = existe fila en `prod_tienda_precios_edicion` (`pxEdicion != null`). **`prod_tienda_margen_edicion`** eliminada (`20260706180000`; datos copiados en `20260624180000`).
- **Retirado**: **`prod_listas_dux`** (reemplazado por catálogo `prod_tienda_listas_precios`, sin `activa`/`ultima_sync`).
- **API / parseo** (`duxApi.ts`): `mapItem` arma `ItemDux.precios[]`. Lista principal UI: `getIdPrecioListaPrincipal()` (default **56994**). Por ítem: upsert catálogo + precio; `deleteMany` precios del ítem cuyo `id_lista` ya no vino.
- **Sync** (`syncListaPrecioTienda.service.ts`): Fase 2 — `prod_tienda` + `prod_tienda_listas_precios` + `prod_tienda_precios` por chunk. Fase 3 — `cod_tienda` ausentes (`last_sync` &lt; inicio corrida). Fase 4 — borrar precios y filas de catálogo con `id_lista` fuera del set visto en la corrida. **Post-fase 3:** `limpiarHuerfanosProdTienda` (`limpiarHuerfanosProdTienda.service.ts`) — borra/anula referencias `cod_tienda` sin fila padre en `prod_tienda` (ediciones Px Listas, stock, competencia, vínculos proveedor, reglas reposición; opcional historial pedidos). Script manual: `npm run db:purge-huerfanos-prod-tienda` (`--execute`, `--incluir-historial`).
- **Lecturas precio tienda en UI**: **`prodTiendaPrecios.service.ts`** — `getPrecioListaPrincipal`, `buildMapPrecioListaPrincipal`.
- **Filtros Px Listas (post-unificación)**: `@/lib/pxListasFiltros` + `getPxListasPageParamsSchema` / `getPxListasPreciosPageParamsSchema`; agregados en memoria vía `competenciaPreciosFilaResumen.ts`.
- **Migraciones clave**: `20260604180000_prod_tienda_precios_y_listas_catalog` (rename hechos → `prod_tienda_precios`; catálogo nuevo `prod_tienda_listas_precios`; DROP `prod_listas_dux`).

### 1.4.3a Catálogo precios REX (`prod_precios_rex`)

- **Tabla**: **`prod_precios_rex`**. Modelo Prisma **`ProdPrecioRex`**.
- **Columnas**: `id` (TEXT, PK, `@default(cuid())`), `id_proveedor` (TEXT NOT NULL, FK → `global_proveedores.id` ON DELETE CASCADE), `descripcion` (TEXT NOT NULL), `px_lista_proveedor` (`DECIMAL(14,4)` NOT NULL; Prisma `pxListaProveedor`).
- **Clave lógica de upsert**: **`UNIQUE (id_proveedor, descripcion)`** — actualizaciones por conversión PDF matriz matchean proveedor + texto exportado (`descripcionExport` del parser, normalizado con `limpiarTextoPdfMatriz` / `buildDescripcionExport` en `@/lib/listaPreciosPdfMatriz`).
- **Migraciones**: `20260616120000_add_prod_precios_rex` (tabla base); `20260616130000_prod_precios_rex_id_proveedor` (FK + índice único); `20260616140000_prod_precios_provee_id_precio_rex` (columna FK); `20260616150000_prod_precios_rex_vinculo_n_a_uno` (drop UNIQUE → vínculo **N:1**); `20260624120000_prod_precios_rex_precio_to_px_lista_proveedor` (rename `precio` → `px_lista_proveedor`).
- **Vínculo N:1 con lista proveedor** (`prod_precios_provee`): columna **`id_precio_rex`** (TEXT NULL, FK → `prod_precios_rex.id` ON DELETE SET NULL; índice no único `prod_precios_provee_id_precio_rex_idx`). Modelo Prisma: `ListaPrecioProveedor.idPrecioRex` → `precioRex`; inversa `ProdPrecioRex.listaPreciosProveedor[]`. Reglas: **varios** `cod_ext` pueden apuntar al mismo REX; cada fila lista tiene como máximo un REX; lista y REX deben compartir **`id_proveedor`**.
- **Servicios vínculo**: `listarPreciosRexParaVincular`, `vincularListaPrecioConPrecioRex`, **`sincronizarPxListaProveedorDesdePreciosRex`** en `@/services/prodPreciosRex.service.ts`.
- **Sincronización de precio lista** (`prod_precios_rex.px_lista_proveedor` → `prod_precios_provee.px_lista_proveedor`): al **vincular** (`vincularListaPrecioConPrecioRex`, siempre copia el precio REX aunque el vínculo ya exista) y tras **upsert** de REX desde PDF (`upsertPreciosRexDesdeFilasPdf` propaga a todas las filas lista con `id_precio_rex` en los ítems actualizados). `px_compra_final_sin_iva` se recalcula por columna generada en BD.
- **Actions**: `listarPreciosRexParaVincularAction`, `vincularListaPrecioConPrecioRexAction` en `src/actions/prodPreciosRex.ts` — gate `PERMISOS.listaPrecios.acciones.edicionMasiva` + `esEditor()`; validación `listarPreciosRexParaVincularSchema` / `vincularListaPrecioConPrecioRexSchema`.
- **Lectura lista precios**: `FilaListaPrecioParaCliente` incluye `idPrecioRex` y `precioRex` (`listaPrecios.service.ts`, include `precioRex`). Filtro **`vinculado`** en `listaPreciosFiltrosLecturaSchema`: `true` → `idPrecioRex IS NOT NULL`; `false` → `idPrecioRex IS NULL`. Aplica en grilla, exportación y opciones dinámicas de proveedor/marca/rubro (`getListaPreciosConTiendaFiltrada`).
- **IDs en Actions futuras**: `idProveedor` con `prismaCuidSchema`; payload filas PDF con `filaPdfMatrizNormalizadaSchema`.
- **Origen previsto**: **`ConvertirPdfListaPreciosModal`** — `proveedorId` obligatorio al convertir; tras parse exitoso persiste vía **`guardarPreciosRexDesdePdfAction`** (`src/actions/prodPreciosRex.ts`) → **`upsertPreciosRexDesdeFilasPdf`** (`src/services/prodPreciosRex.service.ts`). Clave upsert: **`normalizarDescripcionPrecioRex(descripcionExport)`** + proveedor. Duplicados en el mismo lote: gana el último precio.
- **Gate**: `PERMISOS.listaPrecios.acciones.importarLista` + `esEditor()` (mismo que import PDF / lista precios / **Crear Producto**). Permiso `importarLista`: solo **editor** (`permisos.ts`).
- **GET `/api/import-lista-precios/status`**: sin permiso → **200** + `importProgressIdleState()` (no 403); el POST de importación mantiene **403** vía `guardListaPreciosImportarEsEditor`.
- **Validación POST import**: `importarListaPreciosProveedorSchema` en `@/lib/validations/importar.ts` (única entrada; no Server Action).
- **Validación REX PDF**: `guardarPreciosRexDesdePdfSchema` en `@/lib/validations/prodPreciosRex.ts`.

### 1.4.5 Stock multi-depósito DUX (`prod_tienda` + `prod_depositos_dux` + `prod_tienda_stock`)

- **Tabla producto tienda**: sigue siendo **`prod_tienda`** (`ProdTienda`). **Sin** columnas fijas `stock_maipu` / `stock_guaymallen` (DROP `20260604150000`).
- **Stock por depósito** (origen de verdad): **`prod_tienda_stock`** — PK `(cod_tienda, id_deposito)`, `stock_real INTEGER`, `ctd_disponible DECIMAL(14,4) NULL`, FK → `prod_tienda` ON DELETE CASCADE. Modelo **`ProdTiendaStock`**.
- **Catálogo depósitos DUX**: **`prod_depositos_dux`** — PK `id_deposito` (entero API `stock[].id`), `nombre`, `activa`, `ultima_sync`. Modelo **`ProdDepositoDux`**. Se alimenta en sync desde cada `stock[]` del ítem; al cerrar la corrida, depósitos no vistos → `activa = false`.
- **API / parseo** (`duxApi.ts`): `mapItem` arma `ItemDux.stocks[]` (`idDeposito`, `nombre`, `stockReal`, `ctdDisponible`) desde `stock[]` del JSON. Maipú / Guaymallén para UI: `getIdDepositoMaipu()` / `getIdDepositoGuaymallen()` (defaults **16923** / **4565**).
- **Sync** (`syncListaPrecioTienda.service.ts`): en la misma transacción por chunk — upsert `prod_tienda` + `syncStocksEnTransaccion` + `syncListasPreciosEnTransaccion`; por ítem se borran filas de `prod_tienda_stock` cuyo `id_deposito` ya no vino en el array; fase final marca depósitos DUX inactivos fuera del set visto. **Sin** trigger SQL en `prod_tienda` para reposición (retirado `20260606130000`).
- **Lecturas**: **`prodTiendaStock.service.ts`** — `getStockReal`, `buildMapStockPorDeposito`, `buildMapsStockSucursalesPrincipales`, `getStockSucursalPrincipal`. Control Stock filtra negativos con `stocks: { some: { idDeposito, stockReal: { lt: 0 } } }`.
- **Migración**: `20260604150000_prod_tienda_stock` (tablas nuevas + backfill Maipú/Guaymallén + DROP columnas legacy).

### 1.4.4 Purga de esquema — auditoría 2026-06-04

**Objetivo:** esquema mínimo alineado al código en `src/`. **Fase 1 (tablas):** ningún `@@map` del `schema.prisma` vigente es candidato a `DROP` — los **35 modelos** tienen uso activo (`prisma.<modelo>` o SQL raw documentado). **Fase 2 (columnas):** en tablas vigentes no quedan columnas huérfanas en Prisma; las retiradas del negocio ya tienen migración.

**Mapa de tablas vigentes (Prisma → SQL):**

| Dominio | Modelo Prisma | Tabla SQL |
|--------|----------------|-----------|
| Global | `Proveedor` | `global_proveedores` |
| Global | `GlobalCotizacionUsd` | `global_cotizacion_usd` |
| Global | `Sucursal` | `global_sucursales` |
| Global | `GlobalPersonal` | `global_personal` |
| Finanzas | `ComprobanteProveedor` | `fin_compras_comprobante` |
| Finanzas | `FinTesoreriaEntidad`, `FinTesoreriaTipoCaja`, `CajaTesoreria`, `FinTesoreriaCheque` | `fin_tesoreria_entidades`, `fin_tesoreria_tipo_caja`, `fin_tesoreria`, `fin_tesoreria_cheques` |
| Finanzas balance | `FinBalGastoTipo`, `FinBalGastoRubro`, `FinBalGasto`, `FinBalGastoFinal`, `FinBalGastoMensual`, `FinBalVtas`, `FinBalIvaDebImportLine`, `FinBalPosicionIvaSaldoManual`, `FinBalPosicionIvaComparacionPedido` | `fin_bal_gasto_tipo`, `fin_bal_gasto_rubro`, `fin_bal_cat_gasto`, `fin_bal_gasto_final`, `fin_bal_gasto_mensual`, `fin_bal_vtas`, `fin_bal_iva_deb_import`, `fin_bal_posicion_iva_saldo_manual`, `fin_bal_posicion_iva_comparacion_pedido` |
| Finanzas análisis M.C. | `FinAnaCosFinaTerminal`, `FinAnaCosFinaPagoCat`, `FinAnaCosFina`, `FinAnaMcDescuentoFp`, `FinAnaMcFormula` | `fin_ana_cos_fina_terminales`, `fin_ana_cos_fina_pagos`, `fin_ana_cos_fina`, `fin_ana_mc_descuento_fp`, `fin_ana_mc_formulas` |
| Estadísticas productos | `EstPorProd` | `est_por_prod` |
| Marketing | `MktPublicacionRed`, `MktPublicacionContenidoTipo`, `MktPublicacion`, `MktPublicacionRedLink`, `MktPublicacionIdeaSeccion`, `MktPublicacionIdeaDetalle`, `MktPublicacionObj`, `MktContenidoUrlDrive`, `MktContenidoDriveTipo`, `MktColoresMarca` | `mkt_publi_tipo_redes`, `mkt_publi_tipo_contenido`, `mkt_publi`, `mkt_publi_redes`, `mkt_publi_ideas_secciones`, `mkt_publi_ideas_detalle`, `mkt_publi_obj`, `mkt_contenido_drive_url`, `mkt_contenido_drive_tipo`, `mkt_colores_marca` |
| Productos / precios | `ListaPrecioProveedor`, `ComparacionItem`, `CategoriaComparacion`, `SubcategoriaComparacion`, `PresentacionComparacion`, `Marca`, `ProdPrecioRex`, `ProdRubroLista`, `ProdPrecioProveeRegla`, `ProdTiendaListaPrecio`, `ProdTiendaPrecio`, `ProdTiendaPrecioEdicion`, `ProdDepositoDux`, `ProdTiendaStock`, `ProdTienda` | `prod_precios_provee`, `prod_comp_item_comparados`, `prod_comp_item_referencia`, `prod_comp_categorias`, `prod_comp_sub_cat`, `prod_comp_presentaciones`, `prod_marcas`, `prod_precios_rex`, `prod_rubros_lista`, `prod_precios_provee_reglas`, `prod_tienda_listas_precios`, `prod_tienda_precios`, `prod_tienda_precios_edicion`, `prod_depositos_dux`, `prod_tienda_stock`, `prod_tienda` |
| Competencia | `ProdCompetencia`, `ProdPrecioCompetencia` | `prod_competencia`, `prod_precios_competencia` |
| Pedidos / sync | `ProdPedMerc2`, `PedidoHistoria`, `PedidoHistoriaItem`, `ProdPedUltComp`, `ImportProgress`, `SyncDuxStatus` | `prod_ped_merc`, `prod_ped_historial`, `prod_ped_historial_merc`, `prod_ped_ult_comp`, `import_progress`, `sync_dux_status` |

**Tabla en BD sin modelo Prisma (no eliminar):** `prod_rendimientos` — CRUD vía raw SQL en `tiposPinturaRendimientos.ts` (tintométrico / litros). **No** reintroducir como columna dinámica en `prod_tienda`.

**Tablas/columnas eliminadas — no reintroducir:**

| Objeto | Motivo retiro |
|--------|----------------|
| `prod_precios_tienda` (nombre tabla) | Renombrada → `prod_tienda` (`20260604120000`) |
| `prod_tienda.px_lista_tienda` | Precios en `prod_tienda_precios` |
| `prod_listas_dux` | Catálogo → `prod_tienda_listas_precios` (`20260604180000`) |
| `prod_tienda_listas_precios` (hechos, histórico) | Renombrada → `prod_tienda_precios`; nombre catálogo reutilizado (`20260604180000`) |
| `prod_tienda.stock_maipu`, `prod_tienda.stock_guaymallen` | Stock por depósito en `prod_tienda_stock` (`20260604150000`) |
| `prod_tienda.stockeable` | Derivado en runtime desde `prod_tienda_stock.ctd_disponible` (`20260604170000`) |
| `prod_tienda.cod_ext` | Eliminada; vinculación y descripciones vía `prod_precios_provee.cod_tienda` (`20260606120000`) |
| `trg_sync_reposicion_on_prod_tienda_stock` (+ función `sync_reposicion_on_precios_tienda_stock_change`) | Legacy reposición por stock en `prod_tienda`; tras DROP `stock_*` disparaba en cualquier UPDATE y rompía sin `cod_ext` (`20260606130000`) |
| Referencia `NEW.cod_ext` en `fn_uppercase_precios_tienda` | Trigger `trg_uppercase_precios_tienda` (BEFORE INSERT/UPDATE); función recreada sin `cod_ext` (`20260606140000`) |
| `px_lista_cx_px`, `cx_px_px_comp_ref`, `competencia_id_px_lista` | Submódulo Cx/Px legacy retirado (`20260528210000` + reconcile `20260604140000`) |
| `prod_precios_tienda_marcacion`, `prod_precios_tienda_px_lista_config` | UI Px marcación eliminada (`20260528270000`) |
| `prod_tienda_margen_edicion` | Staging margen % reemplazado por `prod_tienda_precios_edicion` (`20260624180000` migración datos; DROP `20260706180000`) |
| `prod_comp_presentaciones.prod_ref_cod_ext` | FK legacy a lista proveedor; backfill a `costo_compra_objetivo` + DROP `20260706190000` |
| `movimientos_finanzas*`, `finanzas_rubros`, `finanzas_gastos`, `fin_bal_iva_deb` | Reemplazadas por esquema `fin_bal_*` / import IVA |
| `pedidos_urgente`, `pedidos_reposicion` | Reemplazadas por `prod_ped_merc` |

**Columnas legacy que se mantienen en `prod_tienda` (no son huérfanas):**

| Columna | Uso actual |
|---------|------------|
| `proveedor` | Espejo DUX congelado; match en `costoListaTienda.service.ts` (`§1.4.2`). Sync **no** escribe. |
| `costo_compra_cod_ext`, `costo_compra`, `es_producto_propio`, `comparar_competencia` | Cx Compra / Px Competencia / sync parcial (`§1.10b`, producto propio, catálogo comparación). |
| `ultima_exportacion_excel`, `last_sync` | Stock export + indicador sync. |

**Procedimiento operativo:** (1) `node scripts/audit-schema-usage.mjs` tras cambios grandes; (2) nueva retirada → migración SQL con `IF EXISTS` + FKs en orden hijo→padre; (3) quitar campo de `schema.prisma` el mismo commit; (4) documentar fila en esta tabla.

### 1.6 Listados de solo lectura (catálogos)

- Para catálogos de solo lectura (ej. `prod_precios_tienda`), exponer búsquedas mediante:
  - **Servicio** (consulta Prisma) + **Action** con sesión/rol + Zod + `ActionResult`.
- Ejemplo aplicado: `buscarBasesTintometricasAction` (módulo Pedido Tintométrico) consulta `prod_precios_tienda` filtrando por `rubro = "Tintometrico"` y búsqueda por descripción/códigos.

### 1.7 Filtros de búsqueda por texto (lecturas)

- Cuando se agrega un filtro de texto (ej. `q`) en un listado de lectura:
  - **Normalizar**: `q?.trim()` y tratar vacío como `undefined`.
  - **Prisma**: usar `contains` con `mode: "insensitive"` y `OR` entre campos relevantes (p. ej. `descripcionTienda` / `descripcionProveedor`).
  - **Ubicación**: la lógica del `where` vive en `src/services/` y la Action solo pasa `q` normalizada.
- **Historial de pedidos** (`listarPedidosHistoria`): `q` opcional; se parte en palabras (máx. 10, texto máx. 200 caracteres); cada palabra debe aparecer en `descripcion_tienda` de **`prod_precios_tienda`** (`AND`); los `cod_tienda` distintos obtenidos filtran cabeceras con `items: { some: { codTienda: { in } } }` (misma fuente de descripción que `getPedidoHistoriaDetalle`). **`estado`**: `PENDIENTE` \| `RECEPCIONADO` \| **`ALL`** (sin filtrar por estado). La página `/pedidos/historial` **sin** query `estado` aplica por defecto filtro **`PENDIENTE`**. Compatibilidad legacy: se acepta `SIN RECEPCION` y se normaliza a `PENDIENTE`. Validación de filtros en RSC (`pedidos/historial/page.tsx`): `proveedorId` con `prismaCuidSchema.optional()`; `q` con `.max(200).optional()`.

### 1.8 Precio de compra sin IVA (`px_compra_final_sin_iva`)

- En listados/exportaciones donde el “costo” proveedor debe ser la **columna generada sin IVA** en `prod_precios_provee`, usar **`px_compra_final_sin_iva`** (campo Prisma **`pxCompraFinalSinIva`**). La función **`pxComparablePedidoUrgenteReposicion`** (ver `@/lib/precioComparacionPedidoUrgenteReposicion`) aplica factor IVA sobre ese valor según `global_proveedores.iva` y el acumulado de saldo IVA cuando el comparable debe incluir IVA; el campo de columna en listados sigue siendo la base sin IVA salvo que la pantalla defina otro criterio explícito.
- Evitar tomar solo `costo_compra` de tienda cuando el contrato sea el precio de lista proveedor calculado en `prod_precios_provee`.
- Migración de columna física: **`20260514120000_rename_prod_precios_provee_px_compra_final_sin_iva`** (`px_compra_final` → `px_compra_final_sin_iva`, misma expresión GENERATED).

### 1.8b Costo en Comp. Categorias — Comparacion (`dto_extra_comparacion`)

- **Solo** en `/gestion-productos/proveedores/comparacion-categorias`: el **COSTO** mostrado no es la columna generada cruda; se recalcula con **`calcCostoComparacion`** (`@/lib/calculos.ts`) sumando **`dto_extra_comparacion`** al total de descuentos.
- Fórmula (idéntica a §1.8 + dto extra):  
  `base = px_lista_proveedor × (cotizacion_dolar si px_dolares, sino 1)`  
  `dtoTotal = dto_proveedor + dto_marca + dto_rubro + dto_cantidad + dto_financiero + dto_extra_comparacion` (cap 0–100)  
  `costo = base × (1 − dtoTotal/100) × (1 + cx_transporte/100)` (redondeo 4 dec.)
- **`dto_extra_comparacion`** y **`dif_px_ref_manual`** se persisten en **`prod_comp_item_comparados`** (`ComparacionItem`: `presentacion_id` + `cod_ext_prod_precios_provee`, `dto_extra` 0–99 o `null`, `dif_px_ref_manual` entero con signo o `null`). **La membresía de productos en una presentación** también vive en esta tabla (una fila por par presentación + `cod_ext`); ya **no** se usa `prod_precios_provee.id_presentacion` (eliminado en **`20260706140000_comp_item_comparados_membership`**). Asignar / quitar ítems: **`asignarProductosAPresentacion`**, **`quitarAsignacionPresentacion`** (create/delete en `prod_comp_item_comparados`). Ajustes por ítem: **`actualizarDtoExtraComparacionAction`**, **`actualizarDifPxRefManualComparacionAction`**; servicio: **`getProductosPorPresentacion`** lee `presentacion.itemsComparados` con join a lista proveedor.

**Troubleshooting P2021 (`prod_comp_categorias` no existe):** el código Prisma espera **`prod_comp_categorias`** pero Neon prod no aplicó la unificación. Verificar en Vercel que **`DIRECT_URL`** (conexión directa Neon, no pooler) esté definida — `prisma migrate deploy` en build la usa vía `prisma.config.ts`. Diagnóstico SQL:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('prod_comp_categorias', 'prod_comp_item_comparados', 'prod_comp_item_referencia', 'prod_comp_cat', 'comparacion_categorias', 'categorias_comparacion');
SELECT migration_name, finished_at FROM "_prisma_migrations"
WHERE migration_name LIKE '20260702%' OR migration_name LIKE '20260703%'
ORDER BY finished_at DESC;
```

Si **`20260702120000`** está pendiente: redeploy (build ejecuta `migrate deploy`). Si figura **applied** pero falta la tabla (p. ej. `migrate resolve --applied` sin SQL): aplicar manualmente el contenido de **`20260703140000_ensure_prod_comp_categorias`** en Neon y redeploy, o `npx prisma migrate deploy` contra prod con `DIRECT_URL`. Si Prisma reporta *migration was modified after it was applied* en dev local tras el endurecimiento idempotente de **`20260702120000`**: actualizar checksum en `_prisma_migrations` o `migrate resolve --applied` solo si el esquema local ya coincide.
- Resto del sistema (lista precios, pedidos, Cx Compra, exportaciones) sigue usando **`px_compra_final_sin_iva`** sin dto extra.

### 1.8c Dif. % manual en Comp. Categorias — Comparacion (`dif_px_ref_manual`)

- Persistido en **`prod_comp_item_comparados.dif_px_ref_manual`** (ver §1.8b). UI: input **DIF % REF. MAN.** (% entero vs px **REFERENCIA COMPETENCIA** activa); al blur se persiste vía **`actualizarDifPxRefManualComparacionAction`**. **PX. CALC.** y **MARG. CALC.** derivados en cliente (`calcPxManualDesdeDifPctReferencia`, `calcMargenManualDesdeDifPctReferencia`).

### 1.8d Reglas descuentos lista precios (`prod_precios_provee_reglas`)

**Decisión de negocio:** los seis valores `dto_proveedor`, `dto_marca`, `dto_rubro`, `dto_cantidad`, `dto_financiero`, `cx_transporte` en **`prod_precios_provee`** son **caché materializada** escrita **solo** por el motor de reglas dimensionales. **`desc_especial`** es caché materializada escrita **solo** por reglas de desc. específico por producto (§1.8d-b). No hay override manual por ítem. La columna GENERATED **`px_compra_final_sin_iva`** incluye `desc_especial` en el `dtoTotal` (migración `20260703100000_prod_precios_desc_especial`).

#### Modelo de datos

| Modelo Prisma | Tabla SQL | Rol |
|---------------|-----------|-----|
| `ProdRubroLista` | `prod_rubros_lista` | Catálogo técnico FK de reglas (`id_rubro`). **Opciones UI de rubro:** nombres distintos de **`prod_tienda.rubro`** (`listarRubrosOpcionesDesdeProdTienda` / `listarRubrosCatalogoReglasDesdeProdTienda` en `rubrosProdTienda.service.ts`; crea fila en `prod_rubros_lista` si falta al armar catálogo de reglas). |
| `ProdPrecioProveeRegla` | `prod_precios_provee_reglas` | Regla por `campo` + `valor` NUMERIC(5,2) + hasta 3 condiciones AND (proveedor / marca / rubro; `NULL` = comodín). |

- **Enum** `CampoReglaDescuentoListaPrecio`: `dto_proveedor` \| `dto_marca` \| `dto_rubro` \| `dto_cantidad` \| `dto_financiero` \| `cx_transporte`.
- **CHECK** al menos una condición no nula; **UNIQUE** `(campo, COALESCE(id_proveedor,''), COALESCE(id_marca,''), COALESCE(id_rubro,''))`.
- **Migración:** `20260619120000_prod_precios_provee_reglas_descuentos`. **No** se infieren reglas desde `dto_*` históricos; tabla de reglas arranca vacía.
- **Post-deploy obligatorio:** `npm run db:recalc-descuentos-lista-precio` → con reglas vacías, todos los `dto_*` / `cx_transporte` → **0** (impacto masivo en `px_compra_final_sin_iva` hasta cargar reglas).
- **Mantenimiento — purga lista sin vínculo tienda:** `npm run db:purge-lista-precio-sin-vinculo` (`scripts/purge-lista-precio-proveedor-sin-vinculo-tienda.ts`). Por defecto **simulación**; con `--execute` borra filas `prod_precios_provee` de un proveedor (`--proveedor "NOMBRE"`) donde **`cod_tienda` IS NULL** (sin vínculo manual a `prod_tienda`). Conserva filas con `cod_tienda` poblado. Cascadas: `prod_comp_item_comparados`; `prod_tienda.costo_compra_cod_ext` → SET NULL si apuntaba al `cod_ext` borrado.

#### Algoritmo de resolución (`descuentosListaPrecioReglas.service.ts`)

Por cada ítem (`id_proveedor`, `marca` texto, `rubro` texto) y cada `campo`:

1. Cargar reglas del campo.
2. Filtrar: `id_proveedor` null o igual al ítem; `id_marca` null o nombre catálogo `prod_marcas` coincide con `item.marca` (**trim + case-insensitive**, locale `es`); `id_rubro` null o nombre `prod_rubros_lista` coincide con `item.rubro` (misma normalización).
3. **Marca no catalogada:** si el ítem tiene texto libre que **no** matchea ningún `prod_marcas.nombre`, las reglas con `id_marca` **no aplican** (ese eje queda en 0 para matching de marca).
4. De las que matchean, gana **mayor especificidad** (= cantidad de condiciones no nulas: 3 > 2 > 1).
5. Sin match → **0** (`clampPercent` en persistencia).

**Anti-empate al guardar:** `validarReglaSinConflicto` rechaza otra regla del mismo `campo` con **igual especificidad**, condiciones distintas y **solapamiento** (existiría un ítem que matchea ambas). Duplicado exacto de condiciones también se rechaza.

#### Servicio y hooks

- **Servicio:** `@/services/descuentosListaPrecioReglas.service.ts`
  - `resolverDescuentosParaItem`, `resolverReglaGanadoraCampo` (interno), `resolverDescuentosActivosParaItem`, `enriquecerFilasConDescuentosActivos`, `materializarDescuentosEnFila`, `materializarDescuentosEnFilas`, `recalcularTodasLasFilas`, `recalcularFilasAfectadasPorRegla` (v1: recalcula **todas** las filas), `validarReglaSinConflicto`, CRUD interno + `listarCatalogosReglasDescuentos`.
- **Lecturas lista precios (modo Desc. en fila):** `getListaPreciosConTiendaFiltrada` enriquece cada `FilaListaPrecioParaCliente` con `descuentosActivos` (solo valores &gt; 0 + `ReglaDescuentoAplicadaResumen` de la regla ganadora por campo).
- **Hooks obligatorios:**
  - `upsertListaPrecios` / `crearProductoListaPrecio` → materializar filas afectadas tras alta/import.
  - `actualizarListaPreciosMasivo` → si cambia `marca` o `rubro`, re-materializar esas filas.
  - CRUD regla → `recalcularFilasAfectadasPorRegla`.
- **Bloqueo escritura manual:** `actualizacionMasivaListaPreciosSchema` y `editarProducto` / `aplicarCampoMasivo` **no** aceptan `dto_*` ni `cx_transporte`.

#### Server Actions (`src/actions/descuentosListaPrecioReglas.ts`)

| Action | Gate |
|--------|------|
| `listarReglasDescuentosListaPrecioAction` | `PERMISOS.listaPrecios.acciones.gestionarReglasDescuentos` + `esEditor()` |
| `crearReglaDescuentosListaPrecioAction` | idem |
| `actualizarReglaDescuentosListaPrecioAction` | idem |
| `eliminarReglaDescuentosListaPrecioAction` | idem |
| `listarCatalogosReglasDescuentosAction` | idem |

Validación Zod: `@/lib/validations/descuentosListaPrecioReglas.ts`. Payloads `unknown` + `.safeParse()`. FKs `idProveedor` / `idMarca` / `idRubro` usan **`prismaIdOptionalNullableSchema`** (`prismaCuidOrUuidSchema` + `""`→`null`): proveedores y marcas legacy en BD tienen **UUID** (`gen_random_uuid()` en migraciones iniciales), no solo CUID.

#### Handoff UI (Fase 2 Full Stack)

**Tipos exportados** (desde `@/services/descuentosListaPrecioReglas.service` / re-export Actions):

```typescript
interface ReglaDescuentoListaPrecio {
  id: string;
  campo: "dto_proveedor" | "dto_marca" | "dto_rubro" | "dto_cantidad" | "dto_financiero" | "cx_transporte";
  valor: number;
  idProveedor: string | null;
  idMarca: string | null;
  idRubro: string | null;
  proveedorNombre: string | null;
  proveedorPrefijo: string | null;
  marcaNombre: string | null;
  rubroNombre: string | null;
  especificidad: number;
  createdAt: string;
  updatedAt: string;
}
```

**`listarCatalogosReglasDescuentosAction`** → `{ proveedores: { id, nombre, prefijo }[], marcas: { id, nombre }[], rubros: { id, nombre }[] }` (proveedores solo `proveedorMercaderia = true`; **rubros** = distinct **`prod_tienda.rubro`** con `id` de `prod_rubros_lista`).

**Ejemplos JSON de reglas:**

```json
{ "campo": "dto_marca", "valor": 18, "idProveedor": "clxxxP1", "idMarca": "clxxxM1", "idRubro": null }
{ "campo": "dto_marca", "valor": 25, "idProveedor": null, "idMarca": "clxxxM1", "idRubro": null }
```

Ítem P1 + marca texto = `M1.nombre` → `dto_marca` materializado = **18** (regla P1+M1 gana sobre solo M1).

**Lecturas lista precios:** `FilaListaPrecioParaCliente` sigue exponiendo `dtoProveedor`, `dtoMarca`, `dtoRubro`, `dtoCantidad`, `dtoFinanciero`, `cxTransporte`, `descEspecial`, `pxCompraFinalSinIva` como **solo lectura** (caché del motor). **`prod_comp_item_comparados`** no se modifica desde lista precios (override solo Comp. Categorías). **`calcCostoComparacion`** (`calculos.ts`) incluye `descEspecial` en el `dtoTotal` además de `dto_extra_comparacion`.

#### 1.8d-b Desc. específico por producto (`desc_especial`)

**Regla de negocio:** descuento adicional por **producto** (`cod_ext`), independiente de las reglas dimensionales. Un producto puede pertenecer a **como máximo una** regla (`UNIQUE` en tabla puente). El valor de la regla se materializa en `prod_precios_provee.desc_especial` y **suma** al `dtoTotal` de `px_compra_final_sin_iva` (misma fórmula que §1.8).

| Modelo Prisma | Tabla SQL | Rol |
|---------------|-----------|-----|
| `ProdPrecioDescEspecialRegla` | `prod_precios_desc_especial_regla` | Regla con `nombre` + `valor` NUMERIC(5,2) + filtros opcionales `id_proveedor` / `id_marca` / `id_rubro` (categorización; al menos uno obligatorio al guardar). Migración `20260703120000_desc_especial_regla_filtros`. |
| `ProdPrecioDescEspecialReglaProducto` | `prod_precios_desc_especial_regla_producto` | Vínculo `regla_id` + `cod_ext` → FK `prod_precios_provee.cod_ext` (**UNIQUE** `cod_ext`). |

- **Migración:** `20260703100000_prod_precios_desc_especial`.
- **Post-deploy opcional:** `npm run db:recalc-desc-especial` → pone `desc_especial = 0` en todas las filas y re-materializa desde reglas.
- **Servicio:** `@/services/descEspecialReglas.service.ts` — CRUD reglas, `materializarDescEspecialEnCodigos`, `recalcularTodasLasFilasDescEspecial`. Al crear/actualizar/eliminar regla o cambiar productos vinculados, actualiza `desc_especial` en las filas afectadas.
- **Actions:** `@/actions/descEspecialReglas.ts` — gate `PERMISOS.listaPrecios.acciones.gestionarReglasDescuentos` + `esEditor()`.
- **Validación:** `@/lib/validations/descEspecialReglas.ts` — al guardar, productos vinculados deben coincidir con los filtros de la regla (`validarProductosCoincidenFiltros` en servicio).
- **Lecturas descuentos activos:** `enriquecerFilasConDescuentosActivos` agrega ítem `campo: "desc_especial"` con `reglaEspecifica: { id, nombre }` (no usa motor dimensional).
- **Descripciones en UI reglas:** `getDescripcionesListaPrecioPorCodExt` (`listaPrecios.service.ts`) + `getDescripcionesListaPrecioPorCodExtAction` — lookup directo por `cod_ext` (sin paginación ni filtro `matchByMultiTerm`) para la grilla de productos vinculados en modales desc. específico.
- **Comp. Categorías — COSTO:** `mapDatosCostoComparacion` en `categoriasComparacion.service.ts` incluye `descEspecial`; `calcCostoComparacion` lo suma al total de descuentos junto con `dto_extra_comparacion`.

### 1.8e Cotización USD única (`global_cotizacion_usd`)

**Regla de negocio:** un solo tipo de cambio USD→ARS para toda la app. El operador define el valor **una vez**; los ítems con `px_dolares = true` usan siempre esa cotización. **No** se edita cotización por ítem ni edición masiva.

| Pieza | Implementación |
|-------|----------------|
| **Fuente de verdad** | `global_cotizacion_usd` — PK fija `id = 'USD'`, `valor DECIMAL(14,4)`, `updated_at`. Migración `20260619130000_global_cotizacion_usd`. |
| **Caché por ítem** | `prod_precios_provee.cotizacion_dolar` — escrita por `cotizacionUsd.service` / import; `1` si `px_dolares = false`. Mantiene compatibilidad con `px_compra_final_sin_iva` GENERATED. |
| **Servicio** | `@/services/cotizacionUsd.service.ts` — `getCotizacionUsd`, `getCotizacionUsdEstado`, `resolverCotizacionDolarParaItem`, `actualizarCotizacionUsd` (propaga a `WHERE px_dolares = true`). |
| **Actions** | `@/actions/cotizacionUsd.ts` — `getCotizacionUsdAction`, `actualizarCotizacionUsdAction`. Gate mutación: `PERMISOS.listaPrecios.acciones.gestionarCotizacionUsd` + `esEditor()`. Lectura: lista precios / import. |
| **Import** | `upsertListaPrecios` usa `resolverCotizacionDolarParaItem(precioEnDolares)` (ya no `process.env.COTIZACION_DOLAR`). |
| **ENV** | `COTIZACION_DOLAR` solo fallback si la fila `USD` no existe al primer `getCotizacionUsd()`. Ver `.env.example`. |
| **UI** | `CotizacionUsdListaPreciosControl` en toolbar lista-precios; retirado campo cotización de `EdicionMasivaListaPreciosModal`. |

**Validación:** `@/lib/validations/cotizacionUsd.ts` — `actualizarCotizacionUsdSchema` (`valor` &gt; 0).

**Tipo handoff UI:** `CotizacionUsdEstado` `{ valor: number; updatedAt: string }`.

### 1.9 Listado Cx Compra (`getTiendaPageData`)

> **Cx Compra** (nombre vigente; antes «Vinculacion Con Prov.» / «Vinc. Con Prov.»). URL canónica sin cambio: `/gestion-productos/tienda/comp-proveedores`.

- **`getTiendaPageData`**: sin filtros en URL lista **todo** `prod_precios_tienda` paginado (`where` vacío); cada filtro activo (`q`, rubro, subRubro, marca, proveedor, `vinculado`) reduce el conjunto.
- Filtro de URL **`cxCompra`** (**CX COMPRA** en Cx Compra; reemplaza **SUB-RUBRO** en esa pantalla): valor = **id (CUID) del proveedor**; matchea ítems cuyo **CX PROD.** apunta a una fila lista de ese proveedor (`costoListaProveedor: { idProveedor }` vía `costo_compra_cod_ext`). Opciones del desplegable: `listarProveedoresCxCompraOpciones()` — solo proveedores con `proveedor_mercaderia = true` y al menos un `prod_precios_tienda.costo_compra_cod_ext` → su `cod_ext`. Tolerante a CUID inválido (se ignora).
- Filtro de URL **`proveedor`** (renombrado **PROV. VINC.** en la UI): valor = **id (CUID) del proveedor**; matchea `listaPreciosProveedores: { some: { idProveedor, habilitado: true } }`. Tolerante a URLs legacy con texto: si el valor no parsea como CUID (`prismaCuidSchema.safeParse`) se ignora silenciosamente y no se aplica el filtro (no rompe la pantalla). Ver §1.4.2.
- Filtro de URL **`vinculado`**: `vinculado=no` → `{ listaPreciosProveedores: { none: {} } }`; `vinculado=si` → `{ listaPreciosProveedores: { some: {} } }`. Otros valores se ignoran.
- **Unificación CX PROD. (2026-05-28):** `getTiendaPageData` enriquece cada fila con **`cxProd: CxProdDatosFila`** vía **`buildCxProdMapDesdeFilas`** (`src/services/cxPxTiendaRows.service.ts` → **`mapCxProdDesdeCandidatos`**). **`guardarCostoCxProdTiendaAction`** revalida **`/gestion-productos/tienda/comp-proveedores`** y **`/tienda`**. Permiso edición/export: **`PERMISOS.cxPxTienda.acceso`**.

### 1.10 Margen sin IVA (Cx Compra — modal vínculos `/tienda`)

- El modal **Vínculos Con Proveedores** ya no muestra margen; `precioLista` / `porcIva` en `ItemTiendaParaTabla` siguen disponibles para otros usos. `calcMargenSinIvaPct` (`src/lib/calculos.ts`) permanece por si otro módulo lo necesita.

### 1.10b Costo de compra elegido (`costo_compra_cod_ext`)

- **Columna** `prod_precios_tienda.costo_compra_cod_ext` (`TEXT NULL`, FK → `prod_precios_provee.cod_ext`). Historial de nombres: `cod_ext_costo_lista` → `cod_ext_costo_compra` → `cx_px_cx_cod_ext` (migración **`20260528160000`**) → **`costo_compra_cod_ext`** (migración **`20260528200000_prod_precios_tienda_costo_compra_cod_ext`**). Campo Prisma: **`costoCompraCodExt`**.
- **Convivencia con DUX**: `costo_compra` sigue siendo **espejo DUX** en `prod_tienda` (`syncListaPrecioTienda.service.ts`). Precios de venta por lista → **`prod_tienda_precios`** (§1.4.3). Desde **2026-05-28** **`proveedor` quedó congelado** (ya no se actualiza por DUX — ver §1.4.2); **`cod_ext` en tienda eliminado** (`20260606120000`). El sync **no** escribe ni borra `costo_compra_cod_ext`, **`es_producto_propio`** ni **`comparar_competencia`**. Migración **`20260528210000`** retiró `px_lista_cx_px` y `cx_px_px_comp_ref`; **`es_producto_propio`** se **restauró** en **`20260530120000`** para **Cx Compra** (ver § Producto propio). **`prod_precios_competencia`** no se modifica por sync DUX lista tienda.
- **CX PROD.** (`buildCxProdMapDesdeFilas` / `costoCxProdMostrado` en `src/lib/cxPxTienda.ts`): promedio de vínculos habilitados (**CX. PROM.**) o costo del proveedor elegido vía `costo_compra_cod_ext`.
- **Candidatos** para asignar o validar: `prod_precios_provee` con `cod_tienda_vinculo = ítem`, `habilitado = true`.
- **Vínculos** (`src/actions/vinculos.ts`): `getVinculos` devuelve `{ productos, costoCompraCodExt }`. Tras `vincularProducto`: `autoAsignarCodExtCostoListaTrasVincular` (solo si FK vacía: un candidato o match DUX). Tras `desvincularProducto`: `limpiarCodExtCostoListaSiCoincide` si la FK apuntaba a ese `cod_ext`. Elección explícita de costo en UI:
  - **`guardarCostoCxProdTiendaAction`** (`cxPxTienda.ts`, gate `PERMISOS.cxPxTienda.acceso` + editor) — dropdown **CX PROD.** en **Cx Compra** (`CeldaCxProdTienda`).
  - **`establecerCostoListaTiendaAction`** (`vinculos.ts`, gate `PERMISOS.tienda.acceso` + editor) — columna **BASE** en subfilas expandidas **Cx Compra** (`CxCompraVinculosDetalle`); firma `(itemTiendaCod, productoListaCodExt: string | null)`: si `codExt` es `string` valida y persiste `costo_compra_cod_ext`; si es `null` llama `limpiarCodExtCostoLista` (destildar = Cx. Prom.). Revalida `/tienda` y `/gestion-productos/tienda/comp-proveedores`.
- **`exportarCostoCxDiffAction`** (`exportCostoCxDiff.service.ts` + `exportCostoCxExcelClient.ts`): compara **`prod_tienda.costo_compra`** (DUX) con **`prod_precios_provee.px_compra_final_sin_iva`** del vínculo **`costo_compra_cod_ext` → `cod_ext`**. Solo entra en Excel si `|costo_compra − px_compra_final_sin_iva| ≥ 0,01` (`costosCompraDifieren`; tolerancia de **1 centavo**, alineada al **COSTO** exportado a 2 decimales). Columnas **CODIGO**, **COSTO** = `px_compra_final_sin_iva` redondeado a **2 decimales**. Requiere FK `costo_compra_cod_ext` y vínculo **habilitado**. **Informe PDF aumentos** (`obtenerInformeAumentosCostos`): **misma lista** vía `listarItemsCostoCxDiff`; agrupa por marca/rubro (fallback **SIN MARCA** / **SIN RUBRO**). **UI:** botón **Act. Cx.** en Cx Compra descarga `.xls` para import manual en DUX (sin POST API).
- **Oficial DUX** (columna OFICIAL en modal): regla distinta — prefijo proveedor vs texto `proveedor` tienda; no sustituye la elección de costo Cx/Px salvo auto-asignación al vincular.

### 1.10c Lotes y pausa — consultas API DUX ERP (GET/POST)

**Regla obligatoria** para integraciones con **`erp.duxsoftware.com.ar`** que envían o consultan ítems en serie:

| Parámetro | Valor | SSOT código |
|-----------|-------|-------------|
| Ítems por lote | **50** | `DUX_API_BATCH_SIZE` (`src/lib/duxApiBatchPolicy.ts`); alineado a `DUX_API_PAGE_LIMIT` (`duxApi.ts`) |
| Pausa entre lote y lote | **≥ 5 s** | `DUX_API_BATCH_INTERVAL_MS` (mín. 5000 ms; override env `DUX_SYNC_DELAY_MS` sin bajar de 5 s) |

**Implementaciones actuales:**

- **Sync lista precios tienda** — GET paginado: **50** ítems/página (`fetchItemsPage`, `DUX_API_PAGE_LIMIT`); **`DELAY_MS`** 5 s entre páginas (`syncListaPrecioTienda.service.ts`). Persistencia Neon en chunks aparte (`DUX_SYNC_CHUNK_SIZE`, no confundir con lote DUX).
- **Reintentos 429 (sync):** backoff en `duxApi.ts` (`fetchItemsPage`).

**Nuevos flujos DUX:** usar las constantes de `duxApiBatchPolicy.ts`; no hardcodear 100 ni intervalos menores a 5 s. Progreso UI en sidebar (`FRONTEND_GUIDELINES` § SSOT progreso API DUX).

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

### 1.11d Política de IVA por proveedor (`global_proveedores.iva`)

- Persistencia: `global_proveedores.iva` (`enum IvaProveedor`, **`NOT NULL`**, **default DB `'PREGUNTA'`**). Prisma: `iva IvaProveedor @default(PREGUNTA) @map("iva")`. Sin índice (cardinalidad = 3; mismo criterio que `global_sucursales.centro_costo`).
- **El enum `IvaProveedor` es transversal**, no exclusivo del modelo `Proveedor`. Otras tablas pueden persistir su propia política reutilizando el mismo tipo Postgres. Hoy lo consume `fin_bal_gasto_final.iva` (ver §2.5e). Si se agrega un nuevo consumidor: **no** crear un enum hermano; reutilizar `IvaProveedor` y documentarlo en esta sección.
- Enum PostgreSQL/Prisma `IvaProveedor` (enumeración cerrada, misma familia conceptual que otros enums financieros p. ej. `TipoCajaTesoreria`, `TipoChequeTesoreria`):
  - `SIEMPRE` — el proveedor **siempre** factura con IVA.
  - `NUNCA` — el proveedor **nunca** factura con IVA.
  - `PREGUNTA` — política indefinida; la UI/flujo debe **preguntar** caso por caso. Es el default semántico (no asume política comercial sobre proveedores nuevos ni preexistentes).
- Migración `20260507193000_add_global_proveedores_iva` (idempotente):
  1. `CREATE TYPE "IvaProveedor" AS ENUM ('SIEMPRE','NUNCA','PREGUNTA')` envuelto en `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$`.
  2. `ALTER TABLE "global_proveedores" ADD COLUMN IF NOT EXISTS "iva" "IvaProveedor" NOT NULL DEFAULT 'PREGUNTA'` — el `DEFAULT` estático actúa como backfill in-place (PostgreSQL ≥ 11 no reescribe la tabla); todas las filas existentes quedan en `PREGUNTA`.
- Validación Zod (módulo compartido `@/lib/validations/iva.ts`):
  - **Fuente de verdad**: `IVA_VALUES = ['SIEMPRE','NUNCA','PREGUNTA'] as const`, `type IvaValue`, `ivaPoliticaFormSchema` (acepta `string` opcional, normaliza con `trim().toUpperCase()` y devuelve uno de los 3 valores; cualquier otro string cae a `PREGUNTA` — mismo default que la BD; nunca produce error de validación).
  - `@/lib/validations/proveedor.ts` re-exporta los aliases históricos para compatibilidad con call sites existentes:
    - `IVA_PROVEEDOR_VALUES = IVA_VALUES`
    - `IvaProveedorValue = IvaValue`
    - `ivaProveedorFormSchema = ivaPoliticaFormSchema`
  - Incluido en `createProveedorSchema` / `updateProveedorSchema` (clave `iva`) y en `crearFinBalGastoFinalSchema` / `editarFinBalGastoFinalSchema` (también clave `iva`). Cualquier nuevo schema que necesite la política debe importar `ivaPoliticaFormSchema` desde `@/lib/validations/iva` — **no** duplicar el schema.
- Servicio `src/services/proveedor.service.ts`:
  - Re-exporta `IvaProveedor` desde `@prisma/client` para call sites que necesiten el tipo.
  - `CreateProveedorInput` y `UpdateProveedorInput` exigen `iva: IvaProveedor`.
  - `ProveedorListItem.iva: IvaProveedor` (expuesto en **todos** los listados: `getProveedores`, `getProveedoresMercaderia`, `getProveedoresNoMercaderia`).
  - `getProveedorById` selecciona y devuelve `iva` (para precarga en edición desde otros flujos).
  - `createProveedor` / `updateProveedor` propagan `iva` al `data` de Prisma. No hay normalización adicional: la única fuente de validación es Zod.
- Actions `src/actions/proveedores.ts`:
  - `crearProveedor` y `editarProveedor` agregan `iva: (formData.get("iva") as string | null) ?? ""` al payload bruto antes de `safeParse`.
  - El orden de mensajes de error agrega `iva` al final (después de `plazosPagos`); en la práctica `ivaProveedorFormSchema` no falla nunca (cae a `PREGUNTA`), pero se mantiene el campo en el flatten por consistencia con el patrón de auditoría.
- UI (`ProveedorForm.tsx` + `ProveedorModal.tsx` + `TablaProveedoresGestion.tsx` + `TablaProveedoresLista.tsx` + `FinBalGastosCatalogoPageClient.tsx`):
  - Select `IVA` con opciones SIEMPRE / NUNCA / PREGUNTA, controlled + hidden `<input name="iva">` para que viaje por `FormData`.
  - **Default UX en alta**: `PREGUNTA` (mismo default de la columna). En edición se precarga `proveedor.iva` persistido. Sin asterisco "obligatorio" (siempre hay un valor válido por defecto).
  - `ProveedorParaModal` incluye `iva?: 'SIEMPRE' | 'NUNCA' | 'PREGUNTA'`. Las tablas que abren el modal mapean `prov.iva` desde `ProveedorListItem` al armar el `ProveedorParaModal`.
- **Regla para futuras IAs/colaboradores**:
  - Si una pantalla nueva debe respetar la política de IVA del proveedor (p. ej. flujo de carga de comprobantes, importación DUX, generación de PDF), **leer `iva` desde el listado/`getProveedorById`**; no inferir desde otros campos. `PREGUNTA` significa explícitamente "preguntar al operador" (no asumir SIEMPRE ni NUNCA).
  - Si se necesita un nuevo valor (p. ej. `RETENCION`), agregarlo al enum vía migración `ALTER TYPE "IvaProveedor" ADD VALUE 'XXX'` (no reescribir el enum; PostgreSQL no permite borrar valores). Documentar el nuevo caso de uso aquí.
  - **No** usar `iva` como FK ni como predicado masivo; si un reporte futuro requiere agrupar por política, evaluar primero la cardinalidad en datos reales antes de agregar índice.

#### 1.11d.1 Regla `iva → tipo comprobante` en recepción de pedidos (POST DUX)

- **Dónde se aplica**: `tipo_comprobante` del POST DUX v2/compras, resuelto en `prepararRecepcionCompraDatos` (`src/services/exportRecepcionPedidoExcel.service.ts`) e invocado por `registrarRecepcionCompraDuxAction` desde **Registrar En Dux** en `PedidoHistoriaDetalleModal` (`/pedidos/historial`).
- **Tabla del mapeo** (canonizada en helper `resolverTipoComprobantePorIva(iva, decisionFiscal)`):

  | `proveedor.iva` | `decisionFiscal` (UI) | `tipo_comprobante` (POST DUX) |
  |---|---|---|
  | `SIEMPRE` | ignorado | `FACTURA` |
  | `NUNCA` | ignorado | `Comprobante_Compra` |
  | `PREGUNTA` | `true` (SI) | `FACTURA` |
  | `PREGUNTA` | `false` (NO) | `Comprobante_Compra` |
  | `PREGUNTA` | `null` / `undefined` | **error** `REQUIERE_DECISION_FISCAL` |

- **Tipos**:
  - `TipoComprobanteRecepcion = "FACTURA" | "Comprobante_Compra"` exportado desde el servicio (**FACTURA** en mayúsculas para coincidir con DUX).
  - `ERROR_REQUIERE_DECISION_FISCAL = "REQUIERE_DECISION_FISCAL"` — constante exportada sólo desde **`exportRecepcionPedidoExcel.service.ts`**. Un archivo **`"use server"`** no puede `export`-ar strings síncronos; re-exportar esa constante desde una Action provocaba `invalid-use-server-value` en runtime.
- **Servicio** (`exportRecepcionPedidoExcel.service.ts`):
  - El `findUnique` de `pedidoHistoria` incluye `proveedor: { select: { idProveedorDux: true, prefijo: true, iva: true } }`.
  - `prepararRecepcionCompraDatos` recibe `decisionFiscal?: boolean` y aplica `resolverTipoComprobantePorIva(pedido.proveedor.iva, decisionFiscal)`. Si devuelve `null`, retorna `{ success: false, error: ERROR_REQUIERE_DECISION_FISCAL }`. El **nro comprobante** sale de **`prod_ped_ult_comp`** según tipo **FACTURA** vs **Comprobante_Compra** (ver §2.8).
- **Action** (`actions/registrarRecepcionCompraDux.ts`):
  - Schema Zod incluye `decisionFiscal: z.boolean().optional()`.
  - Si el servicio devuelve `REQUIERE_DECISION_FISCAL`, viaja hasta el cliente como `error` para que el modal SI/NO se abra.
- **Flujo cliente** (`PedidoHistoriaDetalleModal.tsx`):
  - `getPedidoHistoriaDetalle` expone **`proveedorIva: IvaProveedor`** en `PedidoHistoriaDetalle`.
  - El modal usa `pedirDecisionFiscalSiAplica()` antes de **Registrar En Dux**: si `proveedorIva` ∈ {`SIEMPRE`, `NUNCA`} no abre nada; si es `PREGUNTA`, abre `ConfirmarComprobanteFiscalModal` (Si/No). Cancelar aborta sin POST.
- **Regla para futuras IAs**:
  - **No** duplicar el mapeo en el cliente. Si un nuevo flujo necesita usar la regla, importar y reutilizar `resolverTipoComprobantePorIva` desde `@/services/exportRecepcionPedidoExcel.service`.
  - **No** asumir un default cuando `iva = PREGUNTA` y falta `decisionFiscal`: la única respuesta correcta es el marker `REQUIERE_DECISION_FISCAL` (la decisión es responsabilidad del operador en UI).
  - Si una nueva integración (p. ej. PDF, otra API) necesita un mapeo análogo, agregar un helper hermano (`resolverTipoXxxPorIva`) y documentarlo aquí — **no** reusar el helper de Excel para semánticas distintas.
  - Precios unitarios **netos** con **4 decimales** (`PRECIO_UNITARIO_RECEPCION_DECIMALES`); total ingresado (con IVA) se divide por **1,21** antes del reparto. POST **no** envía `percepciones[]` en v1.

### 1.11e Catálogo personal DUX (`global_personal`)

- **Tabla:** `global_personal` — Prisma `GlobalPersonal`.
  - `id_personal` (`INTEGER`, PK): ID numérico del personal en DUX (mismo valor que `id_personal` en POST v2/compras).
  - `nombre_personal` (`TEXT`, NOT NULL): nombre para mostrar en selector UI.
- **Migración:** `20260605100000_add_global_personal`.
- **Carga de datos:** manual (`INSERT`) o sync futuro desde API DUX *Consultar Personales*; no hay UI de alta en v1. Seed inicial (migración `20260605110000_seed_global_personal`): `14242873` FERNANDO PANAIA, `14045740` WALTER GARCIA, `1930206` EMILIANO GARCIA, `1930207` JUAN PABLOCHANTA.
- **Lectura:** `listGlobalPersonal()` en `src/services/globalPersonal.service.ts`; Action `listGlobalPersonalAction` (`src/actions/globalPersonal.ts`) con gate `PERMISOS.pedidos.acceso`.
- **Uso en recepción:** antes de `registrarRecepcionCompraDuxAction`, la UI debe pedir al operador qué personal registra la compra; el `idPersonal` elegido se envía en el payload y se mapea a `id_personal` del POST. Validación Zod: `z.coerce.number().int().positive()` (campo `idPersonal` en la Action). Selector: `ElegirPersonalRecepcionModal` enlazado a **Registrar En Dux**.

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

### 1.5.1 Error Boundaries de Server Components y diagnóstico en producción

Esta sección **es obligatoria** para todas las páginas RSC y existe para evitar la regresión documentada en `§5.12` (mensaje genérico *"An error occurred in the Server Components render…"* en `/pedidos/historial`).

**A. Boundaries presentes (no eliminar)**

- `src/app/global-error.tsx` — captura excepciones del **root layout** (incluye `getRol()` y cualquier provider) y de Server Components que no tengan un `error.tsx` más cercano. **Debe ser Client Component** y renderizar sus propios `<html>`/`<body>` (regla de Next.js 16). Loggea `digest` con prefijo `[global-error]` para grep en Vercel Function Logs.
- `src/app/pedidos/historial/error.tsx` — boundary específico del módulo Recepción Pedido. Cualquier excepción durante el render del Server Component `pedidos/historial/page.tsx` o de sus hijos cae acá. Loggea con prefijo `[pedidos/historial][error-boundary]`.
- **Regla**: cualquier nuevo módulo con un Server Component que lea de Prisma o sesión debe agregar un `error.tsx` en su carpeta antes de salir a producción. No alcanza con depender solo de `global-error.tsx`: queremos UI específica del módulo + un `digest` rastreable.

**B. Hardening en Server Components (page.tsx)**

- **Nunca** dejar una llamada que pueda lanzar (Prisma, `getRol`, fetch externo) fuera de `try/catch` en el cuerpo de un `async` page/layout. La excepción atraviesa el render y se vuelve el mensaje genérico opaco.
- Patrón aplicado en `src/app/pedidos/historial/page.tsx`:
  - Cada lectura de catálogo auxiliar (p. ej. `prisma.proveedor.findMany`) va en su propio `try/catch`; si falla, se cae a un fallback (`[]`) y se loggea con prefijo `[pedidos/historial][page]`.
  - El servicio principal (`listarPedidosHistoria`) ya devuelve `ServiceResult`, pero igual se envuelve para capturar fallos del adapter (init de Neon, conn pool exhausted) que pueden lanzar fuera del `try/catch` interno.

**C. Sesión defensiva (`getRol`)**

- `getRol()` (`src/lib/sesion.ts`) atrapa cualquier excepción de iron-session (cookie corrupta, secret rotado, firma inválida) y devuelve `"simple"` con un log `[sesion][getRol]`. Antes este `throw` subía hasta el render del root layout y disparaba el error genérico en **toda** la app, sin pista útil.
- Consecuencia: una sesión inválida ya no rompe el render; sólo redirige a inicio si la página exige un permiso. Si una nueva ruta necesita distinguir “sesión inválida” vs “sin permiso”, debe llamar a `getSesion()` directamente y manejar su propio `try/catch`.

**D. Logging server-side (no opacar errores)**

- **Toda Action y servicio del flujo crítico de pedidos/recepción** loggea en el `catch` con un prefijo identificable antes de devolver `ServiceResult/ActionResult`:
  - Servicios: `[pedidoHistoria][<fn>]` y `[exportRecepcionPedidoExcel][<fn>]`.
  - Actions: `[pedidoHistoria][action][<fn>]` y `[exportRecepcionPedidoExcel][action]`.
- Los Action wrappers usan `ejecutarActionSegura(scope, fn)` (helper privado en `src/actions/pedidosHistoria.ts`): cualquier excepción que escape al body de la Action (ej. en `revalidatePath`, en `getRol`, en validaciones raras) se convierte en `{ ok: false, error: "Error inesperado al procesar la solicitud." }` y queda grepeada en logs como `[pedidoHistoria][action][<scope>]`. Replicar este patrón en cualquier Action nueva del módulo.
- Para futuras IAs: cuando agreguen una nueva Action de pedidos/recepción, **es obligatorio**:
  1. Envolverla en `ejecutarActionSegura("nombreCorto", async () => { ... })`.
  2. Mantener `getRol()` + `puede(rol, PERMISOS.pedidos.acceso)` dentro del wrapper.
  3. Loggear con el mismo prefijo en `console.error` si se agregan `try/catch` internos.

**E. Defensa de shape contra relaciones nulas**

- Aunque las FK estén declaradas `NOT NULL`, los servicios que leen relaciones con `select.proveedor.{...}` o `select.sucursal.{...}` **deben** validar que la relación no sea `undefined` antes de leer subcampos (p. ej. `pedido.proveedor.iva`). En `getPedidoHistoriaDetalle`, `getPedidoHistoriaPdfPayload` y `prepararRecepcionCompraDatos` se devuelve un `ServiceResult` con error explícito si la relación viene incompleta y se loggea con el prefijo del módulo. Esto evita que un cliente Prisma desactualizado (entre deploys) se traduzca en `TypeError` genéricos.
- En listados (`listarPedidosHistoria`) se usa el patrón menos estricto `r.proveedor?.nombre ?? "—"` para no romper el render del listado completo si una fila está corrupta.

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
import { listaPreciosCodExtListSchema, actualizacionMasivaListaPreciosSchema } from "@/lib/validations/listaPrecios";

export async function actualizarListaPreciosMasivoAction(
  ids: string[],
  data: ActualizacionMasivaListaPrecios
): Promise<ActionResult<{ actualizados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para edición masiva." };
  }
  const parsedIds = listaPreciosCodExtListSchema.safeParse(ids);
  if (!parsedIds.success) return { ok: false, error: "Cód. externos inválidos." };
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

Cabeceras persistidas desde la API **`/compras`** (mismo origen que `duxComprasApi.ts`). La columna `id_proveedor` guarda el **mismo valor** que `global_proveedores.id_proveedor_dux` (FK).

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
  - **Progreso en UI:** durante `sincronizarComprobantesProveedorDesdeDux` se actualiza la fila **`sync_dux_status.id = compras-proveedor-dux`** (`start` → `processed`/`total` por sucursal completada → `success` o `error`). El cliente hace polling con **`GET /api/sync-compras-proveedor-dux/status`**, con **`guardFinanzasLectura()`** (`PERMISOS.finanzas.acceso`) en el route. Los valores **X de Y** representan **sucursales DUX ya procesadas / total de sucursales** con `id_dux` numérico (no cantidad de comprobantes por página). El route expone **`remainingMinutes`** (heurística: sucursales restantes × `syncComprasSecondsPerSucursalEstimate()` en `comprobantesProveedorDuxSync.service.ts`).
  - **Una petición (o ráfaga paginada) por cada** `global_sucursales.id_dux` numérico; entre sucursales respeta `DUX_COMPRAS_MIN_INTERVAL_MS`.
  - **Ventana fija de consulta por sync**: `fechaDesde = hoy AR − 150 días` y `fechaHasta = hoy AR + 1 día` (sin depender de `MAX(fecha_comp)` persistida).
  - **Purga al finalizar cada sync**: `DELETE` lógico vía `deleteMany` donde `fecha_comp` &lt;= `fechaDesde` (purga inclusiva del borde de ventana para evitar arrastre de registros desactualizados); el conteo vuelve en `data.eliminadosAntiguos`.
  - **Paginación `/compras`**: la API DUX devuelve **como máximo 50** filas por GET (`DUX_COMPRAS_API_PAGE_LIMIT` en `duxComprasApi.ts`). `fetchComprasPagesAcumulado` usa `limit=50` y `offset=0,50,100…` hasta vacío o menos de 50 resultados. `DUX_COMPRAS_SYNC_LIMIT` (opcional) acota 1..50; `DUX_COMPRAS_SYNC_MAX_PAGES` default **500** (techo de seguridad, configurable). Entre páginas y entre sucursales se respeta `DUX_COMPRAS_MIN_INTERVAL_MS`.
  - **Omisiones**: filas sin `tipo_comp`, `fecha_comp` válida, `id_proveedor` que **no** exista en `global_proveedores.id_proveedor_dux`, o importes numéricos inválidos en `total` / `monto_aplicado`.
- **Action**: `sincronizarComprobantesProveedorDesdeDuxAction` (`src/actions/comprobantesProveedor.ts`) — solo **`esEditor()`**; devuelve `ActionResult` con resumen (`eliminadosAntiguos`, `upserts`, `omitidos`, `detalleSucursal` con `error?` por sucursal).
- **Deuda por proveedor (Finanzas — pantalla *Venc. Provee. Merc.*, ruta `/finanzas/deuda-proveedores`)**: `listarDeudaProveedores` en `src/services/deudaProveedores.service.ts` — por cada línea con saldo (`total > monto_aplicado`), **fecha de vencimiento** = `fecha_comp` + primer plazo en `global_proveedores.plazos_pagos` (CSV; si falta o no es numérico → **30** días; mínimo **1** día). **Hoy** = fecha en `America/Argentina/Buenos_Aires`. Columnas agregadas: **deuda total**, **vencida** (`fecha_venc` &lt; hoy), **5 / 30 / 45 / 60 DÍAS** según ventanas `hoy … hoy+5`, `hoy+6 … hoy+30`, `hoy+31 … hoy+45`, `≥ hoy+46`. Además, `listarDetalleDeudaProveedoresMercaderia()` expone detalle por proveedor en shape `FlujoFondoDetalleDiaFila` con `fechaDevengadaIso` (=`fecha_comp`), `fechaVencimientoIso` (cálculo de plazo proveedor), `detalle` fijo `MERCADERÍA`, para modal de doble clic en la tabla. Lectura en **Server Component** con `getRol()` + `PERMISOS.finanzas.acceso`.
- **Venc. por fecha (Finanzas)**: `listarVencimientosEnRango` + **`sumarSaldoVencimientosConFechaVencAnteriorA`** en `src/services/vencimientosPorFecha.service.ts` (misma CTE; **pendiente** = `total - monto_aplicado`); y **`listarVencimientosGastoFlujoEnRango`** + **`sumarPendienteGastosConFechaVencAnteriorA`** en `src/services/finBalGastoMensualBalance.service.ts` (imputaciones `fin_bal_gasto_mensual`, venc. desde devengo + **`fin_bal_gasto_final.plazo_pago_dias`** días; **pendiente** = fórmula devengado coherente con `/finanzas/balance/gastos`, corte = fecha de venc en ventana o &lt; hoy). El listado filtra `fecha_venc` en `[hoy, hoy + 150 días]` **inclusive** (compras) y venc. de gasto en el mismo rango. Grilla **Flujo De Fondo** (`/finanzas/venc-por-fecha`): cuatro columnas (**FECHA**, **VENCIMIENTO DEL DÍA**, **CAJA DISPONIBLE**, **SALDO**). Cálculo en **`calcularFilasFlujoDeFondo`** (`@/lib/flujoDeFondoFilas.ts`): fila 1 **SALDO** = vencimientos acumulados (previos + del día) − **CAJA** (tesorería + cheques diferidos acumulados ese día); filas 2+ **CAJA** fija según fila 1 (`saldo₁ > caja₁` → 0; si no → `caja₁ − saldo₁`); **SALDO** = saldo anterior + vencimiento del día − caja. La página unifica en servidor: detalle del modal **una fila por obligación** (comprobante o imputación), con columna fija `MERCADERÍA` para compras. Paginado: **`pagina`**, `PAGE_SIZE = 100` (cálculo sobre el calendario completo; slice server-side).
- **Control Comprobantes (Finanzas)**:
  - Lectura: `listarControlComprobantes()` en `src/services/controlComprobantes.service.ts` (join `fin_compras_comprobante` + `global_proveedores` + `global_sucursales`) devuelve: `fechaComp`, `proveedorNombre`, `sucursalNombre`, `comprobante`, `total`, `montoAplicado`, `controlado` y `vencimientoSaldo`.
  - `sucursalNombre`: se resuelve por `global_sucursales.id_dux = fin_compras_comprobante.id_sucursal_empresa`; si no hay match, usa fallback con el valor crudo `id_sucursal_empresa`.
  - Orden de listado: por `fecha_comp` ascendente (más antiguo → más reciente), y luego `proveedorNombre` + `comprobante`.
  - Regla de **VENCIMIENTO**: `vencimientoSaldo` = `total - monto_aplicado` **solo** cuando `saldo > 0` y `fecha_venc < hoy` (misma fórmula de `fecha_venc` por primer plazo `plazos_pagos`, default 30, mínimo 1); en caso contrario `0`.
  - Escritura: `actualizarControladoComprobanteAction(raw)` en `src/actions/controlComprobantes.ts` valida `{ id, controlado }` con Zod (`id` CUID), exige `getRol()+puede(PERMISOS.finanzas.acceso)` y `esEditor()`, delega en `actualizarControladoComprobante()`, y revalida `/finanzas` + `/finanzas/control-comprobantes`.
- **SQL / migraciones**: instalación nueva `scripts/neon-comprobantes-proveedor.sql`; evolución desde esquema anterior `20260330200000_fin_compras_comprobante_dux_campos` (renombres + `id_sucursal_empresa` + unique) y `20260417123000_add_controlado_to_fin_compras_comprobante` (`controlado BOOLEAN NOT NULL DEFAULT FALSE`). **Histórico**: la migración `20260418260000_rename_prod_comp_y_comprobantes` incluyó inicialmente `fin_compras_comprobante → prod_comp_provee`, pero fue **revertida** por `20260418270000_revert_rename_fin_compras_comprobante` manteniendo el nombre original — el prefijo `prod_comp_*` queda reservado exclusivamente al dominio "Comparación por Categoría".

### 2.5b Histórico: tabla `movimientos_finanzas` (**eliminada 2026-05-12**)

- Existió como modelo Prisma **`MovimientoFinanzas`** con enum **`TipoMovimientoFinanzas`** (`EFECTIVO | BANCO | CHEQUE`) para gastos simples por sucursal; quedó **sin uso activo** al consolidar **`fin_bal_gasto_mensual`** en Balance · Gastos.
- **Baja**: migración **`20260512210000_drop_movimientos_finanzas`** (`DROP TABLE "movimientos_finanzas";` + `DROP TYPE "TipoMovimientoFinanzas"`). Migraciones previas de alta/rename/consolidado de cheques: `20260402110000_*`, `20260418140000_*`, **`20260512203000_drop_movimientos_finanzas_cheques`**.
- **`listarSucursalesParaGastos()`** (sucursales con `global_sucursales.centro_costo = true`) vive ahora en **`src/services/finBalGastoMensualBalance.service.ts`** junto al resto del flujo de `/finanzas/balance/gastos`; **tipo** exportado **`SucursalOption`**.
- **Sucursal "CORPORATIVO"**: suele vivir en `global_sucursales` con `codigo = 'corporativo'`, `pedido = FALSE` e `id_dux = NULL` para imputaciones sin sucursal física. Queda fuera de selectores de pedidos porque **todas** las páginas de pedidos filtran `where: { pedido: true, codigo: { in: ["guaymallen", "maipu"] } }` (`src/app/pedidos/urgente/page.tsx`, `src/app/pedidos/reposicion/page.tsx`, `src/app/pedidos/enviar/page.tsx`) y los syncs DUX filtran por `idDux` numérico (`comprobantesProveedorDuxSync.service.ts`). Migración histórica `prisma/migrations/20260418150000_seed_sucursal_corporativo/migration.sql` insertó un id fijo `'suc_corporativo'`; **`listarSucursalesParaGastos()`** incluye esa fila cuando tiene **`centro_costo = true`**. Zod: `globalSucursalIdSchema` en `@/lib/validations/common.ts` acepta UUID, CUID o el literal `suc_corporativo` para `sucursalId` en gastos / gasto final.
- **Flag `global_sucursales.centro_costo`** (Prisma: `Sucursal.centroCosto`, `BOOLEAN NOT NULL DEFAULT FALSE`): marca si la sucursal se considera **centro de costo** para reportes de balance / imputación contable. **Ortogonal a `pedido`**: `pedido` rige la participación en flujos de pedidos de mercadería; `centro_costo` sólo tiñe lecturas contables. Una sucursal puede ser `pedido = true, centro_costo = true` (ej. GUAYMALLEN / MAIPU si corresponde), `pedido = false, centro_costo = true` (ej. CORPORATIVO si se decide imputar contra él) o combinaciones opuestas. No hay UI de edición de sucursales: el flag se gestiona por **seed / UPDATE manual** en la DB (mismo canal que el resto de atributos de `global_sucursales`). Sin índice (cardinalidad = 2; se lee como payload, no como predicado masivo). Registros preexistentes quedan en `false` al aplicar la migración; marcar con `UPDATE global_sucursales SET centro_costo = TRUE WHERE codigo IN (...);` cuando se defina la política funcional. Migración: `prisma/migrations/20260418250000_add_sucursales_centro_costo/migration.sql` (SQL histórico sobre tabla `sucursales`, hoy `global_sucursales`).

### 2.5f Balance mensual (`/finanzas/balance/mensual`) y ventas de balance (`fin_bal_vtas`)

- **Rutas**: `src/app/finanzas/balance/mensual/page.tsx` (redirect desde `/finanzas/balance`); cliente `src/components/finanzas/FinanzasBalanceMensualPageClient.tsx`. Permiso: `PERMISOS.finanzas.acceso`. La pantalla es **solo lectura** respecto de ventas: no expone edición de `fin_bal_vtas` (eso queda en **Ventas Mensuales**, con **`esEditor()`** en mutaciones vía actions).
- **Datos en servidor (por mes/año calendario Argentina)**: en paralelo se cargan `listarImputacionesMensualesBalance({ mes, anio })` (`finBalGastoMensualBalance.service.ts`), `listarSucursalesGeneraBalanceParaVtas()` y `listarFinBalVtasPorMesAnio(mes, anio)` (`finBalVtas.service.ts`). El resumen se arma con **`resumenBalanceMensualDesdeFilas(filas, ventasPorNombre, sucursalesGeneranBalance)`** en `src/lib/balanceMensual.ts`.
- **Reglas de negocio del resumen** (`balanceMensual.ts`):
  - **Global**: suma todas las imputaciones del mes; **ventas** del global = suma de ventas cargadas en sucursales con `genera_balance` (no es un registro aparte en `fin_bal_vtas`).
  - **Por sucursal**: entran **todas** las sucursales con `genera_balance = true` (aunque no tengan imputaciones ese mes), más cualquier nombre con `genera_balance` que solo aparezca en filas de gasto; costos de sucursales `centro_costo` y **sin** `genera_balance` se reparten en partes **iguales** entre las que sí generan balance.
  - Clasificación **costos variables / fijos** por texto del tipo de gasto (`VARIABLE` / `FIJO`; si no coincide, se trata como fijo).
  - **Exportado para UI o informes**: `fmtMargenContribucionPct(p)` (porcentaje sobre ventas o `—`); `puntoEquilibrioVentasPesos(b)` — ventas en pesos necesarias para cubrir costos fijos con el ratio actual `(resultadoOperativo / ventas)`; devuelve `null` si no es calculable.
- **Tabla `fin_bal_vtas`** (Prisma `FinBalVtas`): montos enteros por **`sucursal_id` + `mes` + `anio`**. **`@@unique([sucursalId, mes, anio])`** (`fin_bal_vtas_sucursal_mes_anio_ux`); migración **`20260427120000_fin_bal_vtas_unique_sucursal_mes_anio`** deduplica antes del unique. **`crearFinBalVtas`** y **`guardarFinBalVtasCargaPeriodo`** en `finBalVtas.service.ts` hacen **`upsert`** (carga masiva del modal: una o más sucursales del mismo periodo en transacción). Validación: `crearFinBalVtasSchema`, `guardarFinBalVtasCargaPeriodoSchema` y `listarFinBalVtasPorMesAnioSchema` en `@/lib/validations/finBalVtas.ts`. La sucursal debe tener **`genera_balance`** (validado en servicio).
- **Actions** (`src/actions/finBalVtas.ts`): mutaciones con `esEditor()`; **`listarFinBalVtasPorMesAnioAction`** (lectura por periodo para precargar el modal); **`guardarFinBalVtasCargaPeriodoAction`** (carga/edición masiva). Tras crear/eliminar/guardar ventas, **`revalidatePath`** de `/finanzas/balance/vtas` y **`/finanzas/balance/mensual`**.
- **Lectura de periodo para desglose desde el historial** (`src/actions/finBalGastoMensualBalance.ts`): **`cargarFilasBalanceMensualPeriodoAction`** (`mes`/`anio` vía **`mesAnioQuerySchema`**) devuelve **`filas`** (`listarImputacionesMensualesBalance`) y **`ventasPorSucursalNombre`** (`listarFinBalVtasPorMesAnio`); solo **`PERMISOS.finanzas.acceso`**. La UI arma el resumen con **`resumenBalanceMensualDesdeFilas`** igual que la página.
- **Serie temporal del total de una fila de la grilla** (ventas, costos, resultados, margen %, punto de equilibrio): **`listarSerieHistorialFilaBalanceMensualAction`** en el mismo archivo; payload **`serieHistorialFilaBalanceSchema`** (`filaConceptoId`, `columna` global/sucursal, `mesFin`/`anioFin`, `cantidadMeses` opcional 1–60, **default 12**). La pantalla no ofrece selector de rango: el cliente no envía `cantidadMeses` y aplica el default. Delegación en **`listarSerieHistorialFilaBalanceMensual`** (`src/services/balanceMensualHistorialFila.service.ts`), que por cada mes en ventana vuelve a llamar **`listarImputacionesMensualesBalance`** + **`listarFinBalVtasPorMesAnio`** y aplica **`montoFilaBalanceHistorial`** (`src/lib/balanceMensualHistorialFila.ts`) sobre el bloque de la columna elegida. **Distinto** de **`listarHistoricoMontosGastoFinalBalance`** (un solo `gasto_final_id`), usado desde el detalle por rubro/líneas.
- **UI de carga/edición de ventas**: **`src/components/finanzas/CrearFinBalVtasModal.tsx`** y **`FinBalVtasPageClient.tsx`** en `/finanzas/balance/vtas`. El modal elige **mes/año** y muestra una fila **sucursal + monto** por cada sucursal con `genera_balance`; precarga con **`listarFinBalVtasPorMesAnioAction`**; guarda solo filas con monto ingresado vía **`guardarFinBalVtasCargaPeriodoAction`** (upsert). Eliminación individual en la grilla. No existe modal de ventas en Balance mensual.
- **Histórico MC / PE en pantalla**: hoy la UI muestra **—** hasta definir fuente (mes anterior, promedio, tabla nueva, etc.).

### 2.5g Estadísticas por producto (`/estadisticas-productos`, `est_por_prod`)

- **Ruta**: `src/app/estadisticas-productos/page.tsx` → **`EstPorProdPageClient`**. Permiso: **`PERMISOS.estadisticasProductos.acceso`** (`simple` y `editor` lectura; mutaciones con **`esEditor()`**).
- **Tabla `est_por_prod`** (Prisma `EstPorProd`): ventas en unidades importadas por **`sucursal_id` + `mes` + `anio` + `cod_tienda`**. Columnas: `id` (`cuid`), `mes` (1–12), `anio`, `sucursal_id` → `global_sucursales`, `cod_tienda` → `prod_tienda.cod_tienda` (texto; código numérico DUX normalizado en import), `vtas_en_un` (`DECIMAL(14,4)`). **`@@unique([sucursalId, mes, anio, codTienda])`** (`est_por_prod_sucursal_periodo_cod_ux`). Migración **`20260706120000_add_est_por_prod`**.
- **Regla de sucursal**: solo sucursales con **`deposito` no nulo** (y no vacío tras `trim`) — `listarSucursalesConDepositoParaEstPorProd()`; distinto de `fin_bal_vtas` (`genera_balance`).
- **Servicio** (`src/services/estPorProd.service.ts`): `listarEstPorProd`, `importarEstPorProd` (upsert masivo en transacción; omite filas cuyo `cod_tienda` no existe en `prod_tienda`), `eliminarEstPorProd`.
- **Validación** (`@/lib/validations/estPorProd.ts`): `importarEstPorProdSchema` (`mes`/`anio` vía `mesAnioQuerySchema`, `sucursalId` con `globalSucursalIdSchema`, hasta 20 000 líneas); `eliminarEstPorProdSchema`.
- **Actions** (`src/actions/estPorProd.ts`): `importarEstPorProdAction`, `eliminarEstPorProdAction`, **`verificarEstPorProdPeriodoAction`**; **`reemplazarPeriodo`** en importación borra todos los registros del **mes/año/sucursal** antes del upsert (confirmación en UI). Tras mutar, **`revalidatePath("/estadisticas-productos")`**.
- **Import UI**: planilla parseada en cliente (`@/lib/parseEstPorProdExcelClient.ts` + `xlsx`). Por defecto omite las **2 primeras filas** del Excel (`FILAS_OMITIR_INICIO_EST_POR_PROD`); la **3.ª** es encabezado; mapeo inicial col. **0** → `codTienda`, col. **1** → `vtasEnUn` (editable en modal). Modal **`ImportarEstPorProdModal`**.

### 2.5g-bis Marketing · publicaciones (`mkt_publi*`)

Dominio **Marketing · Publicaciones**. Dos catálogos **independientes** (red / tipo contenido) + hechos. CRUD desde **Calendario**. Renombre tablas: migración **`20260714240000_mkt_publi_rename_tables`**. Baja catálogo tipo publicación: **`20260715120000_drop_mkt_publi_tipo_publicacion`** (borra hechos `mkt_publi` existentes y puente ideas↔tipo).

- **`mkt_publi_tipo_redes`** (Prisma `MktPublicacionRed`): `id` (`cuid`), `red_social_nombre` (`TEXT` **único**, MAYÚSCULAS al persistir), `created_at`, `updated_at`.
- **`mkt_publi_tipo_contenido`** (Prisma `MktPublicacionContenidoTipo`): `id` (`cuid`), `contenido_nombre` (`TEXT` **único**, MAYÚSCULAS), `created_at`, `updated_at`.
- **`mkt_publi`** (Prisma `MktPublicacion`): hecho de publicación. Campos: `fecha` (`DATE`, día del calendario; se define al crear desde el Calendario), `publicacion` (`TEXT`, texto de la idea; default `''`), **`contenido_url`** (`TEXT`, URL Google Drive; default `''`; vacío ⇒ sin contenido; migración **`20260715160000_mkt_publi_contenido_url`**), **`contenido_creado`** (`BOOLEAN`, **derivado** de `contenido_url` no vacío; se sincroniza al crear/editar; migración original **`20260714270000_mkt_publi_contenido_creado`**), FK a **tipo contenido** (`onDelete: Restrict`), **N:M redes** vía **`mkt_publi_redes`** (`MktPublicacionRedLink`; FKs publicación **Cascade**, catálogo **Restrict**; migración **`20260715170000_mkt_publi_redes_nm`**; mín. 1 red; conteo/objetivos/cuadro de mando = **1 por cada red** vinculada), **`idea_detalle_id`** opcional **único** → `mkt_publi_ideas_detalle` (`onDelete: Restrict`; migración **`20260714280000_mkt_publi_idea_detalle`**): 1 publicación por idea. Índice `mkt_publi_fecha_idx`. Migración columnas fecha/texto **`20260714260000_mkt_publi_fecha_publicacion`**. Históricas: **`20260713180000`**, **`20260714120000`**, **`20260714140000`**, baja puente N:M contenido **`20260714180000`**, renombre **`20260714240000`**, drop tipo publicación **`20260715120000`**.
- **`mkt_publi_obj`** (Prisma `MktPublicacionObj`; migración **`20260715130000_mkt_publi_obj`**): objetivo **recurrente** de cantidad de publicaciones **programadas** (cualquier fila `mkt_publi` en la ventana). Campos: `periodo` (`MktPubliObjPeriodo`: SEMANAL | MENSUAL), `eje` (`MktPubliObjEje`: RED | CONTENIDO | SECCION), `destino_clave` **único** (`RED:{id}` | `CONTENIDO:{id}` | `SECCION:{id}` — **un objetivo por destino**), `cantidad` (`INT`), exactamente una FK a red / tipo contenido / sección (`onDelete: Restrict`), `created_at`, `updated_at`. Índices por `periodo` y `eje`.
- **Servicio hechos** (`src/services/mktPublicaciones.service.ts`): `listarMktPublicacionesCalendario`, `crearMktPublicacion`, `editarMktPublicacion`, `eliminarMktPublicacion`. Al **crear/editar** con `ideaDetalleId`: exige idea existente y **sin** publicación 1:1 vinculada (salvo la ya vinculada en edición); el texto `mkt_publi.publicacion` se copia de `mkt_publi_ideas_detalle.detalle` (**puede estar vacío**; no editable en el form); `redIds` (mín. 1) → `mkt_publi_redes`; `contenido_url` (opcional, http/https) y `contenido_creado = trim(contenido_url) !== ''`. Al **cambiar** de idea o **eliminar** la publicación: la idea queda libre automáticamente (ya no hay columna `usada`). Actions: `src/actions/mktPublicaciones.ts` (revalidan calendario + ideas). Validación: `@/lib/validations/mktPublicaciones.ts` (`ideaDetalleId` obligatorio; `redIds`; `contenidoUrl`; sin campo `publicacion` de cliente). Estadísticas UI: `@/lib/mktPublicacionesEstadisticas.ts` — `filtrarPublicacionesPorVistaCalendario` (mes + semana **Todas**|1–5) + `calcularCuadroMandoPublicaciones` (redes = **1 por red N:M**; Planificado/Terminado por `contenido_creado` derivado). Objetivos eje RED: `contarPublicacionesConRed` (1 por red vinculada).
- **Servicio objetivos** (`src/services/mktPublicacionesObj.service.ts`): `listarMktPublicacionObjs`, `crearMktPublicacionObj`, `editarMktPublicacionObj` (periodo + cantidad; el eje/destino no cambia), `eliminarMktPublicacionObj`, `evaluarMktPublicacionObjs` (ventana semana/mes; cuenta hechos programados por eje). Evaluación en UI del Calendario: helpers cliente `@/lib/mktPublicacionesObj.ts` (`evaluarMktPublicacionObjsCliente`, `periodoObjParaSemanaFiltro`, `textoIncumplimientoObjetivo` → **`cantidad − actual`**, copy **«Falta 1»** / **«Faltan N»**). Validación: `@/lib/validations/mktPublicacionesObj.ts`. Actions: `src/actions/mktPublicacionesObj.ts` (lectura marketing; mutaciones + `esEditor`; `revalidatePath` calendario + **objetivos**). UI de gestión: página **`/marketing/publicaciones/objetivos`** (`MarketingObjetivosPageClient`), no modal.
- **Servicio** (`src/services/mktPublicacionesCatalogo.service.ts`): CRUD de redes y tipos de contenido (solo nombre).
- **Validación** (`@/lib/validations/mktPublicacionesCatalogo.ts`): `crearMktCatalogoNombreSchema`, `editarMktCatalogoNombreSchema`, `eliminarMktCatalogoNombreSchema`.
- **Actions** (`src/actions/mktPublicacionesCatalogo.ts`): lectura **`PERMISOS.marketing.acceso`**; mutaciones + **`esEditor()`**; `revalidatePath` calendario e ideas.
- **Permiso de área**: **`PERMISOS.marketing.acceso`** (solo `editor`). Rutas UI: `/marketing/publicaciones/{calendario|ideas}`.

### 2.5g-ter Marketing · ideas (`mkt_publi_ideas_*`)

Secciones de ideas y sus detalles. UI en `/marketing/publicaciones/ideas`. Migración original **`20260714190000_mkt_publicaciones_ideas`**; renombre **`20260714240000`**.

- **`mkt_publi_ideas_secciones`** (Prisma `MktPublicacionIdeaSeccion`): `id` (`cuid`), `idea_nombre` (`TEXT` **único**, MAYÚSCULAS al persistir), `idea_resumen` (`TEXT`, default `''`; migración **`20260714230000_mkt_ideas_secciones_idea_resumen`**), `created_at`, `updated_at`.
- **`mkt_publi_ideas_detalle`** (Prisma `MktPublicacionIdeaDetalle`): `id` (`cuid`); `seccion_id` FK → secciones (**`onDelete: Cascade`**); `titulo_idea` (`TEXT` corto, **MAYÚSCULAS** al persistir/`mapDetalle`, **obligatorio**); `detalle` (`TEXT` largo, **opcional**, default `''`); **sin** `tipo_contenido_id` / `usada` (eliminados en **`20260717180000`**). Relación opcional 1:1 `publicacion` → `MktPublicacion` (`mkt_publi.idea_detalle_id`); **`usada` en UI/servicio se deriva** de esa relación. `created_at`, `updated_at`.
- **N:M redes** (legado / opcional, **0..N**): `mkt_publicaciones_ideas_detalle_redes` (`MktPublicacionIdeaDetalleRed`); FKs detalle **Cascade**, catálogo **Restrict**. Altas/ediciones de UI **no** escriben redes: solo `seccion_id` + `titulo_idea` + `detalle`. Migración N:M original **`20260714220000_mkt_ideas_detalle_red_tipo_nm`**; la puente de tipos se eliminó en **`20260715120000_drop_mkt_publi_tipo_publicacion`**.
- **Servicio** (`src/services/mktPublicacionesIdeas.service.ts`): `listarMktIdeasJerarquia` (secciones + detalles anidados), CRUD sección/detalle. **Crear detalle**: `seccionId` + `tituloIdea` + `detalle` (opcional). Orden de detalles: libres primero (sin publicación) + **`titulo_idea` A–Z** (`es`).
- **`mkt_publi_ideas_secciones`**: agrupa detalles; también destinos del eje SECCION en objetivos.
- **Validación** (`@/lib/validations/mktPublicacionesIdeas.ts`).
- **Actions** (`src/actions/mktPublicacionesIdeas.ts`): lectura **`PERMISOS.marketing.acceso`**; mutaciones + **`esEditor()`**; `revalidatePath` ideas.
- **UI**: Finder 2 columnas en `/marketing/publicaciones/ideas` (`MarketingIdeasPageClient`).


### 2.5g-quater Marketing · Base Multimedia (`mkt_contenido_drive_url`)

Catálogo de archivos en Google Drive. UI: `/marketing/base-multimedia` (**Base Multimedia**). Migración **`20260716120000_mkt_contenido_url_drive`** (nombre original); tipos **`20260716130000_mkt_contenido_drive_tipo`**; rename **`20260716140000_rename_mkt_contenido_drive_url`**.

- **`mkt_contenido_drive_tipo`** (Prisma `MktContenidoDriveTipo`): `id` (`cuid`), `tipo` (`TEXT` **único**, MAYÚSCULAS), `created_at`, `updated_at`. CRUD modal **Gestionar Tipos De Contenido**.
- **`mkt_contenido_drive_url`** (Prisma `MktContenidoUrlDrive`): `id` (`cuid`), `nombre` (`TEXT`, MAYÚSCULAS), `descripcion` (`TEXT`, default `''`), `url` (`TEXT`, http/https), **`tipo_id`** FK → `mkt_contenido_drive_tipo` (`onDelete: Restrict`), `created_at`, `updated_at`. Índices por `nombre` y `tipo_id`.
- **Servicios**: `mktContenidoUrlDrive.service.ts` + `mktContenidoDriveTipo.service.ts`. Actions: `mktContenidoUrlDrive.ts`, `mktContenidoDriveTipo.ts`. Export Sheets **Contenido Multimedia**: `id`, `nombre`, `descripcion`, `url`, `tipo_id`; **Contenido Multimedia Tipo**: `id`, `tipo`.

### 2.5g-quinquies Marketing · Colores Marca (`mkt_colores_marca`)

Paleta de colores de marca. UI: `/marketing/base-multimedia/colores-marca` (**Colores Marca**, submódulo **BASE MULTIMEDIA**). Migración **`20260716150000_mkt_colores_marca`**.

- **`mkt_colores_marca`** (Prisma `MktColoresMarca`): `id` (`cuid`), `nombre` (`TEXT`, MAYÚSCULAS), `descripcion` (`TEXT`, default `''`), **`cod_hexadecimales`** (`TEXT` — códigos `#RRGGBB` separados por coma; entrada UI: líneas o comas), `created_at`, `updated_at`. Índice por `nombre`.
- **Servicios**: `mktColoresMarca.service.ts`. Actions: `mktColoresMarca.ts`. Helpers hex: `src/lib/mktColoresMarca.ts` (`parseCodHexadecimalesInput`, `normalizeHexToken`). Export Sheets **Colores Marca**: `id`, `nombre`, `descripcion`, `cod_hexadecimales`.


### 2.5h Análisis M.C. · Costos financieros (`fin_ana_cos_fina`, Prisma: `FinAnaCosFina`)

Matriz **terminal × forma de pago** para costos financieros de medios de cobro (módulo **Análisis M.C.**).

- **Ruta**: `/finanzas/analisis-mc/costos-financieros` → `FinAnaCosFinaPageClient` + `TablaFinAnaCosFina`. Permiso lectura: **`PERMISOS.finanzas.acceso`**; mutaciones: **`esEditor()`** + mismo permiso (`actualizarFinAnaCosFinaAction`, CRUD terminales en `src/actions/finAnaCosFina.ts`).
- **Catálogo terminales** `fin_ana_cos_fina_terminales` (Prisma `FinAnaCosFinaTerminal`): `id` (`cuid`), `nombre` (`TEXT` único, MAYÚSCULAS al persistir), `orden` (`INTEGER`). Semilla migración **`20260707180000_fin_ana_cos_fina_terminales`**. UI: **Gestionar Terminales** → **`GestionarTerminalesFinAnaCosFinaModal`** (`crearFinAnaCosFinaTerminalAction`, `editarFinAnaCosFinaTerminalAction`, `eliminarFinAnaCosFinaTerminalAction`). Alta crea filas `fin_ana_cos_fina` por cada pago con `en_costos_financieros = true`. Baja en cascada: `onDelete: Cascade` elimina filas de costos asociadas.
- **Catálogo formas de pago** `fin_ana_cos_fina_pagos` (Prisma `FinAnaCosFinaPagoCat`): `id` (`cuid` o semilla fija), `codigo` (`TEXT` único, derivado del nombre), `nombre` (`TEXT` único, MAYÚSCULAS), `orden`, `en_costos_financieros` (`BOOLEAN`, default `true`), `en_margen_contribucion` (`BOOLEAN`, default `true`). Semilla migración **`20260709140000_fin_ana_cos_fina_pagos_catalog`** (DÉBITO, cuotas 1/3/6/9/12/18, **EFECTIVO** con `en_costos_financieros = false`). UI: **Gestionar Pagos** → **`GestionarPagosFinAnaCosFinaModal`** (`crearFinAnaCosFinaPagoAction`, `editarFinAnaCosFinaPagoAction`, `eliminarFinAnaCosFinaPagoAction`, `reordenarFinAnaCosFinaPagosAction` con `ordenIds[]`). El campo **`orden`** define el orden de columnas en Margen Contribución y el listado/filtro PAGO en Costos Financieros. Alta con ambos flags en `true` crea filas `fin_ana_cos_fina` por terminal y fila `fin_ana_mc_descuento_fp` con descuento 0. Baja en cascada elimina filas de costos y descuentos asociados. Servicio: `src/services/finAnaCosFinaPago.service.ts`.
- **Tabla** `fin_ana_cos_fina`: `id` (`cuid`), `habilitado` (`BOOLEAN`, default `true`), `imp_cheque` (`BOOLEAN`, default `false`; migración **`20260707160000_fin_ana_cos_fina_imp_cheque`**), `terminal_id` (FK → `fin_ana_cos_fina_terminales`), `pago_id` (FK → `fin_ana_cos_fina_pagos`), `dias_acreditacion` (`INTEGER` nullable), `arancel` (`DECIMAL(5,2)`, default 0), `costo_financiero` (`DECIMAL(5,2)`, default 0). **`@@unique([terminal_id, pago_id])`**. Semilla matriz original: **`20260707120000_fin_ana_cos_fina`**; migración enum → catálogo: **`20260709140000_fin_ana_cos_fina_pagos_catalog`**.
- **Etiquetas UI** pago: `fin_ana_cos_fina_pagos.nombre` vía `src/lib/finAnaCosFinaPagos.ts`. Fórmulas %: `src/lib/finAnaCosFina.ts`. Nombre terminal: `fin_ana_cos_fina_terminales.nombre`.
- **Columnas calculadas en UI** (no persistidas; `src/lib/finAnaCosFina.ts`): **CX TERMINAL** = `arancel + costo_financiero`; **IVA** = `(CX TERMINAL × 1,21) − CX TERMINAL` (`FIN_ANA_COS_FINA_IVA_FACTOR`); **Imp. Cheque** = si `imp_cheque` es false → `0`; si true → `(1 − (CX TERMINAL + IVA) / 100) × 0,012 × 100` (`impChequeFinAnaCosFina`, `FIN_ANA_COS_FINA_IMP_CHEQUE_FACTOR = 0,012`); **CX TOTAL S/ IVA** = `CX TERMINAL + Imp. Cheque`; **CX TOTAL C/ IVA** = `CX TERMINAL + IVA + Imp. Cheque`. Display: `fmtPorcentajeDosDecimalesFinAnaCosFina`.
- **Servicio** (`src/services/finAnaCosFina.service.ts`): `listarFinAnaCosFina`, `actualizarFinAnaCosFina`, `ensureFinAnaCosFinaSeed`. Terminales: `src/services/finAnaCosFinaTerminal.service.ts`. Pagos: `src/services/finAnaCosFinaPago.service.ts`.
- **Validación** (`@/lib/validations/finAnaCosFina.ts`): `actualizarFinAnaCosFinaSchema` — campos opcionales: `habilitado`, `impCheque`, `diasAcreditacion`, `arancel`, `costoFinanciero`. Terminales: `@/lib/validations/finAnaCosFinaTerminal.ts`. Pagos: `@/lib/validations/finAnaCosFinaPago.ts` (`reordenarFinAnaCosFinaPagosSchema`: `ordenIds[]` completo del catálogo).
- Tras mutar: **`revalidatePath`** en `/finanzas/analisis-mc/costos-financieros` y `/finanzas/analisis-mc/margen-contribucion` (CRUD terminales/pagos).

### 2.5i Análisis M.C. · Margen contribución (sin tabla propia de simulación; lectura de `fin_ana_cos_fina` + parámetros `fin_ana_mc_formulas`)

Simulador de márgenes por forma de pago (**solo PORC. UTILIDAD**). **Ruta**: `/finanzas/analisis-mc/margen-contribucion`. Permiso: **`PERMISOS.finanzas.acceso`**; inputs editables solo **`esEditor()`**.

- **Parámetros de fórmula** (`fin_ana_mc_formulas`, Prisma `FinAnaMcFormula`): filas clave/valor (`codigo` único, `etiqueta`, `valor` `DECIMAL(14,6)`, `orden`). Semilla migración **`20260722210000_fin_ana_mc_formulas`**:
  - **`PX_LISTA_C_IVA`** (default **100**)
  - **`IVA_ALICUOTA`** (default **0,21**)
  - **`IIBB_ALICUOTA`** (default **0,04**)
  - Derivados en lib (no persistidos): **`ivaFactor` = 1 + IVA_ALICUOTA**; **PX LISTA S/ IVA** = PX_LISTA_C_IVA / ivaFactor.
  - Servicio `src/services/finAnaMcFormulas.service.ts`: `ensureFinAnaMcFormulasSeed`, `listarFormulasMargenContribucion`, `actualizarFormulaMargenContribucion`. Actions `listarFormulasMargenContribucionAction` / `actualizarFormulaMargenContribucionAction`. Tipos/helpers `src/lib/finAnaMcFormulas.ts`.
- **Configuración UI** (estado cliente): **TERMINAL** (opcional; promedio si vacío), **TIPO COMPROBANTE** (`FACTURA_A` | `FACTURA_C`), **PORC. UTILIDAD** (`PorcentajeCentInput`). Tipos en `src/lib/finAnaMargenContribucion.ts` (`TipoComprobanteVentaMargenContribucion`). **Factura C**: IVA e IIBB = 0; **Factura A**: aplica fórmulas de impuestos.
- **Descuentos por forma de pago** (`fin_ana_mc_descuento_fp`, Prisma `FinAnaMcDescuentoFp`): una fila por forma de pago con `en_margen_contribucion = true` (`pago_id` FK → `fin_ana_cos_fina_pagos`, único); `descuento_pct` INTEGER **−100…100** (entero). Semilla migración **`20260709130000_fin_ana_mc_descuento_fp`**; FK catálogo: **`20260709140000_fin_ana_cos_fina_pagos_catalog`**. Servicio `src/services/finAnaMcDescuentoFp.service.ts`: `ensureFinAnaMcDescuentoFpSeed`, `listarDescuentosFpMargenContribucion`, `actualizarDescuentoFpMargenContribucion` (input `pagoId`). Action `actualizarDescuentoFpMargenContribucionAction` (`esEditor()` + finanzas). **No** reutilizar `fin_ana_cos_fina` (costos financieros ≠ descuentos de venta).
- **Base de simulación**: **PX LISTA C/ IVA** desde **`fin_ana_mc_formulas`**; **PX LISTA S/ IVA** = `PX LISTA C/ IVA / ivaFactor`; **PX VENTA C/ IVA** = `PX LISTA C/ IVA × (1 + descuento % / 100)` (signo: **−25** → **75**; **+10** → **110**; input con `defaultNegative`); **PX VENTA S/ IVA** = `PX VENTA C/ IVA / ivaFactor`.
- **Columnas** (formas de pago): catálogo dinámico `fin_ana_cos_fina_pagos` filtrado por `en_margen_contribucion` (`idsFormasPagoMargenContribucion` en `src/lib/finAnaMargenContribucion.ts`). Pagos con `en_costos_financieros = false` (p. ej. **EFECTIVO**) tienen CX financiero = 0 %.
- **Filas / fórmulas** (ratios sobre **PX VENTA C/ IVA**, salvo M.C PONDERADO; `src/lib/finAnaMargenContribucion.ts` + `ParametrosFormulaMargenContribucion`):
  - **DESCUENTO**: % firmado **−100…100** (`fin_ana_mc_descuento_fp`; fórmula `1 + %/100`; negativo = descuento, positivo = recargo; migración signo **`20260721140000`**).
  - **IVA** = `(PX VENTA S/ IVA × IVA_ALICUOTA) / PX VENTA C/ IVA` (0 si **FACTURA C**).
  - **IIBB** = `(PX VENTA S/ IVA × IIBB_ALICUOTA) / PX VENTA C/ IVA` (0 si **FACTURA C**).
  - **CX MERCADERÍA** = `((PX LISTA S/ IVA) / (1 + porc. utilidad % / 100)) / PX VENTA C/ IVA`.
  - **CX FINANCIERO** = según tipo de comprobante: **FACTURA A** → **`cxTotalSinIvaFinAnaCosFina`** (% BD); **FACTURA C** → **`cxTotalConIvaFinAnaCosFina`** (% BD); luego `/ 100` (ratio). Terminal opcional: una fila o **promedio** entre terminales habilitadas.
  - **M.C** = `1 − (IVA + IIBB + CX MERCADERÍA + CX FINANCIERO)`.
  - **M.C PONDERADO** = `M.C × PX VENTA C/ IVA` (escala base lista).
- **Servicio** (`src/services/finAnaMargenContribucion.service.ts`): `getDatosPaginaMargenContribucion`, `mapCxFinancieroPorFormaPago` (helper en lib).
- **Actions** (`src/actions/finAnaMargenContribucion.ts`): descuentos FP + fórmulas.
- **UI**: `FinAnaMargenContribucionPageClient`, `TablaFinAnaMargenContribucion`, **`GraficoMcVsPorcUtilidad`** (SVG debajo de la tabla), **`GestionCxYFormulasMargenContribucionModal`**, **`GestionarPagosFinAnaCosFinaModal`**. Layout (`FIN_ANA_MC_SECCIONES`): **INGRESO** (**solo DESCUENTO**) → **COSTOS** (IVA · IIBB · CX MERCADERÍA · CX FINANCIERO) → **MARGEN** (M.C · M.C PONDERADO). Sticky sección + concepto; separadores primary. Celdas en **`N%`** (ratios ×100; M.C PONDERADO en base lista). Parámetros de `fin_ana_mc_formulas` se cargan en servidor; el modal **Gestion Cx. Y Formulas** documenta variables y fórmulas (sin edición en este paso).
- **Gráfico M.C vs PORC. UTILIDAD**: helpers en `src/lib/finAnaMargenContribucion.ts` — `idFormaPagoTresCuotasMargenContribucion` (resuelve **3 CUOTAS** por nombre/código del catálogo), `serieMcVsPorcUtilidadMargenContribucion` (eje X **20…200** step 5; M.C de esa forma con descuento/CX/tipo/fórmulas actuales), `mcPctEnPorcUtilidadMargenContribucion` (punto de la marca vertical). Sin dependencia de charts externas.
### 2.5c Cajas de tesorería (`fin_tesoreria`, Prisma: `CajaTesoreria`)

Modelo para persistir saldos de cajas con tipo cerrado y trazabilidad de última modificación del saldo.

- **Tabla catálogo**: `fin_tesoreria_tipo_caja` (Prisma `FinTesoreriaTipoCaja`): `id` (`TEXT`, PK), `codigo` (`TEXT` **único**, alineado al enum `TipoCajaTesoreria`), `nombre` (`TEXT`, etiqueta en UI; **EFECTIVO** → **CAJA LOCAL** en semilla), `orden` (`INTEGER`, listado estable). Semilla en migración **`20260521150000_fin_tesoreria_tipo_caja`**: **BANCO**, **BILLETERA_DIGITAL**, **CHEQUE**, **EFECTIVO**, **TARJETAS_A_COBRAR** (`nombre` **TARJETAS A COBRAR**). Lectura: `listarFinTesoreriaTipoCaja()` / `listarFinTesoreriaTipoCajaAction` (`PERMISOS.finanzas.acceso`). Altas de filas nuevas hoy solo por migración/SQL (sin CRUD en UI).
- **Tabla catálogo**: `fin_tesoreria_entidades` (Prisma `FinTesoreriaEntidad`): `id` (`TEXT`, PK; `cuid()` en altas por app), `nombre` (`TEXT` **único**, MAYÚSCULAS al persistir). CRUD desde UI: modal **Crear Entidad** (`CrearEntidadTesoreriaModal`) vía `crearFinTesoreriaEntidadAction` / `editarFinTesoreriaEntidadAction` / `eliminarFinTesoreriaEntidadAction` (solo `esEditor()` + `PERMISOS.finanzas.acceso`); baja bloqueada si existen cajas con esa `entidad_id` (precheck en servicio). Migración semilla: **`20260520140000_fin_tesoreria_entidades`**.
- **Tabla**: `fin_tesoreria`
  - `id` (`TEXT`, PK; Prisma `cuid()` o UUID según fila).
  - `entidad_id` (`TEXT`, **NOT NULL**, FK → `fin_tesoreria_entidades.id`, `onDelete: Restrict`).
  - `titular` (`TEXT`, obligatorio).
  - `tipo_caja` (enum `TipoCajaTesoreria`: **`BANCO` | `BILLETERA_DIGITAL` | `CHEQUE` | `EFECTIVO` | `TARJETAS_A_COBRAR`** — en UI **`EFECTIVO`** → **CAJA LOCAL**; **`TARJETAS_A_COBRAR`** → **TARJETAS A COBRAR**; ver `etiquetaTipoCajaEnPantalla` / catálogo `fin_tesoreria_tipo_caja` / `OPCIONES_TIPO_CAJA_TESORERIA_UI` en `src/lib/cajasTesoreriaTipos.ts`).
  - `tipo_valor` / `disponibilidad`: en **alta** el cliente envía valores explícitos; el servicio exige que coincidan con la derivación desde `tipo_caja` (`tipoValorDesdeTipoCaja` / `disponibilidadDesdeTipoCaja` en `src/lib/cajasTesoreriaTipos.ts`; **`TARJETAS_A_COBRAR`** → **DIGITAL** / **DIFERIDO**). En **edición** el cliente envía valores explícitos (validación Zod; coherencia operativa en UI).
  - `monto` (`INTEGER`, default `0`; saldo sin decimales).
  - `ult_actualizacion`, `created_at`, `updated_at`.
- **Índices**: único (`entidad_id`, `titular`); índices `tipo_caja`, `tipo_valor`, `entidad_id`.
- **Regla de negocio en BD**: trigger `fin_tesoreria_set_timestamps` + función `set_cajas_tesoreria_timestamps()`: siempre actualiza `updated_at` en `UPDATE`; actualiza `ult_actualizacion` a **ahora** si `monto` cambia (`IS DISTINCT FROM`); si `monto` no cambia pero `ult_actualizacion` sí (touch explícito), conserva el valor nuevo. Migración **`20260527120000_fin_tesoreria_touch_ult_actualizacion_cheques`**.
- **Caja tipo CHEQUE — `ult_actualizacion`**: el saldo visible no usa `fin_tesoreria.monto` sino la suma de cheques; tras **alta**, **acreditación en cuenta** (`transferirChequeFinTesoreria`) o **pago a proveedor** (`marcarEntregaProveedorFinTesoreriaCheque`), el servicio llama `touchUltActualizacionCajaTesoreria(cajaId)` (`src/lib/finTesoreriaCajaTouch.ts`) sobre la caja origen del cheque.
- **Migraciones relevantes**: `20260519120000_fin_tesoreria_tipo_caja_valor_disponibilidad`; **`20260520140000_fin_tesoreria_entidades`** (catálogo + columna `entidad_id`, baja `nombre_caja`); **`20260521150000_fin_tesoreria_tipo_caja`** (tabla + semilla tipos de caja + enum **`TARJETAS_A_COBRAR`**).
- **Servicio**: `src/services/cajasTesoreria.service.ts`
  - `listarEntidadesFinTesoreria()`: catálogo ordenado por `nombre` (MAYÚSCULAS en respuesta).
  - `listarFinTesoreriaTipoCaja()`: catálogo `fin_tesoreria_tipo_caja` por `orden`.
  - `listarCajasTesoreria()` / `listarCajasTesoreriaPorTipoValor` / `listarCajasTesoreriaPorTipoCaja`: incluyen `entidad`; orden por `entidad.nombre`; DTO `entidadId` + `entidadNombre`. En UI, el pie de **`TablaTesoreriaCajas`** arma **INMEDIATO**, **DIFERIDO** y **TOTAL** (= suma de ambos) con los mismos criterios que `montoDisponible` / `montoChequesDiferidos` (cheques: `sumarMontosChequesAcreditadosHasta` ≤ hoy AR vs `sumarMontosChequesDiferidosPorCaja` &gt; hoy AR; solo no transferidos).
  - `crearCajaTesoreria` / `editarCajaTesoreria`: `titular` en MAYÚSCULAS; `entidadId` FK válida; **alta** valida coherencia `tipo_caja` ↔ `tipo_valor` ↔ `disponibilidad`.
  - `eliminarCajaTesoreria(id)`.
- **Actions**: `src/actions/cajasTesoreria.ts`
  - `listarEntidadesFinTesoreriaAction`: lectura del catálogo (`PERMISOS.finanzas.acceso`).
  - `listarFinTesoreriaTipoCajaAction`: lectura del catálogo de tipos de caja (`PERMISOS.finanzas.acceso`).
  - `crearFinTesoreriaEntidadAction`, `editarFinTesoreriaEntidadAction`, `eliminarFinTesoreriaEntidadAction`: mutaciones del catálogo (`esEditor()` + finanzas); Zod `crearFinTesoreriaEntidadSchema` / `editarFinTesoreriaEntidadSchema` / `eliminarFinTesoreriaEntidadSchema`.
  - `listarCajasTesoreriaAction`, `listarCajasTesoreriaTipoDigitalAction`, `listarCajasTesoreriaTipoBancoAction` (destino UI **Acreditar cheque**), mutaciones de caja con `esEditor()` donde aplique.
  - Validación Zod caja: `entidadId` = `prismaCuidOrUuidSchema`; **`crearCajaTesoreriaSchema`** incluye `tipoValor` y `disponibilidad`.
  - `titular`: whitelist `src/lib/cajasTesoreriaTitulares.ts`.
  - Revalidación: `/finanzas`, `/finanzas/tesoreria`.
- **Cheques** (`fin_tesoreria_cheques`, Prisma `FinTesoreriaCheque`; migración **`20260511143000_fin_tesoreria_cheques_tenencia`** — enum Postgres `TenenciaChequeTesoreria` (`TIENDA` | `DEPOSITADO` | `PROVEEDOR`), columna `tenencia` NOT NULL default `TIENDA` (custodia del cheque; **no** confundir con el campo texto **tenedor** = titular de caja); migración **`20260515190000_fin_tesoreria_cheques_transferencia_historial`** — `fecha_transferencia`, `caja_destino_id` → `fin_tesoreria`, `onDelete: SetNull`; migración **`20260516140000_fin_tesoreria_cheques_fechas_recibido_depositado`**: **`fecha_recibido`** (`DATE` NOT NULL), DATE nullable de transferencia a cuenta (alta histórica como `fecha_depositado`); migración **`20260518143000_rename_fin_tesoreria_cheques_fecha_depositado_to_fecha_transferido`**: columna canónica **`fecha_transferido`**; elimina **`entrega_proveedor`** y su FK/índice; migración **`20260518160000_fin_tesoreria_cheques_proveedor_pago`**: **`proveedor_id`** (FK opcional → `global_proveedores`); **`ElegirProveedorPagoChequeTesoreriaModal`** (lista mercadería + **`marcarEntregaProveedorFinTesoreriaChequeAction`** con `proveedorId`):
  - **CHECK `tenedor`:** valores permitidos = **`TITULARES_CAJA_TESORERIA`** (`cajasTesoreriaTitulares.ts`); constraint Postgres `fin_tesoreria_cheques_tenedor_check` (base **`20260422160000_add_tenedor_fin_tesoreria_cheques`**, ampliación **`20260526100000_fin_tesoreria_cheques_tenedor_coorporativo`** con **COORPORATIVO**).
  - Solo filas con **`fecha_transferencia` null** suman en disponibilidad / diferidos (`sumarMontosCheques*` en `finTesoreriaCheques.service.ts`).
  - **Transferencia** a caja con **`tipo_caja = BANCO`** (y **`tipo_valor = DIGITAL`**): incrementa saldo destino y **marca** `fecha_transferencia` + `caja_destino_id`, **`tenencia = DEPOSITADO`**, **`fecha_transferido`** = día hoy AR (no borra la fila). Retención **500 días** (`CHEQUE_TESORERIA_DIAS_RETENCION_TRAS_TRANSFERENCIA` en `src/lib/finTesoreriaChequesRetencion.ts`); **`eliminarChequesTransferidosVencidos()`** purga filas más viejas (se llama al listar y tras transferir).
  - **Listado** `listarChequesPorCajaId(cajaId, tenenciaFiltro)` con `tenenciaFiltro` `actuales` (`tenencia = TIENDA` y `fecha_transferencia` nula) | `transferidos` (`tenencia IN (DEPOSITADO, PROVEEDOR)`), default `actuales` (`listarFinTesoreriaChequesPorCajaSchema` + `finTesoreriaChequesTenenciaFiltroSchema`). En UI (**Detalles De Cheques**), filtro **ACTUALES**: columnas **RECIBIDO** (`fecha_recibido`), **TIPO**, **TENEDOR** (titular de caja del cheque), **EMISOR**, **MONTO**, **ACREDITACION** (`fecha_acreditacion`), **DÍAS** (acreditación − hoy AR; `diasTextoAcreditacionMenosHoyArgentina` / `diasNumericosAcreditacionMenosHoyArgentina`) y **ACCIONES** (transferir si aplica / editar / borrar); orden cliente por **DÍAS** ascendente. Filtro **TRANSFERIDOS**: **RECIBIDO**, **EMISOR**, **TRANSFERENCIA** (`fecha_transferencia`), **TENEDOR** (texto **`fin_tesoreria_entidades.nombre - titular`** de la caja destino vía `cajaDestinoEtiqueta` y join `entidad`; si custodia **PROVEEDOR**, nombre del proveedor (`proveedorNombre`); si no hay destino ni proveedor, etiqueta de `tenencia`), **MONTO**, **ACCIONES** (editar / borrar); orden por **`fecha_acreditacion`** descendente (más reciente primero). Editar/eliminar rechazan cheques ya transferidos.
  - **Fechas `@db.Date` → `YYYY-MM-DD` en DTO / comparaciones:** usar **`isoYmdFromPrismaDateOnly`** (`fechaArgentina.ts`) al mapear `fecha_recibido`, `fecha_acreditacion` y `fecha_transferido` (p. ej. `mapCheque`, regla `fecha_acreditacion` ≤ hoy al transferir). Prisma expone esas columnas como `Date` en medianoche UTC del día guardado; **`dateToIsoYmdArgentina`** sobre ese valor desplaza un día en calendario Argentina y fallaba la UI (**Editar Cheque**, `input type="date"`).
  - **Custodia proveedor**: `marcarEntregaProveedorFinTesoreriaCheque` + `marcarEntregaProveedorFinTesoreriaChequeAction` + `marcarEntregaProveedorChequeSchema` (`chequeId`, `proveedorId`, **`fechaTransferencia`** `YYYY-MM-DD` ≤ hoy AR; FK **`proveedor_id`** → `global_proveedores`, validación **`proveedor_mercaderia = true`**) — solo si **`fecha_transferencia`** es null; pone **`tenencia = PROVEEDOR`**, **`proveedor_id`** y **`fecha_transferencia`** al día elegido (persistencia `…T12:00:00.000Z`); el cheque deja de sumar en disponibilidad/diferidos de caja **CHEQUE**. **`listarProveedoresMercaderiaParaPagoChequeTesoreria` / `listarProveedoresMercaderiaParaPagoChequeTesoreriaAction`**: catálogo para **`ElegirProveedorPagoChequeTesoreriaModal`** (antes del buscador: **FECHA TRANSFERENCIA** con default hoy AR; tras **Pago Proveedor** en **Destino Cheque**).

### 2.5e Catálogo jerárquico de gastos para Balance (`fin_bal_gasto_tipo` → `fin_bal_gasto_rubro` → `fin_bal_cat_gasto`)

Jerarquía de catálogos para Finanzas → Balance → Gastos. Relación canónica:

```text
fin_bal_gasto_tipo (1) ──── (N) fin_bal_gasto_rubro (1) ──── (N) fin_bal_cat_gasto (1) ──── (N) fin_bal_gasto_final
   FinBalGastoTipo             FinBalGastoRubro                   FinBalGasto                    FinBalGastoFinal
                                                                                                      ├── FK → global_proveedores
                                                                                                      └── FK opcional → global_sucursales (solo si gasto mensual; eventual → NULL)
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
  - **Baja `repite_monto` (2026-04-18)**: ver migraciones `20260418220000` / `20260418240000`; campo retirado sin reemplazo automático equivalente en otra tabla.
- **Tabla** `fin_bal_gasto_final` (Prisma: `FinBalGastoFinal`):
  - `id` (`TEXT`, PK), `gasto_id` → `fin_bal_cat_gasto.id` (`onDelete: Cascade`), `proveedor_id` → `global_proveedores.id` (`onDelete: Restrict`), `sucursal_id` → `global_sucursales.id` (`onDelete: Restrict`, **columna nullable** desde migración **`20260509120000_fin_bal_gasto_final_sucursal_nullable`**): en negocio es obligatoria solo si `gasto_mensual = true` (validación en servicio: **`centro_costo`** vía `sucursalEsCentroDeCosto`); si `gasto_mensual = false` (gasto eventual), debe guardarse **NULL**.
  - `gasto_mensual` (`BOOLEAN NOT NULL DEFAULT FALSE`).
  - Varias filas pueden compartir la misma terna lógica `gasto_id` + `proveedor_id` + `sucursal_id` (**incluido `NULL`** para eventuales: varias filas eventuales del mismo proveedor comparten sucursal nula a efectos de la regla de comentarios). Migraciones `20260423120000_drop_fin_bal_gasto_final_gasto_proveedor_sucursal_ux` y **`20260425180000_ensure_drop_fin_bal_gasto_final_unique_triple`** (idempotente: `DROP INDEX` + `ALTER TABLE … DROP CONSTRAINT IF EXISTS`) eliminan el índice/constraint único previo. **COMENTARIOS** es opcional (incluido vacío) aunque existan hermanas con la misma terna. **Regla de negocio:** solo se rechaza alta/edición si **COMENTARIOS** no vacío (trim + mayúsculas `es-AR`, misma normalización que Zod) coincide con otra fila hermana; comentario vacío no se valida contra duplicados. `validarComentariosParaTriplaGastoFinalRepetida` en `finBalGastosCatalogo.service.ts` (`crearFinBalGastoFinal` / `editarFinBalGastoFinal`).
  - Índices en `gasto_id`, `proveedor_id`, `sucursal_id`. La columna **PROVEEDORES** en `/finanzas/balance/gastos/catalogo` sigue siendo CRUD autónomo de `global_proveedores` (`proveedor_mercaderia = false`); los gastos finales consumen ese listado y **`listarSucursalesParaGastos()`** en **`finBalGastoMensualBalance.service.ts`** (sucursales con `centro_costo = true`) para el select de sucursal en **mensual**.
  - `dia_devengado` (`INTEGER NULL`) y `plazo_pago_dias` (`INTEGER NULL`) son condicionales:
    - **Persistencia en servicio**: `crearFinBalGastoFinal` y `editarFinBalGastoFinal` guardan **`dia_devengado`/`plazo_pago_dias` sólo para MENSUAL** (valores validados por Zod, fallback defensivo `1`/`0`). Para **EVENTUAL** ambos deben persistir **`NULL`** (el cliente envía `null`); **no** coercer con `(valor ?? 1)` porque viola `fin_bal_gasto_final_campos_mensual_eventual_chk`.
    - **MENSUAL** (`gasto_mensual = true`): ambos obligatorios (`dia_devengado` 1..28, `plazo_pago_dias` 0..30).
    - **EVENTUAL** (`gasto_mensual = false`): ambos deben persistir en `NULL`.
    - Se valida en DB con `CHECK` único `fin_bal_gasto_final_campos_mensual_eventual_chk`.
  - `iva` (`enum "IvaProveedor"`, `NOT NULL DEFAULT 'PREGUNTA'`): política de IVA del gasto final. Reutiliza el enum Postgres `IvaProveedor` creado en `20260507193000_add_global_proveedores_iva` (no se crea un enum hermano — ver §1.11d). **Independiente** de `proveedor.iva`: un gasto final puede tener política distinta a la del proveedor asociado (p. ej. proveedor `SIEMPRE` con un gasto final puntual `NUNCA`). Sin índice (cardinalidad = 3). Migración: `20260507213000_add_fin_bal_gasto_final_iva` (idempotente vía `ADD COLUMN IF NOT EXISTS`; el `DEFAULT 'PREGUNTA'` actúa como backfill in-place sin reescribir la tabla).
    - **Validación Zod**: `crearFinBalGastoFinalSchema` y `editarFinBalGastoFinalSchema` (en `@/lib/validations/finBalGastosCatalogo.ts`) incluyen `iva: ivaPoliticaFormSchema` (módulo compartido `@/lib/validations/iva.ts`); cae a `PREGUNTA` si llega vacío/desconocido (mismo default que la columna).
    - **Servicio** (`finBalGastosCatalogo.service.ts`): `FinBalGastoFinalItem.iva: IvaProveedor` expuesto en `listarFinBalGastosJerarquia`; `crearFinBalGastoFinal` / `editarFinBalGastoFinal` propagan `iva` al `data` de Prisma; el helper `mapFinBalGastoFinalRow` lo incluye en el tipo de entrada.
    - **UI** (`CrearEditarFinBalGastoFinalModal`): Select **IVA** con opciones `SIEMPRE` / `NUNCA` / `PREGUNTA`, default `PREGUNTA` en alta y precarga `ivaInicial` en edición. La página `FinBalGastosCatalogoPageClient` propaga `a.iva` al estado del modal cuando se abre en `editar`.
- **Tabla** `fin_bal_gasto_mensual` (Prisma: `FinBalGastoMensual`): imputación por mes/año ligada a `fin_bal_gasto_final` (`gasto_final_id`, `mes` 1–12, `anio`, `monto` y `pagado` enteros ≥ 0, `pagado ≤ monto`). Columna `gasto_mensual_en_alta`: `true` en filas creadas con **Cargar mes** (catálogo mensual); índice único parcial `(gasto_final_id, mes, anio) WHERE gasto_mensual_en_alta = true` (migración `20260520120000_fin_bal_gasto_mensual_varias_eventuales_mes`). **Eventuales** (`gasto_mensual_en_alta = false`): pueden repetirse en el mismo mes/año y sucursal de imputación.
  - **Carga eventual manual** (`crearImputacionGastoUnicoBalance` / `crearFinBalImputacionGastoUnicoAction`): además de `monto` y `pagado`, recibe `fechaGasto` (`YYYY-MM-DD`) y `plazoPago` (0..30, obligatorio salvo pago total). `fechaGasto` debe pertenecer al `mes/anio` de la carga. Si `pagado === monto`, el plazo deja de ser obligatorio y se persiste como `0`. No hay tope de filas por gasto final en el periodo. **UI alternativa (2026-06-13):** `/gestion-productos/cargar-gasto` (Ayuda Vendedor) reutiliza `GastoUnicoBalanceModal` con el periodo calendario Argentina actual; mismas actions y gate `requireEditorFinanzas`.
  - Al guardar una carga eventual, no se sobrescriben `dia_devengado` ni `plazo_pago_dias` del catálogo (`fin_bal_gasto_final`): permanecen `NULL` en eventuales por regla funcional.
- **Pantalla** `/finanzas/balance/gastos` (no confundir con el catálogo):
  - **Servicio** `src/services/finBalGastoMensualBalance.service.ts`: `mesAnioCalendarioArgentina()`, `mesAnteriorCalendario()`; `listarPeriodosConImputacionesEnDb()` (`groupBy` `anio`+`mes` sobre `fin_bal_gasto_mensual`) devuelve años y meses **solo** si existen filas en BD (útil para informes u operaciones; **los Select Mes/Año en la pantalla** listan **12 meses** y años **2026–2046**, coherentes con `mesAnioQuerySchema`). `listarImputacionesMensualesBalance({ mes, anio })` expone cada fila con `gastoFinalId` + nombres; **devengado acumulado** hasta hoy = \(\min(\textit{valor}, \text{redondeo de } (\textit{valor} / \textit{días del mes}) \times \textit{días calendario desde devengo hasta hoy inclusive})\). **Valor** para la fórmula: `monto` del mes actual si &gt; 0; si no, último `monto` de un mes estrictamente anterior para el mismo `gasto_final_id`. **`montoDevengadoPendiente`** (columna **DEVENGADO**: pendiente de pago sobre ese devengado) = \(\max(0, \textit{devengado acumulado} - \textit{pagado})\). **Vencimiento** (`fechaVencimientoGastoBalanceDesdeDevengoIso`): mismo día del mes calendario siguiente al devengo (ej. devengo 01/04/2026 → vence 01/05/2026). **`montoVencido`**: si hoy (AR) ≥ fecha de vencimiento, \(\max(0, \textit{monto}-\textit{pagado})\); si no, 0. `obtenerMontoImputacionMesAnterior({ gastoFinalId, mes, anio })` devuelve el `monto` persistido en el **mes calendario inmediato anterior** (para el botón **Repetir Ult. Monto** en UI). `actualizarMontoFinBalGastoMensual` / `eliminarFinBalGastoMensual` mutan `fin_bal_gasto_mensual` (validación `monto ≥ pagado`).
  - **Carga del mes** (`cargarImputacionesMensualesDesdeCatalogo`): por cada `fin_bal_gasto_final` con `gasto_mensual = true` **y** `sucursal_id IS NOT NULL` sin fila para `(mes, anio)`, crea `fin_bal_gasto_mensual` con `monto = 0` y `pagado = 0`.
  - **Actions** `src/actions/finBalGastoMensualBalance.ts`: `cargarFinBalGastoMensualMesAction({ mes, anio }?)` (editor; default mes actual si se omite), `editarMontoFinBalGastoMensualAction`, `eliminarFinBalGastoMensualAction`, `obtenerMontoMesAnteriorFinBalGastoMensualAction` (lectura con permiso finanzas). Revalidan `/finanzas` y `/finanzas/balance/gastos`.
  - **Validaciones** `src/lib/validations/finBalGastoMensualBalance.ts`: `mesAnioQuerySchema`, `editarMontoFinBalGastoMensualSchema`, `eliminarFinBalGastoMensualSchema`, `obtenerMontoMesAnteriorSchema`.
  - **Página** `src/app/finanzas/balance/gastos/page.tsx`: `searchParams` opcionales `mes` / `anio` (`mesAnioQuerySchema`: **mes** 1–12, **anio** 2026–2046). Si **no** vienen `mes` ni `anio` en la URL, **`redirect`** a `?mes=&anio=` con **mes y año calendario actuales en Argentina** (`mesAnioCalendarioArgentina` + año acotado al rango). Si el parse falla (valores fuera de rango), **`redirect`** al mismo default. Sin **redirect** por periodo sin filas en BD. Lista con `listarImputacionesMensualesBalance`.
  - **Venc. Provee. Gastos** (`/finanzas/vencimientos-gastos`): lectura en **Server Component** con `getRol()` + `PERMISOS.finanzas.acceso` (igual que otras pantallas de Finanzas). **`listarObligacionesGastoVencidasNoMercaderia()`** en `finBalGastoMensualBalance.service.ts` devuelve `hoyIso` (calendario Argentina), `proveedores` (agregado por nombre de proveedor con `proveedorMercaderia === false`, solo imputaciones con **fecha de vencimiento** estrictamente anterior a hoy y **pendiente a hoy** &gt; 0) y `detalleLineas` (`FlujoFondoDetalleDiaFila` con `fechaDevengadaIso`, `fechaVencimientoIso`, `proveedor`, `detalle`, `monto`, `sortFecha`, `sortId`) para **`TablaFlujoDeFondoDetalleDia`**. Sin Action dedicada: el servicio se invoca solo desde el Server Component.
- **Integridad referencial**:
  - `onDelete: Restrict` en ambas FKs: no se puede borrar un tipo con rubros asociados ni un rubro con gastos asociados. Si se necesita baja en cascada, cambiar explícitamente a `Cascade` en la migración correspondiente y documentarlo.
- **Convención de normalización**: al persistir desde service/action, aplicar `trim + toUpperCase` sobre `nombre` (alineado a `fin_tesoreria_cajas` y nombres de catálogo `fin_bal_*`).
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
  - `prisma/migrations/20260507213000_add_fin_bal_gasto_final_iva/migration.sql` (alta `iva enum "IvaProveedor" NOT NULL DEFAULT 'PREGUNTA'`; reutiliza el enum creado por `20260507193000_add_global_proveedores_iva`).
  - `prisma/migrations/20260509120000_fin_bal_gasto_final_sucursal_nullable/migration.sql` (`ALTER COLUMN sucursal_id DROP NOT NULL` para gastos eventuales).
- **Validaciones Zod**: `src/lib/validations/finBalGastosCatalogo.ts`
  - `crearFinBalGastoTipoSchema`, `editarFinBalGastoTipoSchema`, `eliminarFinBalGastoTipoSchema`.
  - `crearFinBalGastoRubroSchema`, `editarFinBalGastoRubroSchema`, `eliminarFinBalGastoRubroSchema`.
  - `crearFinBalGastoSchema`, `editarFinBalGastoSchema`, `eliminarFinBalGastoSchema`.
  - `crearFinBalGastoFinalSchema`, `editarFinBalGastoFinalSchema`, `eliminarFinBalGastoFinalSchema`: en alta/edición de gasto final, `gastoId` y `proveedorId` usan **`prismaCuidOrUuidSchema`**; **`sucursalId`**: si `gastoMensual === true` debe ser un id válido **`globalSucursalIdSchema`** (UUID, CUID o literal `suc_corporativo`); si `gastoMensual === false`, debe ir vacío/`null` y el schema normaliza a **`sucursalId: null`** en el objeto parseado; el `id` de la fila `fin_bal_gasto_final` y eliminación siguen con **`prismaCuidSchema`**; `gastoMensual`, `diaDevengado`.
  - `nombre` en todos: `trim + toUpperCase`, `min(1)`, `max(120)`.
  - IDs de tipo/rubro/gasto de jerarquía: `prismaCuidSchema`.
  - `crearFinBalGastoSchema` / `editarFinBalGastoSchema`: solo `nombre` + `rubroId` (+ `id` en edición).
- **Servicio** (`src/services/finBalGastosCatalogo.service.ts`)
  - **Lecturas** (no devuelven `ServiceResult`; siempre exitosas, consumidas desde Server Components):
    - `listarFinBalGastoTipos()` → `FinBalGastoTipoItem[]` ordenados por `nombre` asc.
    - `listarFinBalGastoRubrosPorTipo(tipoId)` → `FinBalGastoRubroItem[]` filtrados por `tipoId`.
    - `listarFinBalGastosPorRubro(rubroId)` → `FinBalGastoItem[]` filtrados por `rubroId`.
    - `listarFinBalGastosJerarquia()` → `FinBalGastoJerarquiaTipo[]` (árbol Tipo → Rubros → Gastos + `asignacionesFinales[]` por gasto en un roundtrip con `include` anidado + orden por proveedor y sucursal).
  - **Tipos expuestos** — `FinBalGastoItem`: `id`, `nombre`, `rubroId`, `createdAt`, `updatedAt`. En jerarquía, cada gasto es `FinBalGastoJerarquiaGasto` con `asignacionesFinales: FinBalGastoFinalItem[]` (`id`, `gastoId`, `proveedorId`, `sucursalId` nullable, `gastoMensual`, `proveedor`, `sucursal` nullable).
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
  - Las **lecturas** NO son Actions: se consumen directamente desde Server Components importando el servicio (mismo patrón que `listarImputacionesMensualesBalance` / `listarCajasTesoreria`).

### 2.5d Catálogo finanzas — rubros y gastos (ELIMINADO 2026-04-18)

> **Baja**: las tablas `finanzas_rubros` y `finanzas_gastos`, junto con el enum PostgreSQL `TipoCostoGasto`, fueron **eliminadas** el 2026-04-18 sin reemplazo (histórico: no había FK desde ese catálogo hacia el flujo actual de Balance; los nombres de gastos viven en **`fin_bal_cat_gasto` / jerarquía**).
>
> - **Migración de baja**: `prisma/migrations/20260418160000_drop_finanzas_rubros_y_gastos_catalogo/migration.sql` — `DROP TABLE IF EXISTS "finanzas_gastos" CASCADE; DROP TABLE IF EXISTS "finanzas_rubros" CASCADE; DROP TYPE IF EXISTS "TipoCostoGasto";` (idempotente). La migración original de alta (`20260418120000_add_finanzas_rubros_y_gastos_catalogo`) se conserva por inmutabilidad del historial Prisma.
> - **Código eliminado**:
>   - Modelos Prisma `FinanzasRubro` y `FinanzasGasto` + enum `TipoCostoGasto` en `prisma/schema.prisma`.
>   - Servicio `src/services/finanzasGastosCatalogo.service.ts`.
>   - Action `src/actions/finanzasGastosCatalogo.ts` (incluye `crearGastoCatalogoAction`).
>   - Validaciones `src/lib/validations/finanzasGastosCatalogo.ts` (`tipoCostoGastoSchema`, `crearGastoCatalogoSchema`).
>   - Componente `src/components/finanzas/CrearGastoCatalogoModal.tsx`.
>   - Prop `rubros` y botón **Crear Gasto** en `src/app/finanzas/balance/gastos/page.tsx` y `src/components/finanzas/FinanzasBalanceGastosPageClient.tsx`.
> - **Consecuencia histórica**: la vista `/finanzas/balance/gastos` consolidó **`fin_bal_gasto_mensual`** del mes (Argentina) y el botón **Cargar Datos Mes.** genera filas desde `fin_bal_gasto_final` con `gasto_mensual = true` (ver §2.5e).

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
- **Salida**: `ActionResult<{ hayItems: boolean }>` — delega en **`getItemsTablaEnviarPedido`** (servicio; misma resolución que la tabla de `/pedidos/enviar` con sucursal + proveedor + tipos). No invoca la Action vecina `getEnviarPedidoTablaData` (§1.2.5.E).

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

#### `getReposicionProveedorPrioritarioParaModalAction` (modal reposición — proveedor prioritario)

- **Uso**: alimentar **`ReposicionProveedorPrioritarioModal`** tras `REPOSICION_PROVEEDOR_PRIORITARIO_REQUIERE_CONFIRMACION`.
- **Entrada (Zod)**: `proveedorId`, `sucursal` (`guaymallen` \| `maipu`).
- **Salida**: `ActionResult<{ tieneItems: boolean; items: ReposicionProveedorPrioritarioItem[] }>`.
- **Datos**: **`getReposicionItemsProveedorPrioritarioAlternativo`** — filas `REPOSICION` en la sucursal con `cantPedir > 0` (regla runtime) cuyo proveedor ganador (`elegirListaPrecioProveedorReposicion`) ≠ `proveedorId` elegido **y** el `cod_tienda` tiene vínculo habilitado con ese `proveedorId` en `prod_precios_provee`.

#### `generarPdfEnviarPedidoAction` (sobrestock otra sucursal, obligatorio)

- **Param opcional**: `confirmarSobreStock?: boolean` (default false).
- **Param opcional**: `ajustesSobreStock?: { idItemPedidoEnvio: string; cantPedir: number }[]` (el campo `idItemPedidoEnvio` es el **`id` de `prod_ped_merc`**; nombre histórico en API).
- **Regla** (antes de `crearPedidoHistoriaSnapshot` y de cualquier persistencia de historial):
  - Si `getSobreStockOtraSucursalParaPedidoEnviar` devuelve al menos un ítem y `confirmarSobreStock` es false, la Action responde `{ ok: false, error: "SOBRESTOCK_REQUIERE_CONFIRMACION:{cantidad}" }`.
  - Con `confirmarSobreStock === true`, se omite ese bloqueo y continúa el flujo normal (snapshot + PDF/WhatsApp + borrado de URGENTE/TINTOMETRICO). La UI debe mostrar el modal y reintentar solo con confirmación explícita del usuario.
  - Si la UI envía `ajustesSobreStock`, los ajustes se aplican **antes** de releer ítems para snapshot/PDF. El PDF y `prod_ped_historial` persisten la cantidad ya ajustada desde el modal.
- **Reposición — proveedor prioritario distinto** (solo si `tipos` incluye `REPOSICION`):
  - **Params opcionales**: `confirmarReposicionProveedorPrioritario?: boolean` (default false), `itemsReposicionProveedorPrioritario?: { idItemPedidoEnvio, proveedorPrioritarioId }[]`.
  - Si hay ítems alternativos (`getReposicionItemsProveedorPrioritarioAlternativo`) y `confirmarReposicionProveedorPrioritario` es false → `{ ok: false, error: "REPOSICION_PROVEEDOR_PRIORITARIO_REQUIERE_CONFIRMACION:{n}" }` **sin persistir** (antes del chequeo de sobrestock).
  - Con confirmación, el PDF del proveedor elegido incluye ítems REPOSICIÓN por defecto **más** los marcados en el modal (`getItemsYProveedorParaEnviar` con `forzarIdsReposicionAlProveedor`; LP del proveedor del pedido vía `resolverListaPrecioReposicionParaProveedor`). Un solo snapshot/PDF. Las filas REPOSICIÓN en `prod_ped_merc` **no** se borran.

#### Tabla `/pedidos/enviar` — `getItemsTablaEnviarPedido` / `getEnviarPedidoTablaData`

- **`getItemsTablaEnviarPedido`** (`pedidosEnvio.service.ts`): ítems desde **`prod_ped_merc`** con cantidad a pedir resuelta **`> 0`** por tipo. En **REPOSICIÓN** la cantidad se calcula siempre en runtime con la regla `stock <= punto` + forma (`CANT_FIJA`/`CANT_MAXIMA`) usando stock vigente de `prod_precios_tienda` (no depende de `reposicion_cant_pedir` persistido). El **proveedor** y el **`cod_ext`** de lista se resuelven por **`cod_tienda`** (`reposicion_cod_tienda`) con **`elegirListaPrecioProveedorReposicion`** (`pedidosReposicionProveedor.service.ts`): todos los vínculos `prod_precios_provee.cod_tienda` habilitados, menor **`pxComparablePedidoUrgenteReposicion`** según **`sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido`**; fallback legacy por `cod_ext` de tienda si no hay vínculos. Filtros opcionales: código de sucursal, `id` proveedor, lista de tipos, texto `q` (descripción tienda/proveedor). Sin ningún filtro → todas las filas elegibles.
- **`getEnviarPedidoTablaData`**: delega en **`getItemsTablaEnviarPedido`** pasando lo que venga de la URL (vacío = sin acotar).
- **`getEnviarPedidoData`** / **`getProveedoresConPedidoActivo`**: el desplegable **PROVEEDOR** solo devuelve datos si hay **sucursal** y al menos un **tipo**; sin tipos, lista vacía. Incluye proveedores con al menos un ítem con **cantidad a pedir > 0** para esa sucursal y esos tipos (misma resolución que la tabla). **`listarProveedoresConPedidoActivoAction`** exige `tipos` con `.min(1)` y alimenta el modal cuando cambian sucursal/tipos.

#### Pedido Urgente — listado

- **`getPedidoUrgenteData`**: debe cargar **`getProveedoresParaPedidoUrgente`** y luego **`getListaPreciosParaPedidoUrgente`** sin acoplarse en un único **`Promise.all`**: si el listado falla, igual se devuelve el catálogo de proveedores (antes un rechazo combinado podía vaciar ambos payloads y la pantalla perdía el desplegable **PROVEEDOR**). Con **sucursal** válida se llama a **`getListaPreciosParaPedidoUrgente`**; proveedor y `q` (≥ 3 caracteres) son opcionales para filtrar. El parámetro `pedido` soporta `cualquier`, `urgente` y `reposicion`: **`urgente`**, **`cualquier`** y **vacío** (desplegable **PEDIDO** sin sub-opción) delegan en **`getListaPedidoUrgenteDesdeListaPrecios`**: listado **`prod_precios_provee`** con **`habilitado = true`**, **agrupación por `codTiendaVinculo`**, **`miembrosAgrupacion`**, **`total`** / **`totalPaginas`** por grupos, **`prefijo`** vacío en el payload de la fila agrupada (la UI de **`TablaPedidoUrgente`** muestra solo el número **`n`** de miembros en **PROVEEDOR** cuando hay varios y **`estaVinculadoTienda`**) y **`descripcion`** desde **`descripcion_tienda`** unificada en filas agrupadas, cantidades vía **`mercaderiaMapsDesdeMerc2`**. Solo **`reposicion`** usa la rama filtrada por **`prod_ped_merc2`** REPOSICIÓN (sin ese agrupamiento global). **Filtro proveedor en urgente/cualquier:** acota qué grupos aparecen (al menos un miembro con ese `idProveedor`), pero al armar la fila agrupada **`miembrosAgrupacion`** incluye **todos** los `cod_ext` del mismo **`cod_tienda`** habilitados (sin re-aplicar el filtro proveedor en la carga de miembros), para que el doble clic siga abriendo **Elegir Proveedor** en frontend.
- **Precio comparable entre proveedores (misma tienda):** ver **`pxComparablePedidoUrgenteReposicion`** y **`sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido`** (alias de **`obtenerSaldoIvaParaComparacionProveedoresPedido`**). El saldo efectivo es el acumulado calculado desde Posición IVA (abril 2026 → mes actual AR) **hasta** que un **editor** guarda un valor en **Conf. IVA Saldo para Comparacion Costo** (`/finanzas/posicion-iva`); desde entonces usa **`saldo_pesos`** de **`fin_bal_posicion_iva_comparacion_pedido`** (`usar_valor_configurado = true`). Servicio: **`finBalPosicionIvaComparacionPedido.service.ts`**; mutación: **`guardarIvaComparacionPedidoAction`** (finanzas + editor). **Pedido Reposición** y **Generar pedido** (tipo REPOSICIÓN) usan **`pedidosReposicionProveedor.service.ts`** (`elegirListaPrecioProveedorReposicion`, carga por `cod_tienda` vínculo). **`getListaPedidoUrgenteDesdeListaPrecios`** no auto-elige proveedor en backend (modal en UI). La rama **`reposicion`** de **`getListaPreciosParaPedidoUrgente`** solo filtra por **`prod_ped_merc2`** REPOSICIÓN.
- **`revalidatePedidoUrgenteTrasCambioIvaSaldo`**: invalida **`/pedidos/urgente`**, **`/pedidos/enviar`** y **`/pedidos/reposicion`** tras cambios en Posición IVA (débito/crédito/saldo manual **o** configuración de comparación en pedidos). Para pestañas ya abiertas en otra PC, las pantallas de pedido usan **`getPosicionIvaComparacionRevisionToken`** + polling (`usePosicionIvaComparacionAutoRefresh`, ~30 s y al volver foco) y **`router.refresh()`** si el token cambió (incluye modo A/C y `updated_at` del singleton).

### 2.6 Servicio `pedidosHistoria.service.ts`

Contratos de funciones (SSOT de lógica y acceso a Prisma) para mantener consistencia e integridad:

1. `listarPedidosHistoria({ pagina, estado?, proveedorId?, sucursalCodigo?, q? })`
   - Uso: obtener página de cabeceras para el módulo de historial (`/pedidos/historial`).
  - `estado`: `PENDIENTE`, `RECEPCIONADO` o `ALL`. La UI por defecto envía/equivale a `PENDIENTE` si no hay parámetro en la URL.
   - Con `q` no vacío: solo pedidos que tengan al menos un ítem cuyo `cod_tienda` figure en `prod_precios_tienda` con descripción que contenga todas las palabras de `q` (insensible a mayúsculas).
   - Devuelve: `items` con `id`, `generadoAt`, `proveedorNombre`, `sucursalNombre`, `estado`, `registradoAt`, más `total`, `totalPaginas` y `paginaActual`.

2. `crearPedidoHistoriaSnapshot({ proveedorId, sucursalCodigo, tipos })`
   - Uso: llamada desde `generarPdfEnviarPedidoAction` para crear cabecera + items del snapshot justo antes de limpiar **`prod_ped_merc`** del proveedor del PDF (URGENTE/TINTOMÉTRICO vía `limpiarPedidoMercaderiaTrasGenerarPdf`).
   - Crea `PedidoHistoria` con `estado = "PENDIENTE"`.
   - Reutiliza **`getItemsYProveedorParaEnviar`** (mismas filas que el PDF): datos desde **`prod_ped_merc`** con proveedor y cantidades ya resueltas.
  - Consolidación por `cod_tienda` para `PedidoHistoriaItem` (fallback `1503` solo si no se puede resolver un código válido en alguna línea).
   - Inserta `PedidoHistoriaItem` consolidando por `cod_tienda` (para respetar UNIQUE por `cod_tienda`).
   - Inserta cada ítem con `cant_recibida = NULL` hasta que en recepción se guarde la cantidad recibida.

3. `getPedidoHistoriaDetalle({ pedidoHistoriaId })`
   - Devuelve cabecera + lista de items ordenados por `codTienda`.
   - Incluye `generado_at`, `registrado_at`, `cant_pedida`, `cant_recibida` y `descripcionTienda` (resuelta desde `prod_precios_tienda`) para renderizar la columna DESCRIPCIÓN en UI.
   - **`serializarPedidoHistoriaDetalleParaCliente(d)`** (mismo archivo): antes de responder **`GET /api/pedidos-historia/[pedidoHistoriaId]/detalle`** (`src/app/api/pedidos-historia/[pedidoHistoriaId]/detalle/route.ts`), las fechas `generadoAt` / `registradoAt` deben pasarse a **ISO string**. El tipo **`PedidoHistoriaDetalle`** declara `generadoAt` y `registradoAt` como `Date | string` (o `null`) para cubrir servicio vs wire. El serializador **no usa spread `...d`**: reconstruye el objeto con primitivos para no arrastrar propiedades del runtime de Prisma.
   - **Route HTTP (`GET .../detalle`)**: gate `getRol` + **`PERMISOS.pedidos.acceso`**, mismo servicio + serializador. La UI carga el detalle vía **`fetchPedidoHistoriaDetalle`** (`src/lib/fetchPedidoHistoriaDetalle.ts`) — JSON puro (`NextResponse.json`), sin Server Action de lectura. En errores internos **500**, el servidor responde con **`supportId`** (UUID), cabecera **`x-support-id`** y log **`[api][pedidos-historia][detalle]`** grepeable.

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
   - Uso: persistencia consolidada al final del flujo (**Registrar En Dux** / **Guardar Corrección**).
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

**Helper de sucursal:** `sucursalPedidoHabilitada(codigo)` — lectura de `global_sucursales.pedido`; usado desde Actions de `pedidos.ts` tras validar `sucursalPedidoCodigoSchema` (no duplicar el chequeo en cada Action).

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

### 2.8 Recepción pedidos — correlativo COMPROBANTE (POST DUX)

- **Eliminado (histórico):** consulta DUX `/compras` por sucursal y columna `recepcion_numero` en `prod_ped_historial` (migración `20260517100000_drop_recepcion_numero_prod_ped_historial`).
- **Vigente — tabla `prod_ped_ult_comp`** (Prisma `ProdPedUltComp`): **dos filas fijas** con columnas `id`, `tipo_comprobante`, `ult_comprobante` y **único** por `tipo_comprobante` (migración `20260519103000_prod_ped_ult_comp_tipo_dos_filas`):
  - **`id = 1`**, `tipo_comprobante = Comprobante_Compra`, `ult_comprobante` inicial **`1234569011`** (sólo dígitos).
  - **`id = 2`**, `tipo_comprobante = FACTURA`, `ult_comprobante` inicial **`A-00000-00000027`** (formato AFIP `L-#####-########`).
- **`prepararRecepcionCompraDatos`** (tras validar totales/precios): según **`resolverTipoComprobantePorIva`** (`FACTURA` vs `Comprobante_Compra`):
  - **Comprobante_Compra:** `UPDATE prod_ped_ult_comp SET ult_comprobante = (btrim(ult_comprobante)::bigint + 1)::text WHERE id = 1 RETURNING ult_comprobante` (atómico).
  - **FACTURA:** transacción con `SELECT ult_comprobante FROM prod_ped_ult_comp WHERE id = 2 FOR UPDATE`, incremento del último tramo en **`incrementarUltimoComprobanteFacturaAfip`** (`src/lib/prodPedUltComprobanteIncrement.ts`), luego `UPDATE` con el nuevo valor.
- El valor devuelto es el `nro_comprobante` del POST DUX (y queda persistido como último correlativo de ese tipo).
- **Cada POST exitoso** consume correlativo del tipo correspondiente.
- **Eliminado (2026-06-04):** exportación Excel que también reservaba correlativo en descarga/registrar/corrección.
- **Sync masivo** DUX compras: `comprobantesProveedorDuxSync.service.ts` + `duxComprasApi.ts` (§2.5a), independiente de esta tabla.

---

### 2.9a POST DUX v2 `/compras` (registrar comprobante de compra)

- **Cliente:** `src/lib/duxComprasV2Api.ts` — `postCompraV2`, auth **Bearer** (`DUX_API_TOKEN`), URL `…/services/v2/compras`. `getDuxIdEmpresaCompras()` lee `DUX_ID_EMPRESA_COMPRAS` (default **2482**, mismo criterio que sync §2.5a).
- **Servicio:** `src/services/registrarRecepcionCompraDux.service.ts` — `registrarRecepcionCompraDux` arma el body y llama `postCompraV2`.
- **Action:** `src/actions/registrarRecepcionCompraDux.ts` — `registrarRecepcionCompraDuxAction`; gate `PERMISOS.pedidos.acceso`.
- **SSOT de datos:** `prepararRecepcionCompraDatos` en `exportRecepcionPedidoExcel.service.ts`. Mapeo → POST:
  - `TIPO COMPROBANTE` → `tipo_comprobante` (`FACTURA` \| `Comprobante_Compra`, misma regla `resolverTipoComprobantePorIva`).
  - `COMPROBANTE` → `nro_comprobante` (misma reserva en `prod_ped_ult_comp`; **sin rollback** si el POST falla).
  - `ID PROVEEDOR` → `id_proveedor`; `global_sucursales.id_dux` → `id_sucursal`; depósito por `getIdDepositoPorSucursalCodigo` → `id_deposito`.
  - `FECHA FACTURA` (modal) → `fecha` y `fecha_imputacion_contable` (misma fecha `YYYY-MM-DD`, sin offset).
  - Ítems: `cod_tienda` → `productos[].cod_item`, `cant_recibida` → `ctd`, precio distribuido → `precio_unitario` (**neto**, total usuario ÷ **1,21**, **4 decimales**). **No** se envía `percepciones[]` en v1 (DUX suma IVA desde el maestro del ítem).
- **Opcionales omitidos en v1:** `condicion_pago`, `fecha_vencimiento` (no requeridos en OpenAPI). **`id_personal`**: requerido en negocio; se envía desde `global_personal.id_personal` tras selector en UI (§1.11e).
- **UI:** botón **Registrar En Dux** en `PedidoHistoriaDetalleModal` — único flujo de registro: POST DUX + `marcarPedidoHistoriaRegistrado` (estado **RECEPCIONADO**). Sin exportación Excel.
- **Doc DUX:** [Registrar comprobante de compra](https://duxsoftware.readme.io/reference/crear_compra).

---

### 2.9 Servicio `exportRecepcionPedidoExcel.service.ts` (datos recepción → POST DUX)

Objetivo: preparar `RecepcionCompraDatosPreparados` para el POST DUX v2/compras (`registrarRecepcionCompraDux`).

**SSOT:** `prepararRecepcionCompraDatos({ pedidoHistoriaId, fechaFacturaIso, totalPedidoIngreso?, decisionFiscal? })`

- Entrada:
  - `pedidoHistoriaId`: `cuid()` del snapshot en `prod_ped_historial`
  - `fechaFacturaIso`: `YYYY-MM-DD` (FECHA DE FACTURA desde el modal)
  - `totalPedidoIngreso`: opcional; si falta, usa `prod_ped_historial.total` persistido (**> 0**)
  - `decisionFiscal`: requerido cuando `proveedor.iva = PREGUNTA` (§1.11d.1)
- Proceso:
  - Lee proveedor, sucursal, ítems con `cant_recibida > 0`
  - `fecha` POST y `fecha_imputacion_contable` = fecha ingresada en **FECHA FACTURA** (sin +1 día; corregido 2026-06-30 — el offset legacy del Excel ya no aplica al POST v2).
  - Reserva **nro comprobante** en `prod_ped_ult_comp` (§2.8) según `tipo_comprobante`
  - Reparte precios netos (total ÷ 1,21) con **4 decimales** y tolerancia **0,10**
- Salida: `RecepcionCompraDatosPreparados` → mapeo en `mapRecepcionCompraDatosToV2PostBody` (§2.9a)

**Eliminado (2026-06-04):** exportación Excel 97-2003 (`getExportRecepcionPedidoExcelPayload`, Action `exportarExcelRecepcionPedidoAction`). El registro en DUX es solo vía **Registrar En Dux**.

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
| `@/lib/validations/pedidosLectura.ts` | `sucursalPedidoCodigoSchema`, `tipoPedidoMercaderiaSchema`, `tiposPedidoMercaderiaSchema`, `proveedorFiltroPedidoSchema` (`""` \| CUID), `getPedidoUrgenteDataParamsSchema`, `getEnviarPedidoDataParamsSchema`, `getEnviarPedidoTablaParamsSchema`. |
| `@/lib/validations/pedidosMutaciones.ts` | Mutaciones/envío: `proveedorIdPedidoSchema` (`prismaCuidSchema`), `listarProveedoresConPedidoActivoSchema`, `comprobarItemsParaGenerarPedidoSchema`, `generarPdfEnviarPedidoSchema` (`idItemPedidoEnvio` → `uuidSchema` / `prod_ped_merc`), `getSobreStockReposicionParaModalSchema`, `upsertPedidoUrgenteItemSchema`, `upsertPedidoTintometricoItemsSchema`, `deleteTintometricoItemSchema`. |
| `@/lib/validations/reposicion.ts` | `sucursalReposicionSchema`, `reposicionFormaPedidoSchema` (`CANT_FIJA` \| `CANT_MAXIMA`), `getReposicionParamsSchema`, `productosReposicionSelectorSchema`. |
| `@/lib/validations/stock.ts` | `getControlStockParamsSchema`. |
| `@/lib/validations/tienda.ts` | `getTiendaPageParamsSchema`. |
| `@/lib/validations/cajasTesoreria.ts` | `crearCajaTesoreriaSchema`, `editarCajaTesoreriaSchema` (`entidadId` `prismaCuidOrUuidSchema`, `tipoValor`, `disponibilidad`), `eliminarCajaTesoreriaSchema`; catálogo entidades: `crearFinTesoreriaEntidadSchema`, `editarFinTesoreriaEntidadSchema`, `eliminarFinTesoreriaEntidadSchema`; `tipoCajaTesoreriaSchema`, `tipoValorTesoreriaSchema`, `disponibilidadCajaTesoreriaSchema`. |
| `@/lib/validations/finBalGastosCatalogo.ts` | CRUD de la jerarquía `fin_bal_gasto_tipo / rubro / gasto` + `fin_bal_gasto_final`: `crear*Schema`, `editar*Schema`, `eliminar*Schema` (incluye `*FinBalGastoFinal*`). `nombre` con `trim + toUpperCase`; jerarquía con `prismaCuidSchema`; gasto final: `gastoId`/`proveedorId` con `prismaCuidOrUuidSchema`; **`sucursalId`** con `globalSucursalIdSchema` solo si `gastoMensual === true`, si no se normaliza a `null`; `gastoMensual` boolean; `diaDevengado` / `vencimiento` condicionales al tipo; `iva` (`ivaPoliticaFormSchema`). |
| `@/lib/validations/finBalGastoMensualBalance.ts` | `fin_bal_gasto_mensual`: `mesAnioQuerySchema`, `cargarImputacionesMesParamsSchema`, `editarMontoFinBalGastoMensualSchema`, `eliminarFinBalGastoMensualSchema`, `obtenerMontoMesAnteriorSchema`. |

Al extender tipos de dominio, preferir `src/types/*.ts`; para tipos ligados a validación, usar `z.infer<typeof schema>` en `src/lib/validations/*.ts`.

---

## 4. Checklist de autocorrección (para IAs)

Antes de entregar código nuevo o modificado, verificar:

- [ ] **Sesión/rol**: ¿Toda Action que modifica datos comprueba `esEditor()` o `getRol()` + `puede()` al inicio? ¿Las lecturas expuestas como Action comprueban `puede()` (incl. listas con precios, vínculos, proveedores)? ¿Las mutaciones sensibles en módulos con acceso compartido simple/editor exigen `esEditor()` además de `puede()`?
- [ ] **Gate doble (módulo + editor)**: Si la mutación pertenece a un submódulo con permiso de módulo (`tienda.*`, `finanzas.*`, etc.), ¿se chequea **primero** `puede(rol, PERMISOS.<modulo>.<accion>)` y **después** `esEditor()`? Ver §1.2.5.B.
- [ ] **Firma de payload**: ¿Las Actions que reciben objetos/arrays del cliente declaran el parámetro como `unknown` (o `string`/`FormData` para casos puntuales) y validan con `schema.safeParse(raw)`? Prohibido tipar con `z.infer<typeof X>` (§1.2.5.A).
- [ ] **Zod**: ¿Todo payload de entrada (IDs, FormData, objetos, **y parámetros de lectura** con `q`/paginación/filtros) se valida con un esquema Zod antes de usarse en BD o servicios?
- [ ] **IDs**: ¿Los UUID y los `cuid` se validan con el esquema correcto (`uuidSchema` vs `prismaCuidSchema`) según el modelo Prisma? Casos especiales: `proveedorId` siempre `prismaCuidSchema` (modelo `Proveedor` usa `cuid()`).
- [ ] **Sin `any`**: ¿El código evita `any` y usa tipos explícitos o inferidos?
- [ ] **ActionResult**: ¿Las Actions que pueden fallar devuelven `ActionResult<T>` con `{ ok, data? }` o `{ ok: false, error }`?
- [ ] **No throw al cliente**: ¿Los errores se capturan en `try/catch` y se devuelven como `{ ok: false, error: string }` (o shape vacío en lecturas que no usan `ActionResult`) en lugar de lanzar?
- [ ] **Lógica en servicios**: ¿La lógica de negocio y el acceso a Prisma están en `src/services/` y no en la Action? (Excepciones documentadas: `tienda.ts`, `stock.ts`, `tiposPinturaRendimientos.ts`, ciertas operaciones puntuales en `vinculos.ts`/`reposicion.ts`).
- [ ] **No anidar Actions**: ¿La Action delega a servicios y nunca invoca otra Action vecina? (§1.2.5.E).
- [ ] **revalidatePath**: ¿Se llama a `revalidatePath` (o `revalidateTag`) tras mutaciones que afectan a rutas concretas?
- [ ] **Permisos**: Si existe un permiso en `PERMISOS` para la funcionalidad, ¿se usa `puede(rol, PERMISOS.*)` en lugar de solo `esEditor()` cuando aplique?

---

## 5. Resumen de auditoría (edición actual)

### 5.1 Cumplen bien

- **proveedores.ts**: `esEditor()`, Zod para crear/editar, `ActionResult`, servicios.
- **listaPrecios.ts**: `getRol()` + `puede()` para edición masiva y para **lecturas** (`importarLista`); Zod en payload masivo y en filtros de lectura. **`exportarListaPreciosAction`**: mismos filtros que la grilla (`listaPreciosFiltrosExportSchema`, sin `pagina`); devuelve todas las filas vía `listarListaPreciosFiltradaParaExport`. **`eliminarListaPrecioAction`**: borra por `cod_ext` (`eliminarListaPrecioSchema`); gate `edicionMasiva` + `esEditor()`; servicio `eliminarListaPrecioProveedor` (cascada dto extra / margen manual; `SetNull` en costo lista tienda y ref. presentación). **`crearProductoListaPrecioAction`**: alta manual 1 fila (`crearProductoListaPrecioSchema`) → **`crearProductoListaPrecio`** en servicio (upsert por `(id_proveedor, cod_prod_proveedor)` + `cod_ext` = prefijo + código, defaults como import CSV: `habilitado=true`, descuentos 0); gate `importarLista` + `esEditor()`.
- **comparacionCategorias.ts**: `getRol()` + `puede()` en todas las Actions; Zod unificado vía `@/lib/validations/comparacionCategorias` y búsqueda de productos a asignar.

### 5.2 Estado tras auditoría de seguridad (2026-03)

- **`tienda.ts`**: `getTiendaPageData` y `getProveedoresTintoLts` comprueban `getRol()` + `puede()`. **Cx Compra** (`PERMISOS.tienda.acceso`) solo **editor**. Módulo **Control de Aumentos** eliminado por completo (2026-05-28; será reimplementado más adelante). `getUltimoSync` y `convertirEnProveedor` eliminadas (sin uso).
- **`cxPxTienda.ts` (actions)**: `guardarCostoCxProdTiendaAction`, **`exportarCostoCxDiffAction`**. Permiso `PERMISOS.cxPxTienda.acceso` (solo **editor**). FK `costo_compra_cod_ext` (ver §1.10b). **`costoListaTienda.service.ts`**, **`cxPxTiendaRows.service.ts`**, **`exportCostoCxDiff.service.ts`**, **`exportCostoCxExcelClient.ts`**.
- **`comparacionCompetencia.ts` (actions)**: `buscarProductosParaComparacionAction`, `agregarProductoComparacionAction`, `quitarProductoComparacionAction` — gate `PERMISOS.competenciaPrecios.editar` + `esEditor()`. Servicio **`comparacionCompetencia.service.ts`**. Flag **`prod_tienda.comparar_competencia`**: la grilla **Px Competencia** lista solo filas con `comparar_competencia = true` (`pxListasPage.service.ts`); el sync DUX **no** modifica el flag. Al quitar de comparación se pone `false`; las filas en **`prod_precios_competencia`** se conservan. Migración **`20260610120000`**: backfill `true` donde ya existía fila en `prod_precios_competencia`.
- **`pxListas.ts` (actions)**: `getPxListasPageData` — módulo **Px Competencia** (`/gestion-productos/tienda/cx-px-tienda`; componentes `px-listas/*`). **`exportarResumenAumentosPxAction`** (PDF aumentos; usado desde **Cx Compra**).
- **`pxListasPrecios.ts` (actions)**: `getPxListasPreciosPageData`, `guardarPxListaMargenEdicionAction`, **`guardarPxListaPrecioEdicionAction`**, **`exportarPxListasMargenAction`** — módulo **Px Listas**. Staging en **`prod_tienda_precios_edicion`** (`pxListasPrecioEdicion.service.ts`); **Act. Px** exporta y limpia filas exportadas. Filtro **`actualizar`**: ítems con `pxEdicion` en staging. Export: **`exportPxListasMargen.service.ts`** — `.xls` por `nombre_lista` (**CODIGO**, **PORC UTILIDAD** numérico 4 dec. + formato `#.##0,0000`). Helpers: **`pxListasPreciosCelda.ts`**, **`pxListasPreciosFiltros.ts`**.
- **`syncListaPrecioTienda.service.ts`**: deduplica por `cod_tienda` dentro de cada chunk y hace `upsert` con `where: { codTienda }`. En **`create`** y **`update`** se persisten las columnas sincronizadas desde DUX **excepto `proveedor`** (congelado — ver §1.4.2). Al finalizar la sync elimina de `prod_tienda` los `cod_tienda` que ya no llegaron en la corrida actual desde DUX.
- **`importar.ts`**: `puede(rol, PERMISOS.importar.acceso)` + `esEditor()`; payloads validados con `@/lib/validations/importar.ts` (`safeParse`).
- **`pedidosHistoria.ts`**: Lecturas y mutaciones (cantidades, agregar ítem, registrar en DUX, borrar) habilitadas para cualquier rol con `puede(rol, PERMISOS.pedidos.acceso)`.
- **`pedidos.ts`**: mutaciones/envío validadas con `@/lib/validations/pedidosMutaciones` (`proveedorId` CUID, IDs `prod_ped_merc` UUID); permisos `pedidos.acceso` al inicio; lógica en `pedidosEnvio.service.ts`.
- **`sesion.ts`**: `activarModoEditor` valida la clave con Zod.
- **`tintometrico.ts` / `productosTienda.ts`**: Límites en `q` y `take` para reducir abuso.
- **Pendientes de evolución** (no bloqueantes): mover lógica pesada de `tienda.ts` a servicios; revisar periódicamente nuevas Actions sin duplicar patrones anteriores (ver §5.8 y §1.2).

### 5.3 Reglas añadidas en esta guía

- Validar con Zod **todos** los payloads que afecten a la BD.
- Acción de sincronización DUX protegida por rol.
- Estandarizar respuestas de error: no `throw`, sí `ActionResult` con `error`.
- Documentar uso de `getRol()` + `puede()` para permisos granulares.
- PDF “Generar Pedido”: usar `src/lib/generarPdfPedido.ts` como SSOT para el layout. El PDF debe titular “Nota de Pedido”, incluir “Fecha” con formato `dddd de mmmm de aaaa` y una tabla con columnas `CANT.`, `COD.` y `DESCRIPCION` en ese orden; las filas van **ordenadas alfabéticamente** por el texto de **DESCRIPCION** (`localeCompare` `es`, `sensitivity: "base"`). Los datos deben venir de `cant_pedir`, `cod_proveedor` (vacío si no existe) y `descripcion_proveedor` priorizando `descripcion_proveedor`, luego `tintometrico_descripcion` (y como fallback `descripcion_tienda`). El archivo exportado debe llamarse `Nota Pedido - {Prefijo Proveedor} - dd/mm hh:mm.pdf`. Opción **`fechaDocumento`** en `generarPdfPedido`: al **volver a descargar** desde historial (`descargarPdfPedidoHistoriaAction`) usar `generado_at` del snapshot para encabezado y nombre de archivo, no la fecha actual. En celdas `COD.` y `DESCRIPCION`, el texto debe hacer wrap en múltiples líneas dentro de la columna y **no** truncarse con `...`.
- Al ejecutar el botón de **Generar Pedido** (`generarPdfEnviarPedidoAction`), limpiar **`prod_ped_merc`** solo del **proveedor** del PDF: URGENTE por `urgente_cod_ext` ∈ catálogo del proveedor; TINTOMÉTRICO por `tintometrico_proveedor` = `proveedorId` (`limpiarPedidoMercaderiaTrasGenerarPdf`). No borrar ítems de otros proveedores en la misma sucursal. Revalidar rutas de pedidos afectadas.

### 5.4 Cambios aplicados en esta auditoría

| Archivo / Área | Cambio |
|----------------|--------|
| `src/services/pedidosEnvio.service.ts`, `src/services/sobreStock.service.ts`, `src/services/listaPrecios.service.ts` | **Circuito REPOSICIÓN por `cod_tienda` (2026-04-28):** no se persiste el `cod_ext` **comercial** de catálogo en reposición; la clave de negocio es `cod_tienda`. Por el unique de BD `(id_proveedor, tipo, sucursal, cod_ext)`, cada fila guarda un **surrogado** estable `REPO_TIENDA:{cod_tienda}` (no es el `cod_ext` de `prod_precios_tienda`). La resolución para PDF/envío usa `cod_tienda` → catálogo vigente. `getItemsYProveedorParaEnviar` recompone filas REPOSICIÓN con proveedor/código vigentes, `getSobreStockOtraSucursalParaPedidoEnviar` usa topes por `cod_tienda`, y `getListaPreciosParaPedidoUrgente` filtra reposición por `cod_tienda`. Migración `20260429120000_reposicion_cod_ext_surrogate`: dedupe + normalización de filas ya existentes. |
| `prisma/migrations/20260429001000_reposicion_sync_por_cod_tienda/migration.sql` | (Histórico: aplicaba sobre la tabla legada `prod_ped_merc`.) Se redefine `sync_pedidos_mercaderia_cant_pedir` y el trigger `trg_sync_reposicion_on_precios_tienda_stock` para que REPOSICIÓN recalcule por `cod_tienda` (no por `cod_ext`) en `BEFORE INSERT/UPDATE` de pedidos mercadería y en cambios de stock en `prod_precios_tienda`. Tras `20260430103000_drop_prod_ped_merc_legacy` la función/trigger asociados a la tabla legada se eliminan; la lógica equivalente en runtime usa **`prod_ped_merc`**. |
| `src/services/pedidosEnvio.service.ts` | `upsertPedidoMercaderiaReposicionConfig`: validación de `reposicion_punto_pedido` admite `0` (solo rechaza `< 0`). Persistencia REPOSICIÓN por `cod_tienda`: `prod_precios_tienda.cod_tienda` → `cod_ext` + proveedor vigentes; al guardar se eliminan otras filas **`prod_ped_merc`** `REPOSICION` para la misma `sucursal + cod_tienda` con proveedor/cod_ext obsoletos. |
| `src/actions/syncListaPrecioTienda.ts` | **Eliminado (2026-05-10):** redundante con `/api/sync-lista-precios-tienda` + `syncListaPrecioTiendaFromDux` (superficie invocable desde cliente sin uso). Histórico: comprobación `PERMISOS.tienda.acciones.sincronizar`; no llegó a usar `esEditor()` en código final. |
| `src/actions/duxCompras.ts` | **Eliminado (2026-05-10):** sin call sites; histórico: correlativo DUX para recepción. **2026-05-08:** removidos también `src/services/duxCompras.service.ts` y `src/lib/duxComprobanteCorrelativo.ts`; ver §2.8 y §2.9. |
| `src/actions/importar.ts` | Solo `importarProductos` (mock). Import lista: `POST /api/import-lista-precios` + `importarListaPreciosProveedorSchema`. |
| `prisma/migrations/20260508140000_precios_natural_pk_cod_tienda_cod_ext/migration.sql` | **`prod_precios_tienda`** PK = **`cod_tienda`**; **`prod_precios_provee`** PK = **`cod_ext`**; vínculo **`prod_precios_provee.cod_tienda`**; satélites comparación (`prod_comp_*`) referencian `cod_ext`. |
| `src/actions/listaPrecios.ts` | `actualizarListaPreciosMasivoAction`: `{ ids, data }` (fila) o `{ filtros, data }` (todos los coincidentes vía `listarListaPreciosFiltradaParaExport`) + `actualizacionMasivaListaPreciosSchema`. **`exportarListaPreciosAction`**: exportación filtrada sin paginación. **`eliminarListaPrecioAction`**: borrado por `cod_ext`. |
| `src/lib/validations/listaPrecios.ts` | Reexport `listaPreciosCodExtListSchema`; `actualizacionMasivaListaPreciosSchema` con `porcentajeListaPreciosSchema` (0–100, máx. 2 decimales) en `dto_*` y `cxTransporte`; `cotizacionDolar` y `pxListaProveedor` con **`.min(0)`** (0 permitido). **`listaPreciosFiltrosExportSchema`** (lectura/export sin `pagina`). **`vinculado`** opcional en filtros de lectura (vínculo REX). **`eliminarListaPrecioSchema`** (`codExt`). **`crearProductoListaPrecioSchema`** (alta manual: proveedor CUID, código, descripción, px lista, marca opcional). |
| `prisma/migrations/20260527150000_prod_precios_provee_porcentajes_decimal/migration.sql` | Columnas `dto_*` y `cx_transporte`: **INTEGER → NUMERIC(5,2)**. Antes hay que **`DROP`** la columna generada `px_compra_final_sin_iva` y recrearla con la misma expresión (PostgreSQL no permite `ALTER TYPE` en columnas dependientes). Lecturas en servicios: `Number(prisma.Decimal)`. Si falló el primer intento: `npx prisma migrate resolve --rolled-back 20260527150000_prod_precios_provee_porcentajes_decimal` y luego `migrate deploy`. |
| `src/components/proveedores/ImportarModal.tsx` | Manejo de respuesta: comprueba `res.ok` y usa `res.data` o `res.error` según corresponda. |
| **Fase 2 (cierre de auditoría)** | |
| `src/actions/pedidos.ts` | `getPedidoUrgenteData`: comprobación `getRol()` + `puede(rol, PERMISOS.pedidos.acceso)`; si no hay acceso se devuelve estructura vacía (proveedores mock, productos [], total 0). |
| `src/actions/stock.ts` | `getControlStock`: comprobación `getRol()` + `puede(rol, PERMISOS.stock.acceso)`; retorno vacío si no hay acceso; **`try/catch`** → `emptyControlStock` + `console.error` (evita digest en RSC si falta `prod_tienda_stock` u otro error Prisma). Stock por depósito vía relación `stocks` + `getIdDepositoPorSucursalCodigo`. `ultimaExportacionExcel` se expone como **ISO string** (serializable al cliente). `registrarExportacionExcelStock`: persiste `ultima_exportacion_excel` (UI **ÚLT. CONTROL**), validación con `listaPreciosCodTiendaSchema` por fila (`cod_tienda`), `WHERE cod_tienda IN (...)` — la UI envía ítems **controlados** en sesión (variación o confirmación con Check, todas las páginas); el Excel solo lleva filas con variación. `ItemStock.id` = **`cod_tienda`**. |
| `src/actions/vinculos.ts` | `vincularProducto` / `desvincularProducto`: `listaPreciosCodTiendaSchema` + `listaPreciosCodExtSchema` (`@/lib/validations/common`). `desvincularProducto` limpia `costo_compra_cod_ext` si apuntaba al `cod_ext` desvinculado; no bloquea por proveedor oficial DUX. |
| `src/actions/productos.ts` | `editarProducto`: validación con `editarProductoSchema` (id + campos). `aplicarCampoMasivo`: validación con `aplicarCampoMasivoSchema` (proveedorId, campo, valor, q). |
| `src/actions/comparacionCategorias.ts` | Acciones `ActionResult<T>`; Zod (`comparacionCategorias.ts` + `listaPreciosCodExtSchema`); presentaciones: **`ref_cod_tienda` + `ref_competencia_id`** → `prod_precios_competencia`; costo objetivo solo **`costo_compra_objetivo`** (sin FK legacy `prod_ref_cod_ext`); DTO extra: `listaPrecioProveedorId` validado como `cod_ext`. |
| `src/lib/validations/common.ts` | Esquemas base: `uuidSchema`, listas/`paramsPagina`; claves naturales **`listaPreciosCodExtSchema`**, **`listaPreciosCodTiendaSchema`**, **`listaPreciosCodExtListSchema`**. |
| `src/lib/validations/productos.ts` | Nuevo: `camposEditablesProductoSchema`, `editarProductoSchema`, `campoMasivoSchema`, `aplicarCampoMasivoSchema`. |
| `src/lib/validations/comparacionCategorias.ts` | CRUD + asignación por `listaPreciosCodExtSchema`; presentación → referencia competencia (`asignarReferenciaCompetenciaSchema`); costo objetivo numérico en `updatePresentacionSchema`. |
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
| `src/app/api/sync-lista-precios-tienda/route.ts` | `GET` y `POST` validan `puede(rol, PERMISOS.tienda.acciones.sincronizar)` (simple y editor); comparten `ejecutarSyncListaPrecioTienda` (estado en BD + progreso await). **`export const maxDuration = 300`**. Persistencia en chunks de **25 ítems** (`DUX_SYNC_CHUNK_SIZE`, máx. 100) en **3 transacciones** (prod_tienda → stock → precios); catálogos `prod_depositos_dux` / `prod_tienda_listas_precios` deduplicados por chunk. Si ningún chunk persiste → error 500 explícito. Progreso en dos fases: `sincronizando` / `guardando`. Ante `SyncListaPrecioTiendaCancelledError` limpia estado con `clearListaPrecioTiendaSyncRunningStateInDb` y responde `200` con `cancelled: true` **sin** tocar `lastCompletedAt`. |
| `src/app/api/sync-lista-precios-tienda/cancel/route.ts` | `POST`: mismo permiso; `requestCancelListaPrecioTiendaSyncInDb` (solo si `running`) para señalar cancelación sin actualizar `lastCompletedAt`. |
| `src/app/api/sync-lista-precios-tienda/status/route.ts` | `GET`: mismo gate que POST (`guardTiendaListaPreciosSincronizar`); expone `lastCompletedAt`, `remainingMinutes`, etc., para sidebar y hooks. |

---

### 5.6 Optimización de persistencia (lista precios)

| Archivo / Área | Cambio |
|----------------|--------|
| `src/services/listaPrecios.service.ts` | `upsertListaPrecios()`: optimiza el conteo `creados/actualizados` con un prefetch en chunks de `codProdProv`, evitando el `findUnique()` por fila (patrón N+1) sin cambiar la lógica final del `upsert`. |
| `prisma/migrations/20260413120000_add_stockeable_prod_precios_tienda/migration.sql` | Columna `stockeable` en `prod_precios_tienda` (default `true` para legado). |
| `src/lib/duxApi.ts` | `ItemDux.stockeable` y `mapItem`: ambos depósitos DUX con `ctd_disponible` no nulo → `true`. |
| `src/services/syncListaPrecioTienda.service.ts` | Upsert **no** persiste `stockeable` en `prod_tienda`; `ctd_disponible` en `prod_tienda_stock`. |
| `src/actions/stock.ts`, `src/services/sobreStock.service.ts`, `src/services/pedidosEnvio.service.ts`, `src/actions/tienda.ts`, `src/components/tienda/TablaTienda.tsx` | Lecturas/filtros y reglas de reposición alineadas al flag. |

### 5.9 Tienda — módulo `Px. Tinto / Cal. Lts.` (lectura por rol)

| Archivo / Área | Cambio |
|----------------|--------|
| `src/lib/permisos.ts` | Nuevo permiso `PERMISOS.tienda.tintoLts` (`simple: true`, `editor: true`) para habilitar el submódulo sin abrir acceso a **Vinculacion Con Prov.** |
| `src/actions/tienda.ts` | Nueva action de lectura `getProveedoresTintoLts()` con `getRol()` + `puede(rol, PERMISOS.tienda.tintoLts)`; devuelve `nombre`, `prefijo`, `coeficienteTintometrico` para cálculo frontend sin persistencia. |

## 6. Organización en Cursor (prompts y reglas persistentes)

- Archivo recomendado para prompts reutilizables: `.cursor/prompts.md`.
- `.cursor/prompts.md` incluye el bloque **Dream Team de 5 agentes** con perfiles de arquitectura backend, frontend y auditoría; usar el perfil de backend/auditor backend cuando la tarea afecte `src/actions/`, `src/services/`, Prisma, seguridad o integraciones.
- Reglas persistentes activas en `.cursor/rules/`:
  - `manuales-obligatorios.mdc`: exige revisar guías frontend/backend antes de modificar código.
  - `flujo-fullstack-end-to-end.mdc`: estandariza ciclo de implementación y cierre con actualización documental.
- Si se crea o modifica una Server Action, servicio, validación Zod, contrato de respuesta o regla de seguridad, registrar el cambio en este documento y mantener coherencia con las reglas de `.cursor/rules/`.

*Última actualización (2026-06-30): **Auditoría backend cerrada** — 17 Server Actions huérfanas eliminadas; servicios/libs legacy de Px Competencia retirados; anti-patrón Action→Action en `vinculos.ts` corregido; Zod en `POST /api/import-lista-precios` y `getPxListasPreciosPageData`. Ver §1.2.8.*

*Última actualización (2026-06-04): **Recepción pedidos** — eliminados `exportarExcelRecepcionPedidoAction` y `getExportRecepcionPedidoExcelPayload`; registro único vía POST DUX (**Registrar En Dux**). SSOT: `prepararRecepcionCompraDatos`. Ver §1.11d.1, §2.8, §2.9, §2.9a.*

*Última actualización (2026-05-27): **Caja CHEQUE — `ult_actualizacion`** — al registrar, acreditar en cuenta o marcar pago a proveedor se actualiza `ult_actualizacion` de la caja origen (`touchUltActualizacionCajaTesoreria`); trigger ampliado en **`20260527120000_fin_tesoreria_touch_ult_actualizacion_cheques`**. Ver §2.5c.*

*Última actualización (2026-05-26): **Cheques listado transferidos** — `listarChequesPorCajaId` con `tenenciaFiltro = transferidos`: `orderBy` por **`fecha_acreditacion` DESC** (antes `fecha_transferencia` DESC). Ver §2.5c (cheques).*

*Última actualización (2026-05-26): **Cheques tesorería — `tenedor` CHECK** — migración **`20260526100000_fin_tesoreria_cheques_tenedor_coorporativo`**: el CHECK `fin_tesoreria_cheques_tenedor_check` incluye **COORPORATIVO** (alineado a `TITULARES_CAJA_TESORERIA` / `cajasTesoreriaTitulares.ts`; antes solo seis valores en **`20260422160000_add_tenedor_fin_tesoreria_cheques`**). Ver §2.5c (cheques).*

*Última actualización (2026-05-11): **Pago proveedor cheque — `fecha_transferencia`** — `marcarEntregaProveedorChequeSchema` incluye **`fechaTransferencia`**; **`marcarEntregaProveedorFinTesoreriaCheque`** la persiste (≤ hoy AR); sumas de caja **CHEQUE** excluyen filas con transferencia. Ver §2.5c (cheques).*

*Última actualización (2026-05-11): **Cheques tesorería — fechas `@db.Date` en DTO:** `mapCheque` y comparación `fecha_acreditacion` ≤ hoy en `transferirChequeFinTesoreria` usan **`isoYmdFromPrismaDateOnly`** (`fechaArgentina.ts`); evita desfase de un día respecto al calendario guardado (UI **Editar Cheque** / `type="date"`). Ver §2.5c (cheques).*

*Última actualización (2026-05-11): **Acreditar cheque** — destino solo **`tipo_caja = BANCO`** (`listarCajasTesoreriaTipoBancoAction` + validación en `transferirChequeFinTesoreria`). Ver §2.5c (cheques).*

*Última actualización (2026-05-19): **Cajas tesorería** — migración **`20260519120000_fin_tesoreria_tipo_caja_valor_disponibilidad`** (`tipo_caja`, `tipo_valor`, `disponibilidad`); **`editarCajaTesoreria`** persiste `tipo_valor` y `disponibilidad` enviados por el cliente; acreditación de cheques en cuenta propia exige **`tipo_caja = BANCO`** (además de `tipo_valor = DIGITAL` en destino). Ver §2.5c.*

*Última actualización (2026-05-11): **Cheques tesorería — tenencia** — migración **`20260511143000_fin_tesoreria_cheques_tenencia`**; `tenencia` en modelo y DTO; listado con `tenenciaFiltro`; transferencia pone `DEPOSITADO`; entrega proveedor pone `PROVEEDOR`. Ver §2.5c (cheques).*

*Última actualización (2026-05-14): **Cheques tesorería — fechas** — migración **`20260516140000_fin_tesoreria_cheques_fechas_recibido_depositado`**: `fecha_recibido` + DATE de transferencia (hist. `fecha_depositado`); **`20260518143000_rename_fin_tesoreria_cheques_fecha_depositado_to_fecha_transferido`**: `fecha_transferido`; baja `entrega_proveedor`. `marcarEntregaProveedorChequeSchema` incluye `chequeId`, `proveedorId`, `fechaTransferencia`. Ver §2.5c (cheques).*
*Última actualización (2026-05-16): **Cheques tesorería — grilla Detalles De Cheques** — **ACTUALES**: **DÍAS** y orden por DÍAS ↑; **TRANSFERIDOS**: columnas transferencia/tenencia en grilla y orden por transferencia ↓. Ver §2.5c (cheques).*

*Última actualización (2026-05-13): **Cheques tesorería** — migración **`20260515190000_fin_tesoreria_cheques_transferencia_historial`** (`fecha_transferencia`, `caja_destino_id`); transferencia conserva fila **500 días** (`src/lib/finTesoreriaChequesRetencion.ts` + purge en `finTesoreriaCheques.service.ts`); sumas SQL filtran `fecha_transferencia IS NULL`. Ver §2.5c (cheques).*

*Última actualización (2026-05-27): **Posición IVA — import IVA débito** — solo **`.txt` de alícuotas** (62 caracteres/línea; Libro IVA Digital ventas). `imp_iva` desde pos. 48–62 «Impuesto liquidado»; **sin** cálculo 21 %. Mes/anio = fila del modal. Rechaza TXT con líneas de cabecera (266). `listarIvaDebitoFinBalPorAnio` suma `imp_iva`.*

*Última actualización (2026-05-13): **Rename** tabla **`fin_bal_pos_iva_final` → `fin_bal_iva_deb_import`** (historial CSV IVA débito; modelo Prisma **`FinBalIvaDebImportLine`**, `@@map("fin_bal_iva_deb_import")`). Migración **`20260513130000_rename_fin_bal_pos_iva_final_to_fin_bal_iva_deb_import`**. Antes: `fin_bal_iva_deb_import_line` → … → `fin_bal_pos_iva_final`. Servicio **`finBalIvaDeb.service.ts`**. Ver `schema.prisma`.*

*Última actualización (2026-05-12): **Rename** tabla **`fin_bal_iva_deb_import_line` → `fin_bal_pos_iva_final`**. Migración **`20260512220000_rename_fin_bal_iva_deb_import_line_to_fin_bal_pos_iva_final`**. Cadena siguiente: ver entrada 2026-05-13 (`fin_bal_iva_deb_import`).*

*Última actualización (2026-05-12): **Dominio gastos Balance** — migración **`20260512203000_drop_movimientos_finanzas_cheques`** (tabla hija huérfana) y **`20260512210000_drop_movimientos_finanzas`** con enum **`TipoMovimientoFinanzas`**; modelo Prisma **`MovimientoFinanzas`** fuera del schema; eliminados `movimientosFinanzas.service.ts`, **`actions/movimientosFinanzas.ts`**, **`validations/movimientosFinanzas.ts`**, **`NuevoGastoModal`**. **`listarSucursalesParaGastos`** + **`SucursalOption`** en **`finBalGastoMensualBalance.service.ts`**. Ver §2.5b.*

*Última actualización (2026-05-10): **Superficie API** — Gates en `GET` de `/api/sync-lista-precios-tienda/status`, `/api/sync-compras-proveedor-dux/status`, `/api/import-lista-precios/status` y refuerzo de `POST` import lista (`listaPrecios.importarLista` + editor) vía `@/lib/apiRouteAuth`. Eliminados mock `/api/sync-tienda` y `useSyncDux`; cliente unificado en `useListaPreciosTiendaModalSync`. **[Histórico misma fecha]** **Limpieza de superficie** — eliminados `src/actions/duxCompras.ts` y `src/actions/syncListaPrecioTienda.ts` (sin call sites). **[2026-05-08]** Excel recepción: sin consulta DUX para **COMPROBANTE**; ver §2.8–§2.9. `finBalGastoMensualBalance.ts` endurece lecturas Prisma con `try/catch`; `ivaPorGastoFinalId` con claves `cuid` + tope en Zod (§1.2.6); `.env.example` ampliado.*

*Última actualización (2026-05-27): **Lista Precios Proveedores** — `actualizacionMasivaListaPreciosSchema` y `ActualizacionMasivaListaPrecios` ahora aceptan `pxListaProveedor` (>= 0), y `actualizarListaPreciosMasivo` persiste ese campo en `prod_precios_provee.px_lista_proveedor` (además de los campos previos) para soportar edición individual desde la grilla.*

*Última actualización (2026-05-07): **Auditoría de seguridad cerrada** — todas las Server Actions vigentes revisadas cumplen los gates documentados. Patrones consolidados en §1.2.5 (firma `unknown` para payloads de cliente, gate doble módulo+editor, IDs por modelo Prisma, no anidar Actions, sin throw al cliente, helpers de gate compartidos) + checklist en §4 + tabla en §5.11.*

*Última actualización (2026-04-24): **Balance mensual** y **`fin_bal_vtas`** (resumen, upsert, unique, revalidaciones, helpers `fmtMargenContribucionPct` / `puntoEquilibrioVentasPesos`) — ver **§2.5f**.*

*Última actualización (2026-04-21): `global_proveedores.prefijo` **opcional** (NULL permitido; unique PostgreSQL). Alta sin prefijo: servicio genera `codigo_unico` tipo `Z`+hex; importación de lista usa `prefijo` efectivo = prefijo trim o `codigo_unico`. Migración `20260421180000_global_proveedores_prefijo_nullable` + función `trg_lista_precios_set_cod_ext` con `COALESCE(NULLIF(trim(p.prefijo), ''), p.codigo_unico)` para `cod_ext`. Zod: `prefijoProveedorOpcionalSchema`, `proveedorMercaderiaFormSchema` (SI/NO obligatorio desde form). Ver §1.11c.*

*Última actualización: 2026-04-21 — **rename** de catálogos maestros: `marcas` → `prod_marcas`, `proveedores` → `global_proveedores`, `sucursales` → `global_sucursales` (migración `20260421120000_rename_marcas_proveedores_sucursales`). Incluye renames de PK/uniques/índices y del CHECK de prefijo; coexiste el unique legado `global_proveedores_nombre_legacy_ux` (antes `idx_proveedores_nombre`) junto a `global_proveedores_nombre_key`. Se recrean `sync_pedidos_mercaderia_cant_pedir` (lee `global_sucursales`) y `trg_lista_precios_set_cod_ext` (lee `global_proveedores`). Prisma: `@@map` en `Marca`, `Proveedor`, `Sucursal` + `map:` en uniques y en `@@index([proveedorMercaderia])`. Raw SQL y comentarios alineados en services/actions listados en el diff del commit. — 2026-04-18 — **rename masivo** de 7 tablas al esquema de prefijado por dominio (`prod_*` para productos/pedidos/precios; `fin_*` para finanzas). Migración `20260418290000_rename_7_tablas_prod_fin`: (1) `pedidos_historia` → `prod_ped_historial`, (2) `pedidos_historial_mercaderia` → `prod_ped_historial_merc`, (3) `pedidos_mercaderia` → `prod_ped_merc`, (4) `precios_proveedores` → `prod_precios_provee`, (5) `precios_tienda` → `prod_precios_tienda`, (6) `cajas_tesoreria` → `fin_tesoreria_cajas`, (7) `comprobantes_proveedor` → `fin_compras_comprobante`. Cada rename incluyó `ALTER TABLE … RENAME TO` + renames explícitos de PK, FKs, índices y unique constraints (PostgreSQL no los auto-renombra al renombrar la tabla). Estrategia defensiva con `IF EXISTS` en todos los renames de constraints/índices: si algún nombre difiere de la convención por historia, se saltan silenciosamente — la tabla sigue funcional porque PostgreSQL resuelve FKs por OID, no por nombre. **Funciones plpgsql recreadas** con los nombres nuevos: `sync_pedidos_mercaderia_cant_pedir()` (referenciaba `precios_tienda` en su cuerpo) ahora usa `prod_precios_tienda`; `sync_reposicion_on_precios_tienda_stock_change()` (referenciaba `pedidos_mercaderia`) ahora usa `prod_ped_merc`. Los triggers siguen a la tabla automáticamente (sus nombres quedan desalineados — cosmético, funcional OK; se renombran en la misma migración vía `ALTER TRIGGER … RENAME TO …`). **`@@map` actualizados** en `schema.prisma` (7 tablas) + 2 unique nombrados (`cajas_tesoreria_nombre_titular_ux` → `fin_tesoreria_cajas_nombre_titular_ux`; `comprobantes_proveedor_natural_ux` → `fin_compras_comprobante_natural_ux`). **Nombres TypeScript sin cambios** (modelos Prisma `PedidoHistoria`, `PedidoHistoriaItem`, `ItemPedidoEnvio`, `ListaPrecioProveedor`, `ListaPrecioTienda`, `CajaTesoreria`, `ComprobanteProveedor` y todos sus Action/Service consumidores se mantienen — el rename afecta solo nombres físicos vía `@@map(...)`). Raw SQL actualizado en: services (`deudaProveedores`, `controlComprobantes`, `vencimientosPorFecha`, `listaPrecios`, `vinculosPorCodExt`), actions (`tienda`), scripts de verificación/simulación y `scripts/ensure-comparacion-dto-extra-items.js`. Script de bootstrap `scripts/neon-comprobantes-proveedor.sql` → `scripts/neon-fin-compras-comprobante.sql` (archivo viejo queda como redirector DEPRECADO). **Motivación**: unificar el prefijado por dominio que ya se había iniciado con `prod_comp_*` y `prod_rendimientos`, y el `fin_bal_*` / `movimientos_finanzas`. Con este batch, la base queda dividida limpiamente: `prod_*` para productos/pedidos/precios, `fin_*` para finanzas/tesorería/compras; los maestros de sucursal/proveedor pasaron luego a `global_*` y el catálogo de marcas a `prod_marcas` (ver entrada 2026-04-21). **Contradicción con revert anterior resuelta**: dos días atrás se había revertido el rename `comprobantes_proveedor` → `prod_comp_provee` porque `prod_comp_*` se reservó al dominio "Comparación por Categoría"; ahora la tabla pasa a `fin_compras_comprobante` (prefijo `fin_*`, domino correcto). Sin pérdida de datos: los registros de las 7 tablas persisten intactos. Rollback: migración inversa con los nombres viejos. — **rename** de la tabla de catálogo de rendimientos por tipo de pintura: `tipos_pintura_rendimientos` → `prod_rendimientos`. Migración `20260418280000_rename_tipos_pintura_rendimientos_a_prod_rendimientos`: `ALTER TABLE … RENAME TO` + renames de PK (`tipos_pintura_rendimientos_pkey` → `prod_rendimientos_pkey`), del índice UNIQUE case-insensitive con expresión `LOWER(tipo_pintura)` (`ux_tipos_pintura_rendimientos_tipo_lower` → `ux_prod_rendimientos_tipo_lower`) y del CHECK sobre `rendimiento` (`tipos_pintura_rendimientos_rendimiento_check` → `prod_rendimientos_rendimiento_check`). La tabla **no está modelada en `schema.prisma`** (se usa exclusivamente vía `$queryRaw` / `$executeRaw` en `src/actions/tiposPinturaRendimientos.ts`), por lo que no hubo `@@map(...)` que actualizar; sí se actualizaron las 4 raw SQL del Action (SELECT listado, UPDATE, INSERT, DELETE). **Nombres TypeScript sin cambios**: el archivo `tiposPinturaRendimientos.ts`, los exports `getTiposPinturaRendimientosAction`, `upsertTipoPinturaRendimientoAction`, `deleteTipoPinturaRendimientoAction`, y el tipo `TipoPinturaRendimiento` se mantienen — el rename afecta solo la capa física en PostgreSQL. Consumidor UI: `/tienda/litros` (Cálculo de Lts + modal Editar Rendimientos). Sin pérdida de datos. Rollback: inverso `ALTER … RENAME TO …` a los nombres originales. — **revert parcial del rename masivo** del mismo día: la tabla de comprobantes DUX **vuelve a su nombre original `comprobantes_proveedor`** (no se queda como `prod_comp_provee`). Migración `20260418270000_revert_rename_comprobantes_proveedor`: `ALTER TABLE prod_comp_provee RENAME TO comprobantes_proveedor` + rename inverso de PK, FK, índices `_fecha_comp_idx`, `_id_proveedor_idx` y del UNIQUE con `map:` explícito (`prod_comp_provee_natural_ux` → `comprobantes_proveedor_natural_ux`). **Nota**: este nombre original `comprobantes_proveedor` fue reemplazado definitivamente el mismo día por `fin_compras_comprobante` (migración `20260418290000_rename_7_tablas_prod_fin`, ver entrada más reciente arriba). `schema.prisma` restaurado en ese momento a `@@map("comprobantes_proveedor")` / `map: "comprobantes_proveedor_natural_ux"`. Raw SQL de `controlComprobantes.service.ts`, `vencimientosPorFecha.service.ts` y `deudaProveedores.service.ts` vuelto a `FROM comprobantes_proveedor` en ese momento. Script de bootstrap `scripts/neon-prod-comp-provee.sql` → `scripts/neon-comprobantes-proveedor.sql` (contenido restaurado). Comentarios en `src/lib/duxComprasApi.ts`, `src/actions/comprobantesProveedor.ts` y `schema.prisma` restaurados al nombre original en ese momento. **Motivación**: el prefijo `prod_comp_*` queda reservado exclusivamente al dominio "Comparación por Categoría" (lectura `prod[ucto]_comp[aración]`) y no debe mezclarse con tablas del dominio "Comprobantes DUX". Los 4 renames de comparación (`prod_comp_cat`, `prod_comp_sub_cat`, `prod_comp_presentaciones`, `prod_comp_dto_extra`) **se mantienen**. Sin pérdida de datos (los 475 comprobantes DUX persisten intactos durante ambos renames). — **rename masivo** de 5 tablas (migración `20260418260000_rename_prod_comp_y_comprobantes`) — inicialmente incluyó los 5 renames, pero la migración de revert anterior deja vigentes **solo 4** en producción: `comparacion_categorias` → `prod_comp_cat`, `comparacion_subcategorias` → `prod_comp_sub_cat`, `comparacion_presentaciones` → `prod_comp_presentaciones`, `comparacion_dto_extra_items` → `prod_comp_dto_extra`. Cada rename incluyó `ALTER TABLE … RENAME TO` + renames explícitos de PK, FKs e índices (PostgreSQL no los auto-renombra al renombrar la tabla). Los nombres de los **modelos Prisma** (y el API TS `prisma.categoriaComparacion.*`, `prisma.subcategoriaComparacion.*`, etc.) **no cambiaron**: el rename afecta solo nombres físicos vía `@@map(...)`. **Limpieza colateral**: eliminado `prisma/rename_comparacion_tables.sql` (script huérfano de un rename histórico que dejó las constraints con nombres desalineados — `categorias_comparacion_pkey`, `subcategorias_comparacion_categoria_id_fkey`, etc. — ahora ya alineados al prefijo `prod_comp_*`); `scripts/ensure-comparacion-dto-extra-items.js` actualizado para usar `prod_comp_dto_extra`. — **alta** del flag `sucursales.centro_costo` (Prisma `Sucursal.centroCosto`, `BOOLEAN NOT NULL DEFAULT FALSE`). Migración `20260418250000_add_sucursales_centro_costo` (`ALTER TABLE "sucursales" ADD COLUMN "centro_costo" BOOLEAN NOT NULL DEFAULT FALSE`). Concepto **ortogonal a `pedido`**: `pedido` gobierna participación en flujos de pedidos de mercadería; `centro_costo` marca a la sucursal como centro de imputación contable en reportes/balance. Sin índice (cardinalidad 2, se lee como payload). Sin UI de edición (no hay formulario de alta/edición de sucursales): el flag se administra por seed / UPDATE manual, igual que el resto de atributos del maestro `sucursales`. Sin backfill automático: los registros preexistentes quedan en `false` (opt-in explícito); cuando se defina la política funcional se marcan con `UPDATE sucursales SET centro_costo = TRUE WHERE codigo IN (...)`. Sin cambios en Zod/service/action (ningún consumidor filtra todavía por este flag). Ver §2.5b. — **baja** de la columna `fin_bal_gasto.repite_monto` (introducida horas antes en `20260418220000_add_fin_bal_gasto_flags_mensual_repite`). Migración `20260418240000_drop_fin_bal_gasto_repite_monto` (`ALTER TABLE … DROP COLUMN IF EXISTS`). Se saca el campo `repiteMonto` del schema Prisma, de `FinBalGastoItem`, de los Zod `crear/editar*Schema`, de la capa de servicio (writes y reads) y del modal `CrearEditarFinBalCatalogoItemModal` (Select `REPITE MONTO` + estado + prop `repiteMontoInicial`); la meta del gasto en la columna GASTOS deja de mostrar el badge "Repite monto". **`gasto_mensual` se conserva**. El caso de uso ("recordar último monto") se moverá a `movimientos_finanzas` cuando aplique. Sin impacto productivo: los gastos existentes tenían el valor `DEFAULT FALSE`. — **cambio de regla de unicidad** en `fin_bal_gasto`: de `UNIQUE (rubro_id, nombre)` a `UNIQUE (rubro_id, nombre, proveedor_id)` (Prisma `@@unique([rubroId, nombre, proveedorId])`, map `fin_bal_gasto_rubro_nombre_proveedor_ux`). Ahora dentro de un mismo rubro el `nombre` puede repetirse si el `proveedor` es distinto. Para cubrir el caso "dos gastos sin proveedor con el mismo nombre en el mismo rubro" (que el UNIQUE estándar no bloquea porque PostgreSQL trata `NULL ≠ NULL`), la migración agrega **adicionalmente** un UNIQUE parcial `fin_bal_gasto_rubro_nombre_sin_prov_ux ON (rubro_id, nombre) WHERE proveedor_id IS NULL`, que vive solo en SQL (Prisma 7.4.1 no soporta índices parciales ni `NULLS NOT DISTINCT` en `@@unique`). Migración `20260418230000_fin_bal_gasto_unique_rubro_nombre_proveedor` (compatible con datos existentes — el constraint previo era más restrictivo). `mapDbError` de `gasto` diferencia el mensaje de `P2002` leyendo `meta.target` / `meta.constraint` (si contiene `sin_prov` → "Ya existe un gasto sin proveedor con ese nombre…", si no → "Ya existe un gasto con ese nombre y ese proveedor…"). — **alta** de los flags `fin_bal_gasto.gasto_mensual` y `fin_bal_gasto.repite_monto` (ambos `BOOLEAN NOT NULL DEFAULT FALSE`). Migración `20260418220000_add_fin_bal_gasto_flags_mensual_repite` (idempotente: `ADD COLUMN … DEFAULT FALSE` x2). Schema Prisma: `gastoMensual` / `repiteMonto` en `FinBalGasto`. Zod: nuevo helper local `booleanFlagSchema` (union `string | boolean | null | undefined` → `boolean`; acepta `"si"/"sí"/"true"/"1"` como `true`) en `crearFinBalGastoSchema` y `editarFinBalGastoSchema`. Servicio: `FinBalGastoItem` expone `gastoMensual` / `repiteMonto` (siempre `boolean`); `crearFinBalGasto` / `editarFinBalGasto` los persisten; `listarFinBalGastosPorRubro` y `listarFinBalGastosJerarquia` los incluyen en el payload. Los registros preexistentes quedan en `false` (opt-in explícito desde el modal del catálogo). Sin índices: cardinalidad baja + el catálogo se lee siempre vía jerarquía rubro→gasto. — **alta** del helper `getProveedoresNoMercaderia()` en `src/services/proveedor.service.ts` (contraparte simétrica de `getProveedoresMercaderia()`): filtra `where: { proveedorMercaderia: false }` reutilizando `listarProveedoresInterno` y el índice `global_proveedores_proveedor_mercaderia_idx`. La página `/finanzas/balance/gastos/catalogo` ahora consume `getProveedoresNoMercaderia()` en lugar de `getProveedores()` para popular la columna "PROVEEDORES" con el catálogo maestro de **proveedores no-mercadería** (gastos operativos / servicios / impuestos), dejando los de mercadería circunscriptos a su propio módulo. La página previamente consumía `getProveedores()` cuando la columna se introdujo (histórico abajo). — **extensión** del flag `proveedor_mercaderia` al modal **Nuevo/Editar Proveedor** (`ProveedorForm.tsx` + `ProveedorModal.tsx`): Select SI/NO controlado + hidden `<input name="proveedorMercaderia">` para `FormData`; `proveedorMercaderiaSchema` (union string/boolean/null/undef → boolean) en `createProveedorSchema` y `updateProveedorSchema`; `CreateProveedorInput.proveedorMercaderia?` y `UpdateProveedorInput.proveedorMercaderia?` opcionales (undefined = no tocar). Default UX en alta: "SI". Consumidores del modal (`TablaProveedoresLista`, `TablaProveedoresGestion`) propagan el valor persistido a `ProveedorParaModal.proveedorMercaderia` para precarga en edición. — **alta** de `fin_bal_gasto.proveedor_id` (FK opcional a `proveedores`, `BOOLEAN NULLable`, `onDelete: SET NULL`, `onUpdate: CASCADE`, índice `fin_bal_gasto_proveedor_id_idx`). Migración `20260418210000_add_fin_bal_gasto_proveedor_id`. Schema Prisma: campo `proveedorId` + relación `proveedor Proveedor?` en `FinBalGasto` y relación inversa `finBalGastos FinBalGasto[]` en `Proveedor`. Zod (`crearFinBalGastoSchema` / `editarFinBalGastoSchema`) acepta `proveedorIdOpcionalSchema` (union de `prismaCuidSchema | ""` | `null` | `undefined` → normalizado a `string | null`). Servicio: `FinBalGastoItem` expone `proveedorId` + `proveedor: { id, nombre } | null` (expandido en lecturas vía `include: { proveedor: { select: { id, nombre } } }`); `mapDbError` distingue P2003 en gasto por `meta.field_name` / `meta.constraint` entre proveedor y rubro. UI: Select opcional "PROVEEDOR" (con opción "SIN PROVEEDOR") en modal de alta/edición de gasto (`CrearEditarFinBalCatalogoItemModal`); la columna 3 de `/finanzas/balance/gastos/catalogo` muestra el nombre del proveedor (o "Sin proveedor") como meta bajo el nombre del gasto; la página del catálogo carga proveedores vía `getProveedores()` en paralelo con la jerarquía. — **alta** de `global_proveedores.proveedor_mercaderia` (`BOOLEAN NOT NULL DEFAULT false` en schema final; backfill a `true` para existentes, índice `global_proveedores_proveedor_mercaderia_idx`). Migración `20260418200000_add_proveedores_proveedor_mercaderia`. Nueva lectura `getProveedoresMercaderia` en servicio y action; `/gestion-productos/proveedores/lista` filtra por `proveedor_mercaderia = true` (ver §1.11c). — **alta** de la jerarquía `fin_bal_gasto_tipo` → `fin_bal_gasto_rubro` → `fin_bal_gasto` (migraciones `20260418170000_add_fin_bal_gasto_tipo` y `20260418180000_add_fin_bal_gasto_rubro_y_gasto`), con FKs `onDelete: Restrict`, nombre único global en tipo y único por padre en rubro/gasto. Incluye capa completa backend: validaciones Zod (`finBalGastosCatalogo.ts`), servicio con lectura jerárquica + CRUD 3 niveles (`finBalGastosCatalogo.service.ts`) y Actions con gate `PERMISOS.finanzas.acceso` + `esEditor()` (`actions/finBalGastosCatalogo.ts`). **Baja** previa del catálogo `finanzas_rubros` / `finanzas_gastos` y enum `TipoCostoGasto` (migración `20260418160000_drop_finanzas_rubros_y_gastos_catalogo`); se eliminaron servicio, action, validaciones y modal asociados; `/finanzas/balance/gastos` queda solo con alta de movimientos en `movimientos_finanzas`. Histórico: `cajas_tesoreria` (2026-04-14, hoy `fin_tesoreria_cajas`), `precios_tienda.stockeable` (2026-04-13, hoy `prod_precios_tienda`), Finanzas 2026-04-02; reposición por punto/stock + DUX compras throttle.*

---

### 5.7 Auditoría de seguridad — tabla de cambios (2026-03)

| Área | Cambio |
|------|--------|
| `src/actions/tienda.ts` | `getTiendaPageData`, `getProveedoresTintoLts`: `getRol` + `puede`. |
| `src/actions/importar.ts` | `puede(importar)` + `esEditor` + `importarProductosSchema`. Lista precios: API route (§1.2.8). |
| `src/lib/validations/importar.ts` | Esquemas de mapeo y límites de filas/celdas. |
| `src/actions/pedidosHistoria.ts` | Mutaciones con `esEditor()`; listado: `proveedorId` normalizado con Zod. |
| `src/actions/pedidos.ts` | `generarPdfEnviarPedidoSchema`, `upsertPedidoUrgenteItemSchema`. |
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
| `src/app/api/sync-lista-precios-tienda/route.ts` | `PERMISOS.tienda.acciones.sincronizar` (simple + editor desde 2026-03-25). Única entrada HTTP para disparar sync lista tienda; no existe Action paralela. |
| `src/actions/tienda.ts` | `getTiendaPageData`: `getTiendaPageParamsSchema` (filtro `proveedor` validado a CUID con `prismaCuidSchema.safeParse` en la action). |
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

### 5.11 Auditoría de seguridad — cierre 2026-05 (Server Actions)

Auditoría integral de los **26** Server Actions vigentes en `src/actions/*.ts` (dos archivos redundantes fueron eliminados el 2026-05-10; ver §1.2.6). Resultado: backend alineado con los gates documentados en §1.2.x.

| Área | Cambio |
|------|--------|
| `src/actions/vinculos.ts` | **`vincularProducto`**: gate doble agregado (`puede(rol, PERMISOS.tienda.acceso) + esEditor()`) — antes solo `esEditor()`, vector potencial de bypass por rol con permisos de tienda revocados. Ambas mutaciones (`vincular` / `desvincular`) ahora envuelven Prisma en `try/catch` para evitar fugas de stack al cliente. |
| `src/actions/tiposPinturaRendimientos.ts` | **`upsertTipoPinturaRendimientoAction` / `deleteTipoPinturaRendimientoAction`**: gate doble agregado (`puede(rol, PERMISOS.tienda.tintoLts) + esEditor()`) — antes solo `esEditor()`. Coherencia con la lectura `getTiposPinturaRendimientosAction` (que ya pedía `tienda.tintoLts`). |
| `src/actions/pedidosHistoria.ts` | `listarPedidosHistoriaSchema.proveedorId`: cambio de `z.string().min(1).max(128).optional()` a `prismaCuidSchema.optional()`. El modelo `Proveedor` usa `cuid()`; aceptar strings arbitrarios de hasta 128 chars era una superficie de ataque para SQL/lookup probing. |
| `src/actions/comparacionCategorias.ts` | Reemplazo del helper anti-patrón `canEdit()` (función que retorna función) por **`tienePermisoEditar(): Promise<boolean>`** (12 call sites). Se agregó `try/catch` a las 5 lecturas (`getArbolCategoriasAction`, `getProductosPorPresentacionAction`, `getPresentacionesConLabelAction`, `getPresentacionesParaGestionAction`, `buscarProductosParaAsignarAction`) para no propagar errores Prisma al cliente. |
| `src/actions/pedidos.ts` | **`comprobarItemsParaGenerarPedidoAction`**: delega en `getItemsTablaEnviarPedido` (§1.2.5.E). Esquemas Zod en `@/lib/validations/pedidosMutaciones` + lectura en `pedidosLectura`; `proveedorId` con `prismaCuidSchema`, `idItemPedidoEnvio` / borrado tintométrico por `id` con `uuidSchema` (`prod_ped_merc`). Payloads de mutación con firma `raw: unknown` (`generarPdfEnviarPedidoAction`, `upsertPedidoUrgenteMercaderiaItemAction`, `upsertPedidoTintometricoItemsAction`, etc.). |
| `src/actions/reposicion.ts` | `upsertReglaReposicion` y `deleteReglaReposicion`: firma `raw: unknown` (antes `z.infer<...>`). |
| `src/actions/stock.ts` | `registrarExportacionExcelStock`: `try/catch` alrededor del `updateMany` para no propagar errores Prisma al cliente. |

**Estado por archivo (cumplen gates los módulos listados):**

| Action | Gate | Zod | ActionResult | Servicio | Estado |
|--------|------|-----|--------------|----------|--------|
| `cajasTesoreria.ts` | finanzas + editor | ✓ | ✓ | ✓ | ✅ |
| `comparacionCategorias.ts` | comparacionCategorias.{acceso,editar} | ✓ | ✓ | ✓ | ✅ |
| `comprobantesProveedor.ts` | finanzas + editor | n/a (sin payload) | ✓ | ✓ | ✅ |
| `controlComprobantes.ts` | finanzas + editor | ✓ | ✓ | ✓ | ✅ |
| `globalPersonal.ts` | pedidos | n/a | ✓ | ✓ | ✅ |
| `registrarRecepcionCompraDux.ts` | pedidos | ✓ | ✓ | ✓ | ✅ |
| `finBalGastoMensualBalance.ts` | finanzas + editor (mutaciones) / finanzas (lecturas) | ✓ | ✓ | ✓ | ✅ |
| `finBalGastosCatalogo.ts` | finanzas + editor (todas) | ✓ | ✓ | ✓ | ✅ |
| `finBalIvaDeb.ts` | finanzas + editor (import CSV) / finanzas (lecturas) | ✓ | ✓ | ✓ | ✅ |
| `finBalPosicionIva.ts` | finanzas | ✓ | ✓ | ✓ | ✅ |
| `finBalPosicionIvaSaldoManual.ts` | finanzas + editor | ✓ | ✓ | ✓ | ✅ |
| `finBalPosicionIvaComparacionPedido.ts` | finanzas + editor | ✓ | ✓ | ✓ | ✅ |
| `finBalVtas.ts` | finanzas + editor (mutaciones) / finanzas (lecturas) | ✓ | ✓ | ✓ | ✅ |
| `finTesoreriaCheques.ts` | finanzas + editor (mutaciones) / finanzas (lecturas) | ✓ | ✓ | ✓ | ✅ |
| `importar.ts` | importar + editor | ✓ | ✓ | ✓ | ✅ |
| `listaPrecios.ts` | listaPrecios.* | ✓ | ✓ | ✓ | ✅ |
| `pedidos.ts` | pedidos.acceso | ✓ | ✓ | ✓ | ✅ |
| `pedidosHistoria.ts` | pedidos.acceso | ✓ (CUIDs) | ✓ | ✓ | ✅ |
| `productos.ts` (mock) | listaPrecios.acciones.edicionMasiva | ✓ | ✓ | n/a | ✅ |
| `productosTienda.ts` | pedidos.acceso | ✓ | ✓ | ✓ | ✅ |
| `proveedores.ts` | proveedores.* / editor (mutaciones) | ✓ | ✓ | ✓ | ✅ |
| `reposicion.ts` | pedidos.acceso | ✓ | ✓ | ✓ (parcial) | ✅ |
| `sesion.ts` | n/a (entrada para activar editor) | ✓ | n/a | n/a | ✅ |
| `stock.ts` | stock.acceso | ✓ | ✓ | n/a (legacy con Prisma directa) | ✅ |
| `tienda.ts` | tienda.{acceso,tintoLts} (acceso solo editor) | ✓ | ✓ | n/a (legacy con Prisma directa) | ✅ |
| `tintometrico.ts` | pedidos.acceso | ✓ | ✓ | ✓ | ✅ |
| `tiposPinturaRendimientos.ts` | tienda.tintoLts + editor (mutaciones) | ✓ | ✓ | n/a (raw SQL inline) | ✅ |
| `vinculos.ts` | tienda.acceso + editor (mutaciones) | ✓ | ✓ | ✓ (parcial) | ✅ |

**Deudas técnicas residuales (no bloqueantes, documentadas):**
- `tienda.ts`, `stock.ts`, `tiposPinturaRendimientos.ts`: lógica de Prisma / raw SQL inline en la Action en lugar de delegar a un servicio. Funcional y con Zod + `try/catch` correcto; mover a `src/services/` queda como evolución arquitectural (§5.2).
- `vinculos.ts` y `reposicion.ts`: una parte de la lógica vive en la Action (Prisma directa) — aceptable por simplicidad y volumen de SQL, pero candidato a extracción a servicio si crece.

**Auditoría = COMPLETADA.** Cualquier nueva Server Action o cambio de gate debe documentarse aquí o en una sub-sección 5.x dedicada y respetar los patrones de §1.2.5 y §1.2.6.

### 5.12 Triage y fix — error genérico de Server Components en Recepción Pedido (2026-05-08)

**Síntoma reportado en producción:** al abrir el modal *Recepción Pedido* y operar sobre `/gestion-productos/pedidos/historial`, el cliente veía
*"An error occurred in the Server Components render. The specific message is omitted in production builds... A digest property is included..."*
Sin contenido y sin trazabilidad útil del lado del usuario.

**Causa raíz (combinación):**

1. **No existía ningún `error.tsx` en toda la app** (`src/app/**`) — confirmado vía `Glob`. En Next.js 16, una excepción no atrapada en cualquier Server Component se traduce literal a ese mensaje cuando no hay un boundary. Este fue el factor dominante: cualquier error transitorio se veía igual y opaco.
2. **`src/app/pedidos/historial/page.tsx`** ejecutaba `prisma.proveedor.findMany(...)` y `pedidosHistoriaService.listarPedidosHistoria(...)` **sin `try/catch`** (el segundo devuelve `ServiceResult` pero el adapter Prisma puede lanzar fuera del catch interno cuando hay timeout / pool exhausted en serverless durante revalidaciones). `HistorialPedidosPageClient` llama a `router.refresh()` cada vez que se cierra el modal y cada Action hace `revalidatePath("/pedidos/historial")`, generando ráfagas de re-render del Server Component que aumentan la probabilidad de error transitorio.
3. **`getRol()`** (`src/lib/sesion.ts`) lanzaba si la cookie estaba corrupta o firmada con un secret distinto. Como se usa en el root layout (`src/app/layout.tsx`) y en cada page RSC, una cookie inválida volaba la app entera con el mismo mensaje genérico.
4. **Catches sin `console.error` en services/actions del flujo** dejaban el incidente sin rastro grepeable en Vercel Function Logs: el `digest` no podía emparejarse con un mensaje útil.

**Fix aplicado:**

- **Boundaries** (nuevos):
  - `src/app/global-error.tsx` — captura errores del root layout (incluye `getRol()`); Client Component con `<html>`/`<body>` propios; loggea `digest` con prefijo `[global-error]`.
  - `src/app/pedidos/historial/error.tsx` — boundary específico del módulo; UI con botones *Reintentar* / *Volver al inicio*; loggea con prefijo `[pedidos/historial][error-boundary]`.
- **Page hardening** (`src/app/pedidos/historial/page.tsx`):
  - `prisma.proveedor.findMany` y `pedidosHistoriaService.listarPedidosHistoria` envueltos en `try/catch` con fallback (`proveedores: []`, `res = { success: false }`) y log `[pedidos/historial][page]`.
- **Sesión defensiva** (`src/lib/sesion.ts`): `getRol()` atrapa cualquier excepción de iron-session y retorna `"simple"` con log `[sesion][getRol]`. Con esto, una cookie inválida ya no rompe el render; la página redirige a inicio si exige permiso.
- **Logging server-side** con prefijo identificable en cada `catch` de:
  - `src/services/pedidosHistoria.service.ts` (`crearPedidoHistoriaSnapshot`, `getPedidoHistoriaDetalle`, `listarPedidosHistoria`, `agregarPedidoHistoriaItem`, `actualizarPedidoHistoriaItemCantRecibida`, `guardarRecepcionPedidoHistoria`, `marcarPedidoHistoriaRegistrado`, `reabrirPedidoHistoriaRecepcion`, `getPedidoHistoriaPdfPayload`, `eliminarPedidoHistoria`).
  - `src/services/exportRecepcionPedidoExcel.service.ts` (`prepararRecepcionCompraDatos`).
  - `src/actions/pedidosHistoria.ts` (helper `ejecutarActionSegura(scope, fn)` envolviendo las 9 Actions del módulo).
  - `src/actions/registrarRecepcionCompraDux.ts` (`registrarRecepcionCompraDuxAction`, top-level `try/catch`).
- **Defensa de shape** ante `proveedor`/`sucursal` undefined en:
  - `getPedidoHistoriaDetalle` y `getPedidoHistoriaPdfPayload`: devuelven `ServiceResult` con error legible y log si la relación viene incompleta.
  - `prepararRecepcionCompraDatos`: idéntico, antes de leer `pedido.proveedor.iva`.
  - `listarPedidosHistoria`: `r.proveedor?.nombre ?? "—"` y `r.sucursal?.nombre ?? "—"` para no romper el listado completo si una fila trae datos corruptos.

**Convención obligatoria para futuras IAs/módulos** (ver §1.5.1):

- Toda nueva ruta con Server Component que lea Prisma o sesión debe agregar un `error.tsx` específico además del `global-error.tsx`.
- Toda Action nueva del módulo Recepción Pedido debe envolverse en `ejecutarActionSegura("nombreCorto", async () => { ... })`.
- Todo `catch` en services del módulo debe loggear con `[pedidoHistoria][<fn>]` o `[exportRecepcionPedidoExcel][<fn>]` antes de devolver `ServiceResult`.
- Toda lectura de relación con `select.proveedor.{...}` o `select.sucursal.{...}` debe validar `!relacion` antes de acceder a subcampos.

**Cómo grepear logs de futuros incidentes** (Vercel Function Logs → filtro por digest):

```
[pedidoHistoria]                    # prefijo de servicios del módulo
[pedidoHistoria][action]            # prefijo de Actions envueltas con `ejecutarActionSegura`
[exportRecepcionPedidoExcel]        # servicios de export Excel
[exportRecepcionPedidoExcel][action]
[pedidos/historial][page]           # errores en la página RSC
[pedidos/historial][error-boundary] # captura del boundary específico del módulo
[global-error]                      # captura del boundary global
[sesion][getRol]                    # cookie inválida / iron-session falló
```

**Verificación:**
- `tsc --noEmit` ✓
- `ReadLints` sobre los 8 archivos modificados ✓
- BD up-to-date (`prisma migrate status` → 119/119 aplicadas) ✓

---

## Comparación de precios de competencia (2026-05)

### Modelos Prisma

- **`prod_competencia`:** catálogo de competidores — `id`, `nombre`, `web` (referencia, **opcional** / `NULL`), `id_proveedor` (FK opcional → `global_proveedores.id`; si está definido, el sync puede tomar `px_vta_sugerido` de `prod_precios_provee` sin HTTP), `ultima_comparacion_at`, `config_extraccion` (JSON: reglas por tipo de página — selectores CSS, JSON-LD, regex; esquema Zod en `@/lib/competenciaConfigExtraccion.ts`). **Sin** `url_busqueda` (eliminada).
- **`prod_precios_competencia`:** vínculo **producto tienda × competidor** — PK `(cod_tienda, competencia_id)`; `url_producto` (manual); `tipo_pagina` (slug de regla en `config_extraccion.reglas`); `px_competencia` (último precio); `estado` (`SIN_URL` | `PENDIENTE` | `OK` | `SIN_PRECIO` | `ERROR`); `error_mensaje`; `relevado_at` (último intento de relevamiento). Constantes en `@/lib/competenciaRelevamiento.ts`.
- **Precio mostrado (lectura / grilla):** misma presentación que el precio por URL. Prioridad en `aplicarPrioridadPrecioMostrar` (`competenciaPxSugerido.service.ts`), aplicada en **`pxListasRows.service.ts`** / **`pxListasPage.service.ts`**: (1) si hay `px_vta_sugerido` del proveedor asociado al competidor para ese `cod_tienda` → se expone como `pxCompetencia` con `estado = OK`; (2) si no → `px_competencia` y `estado` del relevamiento por URL en BD. `prod_precios_competencia.px_competencia` sigue siendo solo el resultado del scraping. **`pxListasRows.service.ts`** resuelve sugeridos con **`listarCompetenciasConPxSugeridoPorCodTiendas`** (todos los proveedores con sugerido por ítem, sin exigir fila previa en `prod_precios_competencia`) y arma `buildMapPxVtaSugerido` con proveedores de **todas** las competencias configuradas, no solo los que ya tienen vínculo URL. **`resolverPreciosCompetenciaMostrar` / `resolverPrecioCompetenciaMostrar`** (mismo SSOT) usan en **Comp. Categorias — Comparacion** para el referente de presentación (`prod_comp_presentaciones.ref_cod_tienda` + `ref_competencia_id`).
- **Sync:** si hay sugerido, no hace HTTP ni pisa `px_competencia` en BD; si no hay sugerido, scraping de `url_producto`. Filas relevables: `url_producto` no nulo **o** sugerido disponible (`whereVinculosRelevablesCompetencia`). `POST` body `{ competenciaId, limiteProductos?, codTienda? }` o `{ todos: true, … }`; cancelación `POST /api/sync-competencia-precios/cancel`.
- **Guardar URL:** `guardarUrlVinculoCompetenciaAction` → `competenciaVinculo.service.ts` (upsert por `cod_tienda` + `competencia_id`; solo el competidor tocado: si la URL no cambió no se pisa `estado`/`px_competencia`; si cambia la URL → `PENDIENTE` y se limpia precio de ese vínculo; al borrar URL solo ese competidor pasa a `SIN_URL` sin tocar filas de otros).

Migraciones: `20260520190000_add_prod_competencia_tables`; `20260523120000_prod_competencia_id_proveedor` (`id_proveedor` opcional en `prod_competencia`).

### Permisos

- Lectura listado: `puede(rol, PERMISOS.competenciaPrecios.acceso)`.
- CRUD competidores + sync: `competenciaPrecios.editar` + `esEditor()`.

### Server Actions (`src/actions/competenciaPrecios.ts`)

- `listCompetenciasAction`, `createCompetenciaAction`, `updateCompetenciaAction`, `deleteCompetenciaAction`, `guardarUrlVinculoCompetenciaAction`, **`relevarUrlVinculoCompetenciaAction`** (`relevarUrlVinculoSchema`: `{ codTienda, competenciaId }` — un solo vínculo, sin lock de sync masivo), **`relevarUrlsProductoCompetenciaAction`** (`relevarUrlsProductoSchema`: `{ codTienda }` — todos los vínculos relevables del ítem tienda).
- **Listado grilla competencia:** `getPxListasPageData` en `src/actions/pxListas.ts` (no Action en `competenciaPrecios.ts`).
- Payloads `unknown` + Zod (`@/lib/validations/competenciaPrecios.ts`). Tras mutaciones, `revalidateCompetenciaPreciosPaths()` (Px Listas).

### Servicios

- `competencia.service.ts` — CRUD + `normalizeWebUrl` (incluye `idProveedor` opcional).
- `competenciaPxSugerido.service.ts` — `obtenerPxVtaSugeridoParaCompetencia`, **`obtenerPxVtaSugeridoPorCompetenciaId`** (resuelve `id_proveedor` del competidor y delega), `whereVinculosRelevablesCompetencia`, `countVinculosRelevablesCompetencia`, `resolverPreciosCompetenciaMostrar`.
- **`pxListasPage.service.ts`** + **`pxListasRows.service.ts`** — listado paginado Px Listas (`PAGE_SIZE`) con vínculos por competidor por fila. Filtros: `getPxListasPageParamsSchema` + `@/lib/pxListasFiltros` (`filtroPxPromedio` en memoria). Agregados promedio/mín/máx vía `competenciaPreciosFilaResumen.ts`.
- `competenciaPrecioScraping.service.ts` — `fetch` HTML; extracción por regla del competidor (`config_extraccion` + `tipo_pagina` del vínculo): JSON-LD, selectores CSS (`.clase`, `#id`, `[id^="prefijo-"]`, `[itemprop="price"]`), regex custom; `expandirSelectoresPrecio` en `@/lib/competenciaConfigExtraccion.ts` duplica `#id-1234` → también `[id^="id-"]` para IDs distintos por producto; heurística genérica solo si no hay regla o como último método. Tras capturar texto, **`parsePrecioArgentino`** (`@/lib/parsePrecioArgentino.ts`) normaliza a **entero en pesos** (sin centavos): punto como **miles** (`179.129` → `179129`), coma como decimales opcionales (`1.234.567,89` → `1234567`). Aplica a regex, CSS y JSON-LD por igual.
- `syncCompetenciaPrecios.service.ts` — relevamiento por par producto×competidor (sugerido proveedor o scraping); devuelve también `desdeSugerido`; progreso vía callback. **`relevarVinculoCompetenciaUnico`** — mismo criterio para un solo `{ codTienda, competenciaId }` (usado desde **Asociar URLs**). **`relevarVinculosPorCodTienda`** — itera competidores con vínculo relevable para ese `codTienda` (usado desde columna ACCIONES en **Px Listas**).

### API Routes

- `POST /api/sync-competencia-precios` — body **`{ competenciaId }`** (un competidor) o **`{ todos: true }`** (todos los que tengan URL cargada; progreso acumulado); `{ codTienda? }`, `{ limiteProductos? }` opcionales. Al finalizar cada competidor, actualiza `prod_competencia.ultima_comparacion_at`. Gate `guardCompetenciaPreciosSyncEsEditor`; progreso en `import_progress` id **`competencia-precios-sync`**.
- `GET /api/sync-competencia-precios/status` — mismo gate.

Migración adicional: `20260520230000_competencia_config_extraccion` (`config_extraccion`, `tipo_pagina`).

**Nota operativa:** configurar al menos una regla **ficha** con el selector del precio visible en DevTools (`.precio-venta`, `#product-price`, `[itemprop="price"]`); sin reglas se usa heurística genérica (menos precisa).

### Contrato backend → frontend (Px. sugerido por competidor, 2026-05)

La UI de configuración de competidores **debe** permitir asignar `idProveedor` (CUID de `global_proveedores.id`). El backend ya expone y persiste el campo; la pantalla es responsabilidad del módulo frontend.

| Acción / lectura | Campo | Tipo | Notas |
|------------------|-------|------|--------|
| `listCompetenciasAction` | `idProveedor` | `string \| null` | En cada ítem de `CompetenciaParaCliente` |
| `createCompetenciaAction` | `idProveedor` | `string \| null` opcional | Zod: `prismaCuidSchema`, `""` o `null` → `null` |
| `updateCompetenciaAction` | `idProveedor` | idem | Mismo esquema que create + `id` competidor |
| `getPxListasPageData` / ítems grilla | `vinculosPorCompetencia[*].pxCompetencia` | `number \| null` | **Ya resuelto en servidor:** si el competidor tiene `idProveedor` y existe `prod_precios_provee.px_vta_sugerido` para ese `cod_tienda`, el listado devuelve ese precio con `estado = OK`; si no, precio/estado del scraping (`px_competencia` en BD) |
| `getPxListasPageData` / ítems grilla | `vinculosPorCompetencia[*].urlBloqueadaPorPxSugerido` | `boolean` | `true` cuando aplica el sugerido anterior; la UI bloquea URL en **Asociar URLs**; `guardarUrlVinculoCompetencia` rechaza alta/edición de URL en ese caso |

**Catálogo de proveedores para el selector:** reutilizar `getProveedoresMercaderia` (`src/actions/proveedores.ts`; solo `proveedor_mercaderia = true`) con el gate de permisos existente; el valor guardado es `Proveedor.id` (CUID), no `id_proveedor_dux`.

**Despliegue BD:** aplicar `20260523120000_prod_competencia_id_proveedor` en el entorno (`prisma migrate deploy`).

*Última actualización (2026-05-30): **Producto propio TiendaColor** — columna **`prod_precios_tienda.es_producto_propio`** (`20260530120000`); `setProductoPropioTienda` / `setProductoPropioTiendaAction`; no marcar si hay vínculos; `vincularProducto` rechaza si `es_producto_propio`; filtro **VINCULADO=NO** excluye propios.*

*Última actualización (2026-05-28): **Retiro comparación tienda↔competencia** — migración **`20260528210000`**: DROP `px_lista_cx_px`, `cx_px_px_comp_ref` (y temporalmente `es_producto_propio`, reintroducida en Cx Compra). **`costo_compra_cod_ext`** y **CX PROD.** en **Cx Compra**.*

*Última actualización (2026-05-28): **Px Listas** — `getPxListasPageData` en `src/actions/pxListas.ts`; URL canónica `/gestion-productos/tienda/cx-px-tienda`; permiso `PERMISOS.cxPxTienda.acceso`.*

*Última actualización (2026-05-30): **Unificación Px Competencia → Px Listas** — grilla con PX PROMEDIO, DIF TIENDA, detalle y URLs; `getPxListasPageData` incluye `competencias`; `/gestion-productos/precios-competencia` redirige a Px Listas. Scraping desde **`PxListasPageClient`** (`SincronizarCompetenciaModal` → `POST /api/sync-competencia-precios`; permiso `competenciaPrecios.editar`).*

### PDF matriz → Excel y REX (`prod_precios_rex`)

Conversión de listas en PDF con estructura matricial (filas = descripción, columnas = presentaciones) a filas tabulares. **Persistencia** en **`prod_precios_rex`** tras conversión exitosa (upsert por proveedor + descripción).

| Pieza | Ubicación |
|-------|-----------|
| Aplanado puro | `@/lib/listaPreciosPdfMatriz` — `aplanarMatrizListaPrecios`, `normalizarDescripcionPrecioRex` |
| Servicio PDF | `@/services/parseListaPreciosPdfMatriz.service.ts` — `pdfjs-dist` (legacy build), heurística posicional X/Y |
| Validación parse | `@/lib/validations/parseListaPreciosPdfMatriz.ts` |
| API parse | `POST /api/parse-lista-precios-pdf` — `multipart/form-data` (`file`, `paginaInicio` default **9**, `filasIgnorar` default **0**); gate `guardListaPreciosImportarEsEditor` |
| Persistencia REX | `@/services/prodPreciosRex.service.ts` — `upsertPreciosRexDesdeFilasPdf` |
| Vínculo lista ↔ REX | `@/services/prodPreciosRex.service.ts` — `listarPreciosRexParaVincular`, `vincularListaPrecioConPrecioRex`, **`sincronizarPxListaProveedorDesdePreciosRex`**; Actions en `prodPreciosRex.ts`; UI `VincularPrecioRexModal` desde **Lista Precios** (columna **ACCIONES**, botón **Vincular**). **Sync precio:** `px_lista_proveedor` REX → `px_lista_proveedor` lista al vincular y al guardar REX desde PDF. |
| Action | `guardarPreciosRexDesdePdfAction` en `src/actions/prodPreciosRex.ts` |
| Validación guardado | `@/lib/validations/prodPreciosRex.ts` — `guardarPreciosRexDesdePdfSchema` |
| UI | `ConvertirPdfListaPreciosModal` — proveedor obligatorio; **Iniciar Conversión** parsea + guarda; **Guardar Precios** re-upsert; **Descargar Excel** opcional |
| Test manual | `npx tsx scripts/test-aplanar-pdf-matriz.ts` |

**Presentaciones de referencia:** `Un.`, `¼`, `½`, `1 L`, `4 L`, `10 L`, `20 L`. Páginas anteriores a `paginaInicio` se omiten (índice). El símbolo **`▲`** se ignora (celda vacía / se quita del texto) vía `limpiarTextoPdfMatriz` en `@/lib/listaPreciosPdfMatriz`.

**Vercel / serverless:** precargar el worker con `@/lib/pdfjsServerLoad` (`globalThis.pdfjsWorker`) antes de `getDocument`; `next.config.ts` incluye `outputFileTracingIncludes` para `pdf.worker.mjs`. Sin eso aparece *Setting up fake worker failed*.

**Pendiente calibración:** sin PDF fixture en repo, la extracción posicional puede requerir ajuste de umbrales (`COLUMN_GAP`, `Y_TOLERANCE`) o migrar a script Python (`pdfplumber`) si el PDF real no alinea columnas.

*Última actualización (2026-06-04): **Sync DUX — dos capas** — (1) **Pasos reanudables** obligatorios: `syncListaPrecioTiendaRunStep` + `SYNC_STEP_TIME_BUDGET_MS` + estado en `sync_dux_status`; el cliente encadena POST con `continuing: true` (a más ítems, más pasos; no eliminar aunque se optimice tiempo). (2) **Pipeline** consulta/guardado en paralelo con `DELAY_MS` dentro de cada paso. Migración `20260604200000_sync_dux_status_resume`.*

*Última actualización (2026-06-04): **Px Listas — export Excel por lista** — `exportarPxListasMargenAction`; un `.xls` por `nombre_lista` con **CODIGO** + **PORC UTILIDAD** (margen desde precio efectivo).*

*Última actualización (2026-06-10): **Comp. Categorias — dto_extra_comparacion** — `calcCostoComparacion` suma `dto_extra` al dtoTotal solo en Comparacion; persistencia `prod_comp_dto_extra`; UI `CeldaDtoExtraComparacion`.*

*Última actualización (2026-06-13): **Comp. Categorias — margen manual** — tabla `prod_comp_margen_manual` (`margen_manual` entero % por `cod_ext`); `actualizarMargenManualComparacionAction`; `getProductosPorPresentacion` → `margenManualComparacion`. Input UI **DIF PX REF MANUAL** deriva px/margen en cliente. Migración **`20260613150000_comp_margen_manual`**.*

*Última actualización (2026-06-16): **Comp. Categorias — filtro competidor referencia** — `buscarOpcionesReferenciaCompetencia` acepta `competenciaId`; `listCompetidoresParaReferenciaAction` alimenta el select del modal.*

*Última actualización (2026-06-16): **Comp. Categorias — búsqueda asignar productos** — `listarProductosProveedoresParaVincular` (modal Asignar + vincular) usa AND por término en descripción, `cod_ext`, `cod_prod_prov`, marca, rubro y proveedor; post-filtro `matchByMultiTerm`.*

*Última actualización (2026-06-16): **Comp. Categorias — búsqueda referencia competencia** — `buscarOpcionesReferenciaCompetencia` usa AND por término (`recu fibr` → `recu` + `fibr` en descripción/código/competidor) vía `matchByMultiTerm`; antes buscaba la cadena literal completa.*

*Última actualización (2026-06-11): **Comp. Categorias — referencia competencia (Px Sugerido)** — `buscarOpcionesReferenciaCompetencia` une `prod_precios_competencia` + `prod_precios_provee.px_vta_sugerido` (catálogo igual cx-px-tienda); `ensureVinculoCompetenciaParaReferencia` crea fila FK si solo hay sugerido.*

*Última actualización (2026-06-10): **Comp. Categorias — múltiples referencias competencia** — tabla `prod_comp_present_refs_comp` (`presentacion_id`, `ref_cod_tienda`, `ref_competencia_id`, `orden`); migración **`20260613120000_comp_present_refs_comp`**; radio activa para margen.*

*Última actualización (2026-06-11): **Comp. Categorias — referencia competencia** — FK compuesta migrada a `prod_comp_present_refs_comp` (N por presentación). Actions `asignarReferenciaCompetenciaAction`, `quitarReferenciaCompetenciaAction(refCompId)`.*

*Última actualización (2026-06-10): **Px Competencia — catálogo explícito** — `prod_tienda.comparar_competencia`; actions `comparacionCompetencia.ts`; backfill en migración **`20260610120000`** para productos con filas en `prod_precios_competencia`.*

*Última actualización (2026-06-04): **Act. Cx. Excel** — eliminado POST DUX `item/nuevoItem`; **Act. Cx.** exporta `.xls` CODIGO+COSTO (`exportarCostoCxDiffAction`) para import manual en DUX.*

*Última actualización (2026-06-04): **Política lotes API DUX** — §1.10c: **50 ítems/lote**, **≥5 s** entre lotes (`duxApiBatchPolicy.ts`); sync lista precios. SSOT progreso sidebar en `FRONTEND_GUIDELINES`.*

*Última actualización (2026-06-04): **Sync DUX — pipeline consulta/guardado** — tras cada página DUX (50 ítems), la persistencia en Neon corre en **`Promise.all` con `delayMs(DELAY_MS)`** para usar la espera de rate limit; tiempo por página ≈ `max(5s, persistencia)` en lugar de suma. Ver `persistPaginaDuxYActualizarEstado` en `syncListaPrecioTienda.service.ts`.*

*Última actualización (2026-06-04): **Sync DUX — persistencia** — chunks de 25 ítems (3 tx: tienda/stock/precios), catálogos deduplicados, progreso await en BD, error si ningún chunk guarda; GET y POST unificados con progreso.*

*Última actualización (2026-06-04): **Sync DUX lista tienda — UX progreso** — fases `sincronizando` / `guardando` en `syncListaPrecioTiendaFromDux`; `maxDuration = 300` en POST/GET bloqueante; sidebar distingue mensajes y toast al finalizar. **Import status polling** solo con rol editor (evita 403 en logs).*

*Última actualización (2026-06-02): **PDF matriz lista precios** — parse + aplanado + API; export Excel en cliente; sin import a BD.*

*Última actualización (2026-06-16): **Import CSV lista precios — MARCA opcional** — `campoDestinoListaPreciosSchema` incluye **`marca`**; `aplicarMapeoListaPrecios` rellena `FilaListaPrecio.marca` solo si el usuario mapeó una columna; `upsertListaPrecios` persiste `prod_precios_provee.marca` en create/update únicamente cuando viene en la fila mapeada (sin mapeo no altera marca existente).*

*Última actualización (2026-06-16): **Edición masiva lista precios** — `actualizarListaPreciosMasivoAction` acepta `{ filtros, data }` y resuelve todos los `cod_ext` coincidentes (sin paginación), igual que exportación; la UI muestra el **total** del filtro, no solo la página visible.*

*Última actualización (2026-06-16): **`buscarProductosTiendaParaComparacion`** — búsqueda multi-término por contiene en **descripción / código / marca / rubro** (`contains` en BD + `matchByMultiTerm`); ej. `Recu 20` → *Membrana Recuplast Fibrado 20 kg*.*

*Última actualización (2026-07-02): **Comp. Categorias — `prod_comp_cat`** — unifica `prod_comp_dto_extra` + `prod_comp_dif_px_ref_manual` en una fila por `cod_ext` (`dto_extra`, `dif_px_ref_manual`); catálogo maestro **`CategoriaComparacion` → `prod_comp_categorias`**; helper `upsertComparacionItemParcial` en `categoriasComparacion.service.ts`; migración **`20260702120000_prod_comp_item_unify_ajustes`**.*

*Última actualización (2026-07-06): **Comp. Categorias — P2022 columna `(not available)`** — suele indicar que prod no tiene `prod_comp_item_comparados.presentacion_id` (código nuevo sin **`20260706140000`** / **`20260706150000`**). Verificar `prisma migrate deploy` en build Vercel (`DIRECT_URL`) y SQL: `SELECT column_name FROM information_schema.columns WHERE table_name = 'prod_comp_item_comparados';` debe listar **`presentacion_id`**. Respaldo idempotente: **`20260706150000_ensure_comp_item_comparados_membership`**.*

*Última actualización (2026-07-06): **Comp. Categorias — membresía en `prod_comp_item_comparados`** — productos comparados por presentación (`presentacion_id` + `cod_ext`); se elimina `prod_precios_provee.id_presentacion`; migración **`20260706140000_comp_item_comparados_membership`**; asignar/quitar vía create/delete en `ComparacionItem`.*

*Última actualización (2026-07-06): **Comp. Categorias — referencia en UI** — `asignarReferenciaCompetenciaPresentacion` persiste en **`prod_comp_item_referencia`** y devuelve `ReferenciaCompetenciaPresentacion`; `asignarReferenciaCompetenciaAction` la retorna al modal; `ComparacionCategoriasClient` actualiza la columna **REFERENCIA COMPETENCIA** al instante y recarga con `loadProductos`.*

*Última actualización (2026-07-06): **Px sugerido por competidor — helper SSOT** — `obtenerPxVtaSugeridoPorCompetenciaId(codTienda, competenciaId)` en `competenciaPxSugerido.service.ts` (lookup `prod_competencia.id_proveedor` → `obtenerPxVtaSugeridoParaCompetencia`); usado en `competenciaVinculo.service.ts` (bloqueo URL) y `syncCompetenciaPrecios.service.ts` (`relevarVinculoCompetenciaUnico`).*

*Última actualización (2026-07-06): **Auditoría esquema — DROP `prod_tienda_margen_edicion`** — tabla huérfana tras migración a `prod_tienda_precios_edicion`; modelo `ProdTiendaMargenEdicion` retirado de Prisma; script `scripts/audit-schema-columns.mjs` para futuras auditorías columna a columna.*

*Última actualización (2026-07-14): **Marketing · Calendario** — `mkt_publi.idea_detalle_id` 1:1 con ideas; al programar marca `usada` (`20260714280000_mkt_publi_idea_detalle`).*

*Última actualización (2026-07-15): **Google Sheets — export Marketing** — un proceso `exportarMktAGoogleSheets`: pestañas Secciones, Redes, Tipo de Contenido, Ideas, Publicaciones (clear+write cada una); Action `exportarMktGoogleSheetsAction`; botón **Exportar a Sheets** en Calendario.*

*Última actualización (2026-07-15): **Marketing · contenido_url** — `mkt_publi.contenido_url` (`20260715160000`); `contenido_creado` se sincroniza desde URL no vacía; form modal input URL.*

*Última actualización (2026-07-16): **Google Sheets — Contenido Multimedia / Tipo** — pestaña renombrada a **Contenido Multimedia**; nueva **Contenido Multimedia Tipo** (`mkt_contenido_drive_tipo`: `id`, `tipo`).*

*Última actualización (2026-07-16): **Google Sheets — Colores Marca** — pestaña **Colores Marca** (`mkt_colores_marca`) + entrada en **Indice**.*

*Última actualización (2026-07-16): **Colores Marca** — `mkt_colores_marca`; CRUD `/marketing/base-multimedia/colores-marca`.*

*Última actualización (2026-07-16): **Google Sheets — Indice** — pestaña **Indice** primera: catálogo hoja↔tabla + relaciones (`buildMktGoogleSheetsIndiceValues`).*

*Última actualización (2026-07-16): **Google Sheets — renombre/orden pestañas** — Publicaciones → Publicaciones Redes → Publicaciones Secciones → Publicaciones Ideas → Publi Tipo Contenido → Contenido Multimedia → Contenido Multimedia Tipo.*

*Última actualización (2026-07-16): **Rename `mkt_contenido_drive_url`** — tabla renombrada desde `mkt_contenido_url_drive` (`20260716140000`); Prisma `MktContenidoUrlDrive` sin cambio de modelo.*

*Última actualización (2026-07-16): **Google Sheets — CONTENIDO MULTIMEDIA** — pestaña desde `mkt_contenido_url_drive` (`id`, `nombre`, `descripcion`, `url`) en el mismo export.*

*Última actualización (2026-07-16): **Base Multimedia · tipos** — `mkt_contenido_drive_tipo` + FK `tipo_id` en `mkt_contenido_url_drive` (`20260716130000`); modal Gestionar Tipos.*

*Última actualización (2026-07-16): **Marketing · Base Multimedia** — tabla `mkt_contenido_url_drive` (`20260716120000`); CRUD; ruta `/marketing/base-multimedia`.*

*Última actualización (2026-07-15): **Marketing · publicaciones N:M redes** — `mkt_publi_redes` (`20260715170000`); quita `mkt_publi.red_id`; modal multi-red; objetivos/cuadro = 1 por red; export Sheets expande filas por red.*

*Última actualización (2026-07-15): **Google Sheets — probe de conexión** — ENV service account + `probarConexionGoogleSheets` / Action (solo `esEditor`); escribe `A1`; script `npm run test:google-sheets`.*

*Última actualización (2026-07-16): **Marketing · Objetivos** — UI de gestión en `/marketing/publicaciones/objetivos`; actions revalidan calendario + objetivo.*

*Última actualización (2026-07-17): **Ideas · detalle** — alta/edición solo `titulo_idea` + `detalle` (opcional); `tipo_contenido_id` nullable (`20260717160000`); redes N:M legado no se escriben desde UI.*

*Última actualización (2026-07-17): **Ideas · drop columnas** — `mkt_publi_ideas_detalle` sin `tipo_contenido_id` / `usada` (`20260717180000`); se conserva `seccion_id`; `usada` se deriva de `mkt_publi.idea_detalle_id`.*

*Última actualización (2026-07-21): **Margen Contribución · signo descuento** — `descuento_pct` negativo = descuento, positivo = recargo; fórmula `1 + %/100`; migración `20260721140000` invierte signos previos.*

*Última actualización (2026-07-22): **Margen Contribución · PX VENTA** — fórmula `PX LISTA × (1 − descuento % / 100)` (lista 100 y **−10** → venta **110**).*

*Última actualización (2026-07-23): **Margen Contribución · DESCUENTO** — restaurada convención `1 + %/100`: **−25** → venta **75** (descuento); **+10** → **110** (recargo); input `defaultNegative`.*

*Última actualización (2026-07-22): **Margen Contribución · fin_ana_mc_formulas** — parámetros configurables PX LISTA C/IVA, IVA_ALICUOTA, IIBB_ALICUOTA; motor usa `ParametrosFormulaMargenContribucion`.*

*Última actualización (2026-07-23): **Margen Contribución · CX FINANCIERO** — **FACTURA A** = CX TOTAL S/ IVA; **FACTURA C** = CX TOTAL C/ IVA.*

*Última actualización (2026-07-23): **Margen Contribución · gráfico M.C** — serie 20–200 % PORC. UTILIDAD para forma **3 CUOTAS** (`serieMcVsPorcUtilidadMargenContribucion`); marca en PORC. UTILIDAD del filtro.*

*Última actualización (2026-07-21): **Margen Contribución · orden columnas** — **EFECTIVO** antes de **DÉBITO** (`orden` en `fin_ana_cos_fina_pagos`; migración `20260721150000`).*

*Última actualización (2026-07-15): **Marketing · Objetivos** — tabla `mkt_publi_obj` (`20260715130000`); servicio/actions `mktPublicacionesObj`; un objetivo por destino; cuenta publicaciones programadas; UI de evaluación diferida.*

*Última actualización (2026-07-06): **Comp. Categorias — costo objetivo sin FK legacy** — columna `prod_ref_cod_ext` eliminada; prioridad objetivo: (1) primera referencia competencia `pxMostrar`, (2) `costo_compra_objetivo` numérico; modal «desde lista» persiste el valor en `costo_compra_objetivo` directamente.*

*Última actualización (2026-07-03): **Comp. Categorias — búsqueda referencia competencia (todos los competidores)** — con `q` no vacío, `buscarOpcionesReferenciaCompetencia` resuelve `cod_tienda` en `prod_tienda` y expande **todos** los competidores del ítem; **`listarCompetenciasConPxSugeridoPorCodTiendas`** (misma lógica que `/cx-px-tienda`, sin exigir fila previa en `prod_precios_competencia` ni join `prod_tienda.comparar_competencia` en lista); resuelve `pxMostrar` con fallback directo desde lista + `buildMapPxVtaSugerido`; devuelve solo filas asignables (`pxMostrar > 0`) tras resolver precios.*
