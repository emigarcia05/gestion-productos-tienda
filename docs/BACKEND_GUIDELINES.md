# Guía Backend — vigente

Stack: **Next.js 16 App Router**, **Prisma 7**, **Zod v4**, **iron-session**. Zona horaria de negocio: **Argentina (UTC−3)**.

**No leas este archivo entero.** Usá la tabla y saltá al § del dominio o principio que estás tocando.

| Qué estás haciendo | Leer |
|--------------------|------|
| Cualquier Action / API route nueva | **Guía para IA** + **§1.2** + patrón **§2.1–2.4** |
| Mutación crítica (borrar, sync, import, API externa) | **§1.2.3** (gate doble + excepciones) |
| Payload / IDs Zod | **§1.2.2** + **§1.2.4** |
| Error / `ActionResult` | **§1.5** |
| Prisma, Neon, índices | **§1.4** |
| Fecha / hora de negocio | **§1.3** |
| Proveedores / lista precios / descuentos / USD / REX | **§3.1–3.3** |
| Tienda, vínculos, Cx Compra, stock | **§3.4–3.5** |
| Px Listas DUX / Px Competencia / competencia | **§3.6** |
| Comp. Categorías | **§3.7** |
| Pedidos (urgente, enviar, reposición, historial, DUX, a fábrica) | **§3.8** |
| Finanzas (tesorería, gastos, balance, IVA, M.C.) | **§3.9** |
| Estadísticas / `est_por_prod` | **§3.10** |
| Marketing / Google Sheets | **§3.11** |
| Asistente IA | **§3.12** |
| Sync DUX / Route Handlers | **§3.13** |
| Tipos pintura / rendimientos | **§3.14** |
| Prohibido reintroducir | **§5** |
| IA Diseño / scraper / CSV | `docs/AGENTEIA_GUIDELINES.md` |

---

## Guía para IA

1. **Action** = sesión (`getRol` / `esEditor`) + permiso (`puede` / `PERMISOS`) + Zod (`unknown` + `safeParse`) + delegación a `src/services/`. Devolver `ActionResult`.
2. **Autorización primero.** Antes de parsear o tocar servicios. No confiar en que el layout protege la página.
3. **Prohibido `any`.** TypeScript estricto.
4. **Sin lógica de negocio pesada ni Prisma en Actions nuevas.** Legacy documentado en **§5** (tienda/stock/reposición/vínculos/tipos pintura): no copiar el patrón.
5. **Una sola entrada por operación.** No Action + API route duplicados. Jobs largos (import, sync DUX, scraping) = Route Handler.
6. **Mutaciones críticas:** gate doble módulo + `esEditor()`, salvo excepciones de **§1.2.3**.
7. **IDs:** `cuid` → `prismaCuidSchema`; UUID → `uuidSchema`; mixto → `prismaCuidOrUuidSchema` / `globalSucursalIdSchema`; `cod_ext` / `cod_tienda` → esquemas en `@/lib/validations/common`.
8. **Errores:** `{ ok: false, error: string }` controlado. No stack ni SQL al cliente. Loguear en servidor con prefijo `[modulo][fn]`.
9. **TZ:** `@/lib/fechaArgentina`. No `Date#getHours()` ni `toLocaleDateString` sin `timeZone`.
10. **Naming:** Px Competencia = `pxCompetencia*`. Px Listas DUX = `pxListasPrecios*`. Ver **§5**.
11. **Gates repetidos:** `@/lib/actionGates.ts` (finanzas / marketing / estadísticas / Asistente IA / gasto eventual). API: `@/lib/apiRouteAuth.ts`.
12. **Al cerrar:** actualizar este documento (modelo, servicio, regla o patrón). Lint: `npx eslint src --max-warnings 0`.

---

## 1. Principios

### 1.1 Server Actions (`src/actions/`)

- `"use server"` al inicio. Exports: **`export async function`**. **No** re-exportar valores de runtime (strings, Zod, constantes); dispara `invalid-use-server-value`. `export type` sí. Literales compartidos: `src/services/` o `src/lib/`.
- Rol: orquestadores I/O. Firma `async`, tipado estricto.
- **Anti-patrón:** una Action no llama a otra Action. Extraer al servicio.

### 1.2 Seguridad

#### 1.2.1 Sesión (`src/lib/sesion.ts`)

- **iron-session** vía `getSesion()`, `getRol()`, `esEditor()`.
- Roles: `"simple"` | `"editor"`. El editor se activa con `activarModoEditor` (`clave` Zod `z.string().min(1).max(500)` vs `EDITOR_PASSWORD`). Única Action de sesión. No hay “volver a simple”: cookie de arranque `tienda-app-arranque` (sin `maxAge`) + middleware fuerzan `simple` al reabrir el navegador. Rutas `/api/*` fuera del matcher del middleware.
- Usuario de pestaña: `sessionStorage` (`main-app-usuario-sesion`); **no** se persiste en iron-session ni BD. Sucursal preferida se copia de `global_personal.sucursal_por_defecto`.
- `getRol()` ante cookie inválida: `"simple"` + log `[sesion][getRol]` (no tumbar el layout).

#### 1.2.2 Checklist por Action (obligatorio, en este orden)

1. **Autorización:** `getRol()` / helper de `@/lib/actionGates` / `esEditor()` + `puede(rol, PERMISOS.*)`.
2. **Payload `unknown`** desde el cliente + `.safeParse()`. Prohibido tipar la firma con `z.infer` (el cliente ignora TS). Excepción: `FormData` o un ID `string` suelto, igual con Zod interno.
3. **IDs** según modelo Prisma (**§1.2.4**).
4. **Delegar** al servicio; `revalidatePath` de rutas canónicas; devolver `ActionResult`.
5. **Sin fugas:** `try/catch` alrededor de Prisma/servicios que puedan lanzar. Lecturas con shape vacío ante error (no stack).

#### 1.2.3 Gate doble: módulo + editor

Convención: `puede(rol, PERMISOS.<modulo>…)` **antes** de `esEditor()`. El primero rechaza acceso conceptual; el segundo rechaza modo solo-lectura.

**Excepciones (simple y editor pueden mutar):**

| Área | Qué |
|------|-----|
| Historial de pedidos | Recepción, marcar registrado, eliminar cabecera, PDF (`pedidosHistoria.ts`). Lectura: RSC o `GET /api/pedidos-historia/[id]/detalle`. |
| Pedido urgente / tintométrico / enviar / reposición / a fábrica | Upserts de cantidades, PDF generar pedido, reglas reposición. Flujo vendedor. |
| Stock / Trans. Depósitos | Encolar, exportar Excel, marcar exportado. Flujo vendedor. |
| Sync DUX lista tienda | `PERMISOS.tienda.acciones.sincronizar` (`simple` y `editor`). Solo API, no Action. |
| Ayuda vendedor · gasto eventual | `PERMISOS.ayudaVendedor.cargarGasto` (`requireCargarGastoEventual`). |

**Todo lo demás crítico** (catálogos maestros, finanzas, marketing CRUD, competencia, lista precios, usuarios, import, scraping, Google Sheets): módulo + `esEditor()`.

#### 1.2.4 IDs Prisma

| Tipo | Schema | Modelos típicos |
|------|--------|-----------------|
| CUID | `prismaCuidSchema` | `Proveedor`, `PedidoHistoria`, gastos balance, tesorería, competencia, marketing |
| UUID | `uuidSchema` | `ProdPedMerc2`, `prod_rendimientos` |
| Mixto / seed | `prismaCuidOrUuidSchema`, `globalSucursalIdSchema` | sucursales (incluye literal `suc_corporativo`) |
| `cod_ext` | `listaPreciosCodExtSchema` / `listaPreciosCodExtListSchema` | `prod_precios_provee` |
| `cod_tienda` | `listaPreciosCodTiendaSchema` | `prod_tienda` |
| FK opcional reglas | `prismaIdOptionalNullableSchema` | descuentos (`""` → `null`; CUID o UUID legacy) |

`proveedorId` en filtros: `prismaCuidSchema.optional()`. No `z.string().max(128)`.

Mapas cliente→servidor con claves FK: `z.record(prismaCuidSchema, …)` + tope de cardinalidad.

#### 1.2.5 Superficie mínima y ENV

- Action sin call sites → eliminarla (`node scripts/audit-actions-usage.mjs`).
- Toda lectura `process.env.*` listada en **`.env.example`**. Obligatorios en prod: `SESSION_SECRET`, `DATABASE_URL`.
- Google Sheets: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (normalizar `\n` con `normalizeGooglePrivateKey` en `@/lib/googleSheets.ts`), `GOOGLE_SHEETS_SPREADSHEET_ID`. Probe: servicio `probarConexionGoogleSheets` + `npm run test:google-sheets` (no hay Action de probe).

### 1.3 Integridad y zona horaria

- Todo payload que toque BD: Zod **antes** de usarse. Preferir validar en la Action; en el servicio si se reutiliza.
- **`@/lib/fechaArgentina`**: `TIMEZONE_ARGENTINA = "America/Argentina/Buenos_Aires"`. PDFs, nombres de archivo, “hoy” de negocio.
- Solo fecha calendario (`YYYY-MM-DD` sin hora, p. ej. factura DUX): parsear partes ISO (`parseIsoYmdParts`), no el TZ del runtime.

### 1.4 Arquitectura

- **Servicios** (`src/services/`): Prisma / SQL / reglas. Las Actions los invocan; no al revés.
- **Prisma / Neon:** `DATABASE_URL` = pooler (runtime `src/lib/prisma.ts`). Migraciones: `DIRECT_URL` (host sin `-pooler`) en `prisma.config.ts`.
- **URLs Gestión de Productos:** prefijo `/gestion-productos/...`. Mutaciones: revalidar la ruta canónica; se permiten rutas legacy (`/proveedores`, `/tienda`, `/stock`, `/pedidos/*`) mientras existan redirects.
- **`stockeable`:** no hay columna en `prod_tienda`. Se deriva de `prod_tienda_stock.ctd_disponible` no nulo en Guaymallén y Maipú (`computeStockeableDesdeStocks` / `whereProdTiendaStockeable` en `prodTiendaStock.service.ts`).
- **Vínculo tienda ↔ proveedor:** 100 % manual. Única relación vigente: `prod_precios_provee.cod_tienda`. Sync DUX **no** escribe `proveedor` ni auto-vincula. `prod_tienda.cod_ext` no existe.
- **Lotes DUX:** 50 ítems/lote (`DUX_API_BATCH_SIZE` / `DUX_API_PAGE_LIMIT`); pausa ≥ 5 s (`DUX_API_BATCH_INTERVAL_MS`). Timeout HTTP `DUX_FETCH_TIMEOUT_MS` (default 30 s) cubre fetch+JSON, no el backoff 429.

### 1.5 Errores y respuestas

```ts
// Actions — @/lib/types
type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// Servicios — @/types (service.types)
type ServiceResult<T = void> = { success: true; data: T } | { success: false; error: string };
```

No lanzar al cliente. `sesion.ts` puede devolver `{ ok, error? }`.

**Error boundaries RSC:** `src/app/global-error.tsx` + `error.tsx` por ruta que lea Prisma. `catch` en servicios con prefijo grepeable (`[pedidoHistoria]`, `[sesion][getRol]`, etc.).

---

## 2. Patrones de código

### 2.1 Action con gate + Zod + servicio

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireEditorFinanzas } from "@/lib/actionGates";
import type { ActionResult } from "@/lib/types";
import { crearAlgoSchema } from "@/lib/validations/algo";
import { crearAlgo } from "@/services/algo.service";

export async function crearAlgoAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = crearAlgoSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors][0] ?? "Datos inválidos.";
    return { ok: false, error: msg };
  }

  try {
    const res = await crearAlgo(parsed.data);
    if (!res.success) return { ok: false, error: res.error };
    revalidatePath("/ruta-canonica");
    return { ok: true, data: res.data };
  } catch (e) {
    console.error("[crearAlgoAction]", e);
    return { ok: false, error: "No se pudo crear." };
  }
}
```

`FormData` (alta proveedor, etc.): armar `raw` desde `formData.get(...)` y `safeParse` igual. El gate de módulo concreto (`PERMISOS.proveedores.acciones.nuevoProveedor`) va **antes** del parse.

### 2.2 Lectura sensible (permiso + Zod + shape vacío)

```ts
export async function getPxListasPreciosPageData(params: unknown) {
  const rol = await getRol();
  const vacio = await getPxListasPreciosPageDataFromDb({});
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ...vacio, items: [], total: 0, totalPaginas: 1 };
  }
  const parsed = getPxListasPreciosPageParamsSchema.safeParse(params);
  if (!parsed.success) return { ...vacio, items: [], total: 0, totalPaginas: 1 };
  return getPxListasPreciosPageDataFromDb(parsed.data);
}
```

Listados pesados de página: preferir **RSC → servicio** (sin Action) cuando el cliente no invoca la lectura.

### 2.3 Zod típico

Esquemas en `src/lib/validations/<dominio>.ts`. Comunes en `@/lib/validations/common`.

### 2.4 Helpers de gate

| Helper | Dónde |
|--------|--------|
| `requireEditorFinanzas` / `requireFinanzasLectura` / `requireCargarGastoEventual` | `@/lib/actionGates.ts` |
| `requireEditorMarketing` / `requireMarketingLectura` | idem |
| `requireEditorEstadisticas` / `requireEstadisticasLectura` | idem |
| `requireEditorAsistenteIa` / `requireAsistenteIaLectura` | idem |
| `guardTiendaListaPreciosSincronizar`, `guardFinanzasLectura`, `guardCompetenciaPreciosSyncEsEditor`, `guardListaPreciosImportarEsEditor`, `guardEstPorProdImportarEsEditor`, `guardPedidosLectura` | `@/lib/apiRouteAuth.ts` |

GET de estado y POST del mismo job: **mismo guard**.

---

## 3. Dominios

### 3.1 Proveedores y personal

**`global_proveedores`** (`Proveedor`): `id` cuid. `id_proveedor_dux` único (varios `NULL` OK; valor no nulo único). FK referenciada por `fin_compras_comprobante.id_proveedor` (`onDelete: Restrict`).

| Campo | Regla |
|-------|--------|
| `proveedor_mercaderia` | Default alta `false`; UI mercadería default SI. Filtros `/gestion-productos/*` → solo `true`. `getProveedoresMercaderia` / `getProveedoresNoMercaderia` / `getProveedores`. |
| `es_fabrica` | Opt-in. Pedido A Fáb. + retención historial 60/14 días. |
| `tiempo_entrega_en_dias` | Integer nullable 0–999. |
| `coeficiente_tintometrico` | `> 0`, hasta 6 decimales. Edición masiva: `actualizarCoeficientesTintometricosAction` (`stock.acceso` + editor). |
| `plazos_pagos` | CSV `30,60,90,…` creciente; tramos 30–150. |
| `iva` | Enum `IvaProveedor`: `SIEMPRE` \| `NUNCA` \| `PREGUNTA` (default). Transversal (también `fin_bal_gasto_final.iva`). Zod: `@/lib/validations/iva.ts`. |
| `prefijo` | Opcional; 3 letras A-Z o `null`. |

CRUD: `src/actions/proveedores.ts` + `proveedor.service.ts`. Mutaciones: `PERMISOS.proveedores.acciones.nuevoProveedor`. Lectura catálogo: al menos uno de `sugeridos` / `lista` / `importarLista`. Eliminar: servicio `deleteProveedor` (`ServiceResult`; respeta FK).

**`global_personal`:** PK `id_personal` (ID DUX). `sucursal_por_defecto` + `modulos_permitidos`. List recepción: `listGlobalPersonalAction` (`pedidos.acceso`). Login slidenav: `listUsuariosParaInicioSesionAction` (`usuarios.inicioSesion`). Update: `actualizarUsuarioPersonalAction` (`usuarios.acceso` + editor).

### 3.2 Lista de precios proveedor

Tabla `prod_precios_provee` (`ListaPrecioProveedor`). PK `cod_ext`. `px_compra_final_sin_iva` es columna **GENERATED**.

- Lectura: `getListaPreciosConOpcionesAction` — `PERMISOS.proveedores.listaPrecios` o `sugeridos` si `opciones.soloPxSugerido`. Filtros: `listaPreciosFiltrosLecturaSchema`. Mapear siempre `px_vta_sugerido` → `pxVtaSugerido`.
- Edición masiva: `actualizarListaPreciosMasivoAction` + `actualizacionMasivaListaPreciosSchema` (`edicionMasiva`). Acepta `{ ids, data }` o `{ filtros, data }` (todos los ítems del filtro, sin paginación). **No** acepta `dto_*` ni `cx_transporte` (caché del motor de reglas).
- Import: **solo** `POST /api/import-lista-precios` (`guardListaPreciosImportarEsEditor` + `importarListaPreciosProveedorSchema`). Status: mismo guard; sin permiso → 200 + idle (no 403 de poll).
- PDF matriz → REX: `POST /api/parse-lista-precios-pdf` + `guardarPreciosRexDesdePdfAction`.

**Descuentos dimensionales** (`prod_precios_provee_reglas`): los seis `dto_*` / `cx_transporte` son caché escrita **solo** por el motor (`descuentosListaPrecioReglas.service.ts`). Gana mayor especificidad (AND proveedor/marca/rubro). Anti-empate al guardar. Post-deploy: `npm run db:recalc-descuentos-lista-precio`. Actions: `gestionarReglasDescuentos` + editor. Rubros UI: distinct `prod_tienda.rubro` (`rubrosProdTienda.service.ts`).

**Desc. específico** (`desc_especial`): reglas por producto (`cod_ext` UNIQUE en puente). Suma al `dtoTotal` de la columna generated. `descEspecialReglas.service.ts` + mismo gate de reglas.

**USD:** singleton `global_cotizacion_usd` id `USD`. No se edita por ítem. `cotizacionUsd.service.ts`. `COTIZACION_DOLAR` solo fallback si no hay fila.

**REX** (`prod_precios_rex`): UNIQUE `(id_proveedor, descripcion)`. Vínculo N:1 desde lista (`id_precio_rex`). Al vincular o upsert PDF se copia `px_lista_proveedor`. Gate import/edición masiva + editor.

### 3.3 Cx Compra, vínculos, costo

URL: `/gestion-productos/tienda/comp-proveedores`. Permiso lectura/edición CX: `PERMISOS.tienda.acceso` / `cxPxTienda.acceso` (solo editor).

- `getTiendaPageData` (Action con Prisma legacy): filtros `q`, rubro, marca, `proveedor` (CUID = PROV. VINC. habilitado), `cxCompra` (CUID = CX PROD. de ese proveedor), `vinculado`.
- Vínculos: `vinculos.ts` — lecturas `tienda.acceso`; `vincularProducto` / `desvincularProducto` + `esEditor()`. Ítem tienda: `listaPreciosCodTiendaSchema`; línea lista: `listaPreciosCodExtSchema`.
- **CX PROD.:** `costo_compra_cod_ext` FK a `cod_ext`. Resolución: `mapCxProdDesdeCandidatos` (`cxPxTiendaRows.service.ts`) — FK persistida → único candidato → promedio de vínculos (`CX_PROD_SELECCION_PROM`) / espejo DUX `costo_compra`. `guardarCostoCxProdTiendaAction` (`cxPxTienda.acceso` + editor).
- **BULTO** (`prod_tienda_bultos`): 1:1 con `prod_tienda` (PK/FK `cod_tienda`). Sin fila = vacío. Entero positivo; `null` en Action borra la fila. Lectura Cx Compra: `buildMapBultosProdTienda` en `getTiendaPageData`. Reposición: `getReposicionData` incluye `bulto` (mismo mapa). Pedido A Fáb.: join `prod_precios_provee.cod_tienda` → `prod_tienda` → `prod_tienda_bultos` (sin vínculo = vacío). Mutación: `guardarBultoTiendaAction` (`tienda.acceso` + `esEditor()`). **No** entra aún en `cantPedirReposicionMerc2` (`POR_BULTO` sigue usando `cantConf`).
- `prod_tienda.proveedor`: espejo DUX **congelado** (sync no escribe). Match histórico en `costoListaTienda.service.ts`.
- Producto propio: `es_producto_propio`; no marcar si hay vínculos; `vincularProducto` rechaza si propio.
- **Act. Cx.:** `exportarCostoCxDiffAction` — Excel CODIGO+COSTO para import manual DUX (sin POST ítem).

### 3.4 Stock y transferencias

- Stock por depósito: `prod_tienda_stock` PK `(cod_tienda, id_deposito)`. Catálogo `prod_depositos_dux`. Lecturas: `prodTiendaStock.service.ts`.
- Control stock / transf.: Actions en `stock.ts` (Prisma legacy en lecturas). Permiso `stock.acceso` (simple+editor).
- **`prod_stock_transf_dep`:** no mueve stock DUX; Excel luego se importa en DUX. Ventana historial/duplicado **14 días**. Encolar + export EGRESO/INGRESO (`transfDepositos.service.ts`). Indicador slidenav: `getIndicadorSlidenavAction` (pedido agrupado por proveedor + transferencias).

### 3.5 Px Listas DUX y Px Competencia

**Px Listas** (precios venta DUX): `prod_tienda` + `prod_tienda_listas_precios` + `prod_tienda_precios`. Staging `prod_tienda_precios_edicion`. Actions `pxListasPrecios.ts` (`cxPxTienda.acceso`). CATEGORÍA MARGEN: `fin_ana_mc_cat` + lista `1 - GENERAL`. Competidor ref. GENERAL: `prod_tienda.competencia_id_px_lista_general`. Act. Px: `exportarPxListasMargenAction` (Excel + limpia staging). Filtros: `@/lib/pxListasPreciosFiltros`.

**Px Competencia** (vs competidores): `getPxCompetenciaPageData` (`unknown` + `getPxCompetenciaPageParamsSchema`) → `pxCompetenciaPage.service.ts` / `pxCompetenciaRows.service.ts`. Precio mostrado: sugerido del proveedor del competidor si existe, si no scraping (`competenciaPxSugerido.service.ts`). Filtros: `@/lib/pxCompetenciaFiltros`.

**Catálogo competidores:** `prod_competencia` + `prod_precios_competencia`. CRUD/relevamiento puntual: `competenciaPrecios.ts` (`competenciaPrecios.acceso` / `editar` + editor). Sync masivo: `POST /api/sync-competencia-precios` (`guardCompetenciaPreciosSyncEsEditor`). `idProveedor` opcional en competidor → puede saltear HTTP.

### 3.6 Comp. Categorías

Jerarquía `CategoriaComparacion` → sub → presentación. Membresía en `prod_comp_item_comparados` (`presentacion_id` + `cod_ext`). **No** hay `prod_precios_provee.id_presentacion`.

- COSTO pantalla: `calcCostoComparacion` suma `dto_extra` al dtoTotal (solo este módulo).
- `dif_px_ref_manual` en la misma fila. Referencias competencia: `prod_comp_present_refs_comp`.
- Mutaciones: `PERMISOS.comparacionCategorias.editar`. Lecturas árbol: RSC → `categoriasComparacion.service.ts`.

### 3.7 Pedidos

Permiso módulo: `PERMISOS.pedidos.acceso` (simple+editor). Ítems vivos: `prod_ped_merc` (`ProdPedMerc2`, UUID).

- Urgente / enviar / tintométrico: `pedidos.ts` + `pedidosEnvio.service.ts`. `comprobarItemsParaGenerarPedidoAction` usa el **servicio** `getItemsTablaEnviarPedido` (no la Action vecina).
- Indicador slidenav: `contarItemsPedidoPorTipoParaSlidenav` (mismos ítems que Generar Pedido, sucursal preferida) agrupa por proveedor; solo proveedores con cant. pedir > 0. `getIndicadorSlidenavAction` expone `proveedoresPedido` + totales por tipo + transferencias. Permiso `pedidos.acceso` / `stock.acceso` por bloque; sin permiso el bloque va en 0 / lista vacía.
- Reposición: `reposicion.ts` (Prisma parcial en Action). `reposicion_forma_pedido`: `UNIDADES_MAX` | `POR_BULTO` | `UNIDADES_FIJAS`. Vendedor (upsert regla): solo `UNIDADES_MAX` + `POR_BULTO`; `POR_BULTO` exige fila en `prod_tienda_bultos`. Selector de productos adicionales en `ConfigurarReposicionModal`: debe filtrar por `prod_tienda_bultos.bulto` igual al `bulto` del producto testigo (si no hay `bulto` de referencia, devolver vacío). Listados de proveedor en Reposición (filtro de página y modal Generar Pedido origen reposición): solo proveedores de mercadería con `global_proveedores.es_fabrica = false`. Pedido A Fáb. (filas `A FÁBRICA`): solo `POR_BULTO` + `UNIDADES_FIJAS`. Cálculo `cantPedirReposicionMerc2`: UNIDADES_MAX → `cantConf - stock`; CANT_FIJA_* → `cantConf`. No reintroducir `CANT_MAX` / `CANT_FIJA_POR_BULTO` como valores persistidos.
- **Historial:** cabecera `prod_ped_historial`; ítems `prod_ped_historial_merc` (writes vía `tx.pedidoHistoriaItem`). Estados `PENDIENTE` | `RECEPCIONADO`. Retención: fábrica 60 días / resto 14 (`purgarPedidosHistoriaExpirados` al inicio de cada mutación, no en lecturas). Listado: RSC. Detalle: API. Mutaciones: Actions.
- **Recepción DUX:** `registrarRecepcionCompraDuxAction`. `iva` proveedor → `tipo_comprobante` (`resolverTipoComprobantePorIva` en `exportRecepcionPedidoExcel.service.ts`). `PREGUNTA` sin decisión → `REQUIERE_DECISION_FISCAL`. Nro comprobante: `prod_ped_ult_comp`. Personal: `idPersonal` de `global_personal`. Precios netos 4 decimales.
- **Pedido A Fáb.:** `pedidoAFabrica.ts` — lectura `estadisticasProductos.acceso` (auth **antes** de Zod); upsert con pedidos **o** estadísticas. Métricas sucursales `genera_est`. Cálculos UI en `@/lib/pedidoAFabricaPromVta`. Vínculo lista↔tienda: `prod_precios_provee.cod_tienda` → `prod_tienda`. Descripción vinculada = `descripcion_tienda`; si no = `descripcion_proveedor`. BULTO solo si hay vínculo (`prod_tienda_bultos`). Filtro **PROD. VINCULADO**: SI = hay `cod_tienda`; NO = sin vínculo. FORMA PEDIR en `reposicion_forma_pedido` de filas `A FÁBRICA` (no UNIDADES_MAX). UI fábrica: labels **BULTO** / **UNIDAD**. CANT. SUGERIDA: UNIDAD → `Math.ceil`; BULTO → techo al múltiplo del bulto (sin bulto = vacío).

### 3.8 Finanzas

Lectura: `PERMISOS.finanzas.acceso`. Mutaciones de catálogo/tesorería/IVA: + `esEditor()` (`requireEditorFinanzas`).

**Comprobantes DUX** (`fin_compras_comprobante`): sync por Action editor + progreso `GET /api/sync-compras-proveedor-dux/status` (`guardFinanzasLectura`). Unique natural para upsert. Ventana ~150 días AR. `id_proveedor` = `id_proveedor_dux`. Deuda / vencimientos: `deudaProveedores.service.ts`, `vencimientosPorFecha.service.ts`. Control: `controlComprobantes.ts`.

**Tesorería:** `CajaTesoreria.tipoCaja` usa enum `TipoCajaTesoreria`. El modelo `FinTesoreriaTipoCaja` existe en schema (seed) pero **la app no lo lee**; no dropear sin decisión explícita. Cheques: `finTesoreriaCheques.ts`.

**Gastos jerárquicos:** tipo → rubro → gasto → gasto final → imputación mensual. Catálogo: `finBalGastosCatalogo.ts`. Imputaciones: `finBalGastoMensualBalance.ts`. Gasto eventual vendedor: `requireCargarGastoEventual`.

**Balance mensual** (`/finanzas/balance/mensual`): solo lectura. Resumen `resumenBalanceMensualDesdeFilas` (`src/lib/balanceMensual.ts`) con imputaciones + `fin_bal_vtas`. Ventas se editan en Ventas Mensuales (`guardarFinBalVtasCargaPeriodoAction`, editor). Sucursales `genera_balance`; costos de `centro_costo` sin `genera_balance` se reparte. UI de colores/grid: `FRONTEND_GUIDELINES` (Balance mensual).

**IVA:** import débito, saldo manual, comparación pedido. Mutaciones editor.

**Análisis M.C.:** `fin_ana_cos_fina` + fórmulas `fin_ana_mc_formulas` + categorías `fin_ana_mc_cat`. Signo descuento: `1 + %/100` (negativo = descuento). UI categorías: `reemplazarFinAnaMcCategoriasAction` (no CRUD granular).

### 3.9 Estadísticas por producto

Área Administración; URLs `/estadisticas-productos/...`. Permiso `estadisticasProductos.acceso`; mutaciones + editor.

- Hechos `est_por_prod`: unique sucursal+mes+anio+cod_tienda. Sucursales `genera_est`. **Import/verificar/borrar periodo = API** (`guardEstPorProdImportarEsEditor`), no Actions. Grilla desde `EST_POR_PROD_CARGA_DESDE` (Mayo 2026).
- Catálogos (Actions): colores, unidades, presentaciones, terminaciones. Match sobre `descripcion_tienda`.
- Categorización / Estadísticas Vtas: servicios `estCategorizacion` / `estVtas`; agregaciones de gráficos en cliente.

### 3.10 Marketing

`PERMISOS.marketing.acceso` (simple+editor lectura). CRUD + export Sheets: `requireEditorMarketing`.

- Publicaciones `mkt_publi` N:M redes; 1:1 opcional con idea (`idea_detalle_id` único). `contenido_creado` derivado de URL. Objetivos `mkt_publi_obj` (un destino).
- Ideas: sección + detalle (`titulo_idea`, `detalle` opcional). `usada` se deriva de la publicación. Tabla puente `MktPublicacionIdeaDetalleRed` se **lee** en include; la UI **no escribe** redes del detalle.
- Base multimedia + tipos + colores marca.
- **Export Sheets:** `exportarMktGoogleSheetsAction` — una corrida, sobrescribe pestañas (Indice, Publicaciones por red, catálogos). Servicio `googleSheetsExportMktSecciones.service.ts`.

### 3.11 Asistente IA

`PERMISOS.asistenteIa.acceso` (simple+editor). CRUD prompts/catálogos: `requireEditorAsistenteIa`. Tablas `prod_ia_diseno_promp`, `prod_ia_diseno_promp_var`, `prod_ia_diseno_catalogo` (kind unificado). Runtime de imagen/cuentagotas es **cliente**; el prompt vive en BD. Detalle de capas/CSV: `docs/AGENTEIA_GUIDELINES.md`.

### 3.12 Sync DUX lista tienda y APIs

Única entrada: `GET`/`POST /api/sync-lista-precios-tienda` + `…/status` + `…/cancel`. Guard `guardTiendaListaPreciosSincronizar`. Pasos reanudables: `syncListaPrecioTiendaRunStep` + estado `sync_dux_status`. Cancelación cooperativa (`running = false`); **no** actualiza `last_completed_at`. Cliente encadena POST con `continuing: true`. Persistencia por chunks; huérfanos: `limpiarHuerfanosProdTienda`.

Otras APIs: import lista, parse PDF, sync competencia, import/borrar `est_por_prod`, detalle historial pedidos. Todas con guard en `apiRouteAuth` (o el mismo criterio).

### 3.13 Tipos de pintura (`prod_rendimientos`)

Tabla en BD **sin modelo Prisma**. CRUD raw SQL en `tiposPinturaRendimientos.ts`. Lectura `tienda.tintoLts`; mutaciones + `esEditor()`. `tipo_pintura` en MAYÚSCULAS. **No** modelar como columna en `prod_tienda`.

### 3.14 Mapa Prisma → SQL (vigente)

Los ~71 modelos de `schema.prisma` están en uso (directo, `tx.` o include). Script: `npm run db:audit-schema`. El script solo cuenta `prisma.<camel>`: `PedidoHistoriaItem`, `ProdPedUltComp`, `MktPublicacionRedLink` se usan vía `tx.` / relaciones.

`prod_rendimientos` no tiene `@@map` en schema (raw SQL, **§3.13**).

---

## 4. Checklist de autocorrección

- [ ] ¿Auth primero + permiso correcto de `PERMISOS`?
- [ ] ¿Mutación crítica con `esEditor()`, o está en **§1.2.3**?
- [ ] ¿Payload `unknown` + `safeParse`? ¿IDs con el schema del modelo?
- [ ] ¿Lógica en `src/services/`? ¿Sin Action→Action?
- [ ] ¿`ActionResult` / shape vacío, sin stack/SQL?
- [ ] ¿Una sola entrada (Action **o** API)?
- [ ] ¿`revalidatePath` de la ruta canónica?
- [ ] ¿Fechas con `@/lib/fechaArgentina`?
- [ ] ¿Este § de dominio actualizado si cambió el contrato?
- [ ] `npx eslint src --max-warnings 0`
- [ ] Si tocaste Actions: `node scripts/audit-actions-usage.mjs`

---

## 5. Anti-patrones — no reintroducir

| Prohibido | Vigente |
|-----------|---------|
| `src/actions/productos.ts`, `editarProducto` / `aplicarCampoMasivo` | `listaPrecios.ts` · `actualizarListaPreciosMasivoAction` |
| `src/lib/validations/productos.ts`, `productoProveedoresPage.ts`, `getProveedoresPageData` | `listaPrecios.service.ts` / `getListaPreciosConOpcionesAction` |
| `src/lib/validations/proveedores.ts`, `pxListas.ts` (legado) | `proveedor.ts`, `pxListasPrecios.ts` |
| `importarListaPreciosProveedor` (Action) | `POST /api/import-lista-precios` |
| Action paralela de sync DUX lista tienda / `syncListaPrecioTiendaFromDux` (wrapper monolítico) | `syncListaPrecioTiendaRunStep` + API |
| `registrarControlTransfDepositosAction` | Encolar/export pendientes (`transfDepositos.service.ts`) |
| `volverModoSimple` | Cookie `tienda-app-arranque` + middleware |
| `prod_tienda.cod_ext`, `stockeable` columna, `px_lista_tienda`, `prod_listas_dux`, `prod_tienda_margen_edicion` | Vínculo manual, stock por depósito, `prod_tienda_precios` / `_edicion` |
| Pool `pg` suelto (`src/lib/db.ts`), WhatsApp API | Prisma; sin WhatsApp |
| Helpers `canEdit() => () => Promise<boolean>` | `tienePermisoEditar()` / `actionGates.ts` |
| Re-exportar constantes desde `"use server"` | `src/lib/` / `src/services/` |
| `CANT_MAXIMA` / `CANT_MAX` / `CANT_FIJA` / `CANT_FIJA_POR_BULTO` / `CANT_FIJA_POR_UNIDAD` en `reposicion_forma_pedido` | `UNIDADES_MAX` / `POR_BULTO` / `UNIDADES_FIJAS` |

**Deuda aceptada (no copiar en código nuevo):** Prisma / SQL inline en `tienda.ts`, `stock.ts`, `reposicion.ts`, `vinculos.ts`, `tiposPinturaRendimientos.ts`. Extraer a servicio si se toca en profundidad. Firmas tipadas (no `unknown`) en varios listados legacy (`comparacionCategorias`, `getPedidoUrgenteData`, etc.): al tocarlas, pasar a `unknown` + Zod.

---

## 6. Herramientas

```bash
node scripts/audit-actions-usage.mjs      # Actions sin call sites
npm run db:audit-schema                   # modelos Prisma vs prisma.*
npm run db:audit-schema-columns           # columnas sin match en src/ (heurística)
npm run db:purge-reposicion-por-bulto     # simulación limpieza REPOSICION+POR_BULTO
npx eslint src --max-warnings 0
```
