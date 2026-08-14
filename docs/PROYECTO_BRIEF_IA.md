# Briefing técnico para prompts de IA — Gestión Productos Tienda

Documento **compacto de contexto**. Pegarlo (o referenciarlo) al inicio de un prompt de agente. **No sustituye** las guías: después de este briefing, leer **solo la sección** del módulo tocado.

Índice: [`docs/README.md`](./README.md). Prompts por rol: [`.cursor/prompts.md`](../.cursor/prompts.md).

---

## 1. Qué es este sistema

App interna de una **tienda de pinturas** (operación Argentina). Unifica:

- Catálogo y precios de **tienda** (ERP **DUX**) y **proveedores**.
- Pedidos de mercadería (urgente / tintométrico / reposición), recepción y POST de compras a DUX.
- Stock multi-depósito y transferencias entre sucursales.
- Análisis de precios (listas, Cx compra, Px listas, competencia, comparación por categoría).
- Finanzas (tesorería, balance, IVA, deuda proveedores, análisis de margen de contribución).
- Marketing (publicaciones, ideas, base multimedia, colores de marca).
- **Asistente IA** de diseño de colores Alba (puente a GPT + catálogos propios).

No es un e-commerce ni un CRM genérico. Prioridad: **integridad de precios/stock**, **gates de rol** y **patrones de UI ya documentados**.

---

## 2. Stack (no improvisar versiones)

| Capa | Tecnología |
|------|------------|
| App | **Next.js 16** App Router, **React 19**, TypeScript **5.9+** estricto |
| UI | **Tailwind 4**, **shadcn/ui**, CVA, Geist, **lucide-react**, **sonner** |
| Validación | **Zod v4** en `src/lib/validations/` |
| Auth | **iron-session** (`@/lib/sesion`) — roles `simple` \| `editor` |
| Datos | **Prisma 7** + PostgreSQL (**Neon**), adapter `pg` |
| Integraciones | API **DUX** (sync productos/compras), scraping competencia, **Google Sheets**, PDF (`pdfjs` / `jspdf`), Excel (`xlsx`) |

Lint obligatorio: `npx eslint src --max-warnings 0`. **Prohibido `any`.**

---

## 3. Arquitectura (orden de implementación)

```
UI (src/app + components)
  → Server Actions (src/actions)  — sesión, rol, Zod, ActionResult
    → Servicios (src/services)    — negocio + Prisma, ServiceResult
      → PostgreSQL (prisma/schema.prisma)
```

1. Diseñar contrato (**Zod** + `ActionResult`) **antes** de la UI.
2. Implementar: Prisma/servicios → Actions → UI.
3. Cerrar actualizando la guía del área. **Sin docs alineados, la tarea está incompleta.**

| Capa | Contrato | Ubicación |
|------|----------|-----------|
| Action | `ActionResult<T>` = `{ ok: true, data } \| { ok: false, error }` | `@/lib/types` |
| Servicio | `ServiceResult<T>` = `{ success: true, data } \| { success: false, error }` | `@/types/service.types` |
| Permisos | `Rol`, `PERMISOS`, `puede(rol, PERMISOS…)` | `@/lib/permisos` |
| Sesión | `getSesion()`, `getRol()`, `esEditor()` | `@/lib/sesion` |

**Actions:** `"use server"`; solo `export async function` (no re-exportar constantes/Zod: `invalid-use-server-value`). Payload del cliente como `unknown` + `.safeParse()`. **No** lógica pesada ni Prisma directo (salvo legacy documentado). **No** throw al cliente. **No** anidar Action→Action.

**API Routes** (`src/app/api/`): superficie mínima — sync DUX, import lista/estadísticas, parse PDF, detalle historial. Auth con `@/lib/apiRouteAuth`. No ampliar sin justificar en BACKEND §1.2.6.

---

## 4. Áreas de producto y URLs

Tres áreas en slidenav (`@/lib/main-app-areas.ts`):

| Área UI | `MainAppAreaId` | Entrada | Password editor |
|---------|-----------------|---------|-----------------|
| **Vendedor** | `gestion-productos` | `/` (hub vacío) | No |
| **Administración** | `finanzas` | `/finanzas` | Sí (`EDITOR_PASSWORD`) |
| **Marketing** | `marketing` | `/marketing` | No |

**Rewrites:** las URLs canónicas de Vendedor / Análisis de Precios viven bajo `/gestion-productos/...` (`GP_ROUTES` en `@/lib/gestionProductosRoutes.ts`) y reescriben a `src/app/*` (`GP_INTERNAL`, `next.config.ts`). Al navegar usar **rutas canónicas**; al abrir archivos, las carpetas internas (`/pedidos`, `/tienda`, `/proveedores`, …).

**Análisis de Precios** se muestra en sidebar de **Administración**, pero las URLs siguen en `/gestion-productos/analisis-precios/...`. **Estadísticas Productos** (`/estadisticas-productos`) y **Pedido A Fáb.** (`/pedido-a-fabrica`) también son Administración.

Mapa rápido Vendedor (canónica → interna):

| Módulo sidebar | Canónica (aprox.) | `src/app` |
|----------------|-------------------|-----------|
| Pedido mercadería | `/gestion-productos/pedido-mercaderia/...` | `/pedidos/{enviar,urgente,tintometrico,reposicion,historial}` |
| Ayuda vendedor | `.../ayuda-vendedor/px-venta/...`, `calc-litros`, `cargar-gasto` | `/proveedores/sugeridos`, `/tienda/{tintometrico,litros}`, `/cargar-gasto` |
| STOCK | `.../control-stock`, `.../transf-depositos` | `/stock`, `/transf-depositos` |
| Asistente IA | `.../asistente-ia/...` | `/asistente-ia/...` |
| Análisis precios | `.../analisis-precios/...` | `/proveedores/lista-precios`, `/tienda`, `/tienda/px-listas`, `/tienda/cx-px`, `/proveedores/comparacion-categorias` |

---

## 5. Auth y seguridad (invariantes)

- Roles: **`simple`** (vendedor) y **`editor`** (Administración con clave). El usuario de pestaña (`sessionStorage`, `@/lib/usuarioSesion`) **no** va en iron-session ni BD.
- Al **cerrar el navegador**, middleware + cookie `tienda-app-arranque` fuerzan rol **`simple`** de nuevo. Única Action de sesión: `activarModoEditor`.
- **Toda** Action invocable desde el cliente valida `getRol()` + `puede()` **antes** de parsear/servicios. No confiar en el layout.
- Mutaciones críticas en módulos con lectura para `simple`: **gate doble** `puede()` **y** `esEditor()`. Excepción documentada: recepción/eliminación en historial de pedidos (simple + editor).
- IDs: modelos usan **`cuid`** salvo tablas con `@default(uuid())`. Validar con `prismaCuidSchema` / `uuidSchema` / schemas de `cod_ext` / `cod_tienda`. **No** mezclar `.uuid()` donde el id es CUID.
- Zona horaria de negocio: **`America/Argentina/Buenos_Aires`** (`@/lib/fechaArgentina`). Fechas `@db.Date`: exponer con `isoYmdFromPrismaDateOnly`, no con conversión AR sobre el `Date` UTC.

Checklist Action: BACKEND **§1.2.2** y **§4**. Patrones de auditoría: **§1.2.5**.

---

## 6. Dominios de datos (prefijos físicos)

Prisma mapea nombres TS estables a tablas prefijadas. **No** renombrar modelos TS al azar; el rename físico ya ocurrió.

| Prefijo SQL | Dominio | Ejemplos de modelo TS |
|-------------|---------|------------------------|
| `global_*` | Maestros | `Proveedor` → `global_proveedores`, `Sucursal` → `global_sucursales`, `GlobalPersonal`, `GlobalCotizacionUsd` |
| `prod_*` | Productos, precios, pedidos, stock | `ProdTienda` (`cod_tienda` PK), `ListaPrecioProveedor` (`prod_precios_provee`, PK `cod_ext`), `PedidoHistoria`, `ProdPedMerc2`, `ProdTiendaStock` |
| `fin_*` | Finanzas | `CajaTesoreria`, `ComprobanteProveedor` (`fin_compras_comprobante`), `FinBalVtas`, catálogo gastos, tesorería cheques, análisis M.C. |
| `mkt_*` | Marketing | publicaciones, ideas, Drive, colores marca |
| `prod_ia_diseno_*` | Asistente IA | prompts, variables, catálogos de diseño |

Entidades núcleo:

- **`ProdTienda`**: catálogo DUX. PK `cod_tienda`. Vínculo a proveedor = **manual** vía `prod_precios_provee.cod_tienda` (campo `proveedor` de DUX **congelado**; `cod_ext` de tienda **eliminado**). `stockeable` es **derivado** de `prod_tienda_stock`, no columna. `costo_compra_cod_ext` = CX elegido (el sync DUX no lo pisa).
- **`ListaPrecioProveedor`**: lista proveedor; `cod_ext` se arma con prefijo (o `codigo_unico` si prefijo null).
- **`Proveedor`**: flags `proveedor_mercaderia`, `es_fabrica`, política `iva` (`SIEMPRE` \| `NUNCA` \| `PREGUNTA`), plazos, tiempo de entrega. `id_proveedor_dux` unique (FK de comprobantes).
- Stock: `prod_depositos_dux` + `prod_tienda_stock`. Transferencias: `prod_stock_transf_dep`.
- Pedidos: sucursales con `pedido = true` (no hardcodear Guaymallén/Maipú en UI de mercadería).

Reglas de dominio: buscar el **§** en `BACKEND_GUIDELINES` (vinculación §1.4.2, listas DUX §1.4.3, stock §1.4.5, descuentos §1.8d, tintométrico §1.11, IVA proveedor §1.11d, balance §2.5f, pedidos §2.5/2.6, competencia al final del doc).

---

## 7. UI — patrones que no se reinventan

Leer `FRONTEND_GUIDELINES.md` **Guía para IA** + sección del módulo. Checklist PR **§4**.

| Necesidad | Usar |
|-----------|------|
| Combinar clases | `cn()` de `@/lib/utils` — nunca template literals en `className` |
| Tokens | `bg-card`, `text-foreground`, `border-border`, … — nunca `bg-white` / `slate-*` / `emerald-*` / `amber-*` |
| Éxito/aviso | `@/lib/ui-classes` (`CALLOUT_WARNING_CLASS`, `TEXT_WARNING_CLASS`, …) |
| Página filtros+tabla | `ClassicPageHeader` / `ClassicFilteredTableLayout` + `FilterBar` |
| Búsqueda debounce | `useFiltrosConBusqueda` + `FiltroBusquedaInput` |
| Tabla | `Table` de `@/components/ui/table` (`.tabla-gestion-compacta`); no `<table>` crudo salvo excepciones documentadas |
| Modal | `AppModal` / `ModalTablaConFiltros`; botones = `Button` shadcn |
| Cascarón fullscreen | `.area-page-shell` |
| Paginación | 100 filas (`PAGE_SIZE`); `PaginacionTabla` (URL) o `PaginacionClient` |
| Celdas vacías | string vacío (`fmtCelda`); **no** `"-"` / `"—"` |
| Desktop-only | **sin** `sm:` `md:` `lg:` etc. |

Convenciones de copy: módulos sidebar **MAYÚSCULAS**; submódulos **Title Case**; thead **MAYÚSCULAS + negrita**; abreviaturas con punto (**Px., Cx., Dto.**). Botones/modales en Title Case.

Shared SSOT: `src/components/shared/` (documentar altas en FE §3.1). Constantes de clases: `@/lib/ui-classes`.

Excepción de color: **Balance mensual** usa hex de informe (`#0072BB`, etc.) — no extrapolar.

---

## 8. Integraciones y jobs

- **DUX GET** lista tienda: `POST/GET /api/sync-lista-precios-tienda` (+ status/cancel). UI: `SyncStatusIndicator` + `DuxSyncStyleButton`. Cancelación cooperativa; no actualiza `last_completed_at`.
- **DUX POST compras**: recepción de pedido → registrar comprobante (no Excel como canal de registro). SSOT: `prepararRecepcionCompraDatos`. Lotes/pausa: BACKEND §1.10c.
- **Competencia:** scrape URLs + px sugerido de proveedor; contrato en BACKEND (sección Comparación de precios). Grilla canónica = **Px Competencia** (`/tienda/cx-px`), no reintroducir grilla standalone.
- **IA Diseño:** 5 capas (CSV oficial scraper → enriquecimiento determinista → `colores_alba_ia.csv` → prompt GPT → UI). Pipeline: `npm run ia-diseno:pipeline`. Guía: `AGENTEIA_GUIDELINES.md`. No editar CSV oficiales a mano.

---

## 9. Qué no hacer (anti-patrones recurrentes)

1. Leer enteras `FRONTEND_GUIDELINES.md` / `BACKEND_GUIDELINES.md` — **buscar el §**.
2. Inventar clases globales, layouts “dashboard”, o una segunda variante de tabla.
3. Poner negocio, Prisma o auth en Client Components.
4. Confiar solo en ocultar botones: las Actions se invocan sin UI.
5. Vincular tienda↔proveedor por texto DUX o reintroducir `cod_ext` en `prod_tienda`.
6. Comparar `submodulo` de Asistente IA con `===` (es case-insensitive).
7. Usar `dateToIsoYmdArgentina` sobre columnas `@db.Date`.
8. Ampliar `/api/*` o dejar status de sync público sin gate.
9. Cambios estructurales grandes sin preguntar; ADRs de IA Diseño cerrados no se reescriben (nuevo ADR).
10. Entregar código sin actualizar la guía del área.

---

## 10. Mapa de lectura por tipo de tarea

| Tarea | Leer |
|-------|------|
| Cualquiera | Este briefing + `docs/README.md` |
| UI | FE: Guía para IA + módulo + §3.1 shared + Checklist §4 |
| Action / servicio / Prisma | BE: §1 principios + § del dominio + §2.1 patrón Action + §4 checklist |
| Auth / mutación | BE §1.2.x |
| Pedidos / recepción / DUX POST | BE §2.5, §2.6, §2.8–2.9a; FE componentes `pedidos/` |
| Balance / `fin_bal_vtas` | BE §2.5f; FE subsección Balance mensual |
| Stock / transf. depósitos | BE §1.4.5–1.4.6; FE módulo STOCK |
| Px Listas / Competencia | FE módulos al final; BE competencia + §1.4.3 |
| Asistente IA / colores | `AGENTEIA_GUIDELINES.md` → `IA_DISEÑO/REGLAS_NEGOCIO.md` si cambia el asesor |
| Auditoría | `.cursor/auditoria_promp.md` + hallazgos FE §5 / BE §5 |

Agentes listos para copiar: `.cursor/fullstack_promp.md`, `front_promp.md`, `back_promp.md`, `auditoria_promp.md`. Completar `Módulo/ruta` y `Objetivo`.

---

## 11. Criterio de hecho

Código estable + flujo tocado verificado + guía del área actualizada + lint limpio.

*Última actualización: 2026-08-14 — alta del briefing compacto para prompts.*
