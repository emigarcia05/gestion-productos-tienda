# Guía de Frontend — Auditoría y Convenciones

Documento vivo: se actualiza con cada corrección o patrón detectado en auditorías. Stack: **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, **shadcn/ui**, **Geist**, **lucide-react**, **sonner**.

---

## Guía para IA (crear o modificar código frontend)

**Cuando crees o modifiques cualquier código frontend en este proyecto, usa este documento como única referencia.** Antes de proponer o escribir código:

1. **Consultar esta guía**  
   Revisa las secciones 1 (Patrones), 2 (Clases globales), 3 (Reglas técnicas) y 4 (Checklist PR). Aplica los patrones existentes; no inventes estilos ni estructuras nuevas que rompan la convención.

2. **Estilos**  
   - **Nunca** uses `bg-white`, `text-slate-*`, `bg-slate-*`, `border-slate-*`. Usa **siempre** tokens: `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, `bg-primary`, etc.  
   - **No** uses utilidades de paleta genérica (`emerald-*`, `amber-*`, `blue-*`, etc.) para éxito, advertencia o resaltados: usá **`@/lib/ui-classes`** (`BADGE_SUCCESS_TINT_CLASS`, `TEXT_SUCCESS_CLASS`, `TEXT_WARNING_CLASS`, `ICON_WARNING_INTERACTIVE_CLASS`, `IMPORT_STAT_BADGE_CLASSES`) o tokens **`primary`**, **`accent`**, **`accent2`** (amarillo de marca) en combinación con `cn()`.  
   - **Excepción acordada**: la pantalla **Balance mensual** (`FinanzasBalanceMensualPageClient`) usa **hex fijos de informe** en el encabezado de la grilla (`#0072BB` + texto blanco) y en las filas de **resultado operativo / resultado ejercicio** (fondo `#a9d6f1`, texto `#063652`). No extrapolar este patrón a otras pantallas sin actualizar esta guía. Detalle en la subsección **Balance mensual** bajo `ClassicFilteredTableLayout`.  
   - **Siempre** combina clases con `cn()` de `@/lib/utils.ts`. **No** uses template literals en `className` (ej. `` className={`${x} ...`} ``), incluyendo el `body` de `layout.tsx`.  
   - Ejemplo correcto: `className={cn("flex gap-2", isActive && "bg-primary/10")}`.
  - **Tarjeta envoltorio de tabla**: cuando la grilla principal vaya dentro de un `Card` (ej. Comp. Proveedores, `/pedidos/enviar`), usar clase global **`card-tabla-envoltorio`** en el **`Card`** de shadcn; la sombra sale de **`--card-tabla-envoltorio-shadow`** en **`globals.css`**. Si la card debe crecer en un flex column (p. ej. proveedores), usar **`className={cn("card-tabla-envoltorio", "flex-1")}`**. En páginas que no usan `Card` (ej. Pedido Urgente / Tintométrico), aplicar directamente `.contenedor-tabla-gestion` como en Comp. Proveedores. **No** repetir utilidades largas ni **`shadow-[0_4px_12px_rgba(0,0,0,0.05)]`** (valor mágico duplicado).

3. **Texto en mayúscula inicial (title case)**  
   - **Títulos de modales** y **textos de botones**: cada palabra con primera letra en mayúscula. Ejemplos: "Importar Lista De Precios", "Nueva Importación".  
   - **Sidebar**: nombre del **módulo** en MAYÚSCULAS (ej. "LISTA PROVEEDORES", "PEDIDO MERCADERÍA"). Nombre del **submódulo**: primera letra de cada palabra en mayúscula (title case) (ej. "Lista Precios", "Control Aumentos", "Pedido Urgente", "Px. Vta. Sugeridos").  
   - Encabezados de página (SectionHeader/ClassicPageHeader): title case. Aplicar también a `title`/`aria-label` cuando sean etiquetas de UI.
4. **Abreviaciones con punto**  
   - Toda abreviatura en la UI (encabezados, labels, placeholders, tooltips, nombres de archivo generados) debe terminar en punto. Ejemplos: Px., Cx., Dto., Desc., Cant., Prov., Cod., Cód., Sug., Disp., Ext., Transp., Finan., Vta., Comp., Cat., Últ., Mín., Act.
5. **Mayúsculas en filtros y tablas**  
   - **Filtros**: contador de resultados (ej. "X PRODUCTO(S)", "X ÍTEM(S)"), `aria-label` del FilterBar ("FILTROS DE BÚSQUEDA") y placeholders de búsqueda en mayúsculas (ej. "BUSCAR POR DESCRIPCIÓN O CÓDIGO...").  
   - **Opciones de filtros desplegables**: placeholders de Select (PROVEEDOR, MARCA, RUBRO, etc.) y opciones por defecto (PROVEEDORES, TODAS, SELECCIONAR, etc.) en MAYÚSCULAS.  
  - **Encabezados de tablas**: todo el texto de `<TableHead>` en MAYÚSCULAS (ej. PROVEEDOR, DESCRIPCIÓN, CANT. PRODUCTOS). Las abreviaciones en mayúsculas también llevan punto (PX., CX., DTO., etc.).
  - **Columnas de selección** (checkbox/tilde): el encabezado debe ser una **tilde** (ícono `Check`), no texto alternativo como “SELECCIÓN”.
6. **Nueva página con filtros y tabla**  
   - Estructura: `SectionHeader` o `ClassicPageHeader` → `FilterBar` (con `filtros-contenedor-tienda bg-card`) → contenido (tabla con `<Table variant="compact">`).  
   - Si la página tiene **input de búsqueda con debounce**: usa el hook `useFiltrosConBusqueda` y el componente `FiltroBusquedaInput` (ver sección 1, punto 3). No reimplementes debounce ni restauración de foco.  
   - Selects de filtros: `FILTER_SELECT_WRAPPER_CLASS`, `SELECT_TRIGGER_FILTER_CLASS`, `SelectContent` con `position="popper" side="bottom" align="start" className="select-content-filtro"`.  
   - Contador de resultados: `cn(FILTER_COUNT_CLASS, "ml-auto")` si va alineado a la derecha; texto del contador en MAYÚSCULAS (PRODUCTO(S), ÍTEM(S), etc.).

7. **Nuevo modal con tabla**  
   - Usar `ModalTablaConFiltros` de `@/components/shared/ModalTablaConFiltros.tsx` (single o multi selección). Para modales genéricos: `AppModal` de `@/components/shared/AppModal.tsx` con cuerpo `bg-card`.
   - Micro-etiquetas de campo en modales densos: **`ModalMicroLabel`** (`@/components/shared/ModalMicroLabel.tsx`, CVA `align`).
   - `AppModal` (wrapper estándar) expone variantes con **CVA** para evitar duplicación de clases:
     - `size`: `"sm" | "md" | "lg" | "xl"` (default `"md"` = `sm:max-w-lg`).
     - `padding`: `"sm" | "default" | "lg"` (default `"default"`).
     - `scrollBody`: `boolean` (default `true`) controla el overflow del cuerpo sin reescribir clases.
     - `hideBodyScrollbars`: `boolean` (default `false`) — con `scrollBody`, oculta barras del área gris (`.app-modal__scroll-area`) y de la card (`.app-modal__body`); ver `globals.css`.
     - `bodyShellClassName`: `string?` — se combina con el `div` gris que envuelve la card (`p-4` por defecto). Ej. `p-1.5 sm:p-2` en modales compactos (`VincularModal`).
   - Cuando el modal tiene una **tabla + bloque inferior fijo** (ej. resúmenes como `TOTAL PEDIDO`), el contenedor de tabla debe consumir el espacio con `flex-1 min-h-0` y **no** debe forzarse con `h-0` u otros height absolutos. Además, como `.contenedor-tabla-gestion` tiene `height: 100%` en `globals.css`, si la cascada lo impide, sobrescribir de forma garantizada con `style={{ height: "auto" }}` (y aplicar `min-h-0 overflow-hidden` en el wrapper inmediato) evita solapes/recortes y deja el scroll exclusivamente en la tabla.
   - Si necesitás alinear un bloque inferior con las mismas columnas de la tabla, **no** usar `grid-cols` con porcentajes que superen 100%. Usar `fr` proporcionales que sumen el mismo total que la tabla, o preferir **`TableFooter` (`<tfoot>`) dentro del mismo `<Table>`** con `colSpan` en las columnas previas. **`PedidoHistoriaDetalleModal`:** totales **TOTAL PEDIDO** en **`<section aria-label="Totales del pedido">`** + **grid** **`5fr_55fr_10fr_15fr_15fr`** **fuera** del **`data-slot="table-container"`** (ver punto 7).
  - **`PedidoHistoriaDetalleModal`:** título visible del modal (AppModal): **Recepcion Pedido**. `AppModal` `sm:max-w-[62.4rem]` (≈ +30% sobre 48rem). Tabla **5% + 55% + 10% + 15% + 15%**: columna **lista de verificación** (icono **Check** en cabecera; por fila **`<Input>`** vacío **`readOnly`**, **`tabIndex={-1}`**, **`pointer-events-none`**, `aria-label="Lista de verificación"` — **no** se escribe a mano): **OK** (`aria-label="OK"`, **Check**) copia **CANT. PEDIDA** en **CANT. RECIBIDA** y marca verificado → ícono **Check** en **`rounded-full bg-primary/20`** (tamaño compacto), fila verificada **`recepcion-fila-verificada`**: fondo gris intermedio neutro vía **`tabla-recepcion-pedido`** en `globals.css`, **`cursor-not-allowed`**, texto legible (**`text-foreground`**, descripción **`font-medium`**); pendiente **`recepcion-fila-pendiente`**: cebra estándar; **OK** deshabilitado si ya verificado; **Editar** copia **CANT. PEDIDA** en **CANT. RECIBIDA**, limpia verificación y deja la fila en modo edición para ajustar la cantidad; **Cesto** persiste **0** en cant. recibida y marca verificado; la cantidad editada solo se confirma con **Confirmar Edición** (check junto al input); si el valor cambió y el input pierde el foco, se muestra aviso y se reenfoca (no se persiste en estado sin ese check); mientras hay edición abierta, **`inert`** en resumen, alta, pie de totales, **`thead`** y filas que no editan, más footer deshabilitado e **`onOpenChange`** que impide cerrar (X, overlay, Escape) hasta confirmar; **DESCRIPCIÓN**, **CANT. PEDIDA**, **CANT. RECIBIDA**, **ACCIONES**; sin **COD. TIENDA** (`title` en descripción con código si existe). (1) Resumen: **dos columnas** en `sm`: bloque proveedor / metadatos **~85%** y columna **FECHA FACTURA** ~**15%** (`GRID_CAPAS_SUP_PEDIDO_HISTORIA` = `85fr_15fr`; sin `div` hueco `hidden sm:block`). Grid del resumen: **`items-center`** (alineación vertical entre columnas en todos los breakpoints). Columna proveedor: **`justify-center gap-0.5 py-0`** (sin **`mt-0.5`** en el segundo párrafo; el aire entre líneas es el **`gap-0.5`** del `flex-col`). Columna fecha (`<label>`): **`flex flex-col justify-center gap-0.5 py-0 px-0 text-left`**; micro-etiqueta **`leading-tight text-left`**. (2) Contenedor **grid** que envuelve la fila de alta + tabla de ítems: **`grid-cols-1`** **`grid-rows-[auto_minmax(0,1fr)]`** **`gap-x-3`** **`gap-y-0`** (sin espacio vertical entre fila de búsqueda y tabla; **`gap-x-3`** = separación horizontal vía *column-gap*). Fila **Agregar producto** (filtrar ítems de la tabla + abrir alta): **`flex`** — bloque izquierdo **`FiltroBusquedaInput`** (placeholder **BUSCAR POR DESCRIPCIÓN...**, input **`h-10 min-h-10`**) + **`LimpiarFiltrosButton`**; bloque derecho botón **Agregar Producto** **`h-10 min-h-10`**; ancho acotado en escritorio (`sm:max-w-[36rem]`) para separar visualmente de la acción de alta (`sm:flex-row` **`justify-between`** **`items-center`** **`gap-x-10`**; móvil **`flex-col`** **`gap-3`**). La **CANT.** del producto nuevo solo se ingresa en **`AgregarProductosModal`**. La sección de alta tiene título **AGREGAR PRODUCTO A LA RECEPCIÓN** (`<span>` `MODAL_MICRO_LABEL_CLASS` + **`text-foreground`** (título en color principal, no muted) + **`p-0 m-0 mb-1 box-border block w-full text-center font-bold`**); la `<section>` usa **`flex flex-col gap-0 pt-0 pb-1.5 pr-3 pl-0 sm:pt-0 sm:pb-2 sm:pr-4 sm:pl-0`** (mismo padding horizontal que el panel resumen del modal; sin **`gap`** entre título y grid salvo el **`mb-1`** del título) y **`aria-labelledby`** al `<span>`. Contenedor **columna** principal del cuerpo del modal: **`gap-0`** entre el **resumen** y el **grid** (alta + tabla), para evitar hueco vertical excesivo. Panel resumen (envoltorio grid proveedor + **FECHA FACTURA**): **`pr-3 pl-0 pt-0 pb-0 sm:pr-4 sm:pl-0 sm:pt-0 sm:pb-0`** (solo padding derecho; sin **`pl`** ni **`pt`**; **`pb-0`**). Sección **AGREGAR PRODUCTO A LA RECEPCIÓN**: **`flex flex-col gap-0 pt-0 pb-1.5 pr-3 pl-0 sm:pt-0 sm:pb-2 sm:pr-4 sm:pl-0`** (homologado al envoltorio del resumen); separación título ↔ fila: **`mb-1`** en el `<span>`. Celdas del grid solo **`py-0`** (sin **`px-*`**). El acople con el resumen sigue con **`gap-0`** en la columna del modal. **`GRID_CAPAS_SUP_PEDIDO_HISTORIA`**: **`gap-2`** en columna única / **`sm:gap-0`**. (3) Bloque **Ítems del pedido**: `<section aria-label="Ítems del pedido">`; `<Table>` solo **`thead` + `tbody`** (sin **`tfoot`**). **`.contenedor-tabla-gestion`** **`flex flex-col`** **`overflow-hidden`**: solo un hijo **`div`** **`flex-1 min-h-0 overflow-x-hidden overflow-y-auto`** envuelve la **`<Table>`** (scroll no cubre totales). **`<section aria-label="Totales del pedido">`** es **hermana** de ese **`div`** (fuera del **`overflow-y-auto`**), con **`GRID_PEDIDO_HISTORIA_TABLA_COLS`**, **`min-w-0` `items-center`**, **`border-t border-border`**, **`bg-background`**, **`shrink-0`**, padding horizontal como el panel resumen (**`pr-3 pl-0 sm:pr-4 sm:pl-0`**) y **`py-2`**: sin celdas huecas; **`col-start-4`** **TOTAL PEDIDO** (`text-sm font-semibold tabular-nums`), **`col-start-5`**: **`celda-datos celda-datos--flush-left`** **`flex`** **`items-center`** **`justify-start`** **`gap-0`** **`border-b-0`** (**.celda-datos--flush-left** fuerza **`padding-left: 0`** frente al shorthand **`padding`** de **`.celda-datos`**). (**sin** **`tabla-bloque-secundario-cell-divider`** en el pie; la columna **ACCIONES** del **`tbody`** sigue usando el divisor). **`Input`** **`ml-0` `h-9` `w-full` `min-w-0` `pl-0` `pr-3` `py-1`** (base **`Input`**: **`pl-3 pr-3`** para que **`tailwind-merge`** resuelva **`pl-0`**; distinto de **FECHA FACTURA**, que usa **`px-3`** en el propio campo); **`text-center`** **`font-semibold`** **`tabular-nums`**; **`inputBorderClassName`**; `inputMode="decimal"` `autoComplete="off"`). `MODAL_SECTION_CARD_CLASS` = `bg-transparent`. `fechaRecepcion` sin persistencia backend hasta definir campo. **Flujo secuencial** (pedido no **RECIBIDO**): foco inicial en **`FECHA FACTURA`** (`ref`); sin fecha (`value` vacío) la sección **AGREGAR PRODUCTO** y la tabla llevan **`pointer-events-none` `opacity-50` `cursor-not-allowed`** y controles **`disabled`**; con fecha habilitados alta y tabla. **Total Pedido** (`aria-label="Total Pedido"`) **`disabled`** hasta que exista al menos una fila y **todas** tengan checklist confirmado. **`cargarDetalle`** (tras `getPedidoHistoriaDetalleAction`) **no** debe anular **`cantRecibida`** en ítems cuando el pedido está en **SIN RECEPCION**: los valores vienen del servidor y deben conservarse al refrescar (p. ej. tras **Agregar Producto**) para no borrar cantidades ya guardadas. Tras alta por **`agregarPedidoHistoriaItemAction`**, la fila nueva queda con checklist confirmado en cliente (la cant. recibida se ingresó y persistió en el alta); el foco vuelve al filtro de búsqueda de **AGREGAR PRODUCTO**. Botón principal **Registrar En Dux** habilitado solo con fecha, checklist completo en todas las filas y total normalizado **> 0**; tras éxito cierra el modal (`onOpenChange(false)`).

8. **Tablas (encabezado fijo + paginación)**  
   - **Un solo diseño** para toda la app (referencia: Comp. Proveedores). Siempre usar `Table` de `@/components/ui/table`; aplica la clase `.tabla-gestion-compacta`. No usar `<table>` en crudo ni otras clases de tabla. Encabezados (`TableHead`) en MAYÚSCULAS. No sobrescribir padding ni altura en celdas (el diseño global manda).
  - **Altura de encabezado (obligatorio y global):** todos los `th` de tablas con `.tabla-gestion-compacta` deben usar **siempre** la misma altura fija definida en `globals.css` (`--tabla-thead-height = 2.125rem`), valor tomado de la tabla de **Comp. Proveedores**. Este alto corresponde a **2 líneas** de texto y se aplica aunque una tabla tenga títulos de una sola línea; no se permite altura dinámica por tabla.
   - **Pie de totales fijo** (patrón `contenedor-tabla-gestion--pie-fijo`): en scroll, `scrollbar-gutter: stable` (`globals.css`). **Tesorería** y **Balance · Gastos** bajan los totales con **`.finanzas-resumen-tarjeta`** (borde #0072bb, contenido centrado) bajo el área con scroll, **sin** segunda `<table>` de pie. Cuando haga falta alinear un **pie** con las mismas columnas que el cuerpo, se puede usar una **segunda** `<table>` en **`.contenedor-tabla-gestion--pie-fijo-pie`** + **`usePieFijoColumnWidthsSync`** (`src/lib/hooks/usePieFijoColumnWidthsSync.ts`): ref en **`.contenedor-tabla-gestion--pie-fijo-scroll`**, ref en la `<table>` del pie, mismo número de `<col>` que de `th`. **`TablaGastos`:** `<table>` en crudo, totales en tarjetas; **`TablaTesoreriaCajas`:** `Table` de shadcn, totales en **una** tarjeta **TOTAL** + monto.
   - **Encabezado fijo (obligatorio)**: el encabezado de la tabla debe estar fijo y **no moverse con el scroll**. `TableHeader` (`<thead>`) usa **`sticky top-0 z-20`** y **`bg-primary`** (fondo opaco); `TableHead` (`<th>`) añade **`sticky top-0 z-20`**. **`globals.css`** (`.tabla-gestion-compacta thead th`) refuerza **`position: sticky`**, **`top: 0`** y **`z-index: 20`**. **Crítico:** el wrapper **`data-slot="table-container"`** del componente **`Table` no debe llevar **`overflow-y-auto`** ni **`overflow-x-hidden`/`auto`**: en CSS, si un eje de overflow no es `visible`, el otro pasa a comportarse como `auto` y ese nodo se convierte en scrollport intermedio; al crecer con la tabla, el sticky del `<thead>` deja de anclarse al contenedor que el usuario desplaza. El scroll vertical (y el horizontal, si aplica) debe estar **solo** en un ancestro (p. ej. **`.contenedor-tabla-gestion`** o un **`div`** con **`overflow-y-auto`** en modales). Iconos en cabecera sobre **`bg-primary`**: **`text-primary-foreground`** (no **`text-foreground`**).  
   - **Paginación estándar**: todas las tablas de la app muestran **100 ítems por página** (`PAGE_SIZE` en `@/lib/pagination`). Cuando el total de filas supera 100, se muestran controles de paginación debajo de la tabla.  
   - **Páginas con URL** (Pedido Urgente, Tienda, Stock): usar `PaginacionTabla` de `@/components/shared/PaginacionTabla.tsx` con `basePath` y `params` (query actual sin `pagina`).  
   - **Páginas con datos en cliente** (Lista precios, Sugeridos): usar `PaginacionClient` de `@/components/shared/PaginacionClient.tsx` con `paginaActual`, `totalPaginas` y `onPaginaChange`.  
   - En el backend, las consultas que alimentan tablas deben usar `skip` y `take` (p. ej. `take: PAGE_SIZE`, `skip: (pagina - 1) * PAGE_SIZE`) y devolver `total` y `totalPaginas` para que la UI muestre la paginación correctamente.

9. **Zona horaria (Argentina)**  
   - Para mostrar **fecha/hora de negocio** (pedidos, historial, impresión stock, nombres de export) usar `@/lib/fechaArgentina` (misma regla que backend: `America/Argentina/Buenos_Aires`). No depender de la zona del navegador si el dato es un instante UTC (p. ej. `generadoAt` serializado como ISO).

10. **Al terminar un cambio**  
   - Recorre el checklist de la sección 4. Si añades una clase global nueva en `globals.css`, regístrala en la sección 2 de este documento.
   - Si ajustas elementos de **slidenav/sidebar**, mantener componentes compactos y consistentes:
    - **Ritmo vertical** (`Sidebar.tsx`): **navegación** arriba (`pt-3 px-4`). Abajo (`mt-auto`, `px-4 pb-4`): **sync/import** → separador (`pt-2`) → **nombre del área** (`SidebarMainAppArea` con `showLogo={false}`) → **logo** (`SidebarMainAppArea` con `showLabel={false}`) → **`SelectorRol` `compact`**; `gap-3` entre bloques en `flex flex-col pt-3`.
    - **Progreso import / sync** (`ImportStatusIndicator`, `SyncStatusIndicator`): **`MensajeProceso` `variant="sidebar"`** solo cuando hay **proceso en curso** (fondo/borde azul proceso en `globals.css`). `ImportStatusIndicator` solo visible con import activa. `SyncStatusIndicator` en **reposo**: textos según **área** (`getMainAppAreaIdFromPathname`): **Gestión Productos** y **Estadísticas Productos** → **`SINCRONIZACION PROD.`** / hover **`SINCRONIZAR PROD.`**; **Finanzas** → **`SINCRONIZACION COMPRAS`** / hover **`SINCRONIZAR COMPRAS`**. Línea 2 **`Últ. Act.: Hace …`** (regla de tiempo: bloques de **15 min.** bajo 1 h; luego horas/días). En **sync lista precios** (polling API): **`SINCRONIZANDO PROD.`** + detalle X de Y. En **sync compras** (solo slidenav en ruta Finanzas): **`SINCRONIZANDO COMPRAS`** + **…**.
     - Resto de botones de sidebar (navegación, etc.): tokens (`bg-sidebar-accent`, `text-sidebar-foreground`) y hover suave (`bg-sidebar-accent/80`).

**Referencia rápida de tokens (usar en lugar de valores fijos):**

| Evitar | Usar |
|--------|------|
| `bg-white` | `bg-card` o `bg-background` |
| `text-slate-400`, `text-slate-500`, `text-slate-600` | `text-muted-foreground` |
| `bg-slate-100`, fondos grises | `bg-muted` |
| `border-slate-200` | `border-border` |
| `emerald-*`, `amber-*`, `blue-*` (éxito / aviso / “info”) | `@/lib/ui-classes` o `text-primary`, `bg-accent`, `text-accent2`, etc. |
| `` className={`${a} ${b}`} `` | `className={cn(a, b)}` |
| `shadow-[0_4px_12px_rgba(0,0,0,0.05)]` en `Card` de tabla | `className={cn("card-tabla-envoltorio", …)}` + variable **`--card-tabla-envoltorio-shadow`** |

---

## Alcance de la auditoría (cerrada)

La auditoría de frontend se considera **terminada**. Se han aplicado:

- **Tokens de diseño**: eliminación de `bg-white`, `text-slate-*`, `bg-slate-*`, `border-slate-*` en favor de `bg-card`, `text-muted-foreground`, `bg-muted`, `border-border` en **toda** la app (páginas en `src/app/` y componentes en `src/components/`).
- **Utilidad `cn()`**: todas las combinaciones de clases usan `cn()` de `@/lib/utils.ts`; no quedan template literals `` `...${VAR}` `` en `className`.
- **Reutilización**: hook `useFiltrosConBusqueda` y componente `FiltroBusquedaInput`; todos los filtros con búsqueda migrados.
- **Documentación**: esta guía y `.cursorrules` alineados con los criterios anteriores.

Para nuevas funcionalidades, seguir el checklist de PR (sección 4) y los patrones de la sección 1.

---

## 1. Patrones de diseño

### Página con filtros y tabla unificada

1. **Estructura de página**
   - `SectionHeader` o `ClassicPageHeader`: título + subtítulo + acciones (botones a la derecha, `h-10 px-4`).
   - `FilterBar` con `filtros-contenedor-tienda bg-card`: `FilterRowSelection` > `FilaFiltrosDesplegables` (5 columnas) + `FilterRowSearch` (input ~75%) + `LimpiarFiltrosButton`.
   - Contenido: tabla con `<Table>` de `@/components/ui/table` (diseño único `.tabla-gestion-compacta` en `globals.css`).
  - **Scroll vertical (obligatorio en tablas)**: el scroll debe estar **dentro del contenedor de tabla** (`.contenedor-tabla-gestion`), para que solo se deslicen las filas y el encabezado quede fijo. Evitar `overflow-auto` en wrappers internos (cards/divs) y evitar scroll en el `main` de la app para no crear scrolls anidados.
  - **Scrollbar visible (recomendado)**: en páginas, **no** usar `no-scrollbar` en `.contenedor-tabla-gestion` para que el usuario vea el scroll dentro de la tabla (como en “Px. Vta. Sugeridos”). Reservar `no-scrollbar` solo para casos muy puntuales.
  - **Encabezado fijo (detalle crítico)**: el sticky se implementa **por celda** (`.tabla-gestion-compacta thead th { position: sticky; top: 0; }`). **No** usar `position: sticky` en `<thead>` porque es menos confiable entre navegadores y puede fallar cuando hay contenedores con scroll.

2. **Clases de filtros (SSOT en FilterBar / globals.css)**
   - Input y SelectTrigger: `INPUT_FILTER_CLASS` / `SELECT_TRIGGER_FILTER_CLASS` = `"input-filtro-unificado"`.
   - Wrapper de cada Select: `FILTER_SELECT_WRAPPER_CLASS` = `"min-w-0 flex-1"`.
   - Contador: `FILTER_COUNT_CLASS`.
   - `LimpiarFiltrosButton` (ícono cesto): **siempre visible** por regla global de UX, incluso sin filtros activos. Su acción sigue limpiando el estado de filtros actual.
   - **Sin búsqueda por descripción**: cuando una pantalla no tiene input de búsqueda y los filtros entran en una sola línea, ubicar las acciones en la **misma fila** usando un slot inline dentro de `FilaFiltrosDesplegables` (`FILTER_INLINE_ACTION_SLOT_CLASS`, por ejemplo con `col-span-2`) para compactar altura. Si no entra en una sola línea, usar `FilterRowNoSearchActions` como segunda fila.
   - SelectContent: `position="popper" side="bottom" align="start" className="select-content-filtro"`.

3. **Input de búsqueda en filtros (reutilización)**
  - **Hook:** `useFiltrosConBusqueda` en `@/lib/hooks/useFiltrosConBusqueda.ts`: estado `q`, debounce, restauración de foco (opcional con `focusStorageKey`) y `isDebouncing`. Llamar `prepareNavigate()` antes de `window.location.href` cuando se use `focusStorageKey`. El hook agrega un **commit diferido cancelable** (`commitDelayMs`) para evitar carreras: si el usuario vuelve a escribir mientras hay navegación pendiente, se cancela la búsqueda anterior.
  - **Regla UX anti-race (typing + recarga):** al sincronizar `qActual` desde URL, si el input de búsqueda sigue enfocado y el usuario ya escribió un valor más nuevo localmente, **no** sobrescribir ese texto con el valor de una navegación previa. Esto evita que se borre lo tipeado cuando el usuario hace una pausa corta y vuelve a escribir.
   - **Componente:** `FiltroBusquedaInput` en `@/components/shared/FiltroBusquedaInput.tsx`: icono Search, input con estilo unificado, botón X y Loader. Usar junto al hook para nueva pantallas con filtro de búsqueda (ej. FiltrosProductos, FiltrosTienda, FiltrosStock).
   - **Nota**: Si la página ya usa filtros por URL (Server Component) y necesitás una segunda fila con búsqueda (ej. “Generar Pedido”), agregá `q` en `searchParams`, pasalo al componente de filtros, y debounceá la navegación con `useFiltrosConBusqueda` (placeholder en MAYÚSCULAS).
  - **Pedido Urgente** (`PedidoUrgentePageClient`): **solo SUCURSAL** es obligatoria para listar productos; **PROVEEDOR**, filtro **PEDIDO** y búsqueda acotan. Filtro **PEDIDO** (orden): `CUALQUIER TIPO PEDIDO` (`cant_pedir > 0`), `PEDIDO URGENTE` (`urgente_cant_pedir > 0`) y `PEDIDO REPOSICION` (`reposicion_cant_pedir > 0`) en `prod_ped_merc`. Mensaje sin sucursal: *«Seleccioná una sucursal para ver los productos.»* En cabecera solo el botón **Generar Pedido** (`GenerarPedidoToolbarButton`); **no** hay **Guardar Cambios**. Cantidades: modal de cantidad o cesto (`upsertPedidoUrgenteMercaderiaItemAction`). Debajo de la tabla **no** mostrar texto resumen tipo **“Mostrando X de Y”**; si hay más de una página, renderizar solo `PaginacionTabla` alineada a la derecha. **Doble click en fila:** antes de abrir el modal de cantidad, si el ítem está vinculado a `prod_precios_tienda` y existe otro proveedor habilitado más barato para el mismo `id_lista_precios_tienda`, abrir confirmación con CTA **Pedir A Ese Proveedor**; si no hay alternativa más barata, abrir el modal normal.
  - **Tabla Pedido Urgente (columnas y anchos)**: `TILDE` **5%** (checkbox visual compacto cuadrado y adaptado a altura de fila: borde **`#0072BB`**, fondo transparente y solo ícono **Check** **`#0072BB`** al seleccionar), `PRIORIDAD` **7%**, `PROVEEDOR` **10%**, `DESCRIPCIÓN` **50%**, `CANT. PED.` **7%**, columna cesto **7%**, `CONF. REPO.` **7%**, `CANT. REPO.` **7%** (suma 100%; columna `REG. DUX` removida). Definir anchos con `<colgroup>` + `Table` `table-fixed` (sin anchos hardcodeados por columna en `w-[…]`) y usar un único contenedor `.contenedor-tabla-gestion` (evitar scroll anidado). **`PRIORIDAD`**: solo para filas tildadas; ordenar por `px_compra_final` ascendente y asignar ranking secuencial iniciando en 1 (menor costo = 1).
   - **Generar pedido (PDF / WhatsApp)**: usar `GenerarPedidoToolbarButton`. Texto del botón de cabecera por defecto: **Generar Pedido** (también en **Urgente** y **Tintométrico**). Abre un **`AppModal`** con `SUCURSAL`, `PROVEEDOR`, **TIPO DE PEDIDO** (multi). El botón del footer del modal solo se habilita con los **tres** completos y **`hayItems === true`**. Tras éxito (descarga PDF o envío WhatsApp) ejecutar `router.refresh()` para que se limpien las grillas afectadas (Urgente/Tintométrico). Rutas: `/pedidos/enviar`, **Pedido Urgente**, **Pedido Tintométrico**, **Pedido Reposición**.
   - **Pedido Tintométrico** (`/pedidos/tintometrico`): al guardar ítems, el backend arma `cod_ext` con **`buildCodExtTintometrico(codTienda, codTintometrico)`** para que no se pisen filas con la misma base y distinto COD.; al borrar, enviar el **`codExt`** de la fila (no solo `cod_tienda`).
  - **Px. Vta. Sugeridos** (`/gestion-productos/proveedores/sugeridos`): la grilla lista ítems que coinciden con filtros y con **`habilitado = true`** (no exige `px_vta_sugerido` no nulo). La columna de encabezado es **`DESCRIPCIÓN`** y muestra descripción efectiva por `cod_ext`: primero **`descripcion_tienda`** (si existe en `prod_precios_tienda`), y como fallback **`descripcion_proveedor`** (`prod_precios_provee`). Si **`px_vta_sugerido`** viene nulo, la celda se muestra vacía (sin `$0`). En el payload de lectura (`getListaPreciosConOpcionesAction`), el campo **`pxVtaSugerido`** debe enviarse siempre para evitar celdas vacías por ausencia de mapeo.
   - **Página `/pedidos/enviar` (tabla previa)**: sin filtros en URL muestra **todos** los ítems con `cant_pedir > 0` (`getItemsTablaEnviarPedido`); cada filtro activo (**SUCURSAL**, **PROVEEDOR**, **TIPO**, `q`) **reduce** la grilla. Vacío sin filtros: *«No hay ítems con cantidad a pedir.»*; vacío con algún filtro: *«No hay ítems para generar el pedido con los filtros seleccionados.»*
- **Tabla `/pedidos/enviar` (columnas, orden):** **TIPO PEDIDO** (**12%**, `prod_ped_merc.tipo_de_pedido`), **SUCURSAL** (**12%**, texto en MAYÚSCULAS), **PROVEEDOR** (**18%**), **DESCRIPCIÓN** (**48%**), **CANT. PEDIR** (**10%**). Envoltorio: **`Card`** con **`className="card-tabla-envoltorio"`** (o **`cn(..., "flex-1")`** si aplica).
- En la barra de filtros de **Generar Pedido**, el orden de desplegables es `SUCURSAL` → `PROVEEDOR` → `TIPO DE PEDIDO`.
- En `Pedido Reposición`, el orden de desplegables es `SUCURSAL` → `PROVEEDOR` → `MARCA` → `RUBRO` → `CONFIGURADO` (sin `SUB-RUBRO`).
  - **Modal `ConfigurarReposicionModal`** (`src/components/pedidos/ConfigurarReposicionModal.tsx`): al abrir un ítem **sin** regla guardada (`idReposicion` y `formaPedir` vacíos), **PUNTO REPOSIC.** y la columna de cantidad (CANT. MAX. / CANT. FIJA) usan estado **string** (`puntoInput`, `cantInput`) para mostrar **vacío** en lugar de `0`. Tras elegir **FORMA PEDIR**, el tercer campo solo aparece cuando **PUNTO REPOSIC.** tiene un entero válido **≥ 0** (el **0** habilita la columna de cantidad). **Cantidad reposición** sigue exigiendo entero **≥ 1** al guardar; vacío o **0** no son válidos. Al editar una regla existente, se precargan los valores del servidor como texto. Helpers locales: `parsePuntoReposicionInput`, `parseCantReposicionInput`. La tabla bajo **Agregar esta configuración a estos productos** está **siempre** visible: primera fila = producto con el que se abrió el modal (`item.descripcionTienda`), sin botón quitar (celda **—**); filas siguientes = `productosAdicionales` con acción quitar.

4. **Modal con tabla y filtros**
   - Usar `ModalTablaConFiltros` de `@/components/shared/ModalTablaConFiltros.tsx` (single o multi selección).

5. **Variantes: contador debajo**
   - **Contador debajo a la derecha**: cuando el diseño requiera el número de ítems en una fila inferior alineada a la derecha, usar una tercera fila dentro del `FilterBar`: `<div className="flex justify-end w-full"><span className={FILTER_COUNT_CLASS}>…</span></div>`. No incluir el contador dentro de `FilterRowSelection`.
   - **Tablas con paginación (estándar de la app)**: todas las tablas de páginas muestran **100 ítems por página**. No se cargan todos los registros; el backend aplica `skip`/`take` y devuelve `total` y `totalPaginas`. Debajo de la tabla se muestra la barra de paginación (`PaginacionTabla` o `PaginacionClient`) cuando `totalPaginas > 1`. El contenedor de tabla **sí** hace scroll vertical interno para navegar filas sin perder el encabezado; el usuario cambia de página con los controles. Ver sección "Guía para IA" punto 8.

6. **Variantes: filtros sin filtros (solo acción “+”)**
  - Cuando el módulo no requiere filtros pero debe conservar el **mismo bloque de filtros** (tamaño/ubicación), usar `FilterBar` igualmente y renderizar una única acción alineada a la derecha (ej. botón `+`).
  - Patrón aplicado: `src/components/pedidos/PedidoTintometricoPageClient.tsx`.

### Tabla con bloque de información secundaria

- Patrón pensado para tablas donde hay **datos principales** (configuración, acciones) y un **bloque de resumen secundario** (stock, métricas) en la misma fila.
- Referencia: módulo **Pedido Reposición** (`TablaReposicion`).
- Estructura:
  - Columnas principales a la izquierda: DESCRIPCIÓN, FORMA PEDIR, PUNTO REPOSICIÓN, CANT. REPOSICIÓN, acciones (botón de basura).
  - Bloque secundario a la derecha: STOCK, CANT. A PEDIR.
- Clases globales:
  - Encabezados secundarios: `tabla-bloque-secundario-head` / `tabla-bloque-secundario-head-divider` (misma tipografía que el resto del encabezado; `*-divider` añade **solo** borde izquierdo entre sub-grupos).
  - Celdas secundarias: `tabla-bloque-secundario-cell` / `tabla-bloque-secundario-cell-divider` (sin fondo distinto; heredan cebra de fila; `*-divider` = línea vertical **#0072bb** vía `box-shadow` inset, no `border-left`, para que con encabezado sticky no se “cuele” el gris en la franja azul).
- Uso recomendado:
  - Aplicar estas clases solo a columnas de **información secundaria** (no editable o de resumen).
  - Mantener siempre el orden lógico: primero las columnas principales, luego el bloque secundario.
  - **No** añadir `px-3 py-2 text-xs` extra en cabeceras/celdas secundarias: el tamaño lo define `.tabla-gestion-compacta` / `.celda-datos`.
- **Varios sub-bloques:** en **Comp. Proveedores** (`TablaTienda`) hay tres grupos: columnas principales sin clase; cada grupo siguiente empieza con `*-divider` (línea vertical). La última columna del bloque derecho usa `*-head` / `*-cell` sin divider.

### Modales con tabla de selección (patrón `modal-app`)

- Para modales que muestran una tabla de selección (ej. **Seleccionar Producto** en Tienda y **Seleccionar Productos** en Pedido Reposición) usar siempre el patrón `modal-app`:
  - `DialogContent` con clase `modal-app` y límites de ancho/alto.
  - `DialogHeader` con clase `modal-app__header` y `DialogTitle` con `modal-app__title` (color de fondo y botón de cierre `X` unificados).
  - `modal-app__body`:
    - Filtros fijos arriba.
    - Encabezado de tabla fijo (Table con solo `<TableHeader>`) fuera del contenedor con scroll.
    - Cuerpo con scroll: `<TableBody>` dentro de un `div` con `overflow-y: auto`.
  - `modal-app__footer` con botones alineados (`Cancelar`, `Agregar`, etc.).
- Ejemplos: `SeleccionarProductoModal` (Tienda) y `SelectorProductosReposicionModal` (Pedido Reposición).

### Tienda — Modal **Vínculos con Proveedores** (`VincularModal.tsx`)

- **Tabla estándar**: `<Table variant="compact" className="tabla-vinculos-modal">` directamente dentro de `.contenedor-tabla-gestion` con `w-full min-w-0` (mismo ancho útil que el modal). Incluir `<colgroup>` con anchos porcentuales (suma 100%) para `table-layout: fixed`. El wrapper `overflow-x` lo aporta el propio `<Table>` (`data-slot="table-container"`); no añadir `inline-block` ni centrar la tabla al contenido. **`tabla-vinculos-modal`** en `globals.css`: `width: 100%`, `table-layout: fixed`, padding horizontal reducido; **`thead th`** con salto de línea (`white-space: normal`, `overflow-wrap`/`word-break`); última columna (ícono) `nowrap` y ancho fijo. **AppModal** `size="lg"` + `sm:max-w-2xl`, `bodyShellClassName` compacto, **sin** card/borde extra alrededor de la tabla. **No** usar el listado legacy `.modal-vinculos-*`.
- **Orden de filas**: primero el proveedor **oficial** (coincide `prefijoProveedor` / `proveedorDux` con el prefijo del vínculo); el resto ordenado por **px. final de compra** ascendente. Si no hay oficial reconocido, todas las filas solo por precio.
- **Columnas** (misma jerarquía visual **unificada**, sin `tabla-bloque-*` en este modal): `OFICIAL`, `PREFIJO`, `PX. FINAL COMPRA`, `VARIAC.`, `MARGEN S/ IVA`, `DESVINC.` (ícono). Celdas con `celda-datos` / `celda-mono` / `celda-numero` / `celda-destacado` como en la grilla tienda donde aplique. Márgenes con `calcMargenSinIvaPct` como `TablaTienda`. **Columna `OFICIAL` (solo lectura)**: indica qué fila es el proveedor oficial (coincidencia de prefijo con el ítem tienda); **no** incluye control para cambiar el oficial desde este modal — las filas no oficiales muestran `—` (`text-muted-foreground`); la fila oficial conserva `sr-only` ("Proveedor oficial actual").
- **Encabezado del producto**: dos líneas — (1) descripción `text-sm font-semibold text-foreground` con `break-words`; (2) si hay datos, una sola línea `text-xs text-muted-foreground` con **Marca - Rubro - SubRubro** (solo valores no vacíos, unidos con ` - `).
- **Props**: además de `costoTienda`, el modal recibe `precioListaTienda` y `porcIva` desde la fila de tienda para el margen.

### Ejemplos de código (referencia para IA)

**Combinar clases con `cn()`:**
```tsx
import { cn } from "@/lib/utils";

// Condicional
<div className={cn("rounded-lg border", isActive && "bg-primary/10 text-primary")} />

// Varias clases + variable
<span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>{count}</span>
```

**Nueva pantalla con filtro de búsqueda (esqueleto):**
```tsx
"use client";
import { usePathname } from "next/navigation";
import FilterBar, { FilterRowSelection, FilterRowSearch, FILTER_COUNT_CLASS, LimpiarFiltrosButton } from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { cn } from "@/lib/utils";

export default function MiFiltros({ qActual, totalItems }: { qActual: string; totalItems: number }) {
  const pathname = usePathname();
  const { q, setQ, ref: inputRef, handleQChange, isDebouncing, prepareNavigate } = useFiltrosConBusqueda({
    qActual,
    debounceMs: 400,
    focusStorageKey: "mi-modulo-focus",
    onDebouncedSearch: (value) => {
      prepareNavigate();
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      window.location.href = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    },
  });
  const hayFiltros = !!q;
  return (
    <FilterBar className="filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <span className={FILTER_COUNT_CLASS}>{totalItems.toLocaleString()} ítems</span>
      </FilterRowSelection>
      <div className="flex items-center gap-2">
        <FilterRowSearch>
          <FiltroBusquedaInput id="mi-busqueda" placeholder="Buscar..." value={q} onChange={handleQChange} isDebouncing={isDebouncing} inputRef={inputRef} />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={() => { setQ(""); window.location.href = pathname; }} />
      </div>
    </FilterBar>
  );
}
```

**Encabezado de página:**
```tsx
import SectionHeader from "@/components/SectionHeader";

<SectionHeader titulo="Título" subtitulo="Subtítulo opcional" actions={<Button>Acción</Button>} />
```

---

## 2. Catálogo de clases globales (Tailwind 4 / globals.css)

| Clase / variable | Uso |
|------------------|-----|
| `.section-header` | Encabezado de sección (título, barra primaria, acciones). Fondo: `var(--card)`. |
| `.card-tabla-envoltorio` | **`Card`** que envuelve la tabla principal en páginas con layout estándar cuando se use `Card` (ej. Comp. Proveedores, Generar Pedido): `min-h-0` flex column, `rounded-xl`, `border-border`, `bg-card`, `gap-0`, `py-0`, sombra vía **`--card-tabla-envoltorio-shadow`**. Incluye override específico sobre `Card` base (`[data-slot="card"].card-tabla-envoltorio`) para anular `gap-6 py-6 border-card-border` heredados y evitar espacio extra entre borde, encabezado y cuerpo de tabla. No duplicar la misma cadena de utilidades Tailwind en cada página. |
| `--card-tabla-envoltorio-shadow` | **`:root`**: sombra suave de la tarjeta-tabla (antes repetida como `shadow-[0_4px_12px_rgba(0,0,0,0.05)]`). |
| `.modal-app`, `.modal-app__header`, `.modal-app__body`, `.modal-app__footer` | Modales con tabla y filtros. |
| `.input-filtro-unificado` | Input y SelectTrigger de filtros (borde primary, altura 2.5rem). |
| `.fila-filtros-5`, `.fila-filtros-desplegables` | Grid 5 columnas para Selects de filtros. |
| `.tabla-gestion-compacta.tabla-vinculos-modal` | Variante de ancho para **modal Vínculos** (Tienda): `width: 100%`, `table-layout: fixed`; los encabezados usan la misma regla global de `tabla-gestion-compacta`. |
| `.tabla-gestion-compacta.tabla-recepcion-pedido` | **Recepcion Pedido** (`PedidoHistoriaDetalleModal`): **`recepcion-fila-pendiente`** cebra estándar; **`recepcion-fila-verificada`** fondo **gris intermedio** neutro (`color-mix(in oklab, var(--muted) 72%, var(--card) 28%)`, hover **84%/16%**), entre blanco/card y cebra celeste; misma altura de fila que el resto de tablas. |
| `.tabla-gestion-compacta.tabla-deuda-proveedores` | Solo **Finanzas / Venc. Provee. Merc.** (`/finanzas/deuda-proveedores`): habilita alto automático de fila + wrap en `.celda-proveedor-deuda` para textos largos. |
| `.tabla-gestion-compacta.tabla-flujo-de-fondo` | **Finanzas / Flujo De Fondo** (`/finanzas/venc-por-fecha`, `TablaFlujoDeFondo` / `TablaFlujoDeFondoDetalleDia`) y **reutilización** de **`TablaFlujoDeFondoDetalleDia`** en **Venc. Provee. Gastos** (`/finanzas/vencimientos-gastos`, detalle por proveedor): **thead** sin sobrescrituras (mismo centrado global). **FECHA** (grilla principal) **centrada**; en el **modal** columnas de texto (PROVEEDOR, **DETALLE**) con **`text-left`**, importes con **`TD_NUM`**. **SALDO** negativo: `text-destructive` en la celda, **no** fila con tinte (cebra = card + primary 8 % impar/par). |
| `.tabla-gestion-compacta` | **Diseño único** de tablas (referencia: Comp. Proveedores). Usar siempre `<Table>` de `@/components/ui/table`; no usar otra clase. **Encabezado fijo obligatorio**: al hacer scroll los encabezados no desaparecen (`position: sticky` en `globals.css`). **`thead th`**: **`--tabla-thead-height`** es la **altura mínima** (referencia ≈ 2 líneas + padding); si el título lo requiere, el **`th` crece en altura** (texto con `word-break`, sin `line-clamp` ni `max-height` fijos); centrado horizontal y vertical del bloque de título; sin `nowrap` en encabezados. `TableHead` mantiene `text-xs` y `font-normal`. **Inputs y Select** en celdas: fondo transparente, recuadro #0072bb. **Select en tablas**: texto en negro, sin bold (`globals.css`). **Hover global de filas (páginas y modales):** el resaltado es uniforme para toda la fila, sin distinción por columnas ni overlays por celda (`td:hover::before` desactivado). Los colores se definen por estado de fila (cebra `odd`/`even`, `hover`, `data-state="selected"`) y, en `hover`, el color de fuente de todas las celdas se fuerza a **`foreground`** para mantener contraste homogéneo. |
| `.tabla-bloque-secundario-head`, `.tabla-bloque-secundario-head-divider` | Columnas de **información secundaria** en `<thead>`: fondo `var(--primary)` explícito (opaco bajo sticky). `*-divider`: primera columna de cada sub-bloque; el divisor blanco se dibuja con `::before` absoluto (`2px`, `primary-foreground`) sobre el `th` sticky para evitar artefactos al hacer scroll (ej. `TablaTienda`: MARGEN vs MEJOR PROV.). |
| `.tabla-bloque-secundario-cell`, `.tabla-bloque-secundario-cell-divider` | Celdas de **tbody** secundarias; fondo transparente (cebra). `*-divider`: línea vertical **#0072bb** con `box-shadow: inset 1px 0 0 #0072bb` (evita artefactos con `border-collapse: collapse` y scroll). **No** usar en el modal **Vínculos**. |
| `--tabla-thead-height`, `--tabla-thead-lines`, `--tabla-thead-line-height`, `--tabla-thead-padding-y`, `--tabla-body-row-min-height`, `--tabla-body-cell-padding-y`, `--tabla-body-cell-padding-x` | **`--tabla-thead-height`** = `calc((0.75rem * --tabla-thead-line-height * --tabla-thead-lines) + (--tabla-thead-padding-y * 2))` usada como **`min-height`** del **`thead th`**; defaults `--tabla-thead-lines: 2`, `--tabla-thead-line-height: 1.15`, `--tabla-thead-padding-y: 0.2rem`; **`--tabla-body-row-min-height`** = **2rem**; padding vertical celdas ~**`py-0.5`** (**0.125rem**); inputs/botones en celdas ~**1.75rem**. Sin cambio de **`font-size`** en **`tbody tr:hover td`** (evita saltos). |
| `.celda-datos` | Celdas de datos; usa las mismas variables de padding y min-height que la tabla oficial. |
| `.celda-datos.celda-datos--flush-left` | Anula **`padding-left`** con **`!important`** (especificidad doble clase) cuando **`!pl-0`** de Tailwind no gana al atajo **`padding`** de **`.celda-datos`**; usar con **`Input`** **`pl-0` `pr-3`** (base **`Input`**: **`pl-3 pr-3`**, no **`px-3`**, para que **`tailwind-merge`** anule bien el lado izquierdo). |
| `.celda-datos.celda-datos--flush-right` | Anula **`padding-right`** con **`!important`** para campos al ras del borde derecho dentro de celdas `celda-datos` (ej. input de **TOTAL PEDIDO**). |
| `.tabla-check-toggle` | Checkbox/toggle compacto para columnas de **tilde** en tablas (`.tabla-gestion-compacta`): cuadrado (mismo alto/ancho) con tamaño derivado de `--tabla-body-row-min-height`, sin superar el alto de fila; borde **`#0072BB`**, fondo transparente y solo ícono **Check** en **`#0072BB`** al seleccionar. **Regla global:** toda columna de selección usa encabezado con tilde (`Check`). Reutilizar en tablas actuales y futuras para mantener consistencia visual. |
| `.celda-destacado` | Celdas “destacadas” sin negrita (font-weight normal) para cumplir el estilo de tablas. |
| `.contenedor-pagina-con-filtros` | Espaciado vertical entre header, filtros y tabla. |
| `.finanzas-resumen-tarjeta` | Totales bajo tablas de **Finanzas** (p. ej. **Balance · Gastos** / **`TablaGastos`**, **Tesorería** / **`TablaTesoreriaCajas`**): borde **2px** **#0072bb**, `border-radius` suave, fondo **`var(--card)`**, `flex` columna, texto centrado. |
| `.no-scrollbar` | En **`globals.css`**: oculta barras del scrollport del mismo nodo (`scrollbar-width: none` / webkit); mantiene **`overflow-y-auto`** / **`overflow-x-auto`** (rueda/táctil). Usar en el **div** que hace scroll (p. ej. hijo interno de **`contenedor-tabla-gestion`**, **`AppModal`** con **`hideBodyScrollbars`**, tabla dentro de modal en **Flujo De Fondos**). Antes solo existían variantes acopladas a `.contenedor-tabla-gestion` / `.app-modal__*`; la regla es única para toda la app. |
| *(retiradas)* `.modal-vinculos-*`, `.btn-convertir-proveedor-principal*`, `.btn-desvincular-icono`, `.modal-vinculos-footer` | El modal **Vínculos con Proveedores** pasó a `<Table>` estándar; no reintroducir estas clases. |
| `@/lib/ui-classes` | Constantes reutilizables: `BADGE_SUCCESS_TINT_CLASS`, `TEXT_SUCCESS_CLASS`, `TEXT_WARNING_CLASS`, `ICON_WARNING_INTERACTIVE_CLASS`, `IMPORT_STAT_BADGE_CLASSES` (badges de importación / estados positivos y avisos con tokens `primary`, `accent`, `accent2`). |
| `PAGE_SIZE` (`@/lib/pagination`) | Tamaño de página estándar para tablas: 100 ítems. |
| `PaginacionTabla` (`@/components/shared/PaginacionTabla.tsx`) | Paginación por URL: `basePath`, `params`, `paginaActual`, `totalPaginas`, `total`, `pageSize`. |
| `PaginacionClient` (`@/components/shared/PaginacionClient.tsx`) | Paginación por estado: `paginaActual`, `totalPaginas`, `onPaginaChange`. |
| `TableEmptyState` + CVA (`@/components/shared/TableEmptyState.tsx`) | Mensajes de lista/tabla vacía; `EmptyTableRow` en `ui/table` reutiliza las mismas variantes. |
| `ModalMicroLabel` + CVA (`@/components/shared/ModalMicroLabel.tsx`) | Micro-etiquetas MAYÚSCULAS en modales (campos/secciones densas); variantes `align`: `left` \| `center`. |
| `--gris` | Fondo universal de modales y zonas secundarias. |
| `--primary`, `--card`, `--muted-foreground`, `--border` | Tokens de tema; **no** usar `bg-white`, `text-slate-*`, `border-slate-*` en componentes. |

---

## 3. Reglas técnicas estrictas

| Área | Regla |
|------|--------|
| **Tipado** | TypeScript 5.9+. No `any`. Esquemas Zod para validación. |
| **Estilos** | Siempre `cn()` de `@/lib/utils.ts` para combinar clases. No concatenar con `` `...${VAR}` ``. |
| **Tokens** | Solo variables del tema: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`. Evitar `bg-white`, `text-slate-*`, `bg-slate-*`. |
| **Estructura** | Rutas en `src/app/`; componentes base shadcn en `src/components/ui/`; compartidos en `src/components/shared/`. |
| **Texto UI** | Títulos de modales y botones: title case. Sidebar: módulo en MAYÚSCULAS, submódulo con primera letra de cada palabra en mayúscula (title case). Filtros, desplegables y encabezados de tablas: MAYÚSCULAS. Toda abreviatura termina con punto (Px., Cx., Dto., Cod., etc.). |
| **Tablas** | Todas las tablas con encabezado fijo: al hacer scroll los encabezados no desaparecen. Usar `<Table>` de `@/components/ui/table` (aplica `.tabla-gestion-compacta` en `globals.css`). |
| **Celdas vacías (tablas)** | En tablas, los valores vacíos/null **se renderizan en blanco** (string vacío). **No** usar `"-"` ni `"—"` como placeholder. Para valores opcionales, usar `fmtCelda()` / `fmtNumero()` de `@/lib/format` (devuelven `""` para vacío). |
| **Acciones en tablas (basura)** | Los botones de eliminar (ícono cesto) dentro de tablas deben verse **en negro** (`text-foreground`) para que se perciban como acción. En hover pueden pasar a `text-destructive`. |
| **Sesiones** | Acceso a datos vía iron-session y helpers del proyecto. |

---

## 3.1 Catálogo de componentes compartidos (`src/components/shared/`)

Estos componentes son **SSOT** para patrones repetidos. Reglas:

- **Siempre** combinar clases con `cn()` (`@/lib/utils.ts`).
- **Variantes**: cuando haya duplicación de clases o combinaciones, usar **CVA** (`class-variance-authority`) dentro del componente.
- **Accesibilidad**: inputs de selección deben tener `aria-label` si no hay texto visible.

**Patrón Design System (nuevos componentes en `shared/`):**

- **CVA**: definir `*Variants = cva(base, { variants, defaultVariants })`; tipar props con `VariantProps<typeof *Variants>` y extender `ComponentPropsWithoutRef<"elemento">` (u otra raíz semántica).
- **Export**: si otras piezas reutilizan las mismas clases (ej. `EmptyTableRow`), exportar el objeto `*Variants` además del componente.
- **Tokens**: solo tema (`bg-card`, `text-muted-foreground`, `border-border`, etc.); nunca `bg-white` / `text-slate-*` / paletas genéricas para estados — ver `@/lib/ui-classes`.
- **Capa cliente**: añadir `"use client"` solo si el componente usa hooks, eventos del navegador o estado; los presentacionales pueden quedarse como Server Components.
- **Retroalimentación**: al dar de alta un componente compartido, añadir entrada en esta sección **3.1** (props, variantes CVA, accesibilidad, ejemplos breves).

### `AppModal` (`src/components/shared/AppModal.tsx`)

Modal estándar (header corporativo + cuerpo en capas `bg-gris → bg-card` + footer con acciones).

- **Props**
  - **`title`**: `ReactNode` (título del modal, en title case).
  - **`children`**: `ReactNode` (contenido del cuerpo).
  - **`actions`**: `ReactNode` (botonera del footer).
  - **`size`**: `"sm" | "md" | "lg" | "xl"` (default `"md"`).
  - **`padding`**: `"sm" | "default" | "lg"` (default `"default"`).
  - **`scrollBody`**: `boolean` (default `true`).
  - **`hideBodyScrollbars`**: `boolean` (default `false`). Si `true` y `scrollBody`, oculta la barra de scroll del **área gris** (`.app-modal__scroll-area`) y de la **card** (`.app-modal__body`); el scroll con rueda/táctil se mantiene. Estilos en `globals.css` (combinación con `.no-scrollbar`).
  - **`showCloseButton`**: `boolean` (default `true`).
  - **`className`** / **`bodyClassName`**: overrides puntuales (evitar duplicar estilos base).
  - **`bodyShellClassName`**: opcional; se aplica al `div` gris que rodea la card del cuerpo (junto con `p-4` por defecto). Útil para reducir padding en modales densos (ej. `VincularModal`: `p-1.5 sm:p-2`).
  - **`headerClassName`** / **`footerClassName`**: opcional; se combinan con el header primary (`pt-5 pb-4` por defecto) y el footer (`py-4`). Ej. `PedidoHistoriaDetalleModal`: `headerClassName="pt-3 pb-3"`, `footerClassName="py-3"`, `padding="sm"` y `bodyClassName` con `py-2` para ganar altura útil en la tabla.

### `ToolbarActionButton` (`src/components/shared/ToolbarActionButton.tsx`)

Botón estándar para **barras de acciones y encabezados de página** (toolbar de `SectionHeader` / `ClassicPageHeader`, modales, cards). Centraliza el patrón `icon + label + estado async` accesible, delegando tipografía, altura y tokens al **`Button`** de `@/components/ui/button`.

- **Por qué existe**
  - Evita repetir `gap-2 shrink-0` en cada call site: el `Button` base ya los incluye en su clase (y tamaña los SVGs a `size-4` vía selector `[&_svg:not([class*='size-'])]:size-4`).
  - Encapsula el estado **`loading`** (spinner + `disabled` + `aria-busy`), que antes se resolvía ad hoc en cada toolbar.
  - Fuerza `type="button"` (previene submit accidental dentro de `<form>`).

- **Props**
  - **`label`**: `ReactNode?` — texto del botón (title case). Si no hay texto visible, pasar `aria-label`.
  - **`icon`**: `ReactNode?` — ícono de `lucide-react` (ej. `<RefreshCw />`). No hace falta dimensionarlo: el `Button` base aplica `size-4 shrink-0` a los `<svg>`.
  - **`loading`**: `boolean` (default `false`) — al activarse deshabilita, reemplaza el ícono por **`Loader2`** con `animate-spin` y setea `aria-busy`.
  - **`loadingLabel`**: `ReactNode?` — texto alterno mientras `loading` (ej. `"Importando…"`). Si se omite, se mantiene `label`.
  - **`variant`** / **`size`**: pass-through del `Button` de shadcn (`default` | `outline` | `secondary` | `destructive` | `ghost` | `primaryIcon` | `link`; tamaños `default` | `xs` | `sm` | `lg` | `icon*`).
  - **`density`** (CVA): `"default"` | `"tight"` — única variante propia, sólo ajusta el gap cuando una toolbar densa lo requiera.
  - Resto: hereda `ComponentProps<typeof Button>` (incluye `onClick`, `disabled`, `className`, etc.).

- **Ejemplos**

  ```tsx
  import { RefreshCw, Download } from "lucide-react";
  import ToolbarActionButton from "@/components/shared/ToolbarActionButton";

  // Acción primaria con ícono
  <ToolbarActionButton
    label="Importar Datos Dux"
    icon={<RefreshCw />}
    onClick={handleImport}
  />

  // Acción con estado async y texto alterno
  <ToolbarActionButton
    label="Importar Datos Dux"
    loadingLabel="Importando…"
    loading={syncing}
    icon={<RefreshCw />}
    onClick={handleImport}
  />

  // Variante secundaria (exportar)
  <ToolbarActionButton
    variant="outline"
    label="Exportar Stock"
    icon={<Download />}
  />
  ```

- **Cuándo usarlo**
  - **Nuevas** toolbars con íconos y/o estados async (importar, exportar, sincronizar, generar PDF, imprimir, etc.).
  - Cualquier acción donde actualmente se repetía `className="btn-primario-gestion gap-2 shrink-0"` junto con `<Icon className="h-4 w-4 shrink-0" />`.

- **Cuándo NO usarlo**
  - Botones puramente ícono (ej. `LimpiarFiltrosButton`): usar `<Button variant="primaryIcon" size="icon-lg" aria-label="…">` directo.
  - Botones sin ícono ni estado async: `<Button>` de shadcn sigue siendo la API mínima.
  - Botones con doble línea (texto principal + detalle de última actualización): usar **`DuxSyncStyleButton`** (CVA `surface`).

- **Nota de consolidación**
  - **`src/lib/actionButtons.ts`** (constantes `MAIN_BUTTON_CLASSES`, `ACTION_BUTTON_PRIMARY`, `ACTION_BUTTON_SECONDARY` armadas con **template literals**) quedó como código muerto y fue **eliminado** en la misma iteración: usar `ToolbarActionButton` (o `Button` directo) en su reemplazo.
  - La clase CSS global **`.btn-primario-gestion`** (`globals.css`) sigue vigente para no romper los call sites existentes, pero para nuevas toolbars **preferir `ToolbarActionButton`**. Cualquier migración del resto de call sites (`SyncDuxHeaderButton`, `SyncButton`, `ExportarStockButton`, `ImprimirStockButton`, etc.) se hará en una iteración dedicada.

### `ModalTablaConFiltros` (`src/components/shared/ModalTablaConFiltros.tsx`)

Modal reutilizable de **título + filtros + tabla** con modos:

- **Single** (default): selección por **doble clic** en fila (definido por el padre con `onRowDoubleClick`).
- **SingleConfirm**: selección por **click** en fila + confirmación con botón (default: `confirmSingleLabel="AGREGAR"`).
- **Multi**: selección por checkbox + confirmación con botón.

- **Props base**
  - **`open`**, **`onClose`**.
  - **`title`**: `string` (title case).
  - **`subtitle`**: `string?`.
  - **`filterContent`**: `ReactNode` (filtros del modal).
  - **`columns`**: `{ key, label, className?, render(row) }[]`.
  - **`rows`**, **`getRowId(row)`**.
  - **`loading`**: `boolean?`.
  - **`emptyMessage`**: `string?` (default `"Sin resultados"`).
  - **`count`**: `number?` (si se pasa, muestra “X resultado(s)” en el footer).
  - **`contentClassName`**: `string?` (solo para ajustes puntuales del contenedor).

- **Props single**
  - **`selectionMode`**: `"single"` (default).
  - **`onRowDoubleClick(row)`**: handler de selección.
  - **`footerRight`**: `ReactNode?` (por defecto renderiza “Cancelar”).

- **Props multi**
  - **`selectionMode`**: `"multi"` (obligatorio).
  - **`onConfirm(ids)`**: callback async/sync (si resuelve OK, el modal se cierra).
  - **`confirmLabel(count)`**: texto del botón (default: `Asignar N producto(s)`).
  - **`confirmPending`**: `boolean?` (deshabilita acciones y muestra loader).

- **Props singleConfirm**
  - **`selectionMode`**: `"singleConfirm"` (obligatorio).
  - **`onConfirmSingle(row)`**: callback async/sync. Si resuelve OK, el modal se cierra.
  - **`confirmSingleLabel`**: texto del botón de confirmación (default: `AGREGAR`).
  - **`confirmPending`**: `boolean?` (deshabilita acciones y muestra loader).

- **Notas de implementación**
  - **Estilos de tabla**: las celdas repetidas (header/body) y estilos de fila usan **CVA** para evitar duplicación.
  - **Accesibilidad**: los checkboxes incluyen `aria-label` (no hay texto visible).

### `GenerarPedidoToolbarButton` (`src/components/pedidos/GenerarPedidoToolbarButton.tsx`)

Botón de cabecera que abre el modal **Generar Pedido** (`AppModal` + `Dialog`). Lista de proveedores: misma forma que **`FiltrosEnviarPedido`** (`id`, `nombre`, `prefijo`); en **Tintométrico** se mapea desde los proveedores tintométricos; en **Reposición** se usa **`getEnviarPedidoData().proveedores`** (catálogo completo con lista de precios habilitada).

- **Props**: `proveedores`, `defaultSucursal`, `defaultProveedor`, `defaultTipos`, `modulo` (`"enviar" | "urgente" | "tintometrico" | "reposicion"`), `triggerLabel?`, `triggerClassName?`, `triggerSize?`.
- **Título del modal**: **Generar Pedido** (title case). Footer: **Cancelar** (outline) + **Generar Pedido** (primary).
- **Tipo de pedido**: `DropdownMenu` de **`radix-ui`** (`modal={false}` dentro del `Dialog`) con **`Portal`** + **`CheckboxItem`** (tres opciones: URGENTE, TINTOMÉTRICO, REPOSICIÓN); no usar panel `absolute` bajo el trigger — el **`AppModal`**/`DialogContent` llevan `overflow-hidden` y recortaban el menú.
- **Bajo los tres desplegables**: recuadro reservado (`min-h`, borde `border-border`, `bg-muted/40`), contenido **centrado** (`items-center`, `text-center`). Estados: aviso/error → ícono **`AlertCircle`** `text-destructive`; comprobación → **`Loader2`** `text-muted-foreground`; sin ítems → **`AlertCircle`** rojo + texto muted; listo → **`CheckCircle2`** `text-primary` (#0072BB vía token) + **«Listo para generar el pedido.»**. El footer **Generar Pedido** solo con los tres filtros y **`hayItems === true`**.
- **Validación de sobrestock (otra sucursal):** al confirmar **Generar Pedido**, la primera llamada es `generarPdfEnviarPedidoAction` **sin** `confirmarSobreStock`. El servidor valida antes del snapshot: para cada línea del pedido con **`cod_tienda`**, si en la **otra** sucursal hay sobrestock (stock en `prod_precios_tienda` vs tope resuelto con filas REPOSICIÓN en `prod_ped_merc`), responde `SOBRESTOCK_REQUIERE_CONFIRMACION:…` **sin persistir** (aplica con cualquier combinación de tipos URGENTE / TINTOMÉTRICO / REPOSICIÓN). El cliente llama `getSobreStockReposicionParaModalAction` y abre **`SobreStockReposicionAdvertenciaModal`**. **Confirmar Cant. Pedida** reintenta con `confirmarSobreStock: true`.

### `SobreStockReposicionAdvertenciaModal` (`src/components/shared/SobreStockReposicionAdvertenciaModal.tsx`)

- **Rol:** advertencia accesible antes de generar el pedido cuando hay sobrestock en la **otra** sucursal (orquestado por `GenerarPedidoToolbarButton`).
- **Props:** `open`, `onOpenChange`, `items` (`SobreStockReposicionItem[]`), `pending?`, `onPedirAlProveedorIgual`, `layoutGap?` (`"default"` \| `"tight"` — CVA `sobreStockAdvertenciaLayoutVariants`).
- **CVA:** `sobreStockAdvertenciaLayoutVariants`, `sobreStockAdvertenciaTableShellVariants`.
- **Copy vigente:** título del modal **Advertencia SobreStock**; texto principal **Confirmar Cantidad Pedida al Proveedor** (sin párrafo descriptivo secundario).
- **Tabla (patrón visual `Recepcion Pedido`):** columnas **CHECKLIST**, **SUCURSAL**, **DESCRIPCIÓN**, **SOBRESTOCK**, **CANT. PEDIR**, **ACCIONES**. Clave de fila: `` `${idItemPedidoEnvio}-${origenDeteccion}-${sucursalCodigoSobrestock}` ``.
- **Anchos actuales (proporción final normalizada):** `CHECKLIST 6%`, `SUCURSAL 9%`, `DESCRIPCIÓN 50%`, `SOBRESTOCK 8%`, `CANT. PEDIR 20%`, `ACCIONES 9%`. El modal usa `AppModal` `size="lg"` + `className="sm:max-w-[72rem]"` para acompañar el crecimiento de columnas.
- **Edición de cantidad:** `CANT. PEDIR` usa el mismo patrón de `PedidoHistoriaDetalleModal` (botón `-`, `Input` numérico centrado, botón `+`; controles `size="icon-xs"`). Cualquier cambio en cantidad limpia la confirmación de esa fila.
- **Acciones por fila:** **Check** confirma la fila con la cantidad actual del input. **Cesto** pone la cantidad en `0` y confirma en el mismo click.
- **Confirmación global:** el botón **Confirmar Cant. Pedida** permanece deshabilitado hasta que todas las filas estén confirmadas.
- **Tipo `SobreStockReposicionItem`:** incluye `sucursalCodigoSobrestock`, `origenDeteccion` (en este flujo **`OTRA_SUCURSAL`**; el tipo conserva `LOCAL` por compatibilidad de contrato).
- **Tokens:** `TEXT_WARNING_CLASS` para el ícono de aviso; `AppModal` + `Dialog` como en el resto de modales compuestos.

### `PedidoHistoriaDetalleModal` (`src/components/pedidos/PedidoHistoriaDetalleModal.tsx`)

Modal del módulo **Historial Pedidos** para operar la recepción de ítems del pedido (tabla, cantidades recibidas, alta de productos, etc.). Usa **`AppModal`**.

- **Título (`AppModal`, prop `title`):** **Recepcion Pedido** (title case).
- **Altura del modal:** mantener altura fija en recepción (`h-[95vh] max-h-[95vh]`) para que el tamaño del modal no cambie según cantidad de filas; el scroll queda dentro de la tabla.
- **Resumen superior (columna proveedor):** sin micro-etiqueta “Nombre proveedor”; el nombre del proveedor es el primer nodo visible (`<p>` `text-sm font-semibold`). Contenedor **`flex-col justify-center gap-0.5 py-0`** **`text-center sm:text-left`**; padding horizontal **`CELDA_RESUMEN_PROVEEDOR_PADDING_X`**. Línea secundaria (**sucursal - dd/mm hh:mm**) sin **`mt-*`** (separación vía **`gap-0.5`**). Grid resumen: **`items-center`**. Sin estado PEDIDO/RECIBIDO en esa línea.
- **Resumen superior (borde a borde):** el panel de resumen se renderiza sin padding lateral ni márgenes negativos (`py-0`), con grid `w-full` para ocupar todo el ancho disponible del cuerpo.
- **Tabla ítems + totales:** pie **TOTAL PEDIDO** fuera del `<table>` y **fuera** del **`div`** con **`overflow-y-auto`** que envuelve solo la **`<Table>`** (**`<section aria-label="Totales del pedido">`** hermana bajo **`.contenedor-tabla-gestion`** **`flex flex-col`**: scroll **`flex-1 min-h-0 overflow-y-auto`**, totales **`shrink-0`** **`border-t`** **`bg-background`** **`py-2`**); ver punto 7.
- **Scroll en Recepción:** cuando la grilla de ítems supera el alto visible, el desplazamiento vertical debe ocurrir solo en el contenedor de filas (tbody) del bloque de tabla; header y totales permanecen fijos. En este modal, el contenedor de filas usa `no-scrollbar` para ocultar la barra visual sin perder scroll con rueda/trackpad y **no** debe tener `max-h` fijo, para que aproveche todo el alto disponible del cuerpo.
- **Alta de nuevos ítems:** se realiza con botón primario **`(+ ) Agregar Producto`** dentro del modal de recepción. Al hacer click, abre `AgregarProductosModal`, donde se selecciona el producto en tabla, se carga **CANT.** y se confirma con **Agregar Producto**.
- **Alta de nuevos ítems (borde a borde):** la sección de alta no usa márgenes negativos ni padding lateral manual; el bloque de filtro + botón toma el ancho completo disponible.
- **Altura fila alta (Recepción):** en la fila **filtro + cesto + Agregar Producto**, el **`FiltroBusquedaInput`** lleva `className="h-10 min-h-10"` y el botón **Agregar Producto** **`h-10 min-h-10`**, alineados con **`LimpiarFiltrosButton`** (`h-10`). Bordes/ring `#0072bb`, `rounded-md`, `text-sm`, `px-3 py-1` en el botón; en `sm+` ancho `w-auto`, en móvil `w-full`.
- **Filtro previo de alta:** arriba del botón `(+ ) Agregar Producto` se muestra `FiltroBusquedaInput` con placeholder **BUSCAR POR DESCRIPCIÓN...** y `LimpiarFiltrosButton` (ícono cesto) para limpiar el texto. Ese valor se usa como búsqueda inicial al abrir `AgregarProductosModal`.
- **Filtro por descripción (tabla de recepción):** el input de la fila de alta también filtra en vivo los ítems visibles de la tabla por `DESCRIPCIÓN` (case-insensitive). Si no hay coincidencias, mostrar estado vacío específico de búsqueda.
- **Limpieza automática del filtro:** cada vez que una fila pasa a checklist **TRUE** (OK, cesto o check de edición), el filtro por descripción de la tabla de recepción se limpia automáticamente.
- **Alta de producto y checklist:** al agregar una nueva fila en recepción, el ítem nuevo se marca confirmado y las confirmaciones previas de ítems existentes deben preservarse (no resetear checklist al recargar detalle).
- **Fila de acciones de alta (Recepción):** en `PedidoHistoriaDetalleModal`, **filtro + cesto** + **Agregar Producto** en `flex` (`sm:flex-row sm:justify-between sm:items-center sm:gap-x-10`): bloque izquierdo acotado (`sm:max-w-[36rem]`) para que el input de búsqueda no estire todo el ancho; bloque derecho **Agregar Producto** con `sm:w-auto sm:shrink-0` para dejar hueco visual claro entre filtrar y alta.
- **Separación funcional en fila de alta:** agrupar **filtro + cesto** como bloque izquierdo y **Agregar Producto** a la derecha; en móvil apilar con `gap-3` (`flex-col`).
- **Espaciado vertical fila alta:** la fila `filtro + agregar` lleva padding superior leve (`pt-1`) para separarla visualmente del bloque resumen.
- **Ancho/alto del botón Agregar (fila recepción):** altura **`h-10 min-h-10`** (misma que cesto e input de esa fila); ancho según contenido en escritorio, ancho completo en columna móvil.
- **Orden en filtros de `AgregarProductosModal`:** **DESCRIPCIÓN** (`FiltroBusquedaInput`) → **CANT.** (`Input`) → **cesto** (`LimpiarFiltrosButton`) en la misma fila. La tabla muestra primera columna de checkbox de selección; en modo `singleConfirm` solo puede quedar 1 fila marcada a la vez. El botón **Agregar Producto** del footer se habilita solo cuando hay una fila seleccionada y **CANT.** > 0.
- **Nota:** el texto `AGREGAR PRODUCTO A LA RECEPCIÓN` se mantiene solo como label de accesibilidad (sr-only) y no se muestra visualmente; la acción visible es el botón `(+ ) Agregar Producto`.
- **Lista de verificación / acciones:** el campo de la primera columna no admite tipeo; al abrir en estado **SIN RECEPCION**, la columna **CANT. RECIBIDA** inicia vacía para todas las filas y se completa de forma secuencial por acción del usuario. **OK** copia **cant. pedida** en **cant. recibida** y confirma checklist; **Editar** copia **cant. pedida** en **cant. recibida**, limpia confirmación y abre controles de edición (`-`, input, `+`); **cesto** coloca **0** y confirma checklist en UI. **Registrar En Dux** al completar cierra el modal.
- **Persistencia diferida (Recepción):** agregar producto, editar cantidades y confirmar checklist son cambios locales del modal; no deben persistirse en BD hasta ejecutar **Registrar En Dux** (o **Guardar Corrección** en pedidos recepcionados).
- **Persistencia de TOTAL PEDIDO:** al registrar en DUX, el modal envía `totalPedido` a backend para persistirlo en `prod_ped_historial.total`. Si el pedido ya está **RECEPCIONADO**, al reabrir el modal el input **TOTAL PEDIDO** se precarga con ese valor guardado para re-descargas del Excel.
- **Input TOTAL PEDIDO (tipeo):** visual **AR** (`$` + miles `.` + decimales `,`, máx. **2** cifras decimales). El usuario puede tipear **`,` o `.`** como separador decimal: si aparecen ambos, el **separador decimal** es el que queda **más a la derecha**; el otro solo agrupa. Repeticiones seguidas del **mismo** separador (`,,` / `..`) se colapsan a **uno** (el resto se ignora).
- **Pedido ya recepcionado (corrección):** cuando el pedido está en estado **RECEPCIONADO**, el footer muestra **Corregir Recepcion**. Al activarlo, el modal habilita los mismos campos cargados para permitir edición y cambia la acción a **Guardar Corrección**; al guardar, además de volver al modo bloqueado, dispara la misma exportación que **Descargar Recepcion** (`exportarExcelRecepcionPedidoAction`) para recalcular el campo **COMPROBANTE** del Excel con la consulta actual a DUX `/compras`.
- **Checklist inicial en corrección:** al cargar un pedido en estado **RECEPCIONADO**, la lista de verificación inicia con todos los ítems marcados como revisados (según la última recepción persistida), para que en **Corregir Recepcion** el usuario solo ajuste diferencias puntuales y no tenga que rehacer toda la confirmación.
- **Corrección en recepcionado (persistencia):** durante **Guardar Corrección**, las ediciones de **CANT. RECIBIDA** y el alta por **Agregar Producto** se persisten sobre `prod_ped_historial_merc` aun cuando la cabecera esté en estado **RECEPCIONADO**; la corrección no debe mostrar bloqueo por “Pedido ya recepcionado” en ese flujo.
- **Instructivo post-exportación (Recepción):** al descargar el Excel de recepción en `PedidoHistoriaDetalleModal`, se abre (con delay de 1500 ms) un modal tutorial de 5 pasos para importar en DUX: **Importar Datos** → **Nueva Importacion** → **Compra** → **cargar archivo** → **seleccionar ítems y guardar**.
- **Assets del instructivo de recepción:** las capturas del carrusel se toman desde `public/importar_compra_1.png` a `public/importar_compra_5.png` (una por paso, en ese orden).
- **Assets unificados de instructivos post-exportación:** los tres modales tutoriales (precios, stock y recepción) cargan imágenes desde `public/importar_precios_{1..5}.png`, `public/importar_stock_{1..5}.png` y `public/importar_compra_{1..5}.png` (una por paso, en ese orden), y usan el mismo título visible: **Instructivo: Importar El Archivo Exportado** y navegación homogénea de carrusel (**Paso Anterior** / **Paso Siguiente**).
- **Checklist visual (columna 1):** en filas no verificadas no mostrar recuadro/input placeholder en la columna de checklist; dejar celda limpia para evitar confusión. El check visible aparece solo cuando el ítem está confirmado (`TRUE`).
- **Visualización de `CANT. RECIBIDA`:** con pedido **SIN RECEPCION**, la celda queda **vacía** hasta que el ítem tenga checklist confirmada (**OK**, cesto o check de edición); recién entonces se muestra el número (incluido **`0`** tras cesto). Con pedido **RECEPCIONADO** (lectura o **Corregir Recepcion**), mostrar siempre el valor persistido; vacío solo cuando en datos es `null`.
- **Edición en CANT. RECIBIDA:** la columna se ensancha para soportar controles inline en edición (`-`, input, `+`, `check`). El botón `check` dentro de la celda confirma checklist con el número editado. Al ampliar esa columna, se incrementa también el ancho del `AppModal` para conservar legibilidad.
- **Orden de ítems en tabla de recepción:** mantener el orden original de carga (`detalle.items`) y **no** mover la fila cuando cambia checklist.
- **Contraste de estados (Recepción):** tabla con clase **`tabla-recepcion-pedido`**; pendiente **`recepcion-fila-pendiente`** (cebra global **odd/even**); verificado **`recepcion-fila-verificada`** (fondo gris intermedio **`muted`/`card` ~**72/28** en `oklab`) + círculo **`bg-primary/20`** en checklist; hover más oscuro (**~84/16**) en `globals.css`; altura de fila igual al estándar de tabla.
- **Confirmación optimista (Recepción):** en acciones **OK**, **cesto** y **check de edición**, el estado visual de checklist se marca en frontend antes de la respuesta del backend para acelerar percepción de respuesta; si la persistencia falla, se revierte al estado previo.

Layout, grillas y reglas de tabla: sección **Guía para IA**, punto 7 (`PedidoHistoriaDetalleModal`).

### `PedidoHistoriaLecturaModal` — **Ver Pedido** (`src/components/pedidos/PedidoHistoriaLecturaModal.tsx`)

- Solo lectura. Con pedido **Recepcionado**: tabla **DESCRIPCIÓN** (`w-[52%]`) | columna estrecha (`w-[10%]`, cabecera con **`sr-only`** "Diferencia cantidades") con **`AlertTriangle`** + **`Tooltip`** solo si cant. recibida ≠ cant. pedida — color vía token de marca **`accent2`** (`ICON_WARNING_INTERACTIVE_CLASS` en `@/lib/ui-classes`), no clases `amber-*` sueltas. Sin texto de resumen bajo la subcabecera sobre cantidad de ítems con diferencia; **CANT. RECIBIDA** sin **negrita** ni color condicional por diferencia (el detalle va en tooltip del ícono). Celdas vacías: string vacío (sin `—`). Con estado **Sin Recepción**: **DESCRIPCIÓN** + **CANT. PEDIDA** únicamente; footer **`AppModal`**: botón primario **Recepcion Pedido** (si existe **`onIrARecepcion`**) a la izquierda de **Cerrar** — cierra **Ver Pedido** y el padre abre **`PedidoHistoriaDetalleModal`** (mismo `pedidoHistoriaId`).

### `HistorialPedidosPageClient` (`src/components/pedidos/HistorialPedidosPageClient.tsx`)

Listado **Historial Pedidos** (`/pedidos/historial`). Todas las acciones están habilitadas para cualquier usuario con acceso a `pedidos`: **Recepción**, **Ver Detalles** y **Borrar**. **`FiltrosHistorialPedidos`**: **`estado`** en URL — sin `estado` o vacío, la página lista solo **`PENDIENTE`**; opciones visibles: **PENDIENTE**, **RECEPCIONADO**, **TODOS** (`estado=ALL`); **Limpiar filtros** restablece **`PENDIENTE`**. Compatibilidad legacy: el backend acepta `SIN RECEPCION` y lo normaliza a `PENDIENTE`. Parámetro URL **`q`** con **`useFiltrosConBusqueda`** (**700 ms**) + **`FiltroBusquedaInput`** en **`FilterRowSearch`**, **`focusStorageKey`** **`filtros-historial-pedidos-focus`**; al buscar se listan solo pedidos con algún ítem cuya descripción en catálogo coincida (backend: **`listarPedidosHistoria`**). **`PaginacionTabla`** incluye **`q`** en **`params`**. Última columna **ACCIONES** (`tabla-bloque-secundario-*` alineado al patrón de tabla gestión), celdas con **`flex items-center justify-center gap-2`**. Botones **`size="icon-xs"`** con **`Tooltip`**: **Recepción De Mercadería** (`PackageCheck`) → **`PedidoHistoriaDetalleModal`**; **Ver Detalles** (`Eye`) → **`PedidoHistoriaLecturaModal`** (solo lectura, título **Ver Pedido**; **`AppModal`** **`size="xl"`** (`sm:max-w-3xl`), **`scrollBody={false}`** para que la card sea **`flex flex-col` `overflow-hidden`** y el **único scroll vertical** sea **`.contenedor-tabla-gestion`** bajo la cabecera fija — patrón equivalente a *header / `flex-1 overflow-y-auto` con tabla + `thead` sticky / footer*; cabecera del cuerpo: **badge** **Pendiente** / **Recepcionado** y nombre proveedor en **una fila** (`flex items-center gap-2`), sucursal + fecha debajo; **`.contenedor-tabla-gestion`** **`no-scrollbar`** **`no-scroll-x`**; en **Ver Pedido** ver **`PedidoHistoriaLecturaModal`**; sin inputs); dentro de **Ver Pedido** la botonera incluye **Descargar PDF** (`Download`, **`descargarPdfPedidoHistoriaAction`** + **`descargarPdfBase64`** desde `@/lib/descargarPdfBase64`, loader **`Loader2`** mientras corre); **Borrar** (`Trash2`, hover **destructive**) → **`PedidoHistoriaBorrarConfirmModal`** (texto de confirmación, **Cancelar** outline / **Sí, Borrar** destructive). Tras cerrar recepción o borrar, **`router.refresh()`** mantiene el listado al día.
- **Descripción en Historial (fuente correcta):** cuando un ítem proviene de un producto vinculado, la columna **DESCRIPCIÓN** debe reflejar el producto de `prod_precios_tienda` resuelto por la vinculación (`id_lista_precios_tienda`) y no depender solo de coincidencia por `cod_ext` del proveedor activo; así se evita mostrar genéricos como *PRODUCTO VARIOS* en productos vinculados.

### `FiltroBusquedaInput` (`src/components/shared/FiltroBusquedaInput.tsx`)

Input unificado para búsqueda en filtros (ícono Search + limpiar + loader). Usar junto a `useFiltrosConBusqueda`.

- **Props**
  - **`id`**: `string`.
  - **`placeholder`**: `string` (en MAYÚSCULAS cuando sea placeholder de filtro).
  - **`value`** / **`onChange(value)`**.
  - **`isDebouncing`**: `boolean`.
  - **`inputRef`**: `RefObject<HTMLInputElement | null>`.
  - **`disabled`**: `boolean?`.
  - **`className`**: `string?`.

### `MontoArInput` (`src/components/shared/MontoArInput.tsx`)

Input monetario reutilizable (formato **AR**): muestra **`$`**, miles con `.` y decimales con `,` (máx. **2**).

- **Props**
  - **`valueNormalized`**: `string` — `"" | "123" | "123.45"` (siempre `.` como separador decimal interno).
  - **`onValueNormalizedChange(next)`**: callback al confirmar (onBlur) con el valor normalizado.
  - **`variant`**: `"totalPedido"` (default) — variantes definidas con **CVA**.
  - **`className`**: `string?` — para borde/ring (ej. `inputBorderClassName`) u overrides puntuales.
- **Reglas de tipeo**
  - Acepta **`,` o `.`** como separador decimal (si aparecen ambos, se toma el más a la derecha).
  - Repeticiones `,,` / `..` se colapsan a una sola.

### `PageSectionHeader` (`src/components/shared/PageSectionHeader.tsx`)

Núcleo **único** del encabezado de página (barra primaria, `h1`, `h3`, acciones, `Separator`). Variantes con **CVA** (`pageSectionHeaderRootVariants`) para evitar duplicar clases entre rutas.

- **Props**
  - **`title`**: `string` (title case).
  - **`subtitle`**: `string?` (vacío o `undefined` no renderiza el `h3`).
  - **`actions`**: `ReactNode?` (botones a la derecha, tamaño uniforme `h-10 px-4` vía CSS global).
  - **`tone`**: `"default" | "card"` (default `"default"`). `"card"` añade `bg-card` como refuerzo del token; el layout global `.section-header` ya usa `var(--card)`.
  - **`className`**: `string?`.
- **Accesibilidad**: `role="banner"` en el `<header>`; barra decorativa con `aria-hidden`.

**Consumo recomendado:** no importar este componente directamente salvo nuevos layouts; usar `SectionHeader` (API en español) o `ClassicPageHeader` (inglés + `tone="card"`).

### `ClassicPageHeader` (`src/components/shared/ClassicPageHeader.tsx`)

Wrapper sobre `PageSectionHeader` con **`tone="card"`** (misma API que antes: `title`, `subtitle`, `actions`, `className`).

### `ClassicFilteredTableLayout` (`src/components/shared/ClassicFilteredTableLayout.tsx`)

Layout reutilizable para páginas con **header + filtros + tabla**. Centraliza espaciados y contenedores con variantes **CVA** para evitar clases duplicadas en rutas.

- **Props**
  - **`title`**: `string` (title case, renderizado en `ClassicPageHeader`).
  - **`subtitle`**: `string?`.
  - **`actions`**: `ReactNode?` (acciones del header).
  - **`filters`**: `ReactNode?` (bloque de filtros).
  - **`children`**: `ReactNode` (contenido principal; normalmente tabla).
  - **`tone`**: `"gray" | "card"` (default `"gray"`).
  - **`contentWidth`**: `"default" | "full"` (default `"default"`).
  - **`density`**: `"default" | "compact"` (default `"default"`).
  - **`filtersAriaLabel`**: `string` (default `"Filtros"`), para accesibilidad del bloque `role="search"`.
  - **`className`** / **`contentClassName`**: overrides puntuales.

### Balance mensual (`src/components/finanzas/FinanzasBalanceMensualPageClient.tsx`)

Página **Finanzas → Balance → Balance mensual** (`/finanzas/balance/mensual`). Objetivo: **una sola tabla en CSS Grid** con columna **Concepto** + una columna por **Global** y cada sucursal con `genera_balance`, para alinear importes en la misma línea visual.

- **Layout**: `grid-template-columns: minmax(10.5rem, 1.05fr) repeat(N, minmax(6.75rem, 1fr))`; contenedor con `overflow-x-auto` y ancho mínimo para scroll en pantallas chicas.
- **Cabecera de columnas** (Concepto / Global / sucursales): fondo **`#0072BB`**, texto **blanco**, divisores `border-white/20`. *Es la excepción documentada en la guía para IA (punto 2 de estilos).*
- **Filas de datos**: orden lógico — **Ventas**, **Costo variable**, **Resultado operativo**, **Costo fijo**, **Resultado ejercicio**, **Margen Contribución** (%), **Punto de Equilibrio** ($ o `—`), **Margen Contribución Histórico**, **Punto de Equilibrio Histórico** (últimos dos con `—` hasta backend). Etiquetas de costos en el mismo color que Ventas (`text-foreground`).
- **Filas resultado** (operativo y ejercicio): fondo **`#a9d6f1`**, texto **`#063652`**, **negrita** en concepto e importes; en la columna Concepto **`pl-10`** para indentar. Constantes `BG_FILA_RESULTADO` / `FG_FILA_RESULTADO` en el componente.
- **Fila Ventas — edición**: si `puedeEditarVentas` y la columna tiene `sucursalId`, cada celda usa grid **`[1fr_2.25rem]`**: monto a la izquierda, **botón lápiz** (`ghost`, `size="icon"`) a la **derecha** del importe; en **Global** se reserva un hueco `h-8 w-8` para alinear montos con las columnas que llevan botón.
- **Modal**: `EditarVentasBalanceMensualModal.tsx` — `MontoArInput`, `crearFinBalVtasAction`, `router.refresh()` al guardar.
- **Filtros**: mes y año en `FilterBar` + `ClassicFilteredTableLayout` (`contentWidth="full"`). Aviso ámbar si no hay sucursales con `genera_balance`.

### `SectionHeader` (`src/components/SectionHeader.tsx`)

API histórica (`titulo`, `subtitulo`, `actions`). Delega en `PageSectionHeader` con `tone` default (sin refuerzo `bg-card` explícito en Tailwind).

### `TableEmptyState` (`src/components/shared/TableEmptyState.tsx`)

Mensaje de **lista/tabla vacía** con tokens (`text-muted-foreground`) y densidades unificadas. Exporta **CVA**: `tableEmptyStateContainerVariants`, `tableEmptyStateMessageVariants`.

- **Props (`TableEmptyState`)**
  - **`message`**: `string`.
  - **`placement`**: `"tableCell" | "panel" | "compact"` — `tableCell` ≈ fila vacía estándar (`py-8`); `panel` para modales (`py-12`); `compact` para paneles secundarios (`py-6`).
  - **`textSize`**: `"sm" | "xs"`.
  - **`maxWidth`**: `"readable" | "full"` — `readable` aplica `max-w-md` al texto (comportamiento de `EmptyTableRow` en `ui/table`).
  - **`as`**: `"div" | "p"` (default `"div"`). Usar `"p"` cuando el padre requiera un párrafo semántico.
  - **`className`** / **`messageClassName`**: overrides puntuales.

**Integración:** `EmptyTableRow` (`@/components/ui/table`) y `ModalTablaConFiltros` usan estas variantes para no duplicar utilidades. Paneles secundarios (ej. **Control Aumentos**) pueden usar `<TableEmptyState as="p" … />` para mantener densidad y tokens.

### `MensajeProceso` (`src/components/shared/MensajeProceso.tsx`)

Indicador de **proceso en curso** (modal, importación, barra lateral). Clases globales `.mensaje-proceso` / `.mensaje-proceso--sidebar`; contenedor variantado con **CVA** (`mensajeProcesoVariants`).

- **Props**
  - **`mensaje`**: `string`.
  - **`detalle`**: `{ procesados: number; total: number } | string | null | undefined` — objeto muestra “X de Y” con locale `es-AR`.
  - **`variant`**: `"default" | "sidebar"`.
  - **`className`**: `string?`.
  - **`onDoubleClick`**: `() => void?` — si está definido, el contenedor usa **`cursor-pointer`** y **`title`** *«Doble Clic Para Cancelar Sincronización»* (p. ej. sync lista precios en slidenav).
- **Accesibilidad**: `role="status"`, `aria-live="polite"`.

### `ModalMicroLabel` (`src/components/shared/ModalMicroLabel.tsx`)

Etiqueta visual **compacta** para títulos de campo o bloques dentro de modales (tipografía en MAYÚSCULAS alineada a filtros/tablas). Implementación con **CVA** (`modalMicroLabelVariants`).

- **Props**
  - **`children`**: `ReactNode` — texto en MAYÚSCULAS (según guía de mayúsculas en filtros cuando aplique).
  - **`align`** (CVA): `"left"` (default) \| `"center"` — controla `text-left` / `text-center` y `w-full leading-tight`.
  - **`className`**: `string?` — combina con `cn()` para overrides puntuales.
  - Resto: atributos nativos de `<span>` (`id`, `ref`, etc.).
- **Accesibilidad**: es un `<span>` decorativo; si precede a un control, envolver en `<label>` (como en **FECHA FACTURA** de `PedidoHistoriaDetalleModal`) o asociar el control con `aria-labelledby` / `aria-label` explícito en el input.
- **Cuándo usarlo**: micro-etiquetas sobre inputs o separación de secciones en modales densos; evita duplicar `text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground`.

### `DuxSyncStyleButton` (`src/components/shared/DuxSyncStyleButton.tsx`)

Botón de **dos líneas** con **swap al hover** en la primera (misma interacción que el sync de lista precios en slidenav). Implementado con **CVA** (`duxSyncStyleButtonVariants`, `duxSyncStyleSecondaryVariants`).

- **Props**
  - **`lineIdle`** / **`lineHover`**: `string` — texto línea 1 en reposo vs hover (ambos visibles con cross-fade; si `busy` o `disabled`, no se aplica hover).
  - **`secondary`**: `ReactNode` — segunda línea (ej. `Últ. Act.: …`); en hover se colapsa (`max-h-0` + opacidad), igual que en slidenav.
  - **`surface`**: `"sidebar"` (default, `bg-sidebar-accent` + `text-sidebar-foreground`) | `"card"` (`border` + `bg-card` + `text-foreground`, hover `bg-muted/60`) para uso fuera de la slidenav si hiciera falta.
  - **`busy`**: `boolean` — cursor espera y opacidad atenuada; alinea línea 1 sin efecto hover.
  - Resto: atributos estándar de `<button>` (`onClick`, `disabled`, `aria-label`, `className`, etc.).
- **Uso**: `SyncStatusIndicator` (lista precios en áreas **Gestión Productos** / **Estadísticas Productos**; compras en **Finanzas**); `SincronizarComprobantesProveedorDuxButton` (cabecera de **`/finanzas/tesoreria`** para `editor`, misma piel `surface="sidebar"`).

### `formatLastCompletedAtElapsed` (`src/lib/formatElapsedSince.ts`)

Helper compartido para textos **Últ. Act.: Hace …** (bloques de 15 min. bajo 1 h; luego horas/días). Usado por `SyncStatusIndicator` y por el botón de compras en Finanzas.

### Slidenav — Áreas principales (`src/lib/main-app-areas.ts`, `src/components/shared/SidebarMainAppArea.tsx`)

La app se divide en **tres áreas** de alto nivel; el resto de rutas actuales pertenecen a **Gestión Productos** (comportamiento por defecto).

- **`MAIN_APP_AREAS`**: cada ítem tiene `id`, `label` (title case en datos), `statusLabel` (ej. **Terminada** / **A construir**), `href` (entrada al elegir el área). En slidenav y modal, el nombre visible usa **`areaLabelMayusculas(label)`** (`toLocaleUpperCase("es")`) → **MAYÚSCULAS** (ej. **GESTIÓN PRODUCTOS**).
- **`getMainAppAreaIdFromPathname(pathname)`**: `/finanzas` y `/finanzas/*` → **Finanzas**; `/estadisticas-productos` y subrutas → **Estadísticas Productos**; cualquier otra ruta → **Gestión Productos** (incluye `/`, `/proveedores`, `/tienda`, `/stock`, `/pedidos`, `/importar`, etc.).
- **Navegación lateral por área activa** (`Sidebar.tsx`): los módulos (`PEDIDO DE MERCADERÍA`, `LISTA PROVEEDORES`, `LISTA TIENDA`) se muestran **solo** cuando el área activa es **Gestión Productos**. Con área **Finanzas** se muestran, en este orden, dos bloques: primero **`BALANCE`** (`Scale`) con submódulos **Gastos** → `/finanzas/balance/gastos` (`Receipt`) y **Catálogo Gastos** → `/finanzas/balance/gastos/catalogo` (`FolderTree`); luego **`FINANZAS`** (`Landmark`) con **Tesorería** → `/finanzas/tesoreria` (`Banknote`), **Flujo De Fondo** → `/finanzas/venc-por-fecha` (`CalendarDays`), **Venc. Provee. Merc.** → `/finanzas/deuda-proveedores` (`Wallet`), **Venc. Provee. Gastos** → `/finanzas/vencimientos-gastos` (`CalendarClock`) y **Control Comprobantes** → `/finanzas/control-comprobantes` (`FileSearch`) (todos `PERMISOS.finanzas.acceso`). `getOpenModule` abre **BALANCE** para rutas `/finanzas/balance/*` y **FINANZAS** para el resto de `/finanzas/*`. En **Estadísticas Productos** no hay módulos en sidebar todavía (mensaje vacío).
- **`SidebarMainAppArea`** (client): recibe **`esEditor`** desde `Sidebar` (`rol === "editor"`). Con **`showLogo` y `showLabel`**, el **nombre del área** no va dentro del botón del logo (ese botón usa `max-w-[45%]`): se renderiza **encima**, en un contenedor **`w-full min-w-0 px-1 text-center`** con `role="status"` + `aria-live="polite"`, y el `<span>` del nombre con **`w-full text-center`** + tipografía sidebar (`whitespace-nowrap`, `text-[13px]`, `leading-none`) para una sola línea centrada en todo el ancho del sidebar; el texto del nombre pasa por **`areaLabelMayusculas`**. **Rol `editor`:** el **logo** es `<button>` + `Image` (`alt=""`) con `aria-label` **Elegir Área De La Aplicación**; el click abre **`Dialog` + `AppModal`** **Áreas De La Aplicación** con las **tres** opciones (`MAIN_APP_AREAS`, `router.push` al `href` de cada área). **Rol `simple`:** el logo es un **`<div>`** decorativo (sin modal): **Finanzas** y **Estadísticas Productos** no se ofrecen en el selector — solo **Gestión Productos** como área de trabajo. Con **`showLabel` y sin logo** (`showLogo={false}`), el nombre sigue en `role="status"` con **`pb-0.5`** en el `<span>`. En el modal (solo editor), la opción de la ruta actual resaltada (`border-sidebar-indicator`, `bg-sidebar-accent/40`); íconos `lucide-react` por opción (`Boxes`, `Landmark`, `BarChart3`). Variantes **CVA**: `areaOptionVariants`, `areaTitleVariants` / `areaStatusVariants` (`context`: `sidebar` | `modal`).
- **`/finanzas`**: **`permanentRedirect`** a **`/finanzas/tesoreria`** (`src/app/finanzas/page.tsx`); no hay pantalla de resumen. La entrada del área **Finanzas** en el modal de áreas usa **`MAIN_APP_AREAS`** → mismo destino (`src/lib/main-app-areas.ts`). En sidebar, **Tesorería** se considera activa también si la ruta es exactamente **`/finanzas`** (hasta completar el redirect).
- **`/finanzas/tesoreria`**: **`ClassicFilteredTableLayout`** título **Finanzas**, subtítulo **Tesorería**. Incluye bloque de filtros con tres desplegables (**CAJA**, **TITULAR**, **TIPO CAJA**) y botón de limpieza inline en la misma fila (`FilterBar` + `FilaFiltrosDesplegables` + `FILTER_INLINE_ACTION_SLOT_CLASS`) cuando el contenido entra en una línea. **`actions`** (solo `editor`): fila **`flex flex-wrap`** con **`SincronizarComprobantesProveedorDuxButton`** (consulta compras DUX, **sonner**, **Últ. Act.** local) y botón **Nueva Caja** (`h-10 px-4`, `Plus`) que abre **`NuevaCajaTesoreriaModal`** (título visible: **Crear Caja**). Modal (`AppModal`) con alta por tres campos: **NOMBRE CAJA**, **TITULAR** y **TIPO CAJA** (`DIGITAL | EFECTIVO | CHEQUE`); guarda con `crearCajaTesoreriaAction` y `router.refresh()`. **NOMBRE CAJA** y **TITULAR** se muestran en MAYÚSCULAS y se persisten en MAYÚSCULAS. **TITULAR** se elige por desplegable fijo (sin texto libre) con estos valores: `SUC. GUAYMALLEN`, `SUC. MAIPU`, `WALTER GARCIA`, `FERNANDO PANAIA`, `EMILIANO GARCIA`, `VANESA GARCIA`. Tabla **`TablaTesoreriaCajas`**: **`contenedor-tabla-gestion--pie-fijo`** (scroll solo el cuerpo; bajo el scroll, **TOTAL** y suma de **MONTO** en **`.finanzas-resumen-tarjeta`**, alineado a **Balance · Gastos**; `scrollbar-gutter: stable` en **`contenedor-tabla-gestion--pie-fijo-scroll`** vía `globals.css`). Columnas **CAJA**, **TITULAR**, **TIPO CAJA** (`TipoCajaTesoreria`), **MONTO** (`$` + `fmtPrecio`, entero), **ÚLT. ACTUALIZACIÓN** (`ult_actualizacion` con `formatFechaHoraCompletaArgentina`, segunda importancia) y **ACCIONES** (solo `editor`: editar/eliminar). En **ÚLT. ACTUALIZACIÓN**, cuando la caja supera **5 días** sin cambios de monto, mostrar llamado de atención visual con **`TriangleAlert`** y estilo de advertencia (`TEXT_WARNING_CLASS`) junto a la fecha (ej. `+6 D`). Doble clic sobre fila (solo `editor`) abre **`ActualizarMontoCajaTesoreriaModal`** para modificar solo **MONTO** y guardar con `editarCajaTesoreriaAction`. El ícono lápiz abre **`EditarCajaTesoreriaModal`** (edita nombre, titular y tipo; conserva monto) y el cesto abre **`EliminarCajaTesoreriaModal`** con confirmación. Sin paginación. Datos desde `listarCajasTesoreria` (servidor). `PERMISOS.finanzas.acceso`. **`SyncStatusIndicator`** en Finanzas mantiene su propio **Últ. Act.** de compras.
- **`PedidoHistoriaDetalleModal` — `TOTAL PEDIDO` (`MontoArInput`)**: input con patrón **POS** (desplazamiento de centavos). Reglas: solo admite dígitos (`0-9`) y borrado (`Backspace`/`Delete`); **no** admite `.` ni `,`; el display inicia siempre en **`0,00`** y cada dígito nuevo desplaza el valor (ej. `1 -> 0,01`, `12 -> 0,12`, `123 -> 1,23`). Límite máximo: **`99.999.999,99`**.
- **`/finanzas/deuda-proveedores`**: **`ClassicFilteredTableLayout`** título **Finanzas**, subtítulo **Venc. Provee. Merc.** (nombre visible; la URL se mantiene por compatibilidad). Tabla **`TablaDeudaProveedores`**: columnas **PROVEEDOR**, **DEUDA TOTAL**, **VENCIDA**, **5 DÍAS**, **30 DÍAS**, **45 DÍAS**, **60 DÍAS** (importes `$` + `es-AR` 2 dec.); reparto del saldo por vencimiento según servicio (ver `BACKEND_GUIDELINES` §2.5a). Contador **X PROVEEDOR(ES) CON DEUDA**. Sin paginación. `PERMISOS.finanzas.acceso`.
- **`/finanzas/vencimientos-gastos`**: **`FinanzasVencimientosGastosPageClient`**: mismo ancho de contenido que **`/finanzas/deuda-proveedores`** (`ClassicFilteredTableLayout` con `contentWidth` por defecto = `max-w-7xl mx-auto` + padding de `contenedor-pagina-con-filtros`). Proveedores con `proveedorMercaderia === false` y obligación de gasto de balance vencida (`fecha_venc` &lt; hoy AR, pendiente a hoy &gt; 0). **`TablaVencimientosGastosNoMercaderia`**: envoltorio `flex flex-1 min-h-0 flex-col gap-2 px-4 pb-4 sm:px-6 lg:px-8` alineado con **`TablaDeudaProveedores`**; columnas **PROVEEDOR**, **TOTAL VENCIDO**; doble clic abre **`Dialog`** + **`AppModal`** (título **Detalle De Vencimientos**, subtítulo en header: proveedor + **CORTE:** `formatFechaLargaNotaPedidoArgentina` desde `hoyIso`) + **`TablaFlujoDeFondoDetalleDia`** filtrada en cliente por proveedor; **`emptyMessage`** en mayúsculas acorde a este contexto (la grilla compartida con Flujo de Fondo usa el mensaje por defecto orientado al día). Datos: `listarObligacionesGastoVencidasNoMercaderia` en `finBalGastoMensualBalance.service.ts`. `PERMISOS.finanzas.acceso`.
- **`/finanzas/venc-por-fecha`**: **`src/app/finanzas/venc-por-fecha/page.tsx`** (servidor) + **`FinanzasVencPorFechaPageClient`**. **`ClassicFilteredTableLayout`** `contentWidth="full"`, título **Finanzas**, subtítulo **Flujo De Fondo**; **`filters`**: **FilterBar** con Select **PROVEEDOR** + **`LimpiarFiltrosButton`**. Sobre el bloque de grilla: contador **`FILTER_COUNT_CLASS`** (**X DÍA(S) EN ESTA PÁGINA**), si hay paginación **`· Pág. n / m`**, texto **Ventana: Y días (hoy + 150)**. Rango: **hoy** (AR) a **hoy+150** — venc. de comprobantes (`listarVencimientosEnRango`) **y** venc. de imputaciones de balance (`listarVencimientosGastoFlujoEnRango`; fecha de vencimiento del gasto = **mismo día del mes calendario siguiente** al devengo, ver `BACKEND_GUIDELINES` §2.5e); detalle: **MERCADERÍA** o nombre de gasto. **Vista:** **`TablaFlujoDeFondo`**, **`TablaFlujoDeFondoDetalleDia`**: **mismo cascarón** que Deuda/Control, clase **`tabla-flujo-de-fondo`**; **cebra global** (no tinte de fila por **SALDO** negativo); importe en rojo con **`text-destructive font-semibold`** solo en la celda **SALDO** si aplica. **`<colgroup>`** grilla 20% × 5; **FECHA** centrada en cuerpo; **modal** tres columnas **PROVEEDOR** · **DETALLE** (MERCADERÍA o gasto) · **MONTO** (pendiente, una fila por obligación, orden alfabético con desempate por fechas/ids, ver `ordenarDetallesFlujoDia`); con filtro **PROVEEDOR** el modal y la columna **VENCIMIENTO DEL DÍA** restringen a ese proveedor. cálculo VTOS/CAJA/SALDO en el cliente. **Paginación** 100, `pagina`. **Doble clic** → modal, **`no-scrollbar`**. `PERMISOS.finanzas.acceso`.
- **`/finanzas/control-comprobantes`**: **`ClassicFilteredTableLayout`** título **Finanzas**, subtítulo **Control Comprobantes**. Tabla **`TablaControlComprobantes`** con columnas: **CONTROLADO** (primera), **FECHA COMP.** (segunda), **PROVEEDOR**, **SUCURSAL**, **COMPROBANTE**, **TOTAL**, **MONTO APLICADO** y **VENCIMIENTO**. La vista usa **filtros de una sola línea** (sin búsqueda por descripción): **PROVEEDOR**, **SUCURSAL**, **PAGADO** (solo opción `PENDIENTE`), **VENCIDO** (solo opción `VENCIDO`) y **CONTROLADO** (solo opción `NO`). En **VENCIMIENTO** se muestra monto solo si existe saldo vencido según regla backend (`vencimientoSaldo > 0`); caso contrario la celda queda vacía. **CONTROLADO** es de solo lectura: renderiza `tabla-check-toggle` (alto autoajustado) sin interacción directa en celda; si está en `true` se pinta con **fondo azul (`primary`) + tilde blanca** para contraste. La marcación se realiza por **doble click en fila** (solo `editor`), que abre `AppModal` dinámico de confirmación: si está en `false` pregunta por marcar como **"Controlado"**; si está en `true` pregunta por marcar como **"No Controlado"**. Al confirmar llama a `actualizarControladoComprobanteAction` + `router.refresh()`.
- **Nuevo patrón global de filtros por fecha (fila 2 con flecha):** usar `FilterRowDateRange` + `FILTER_DATE_RANGE_TRIGGER_CLASS` (`@/components/FilterBar`). La segunda fila no contiene búsqueda de descripción: muestra un trigger con ícono/flecha que abre **`FiltroRangoFechasCalendarioModal`** (`@/components/shared/FiltroRangoFechasCalendarioModal.tsx`): calendario mensual (semana inicia lunes), navegación mes anterior/siguiente, **primer click** en un día = fecha desde, **segundo click** = fecha hasta (si el segundo es anterior al primero se intercambian); al completar el segundo click se aplica el rango y se cierra el modal. Botones **Limpiar** (borra rango y cierra) y **Cerrar** (cierra sin aplicar cambio si no se completó el segundo click).
- **`/finanzas/control-comprobantes`**: **`ClassicFilteredTableLayout`** título **Finanzas**, subtítulo **Control Comprobantes**. Tabla **`TablaControlComprobantes`** con columnas: **CONTROLADO** (primera), **FECHA COMP.** (segunda), **PROVEEDOR**, **SUCURSAL**, **COMPROBANTE**, **TOTAL**, **MONTO APLICADO** y **VENCIMIENTO**. La vista usa **filtro doble fila**: primera fila con **PROVEEDOR**, **SUCURSAL**, **PAGADO** (solo `PENDIENTE`), **VENCIDO** (solo `VENCIDO`) y **CONTROLADO** (solo `NO`); segunda fila con filtro de rango de fechas por flecha. En **VENCIMIENTO** se muestra monto solo si existe saldo vencido según regla backend (`vencimientoSaldo > 0`); caso contrario la celda queda vacía. **CONTROLADO** es de solo lectura: renderiza `tabla-check-toggle` (alto autoajustado) sin interacción directa en celda; si está en `true` se pinta con **fondo azul (`primary`) + tilde blanca** para contraste. La marcación se realiza por **doble click en fila** (solo `editor`), que abre `AppModal` dinámico de confirmación: si está en `false` pregunta por marcar como **"Controlado"**; si está en `true` pregunta por marcar como **"No Controlado"**. Al confirmar llama a `actualizarControladoComprobanteAction` + `router.refresh()`.
- **`/finanzas/balance/gastos/catalogo`**: **`ClassicFilteredTableLayout`** título **FINANZAS**, subtítulo **Balance · Catálogo Gastos** (submódulo **Catálogo Gastos** dentro del módulo **BALANCE**, ícono `FolderTree`). Página dedicada al mantenimiento del catálogo jerárquico `fin_bal_gasto_tipo → fin_bal_gasto_rubro → fin_bal_cat_gasto` (ver `BACKEND_GUIDELINES` §2.5e) **+ catálogo maestro de proveedores "no-mercadería"** (5ª columna autónoma). **Layout tipo Finder de 5 columnas** con `grid md:grid-cols-2 xl:grid-cols-5 gap-3` dentro del contenido del layout: **TIPOS** · **RUBROS** · **GASTOS** · **GASTO FINAL** · **PROVEEDORES** (las 4 primeras en cascada: gasto de catálogo `fin_bal_cat_gasto` sin proveedor; la 4ª lista `fin_bal_gasto_final`; la 5ª es independiente). En viewports medianos se apilan 2+2+1, en `xl` se expanden a 5 columnas. Cada columna es una `<section>` con borde y `rounded-lg`, header en `bg-muted/60` que muestra el **título** (uppercase tracking), un **subtítulo contextual** (contador de hijos o prompt `Seleccioná un tipo/rubro`) y un botón **`+ Nuevo`** (solo `editor`, `size="sm"`, `h-8`, ícono `Plus`). El body de la columna es `flex-1 overflow-y-auto` y renderiza filas `FilaCatalogo`. **Selección en cascada:** click en un tipo selecciona y puebla la columna de rubros (reset del rubro y del gasto); click en un rubro selecciona y puebla la columna de gastos (reset del gasto); click en un gasto selecciona y puebla **GASTO - PROVEEDOR**. Estado seleccionado: `bg-primary/10` + `ChevronRight` en color `primary`. Filas: `truncate` para el nombre + meta auxiliar (`N rubros` / `N gastos`) en `text-[11px]`, con acciones **editar** (ícono `Pencil`) y **eliminar** (ícono `Trash2`, color destructive) ocultas por defecto y visibles en `group-hover`/`group-focus-within` (solo `editor`). Click/Enter/Space en la fila dispara la selección; los `<Button>` de acción usan `e.stopPropagation()` para no activarla. Estados vacíos centrados con `EmptyState` (columna vacía, padre no seleccionado, padre sin hijos). Las mutaciones de tipo/rubro/gasto usan **`CrearEditarFinBalCatalogoItemModal`** y **`EliminarFinBalCatalogoItemModal`** (`nivel: "tipo" | "rubro" | "gasto"`). El modal de catálogo solo persiste **NOMBRE**; en **alta de gasto** (`esAltaGastoSoloNombre`) solo se muestra NOMBRE (sin contexto rubro). La tabla hoja `fin_bal_cat_gasto` no tiene proveedor. **Columna GASTOS:** filas con `meta` = conteo de asignaciones (`fin_bal_gasto_provee`). **GASTO - PROVEEDOR:** `CrearEditarFinBalGastoProveeModal` + `EliminarFinBalGastoProveeModal` (Select proveedor desde `proveedores` precargados + **GASTO MENSUAL** SÍ/NO). El modal de eliminación de tipo/rubro/gasto es `AppModal size="sm"` con **Sí, Eliminar**; `onDelete: Restrict` en jerarquía. **Columna PROVEEDORES:** autónoma, `getProveedoresNoMercaderia()`, `meta` = prefijo, click abre **`ProveedorModal`**; el payload `proveedores` alimenta también el Select de asignaciones. **Importante**: si en alta/edición el usuario marca `PROVEEDOR MERCADERÍA = SI`, ese proveedor saldrá del listado (quedará visible en `/gestion-productos/proveedores/lista`). **Permiso:** `PERMISOS.finanzas.acceso` (rol `simple` ve la jerarquía + lista de proveedores en modo lectura, sin botones de mutación).
- **`/finanzas/balance/gastos`**: **`ClassicFilteredTableLayout`** `contentWidth="full"`, título **Balance**, subtítulo **Gastos**. **Filtros** (`FilterBar` `filtros-contenedor-tienda bg-card`): **fila 1** `FilterRowSelection` + `FilaFiltrosDesplegables` — **RUBRO**, **GASTO** (opciones acotadas si hay rubro), **SUCURSAL**, **PROVEEDOR**, **PAGADO** (opción **PENDIENTE** = solo filas con `montoDevengadoPendiente > 0`); patrón global de Select (`input-filtro-unificado`, `SelectContent` `position="popper"` `side="bottom"` `align="start"` `select-content-filtro`, primera opción con valor `none` muestra el **nombre de la dimensión** en el trigger, ej. **RUBRO**, **GASTO**, …, no la palabra «TODOS»). **Fila 2** — misma retícula de cinco columnas: **Año**, **Mes** y, en `col-span-3` (`FILTER_INLINE_ACTION_SLOT_CLASS`), contador **`FILTER_COUNT_CLASS`** (**X GASTO(S)**) + **`LimpiarFiltrosButton`**. Select **Mes**: los **12 meses** del año. Select **Año**: **2026–2046** (`ANIOS_FILTRO_BALANCE_GASTOS` en `FinanzasBalanceGastosPageClient`). Sin `mes`/`anio` en la URL, el servidor **`redirect`** a **`?mes=&anio=`** del **mes y año actuales en Argentina**. Query validada con `mesAnioQuerySchema`. Solo `editor`: **Cargar Datos Mes.** llama `cargarFinBalGastoMensualMesAction({ mes, anio })`. Tabla **`TablaGastos`**: **FECHA**, **SUCURSAL**, **TIPO GASTO**, **RUBRO** (8% c/u), **GASTO** y **PROVEEDOR** (15% c/u), **MONTO**, **PAGADO**, **DEVENGADO** (8% c/u; muestra **pendiente de pago sobre el devengado**: acumulado proporcional hasta hoy − **PAGADO**, mínimo 0); con `editor`, **ACCIONES** (14%, `tabla-bloque-secundario-*`, `bg-muted/25`, `Pencil` / Pagar / `Trash2`). **Scroll** único a la derecha de toda la tabla (incluye **ACCIONES**). Sin columna **MONTO VENCIDO**. Sin **ACCIONES** (rol `simple`), el `colgroup` aplica la misma proporción de las 9 columnas de datos escalada a 100%. **Editar monto** → `EditarMontoFinBalGastoMensualModal`: fila **Ult. Monto $… — Repetir Monto** (aplica el monto del mes anterior y cierra); **Eliminar** → `EliminarFinBalGastoMensualModal`. Banda bajo el scroll (`w-full` como la tabla, `border-t`), **tarjetas** compactas **centradas** con totales **MONTO** / **PAGADO** / **DEVENGADO** (`aria-live="polite"`); sin fila de pie en la tabla. `PERMISOS.finanzas.acceso`.
- Rutas placeholder: **`/estadisticas-productos`** (página “A construir” con `SectionHeader`).
- **Jerarquía canónica de URLs (2026-03):** para el área **Gestión Productos** usar siempre prefijo **`/gestion-productos`** con estructura **área/módulo/submódulo**:
  - Proveedores: `/gestion-productos/proveedores`, `/gestion-productos/proveedores/lista-precios`, `/gestion-productos/proveedores/sugeridos`, `/gestion-productos/proveedores/comparacion-categorias`, `/gestion-productos/proveedores/lista`.
  - Tienda: `/gestion-productos/tienda/comp-proveedores`, `/gestion-productos/tienda/control-aumento`, `/gestion-productos/tienda/control-stock`, `/gestion-productos/tienda/calc-tintometrico`, `/gestion-productos/tienda/calc-litros`.
  - **Comp. Proveedores** (`src/app/tienda/page.tsx`, URL canónica **`/gestion-productos/tienda/comp-proveedores`**): cabecera **`ClassicFilteredTableLayout`** con acción **Cambiar A Prov. Menor Costo**; requiere selección múltiple en la grilla (`TablaTienda`, checkbox por fila + seleccionar todos visibles). Al ejecutar, actualiza ítems seleccionados y exporta dos Excel: **Act. Proveedor** (`CODIGO`, `CODIGO EXTERNO`, `PROVEEDOR`, `COSTO`) y **Act. Margen** (`CODIGO`, `IMPORTE`).
  - Pedidos: `/gestion-productos/pedidos`, `/gestion-productos/pedidos/generar-pedido`, `/gestion-productos/pedidos/urgente`, `/gestion-productos/pedidos/tintometrico`, `/gestion-productos/pedidos/reposicion`, `/gestion-productos/pedidos/historial`.
  - Compatibilidad: mantener redirecciones de rutas legacy (`/proveedores`, `/tienda`, `/stock`, `/pedidos/*`) hacia las rutas canónicas.

### Slidenav — Botón de usuario (perfil) (`src/components/SelectorRol.tsx`)

En la slidenav se usa `SelectorRol` con `compact` para renderizar un **botón de una sola línea**, montado en **`Sidebar`** debajo del bloque **nombre del área + logo** (bloque inferior `mt-auto`, no en la cabecera).

- **Formato**: ícono `User` (`aria-hidden`) + texto **`SIMPLE` / `EDITOR`** (según `rolActual`).
- **Interacción**
  - En **SIMPLE**: click abre modal de contraseña para pasar a **EDITOR**.
  - En **EDITOR**: click vuelve a **SIMPLE** sin modal.
- **Feedback visual**: el botón debe tener hover claro (ej. `hover:bg-sidebar-accent/80`) y `focus-visible:ring-*` para accesibilidad.

#### Modal “Acceso De Editor” (mismo archivo)

- El modal se adapta al diseño estándar usando `AppModal` (header corporativo + footer con botonera).
- Botones y título respetan el Title Case (ej. `Acceso De Editor`, `Activar Modo Editor`).

### Slidenav — Sincronización DUX (`src/components/layout/SyncStatusIndicator.tsx`)

Botón/indicador persistente en la parte inferior de la slidenav. El markup del reposo se delega a **`DuxSyncStyleButton`** (`surface="sidebar"`).

- **Estados**
  - **Reposo**: etiquetas por área (ver bullet **Ritmo vertical** arriba). **`Últ. Act.:** en **Gestión Productos** / **Estadísticas Productos** viene del polling (`lastCompletedAt` de lista precios). En **Finanzas** refleja la **última sync de compras exitosa en el cliente** (misma sesión; no es el timestamp de lista precios).
  - **Sync lista precios en curso** (polling): **`MensajeProceso`** **`SINCRONIZANDO PROD.`** + detalle **X de Y**. **Doble clic** en ese bloque abre **`AppModal`** **Cancelar Sincronización** con confirmación *«¿Está seguro que desea cancelar la sincronización?»*; **Sí, Cancelar** llama **`POST /api/sync-lista-precios-tienda/cancel`**. Una cancelación **no** actualiza **`lastCompletedAt`** (no cuenta para **Últ. Act.**).
  - **Sync compras en curso** (Finanzas, action): **`MensajeProceso`** **`SINCRONIZANDO COMPRAS`** + **…**.
- **Feedback visual por estado**
  - **Reposo**: `bg-sidebar-accent` con hover suave (componente compartido).
  - **Consulta**: **fondo amarillo de marca** `bg-accent2` (token `--accent2`) para indicar proceso activo.

### Comp. Por Cat. — DTO. EXTRA Persistente

En el módulo **`Comp. Por Cat.`** (`src/components/proveedores/ComparacionCategoriasClient.tsx`) el campo `DTO. EXTRA` es editable por ítem y se guarda en backend con `actualizarDtoExtraComparacionAction`.

**Layout de la tabla**: no hay un segundo encabezado de tarjeta con la ruta (marca / categoría / presentación) encima de la grilla; el contexto queda en los filtros y en los mensajes vacíos dentro del área de tabla.

La columna **VARIACIÓN** usa siempre precio efectivo con `DTO. EXTRA` y un **mínimo como base**: sin casillas `SEL.`, base = mínimo de **toda** la tabla visible; con una o más casillas marcadas, base = mínimo **solo entre las filas marcadas** y solo esas filas muestran porcentaje (el resto en blanco).

La tabla incluye una última columna de acciones con ícono de cesto:
- Encabezado: cesto visual.
- Filas: botón cesto que quita el ítem de la presentación (desasigna la fila) usando `quitarAsignacionPresentacionAction`.

Comparación con casillas `SEL.` (solo front):
- Columna `SEL.` con casilla por fila; se pueden marcar **varias** a la vez.
- **Sin casillas**: `VARIACIÓN` en **todas** las filas vs el **menor precio** de la tabla visible.
- **Con casillas**: solo las filas marcadas muestran `VARIACIÓN`, cada una vs el **menor precio entre las marcadas**; filas sin tilde quedan en blanco.

### Sincronización DUX — Slidenav y excepción Finanzas

Regla de UX: la sincronización de **lista de precios tienda** (`POST /api/sync-lista-precios-tienda`) **no debe duplicarse** como botón en encabezados de módulos; debe iniciarse desde **`SyncStatusIndicator`** en la slidenav.

**Excepción acordada:** la consulta/sincronización de **comprobantes de compra** desde DUX (`sincronizarComprobantesProveedorDesdeDuxAction`) se expone en **`/finanzas/tesoreria`** con **`SincronizarComprobantesProveedorDuxButton`** (mismo patrón **`DuxSyncStyleButton`**) y, además, el **`SyncStatusIndicator`** en slidenav adopta etiquetas **COMPRAS** y dispara la **misma action** cuando la ruta activa es **Finanzas** (solo **editor** en la action).

### Orden y labels — LISTA PROVEEDORES (sidebar)

En `Sidebar` (`src/components/layout/Sidebar.tsx`), el orden estándar de submódulos en `LISTA PROVEEDORES` es:
1. `Lista Px Proveedores` (`/proveedores/lista-precios`)
2. `Px. Vta. Sugeridos` (`/proveedores/sugeridos`)
3. `Comp. Por Cat.` (`/proveedores/comparacion-categorias`)
4. `Lista Proveedores` (`/proveedores/lista`)

### Stock — No mostrar modal al entrar (`/stock`)

Regla de UX: al abrir **Control Stock** no se debe interrumpir con un modal de “¿Desea sincronizar?”.  
La sincronización se inicia solo desde los botones existentes (header y/o slidenav).

### Stock — Botón `Editar Coeficientes` (Control Stock)

- En `Control Stock`, la zona de acciones del encabezado usa layout con dos bloques: izquierda (`Editar Coeficientes`) y derecha (acciones de exportar/imprimir).
- `Editar Coeficientes` abre modal `EditarCoeficientesModal` con tabla de dos columnas:
  - `PROVEEDOR` (`proveedores.nombre`)
  - `COEFICIENTE` (`proveedores.coeficiente_tintometrico`) editable con `Input`.
- El botón es visible solo para `editor`.
- Al guardar, persiste en DB y refresca la página para reflejar coeficientes actualizados en módulos dependientes (ej. `Calc. Tintométrico`).
- En el modal, botón `Guardar` deshabilitado mientras no haya cambios en los coeficientes (o si está guardando).

### Tienda — `Calc. Tintométrico` (`/tienda/tintometrico`) y `Calc. Litros` (`/tienda/litros`)

- Rutas separadas bajo **Lista Tienda**; la URL antigua `/tienda/tinto-lts` redirige (308) a `/tienda/tintometrico`.
- Ambos usan encabezado estándar (`SectionHeader`) con título **Lista Tienda** y subtítulo **Calc. Tintométrico** o **Calc. Litros** según la pantalla.
- No renderizan bloque de filtros (`FilterBar`).
- **Calc. Tintométrico**: cálculo local en cliente (sin persistencia de montos). Una card `bg-card` a ancho útil (`max-w-xl` centrada para el formulario) con título en mayúsculas **CÁLCULO DE PX TINTOMÉTRICO** + línea `bg-primary` al `70%`; grilla etiqueta/campo: `Proveedor` (`Select` con `SELECT_TRIGGER_FILTER_CLASS`), `Px. Compra` (`Input` entero), `Px Lista Tienda` (solo lectura, múltiplo de 100). Solo proveedores con `coeficienteTintometrico > 1` en el desplegable. **Editar Coeficientes** solo `editor`; modal con tabla proveedor/coeficiente y persistencia.
- **Calc. Litros**: cálculo local; card única a ancho completo del contenedor con título **CALCULO DE LTS** + línea `bg-primary` al `70%`; selectores **FORMA DE CÁLCULO** y **TIPO DE PINTURA**; tablas según forma (paredes, módulo, pileta). **EDITAR RENDIMIENTOS** solo `editor` (modal CRUD `prod_rendimientos`, antes `tipos_pintura_rendimientos`). Los campos **LARGO**, **ANCHO**, **ALTO** y **PROFUNDIDAD** (dimensiones en metros) usan `InputDimensionMts` en `TiendaCalcLitrosPageClient.tsx`: `Input` con `pr-10` + sufijo visual **Mts.** (`text-muted-foreground`, `pointer-events-none`, `aria-hidden`); el valor sigue siendo solo el número; `aria-label` incluye «en metros».
- Sidebar (`LISTA TIENDA`) por rol:  
  - **editor**: `Comp. Proveedores`, `Control Aumento`, `Control Stock`, `Calc. Tintométrico`, `Calc. Litros`
  - **simple**: `Control Stock`, `Calc. Tintométrico`, `Calc. Litros`

## 4. Checklist de PR (Cursor / desarrollador)

Antes de dar por terminada una tarea de frontend:

- [ ] No hay estilos inline ni clases hardcodeadas (`bg-white`, `text-slate-400`, `emerald-*`, `amber-*`, etc.); se usan tokens (`bg-card`, `text-muted-foreground`, `primary`/`accent2`) o `@/lib/ui-classes`. Excepción aceptable: anchos dinámicos (p. ej. barra de progreso `%`) o el patrón documentado `style={{ height: "auto" }}` en modales con tabla. **`Card`** que envuelve la tabla principal: **`card-tabla-envoltorio`**, no sombras arbitrarias **`shadow-[0_4px_12px_rgba(...)]`** ni la cadena larga de utilidades duplicada.
- [ ] Las clases condicionales o combinadas usan `cn(...)`.
- [ ] Tablas usan `Table` de `@/components/ui/table` con `variant="compact"` cuando aplique; encabezado fijo (al hacer scroll los encabezados no desaparecen).
- [ ] Filtros usan `FilterBar`, `FilaFiltrosDesplegables`, `INPUT_FILTER_CLASS`, `FILTER_SELECT_WRAPPER_CLASS`. Input de búsqueda: `useFiltrosConBusqueda` + `FiltroBusquedaInput`.
- [ ] Encabezados de página usan `SectionHeader` o `ClassicPageHeader` (implementación única vía `PageSectionHeader`; no duplicar markup de `.section-header`).
- [ ] Mensajes de tabla/lista vacía reutilizan `TableEmptyRow` o `TableEmptyState` (variantes CVA), sin copiar `py-* text-muted-foreground text-center` sueltos.
- [ ] Botones de toolbar con **ícono + label** (y/o estado async): usan `ToolbarActionButton` (`src/components/shared/ToolbarActionButton.tsx`) o `Button` de shadcn **sin** repetir `gap-2 shrink-0` (el `Button` base ya los aporta) ni dimensionar el `<svg>` con `h-4 w-4 shrink-0` (el `Button` lo hace vía `[&_svg:not([class*='size-'])]:size-4`).
- [ ] Títulos de modales y botones: title case. Sidebar: módulo en MAYÚSCULAS, submódulo con primera letra de cada palabra en mayúscula (title case). Filtros, desplegables y encabezados de tablas: MAYÚSCULAS. Abreviaciones con punto final (Px., Cx., Dto., etc.).
- [ ] Iconos: `lucide-react`. Toasts: `sonner`. Fuente: Geist (vía layout/tema).
- [ ] No hay `any`; validación de datos con Zod donde aplique.
- [ ] Si se añade una clase global nueva, se registra en este documento (sección 2).

---

## 5. Hallazgos de auditoría y correcciones aplicadas

### Correcciones ya aplicadas

- **Tokens de éxito/advertencia (2026-03)**: creado `@/lib/ui-classes` con clases basadas en `primary`, `accent`, `accent2`. Sustituidos `emerald-*`, `amber-*`, `blue-*` en `ImportarModal`, `ImportarListaPreciosModal`, `ImportResultContext`, `UploadZone`, `app/importar/page.tsx`, `AccionMasivaModal`. **`PedidoHistoriaLecturaModal`**: ícono de diferencia con `ICON_WARNING_INTERACTIVE_CLASS`, celdas vacías sin `—`. **`VincularModal`**: `<col>` con `className="w-[x%]"` en lugar de `style`.
- **SectionHeader**: eliminado `bg-white`; clase `.section-header` (fondo `var(--card)`). `cn()` en header. Subtítulo `<h3>`.
- **Toolbars (Proveedores, Tienda, Pedidos)**: tokens `text-muted-foreground`, `hover:bg-muted`, `hover:text-foreground`.
- **Filtros**: FiltrosProductos, FiltrosTienda, FiltrosStock, FiltrosPedidoUrgente, BuscadorSimple con **useFiltrosConBusqueda** + **FiltroBusquedaInput**. `cn(FILTER_COUNT_CLASS, "ml-auto")` en TablaAumentos, FiltrosComparacionCategorias, SugeridosTablaConFiltros, ListaPreciosTablaConFiltros. **Pedido Urgente**: sin contador “Mostrando X de Y” bajo la tabla (solo paginación cuando aplica). **Tablas**: encabezado fijo, 100 ítems por página, paginación con `PaginacionTabla` (URL) o `PaginacionClient` (estado cliente); ver sección 1 punto 8. Pedido Urgente, Pedido Reposición y Control Stock usan el contenedor estándar `.contenedor-tabla-gestion` para que el encabezado permanezca siempre visible al hacer scroll interno de filas. **Control Stock**: se elimina el filtro `SUB-RUBRO` y se agrega el desplegable `ORDEN` con opción única `TIEMPO SIN CONTROL` para ordenar por `ÚLT. EXPORT. EXCEL`. En tabla, columnas y anchos: **DESCRIPCIÓN (50%)**, **STOCK (20%)**, **VARIACIÓN (10%)**, **ÚLT. EXPORT. EXCEL (20%)** (sin columna `CÓD.` visible). **VARIACIÓN** solo muestra dato cuando el usuario modificó el stock: flecha **azul** (`text-primary`) si incrementa, flecha **roja** (`text-destructive`) si decrementa y valor numérico en **negro** (`text-foreground`).
- **Regla transversal Gestión Productos (filtros PROVEEDOR)**: en rutas canónicas `/gestion-productos/*`, cualquier `Select`/filtro de **PROVEEDOR** debe listar únicamente proveedores con `proveedor_mercaderia = true` (catálogo `global_proveedores`). Esto aplica a páginas de Proveedores, Tienda, Pedidos y Stock, incluyendo modales que consultan proveedores vía actions compartidas (`vinculos`, etc.).
- **TablaTienda / Comp. Proveedores** (`TablaTienda.tsx`, clase `tabla-tienda-listado` en `globals.css`): columna de **selección** al inicio con encabezado **tilde** (`Check`) y ancho **5%**. Luego columnas principales: `COD. TIENDA` **10%**, `DESCRIPCIÓN` **55%**, `PX. COMPRA FINAL` **10%**. Columnas secundarias: `MEJOR PROV.` **10%** (con `tabla-bloque-secundario-head-divider` / `tabla-bloque-secundario-cell-divider`) y `MARGEN S/ IVA` **10%** (`calcMargenSinIvaPct`, `fmtPctEntero`, `tabla-bloque-secundario-head` / `tabla-bloque-secundario-cell`). Encabezados secundarios **sin** `px-3 py-2 text-xs`. El tipo `ItemTienda` incluye **`stockeable`** (`boolean`, desde `prod_precios_tienda` vía sync DUX según `ctd_disponible` por depósito); uso en UI (columna, badge o tooltip) opcional.
- **Modal Vínculos** (`VincularModal.tsx`): tabla sin `tabla-bloque-*`; `AppModal` con `bodyShellClassName` compacto; sin borde/card envolviendo la tabla; encabezado de ítem en dos líneas (descripción + metadatos unidos).
- **Encabezado sticky + divisores**: `tabla-bloque-secundario-head*` con fondo `primary` opaco; separadores **verticales en thead** (`*-head-divider`) en blanco (`primary-foreground`). En **tbody**, `tabla-bloque-secundario-cell-divider` usa `box-shadow` inset **#0072bb** en lugar de `border-left` (`border-collapse: collapse`). Separación **horizontal entre filas**: `border-bottom` blanco (`var(--primary-foreground)`) en `.tabla-gestion-compacta tbody tr`. `TableHead` sin utilidad `bg-transparent` para no competir con `globals.css`.
- **Control Aumentos (Export Excel)**: el Excel exportado incluye solo dos columnas, `"CODIGO"` y `"COSTO"`. `"COSTO"` proviene de `px_compra_final` (campo `pxCompraFinal` en `prod_precios_provee`), y se exportan solo ítems con variación real (`pctAumento !== 0`).
- **Altura de filas en tablas**: **`thead th`**: **altura fija** con **`height/min-height/max-height`** vía **`--tabla-thead-height`** (**2.125rem**, referencia Comp. Proveedores; siempre fijo para dos líneas); **`--tabla-body-row-min-height: 2rem`**; **`TableCell`**: **`text-xs` `leading-tight` `align-middle`**; **`TableRow`**: **`transition-[background-color]`** (sin afectar layout). **`globals.css`**: **`tbody td`** con **`line-height: 1.25`**; **sin** zoom de texto en hover de fila. Inputs en celdas forzados a **~1.75rem** vía **`globals.css`** (las utilidades `h-6`/`h-7` en JSX quedan alineadas a ese valor).
- **ui/tooltip.tsx**, **ui/dialog.tsx**, **ui/sonner.tsx**: tokens (border-border, bg-popover, bg-background) y configuración del toaster vía clase global `.toaster` (sin `style` inline).
- **Modales y listados**: ImportarModal, ImportarListaPreciosModal, TablaProductosFiltrada, AppModal con `bg-card`, `text-muted-foreground`, `bg-muted` y `cn()` en todos los classNames combinados.
- **Páginas (src/app/)**: `app/importar/page.tsx`, `app/proveedores/page.tsx`, `app/pedidos/urgente/page.tsx`, `app/proveedores/gestion/page.tsx`, `app/tienda/page.tsx`, `app/stock/page.tsx` — Separator `bg-border`; Card `border-border bg-card`; tablas con 100 ítems por página y barra de paginación al pie cuando hay más de una página (`PaginacionTabla` o `PaginacionClient`).
- **Tarjeta envoltorio de tabla (2026-04-24)**: clase **`.card-tabla-envoltorio`** + variable **`--card-tabla-envoltorio-shadow`** en `globals.css`; sustituida la cadena repetida de utilidades y **`shadow-[0_4px_12px_rgba(0,0,0,0.05)]`** en `proveedores/page.tsx`, `pedidos/enviar/page.tsx`, `PedidoUrgentePageClient.tsx`, `PedidoTintometricoPageClient.tsx`.
- **Componentes con `cn()`**: TablaAumentos, SyncButton, SyncDuxHeaderButton, UploadZone, ProveedorAlternativoRow, ImportarModal, ImportarListaPreciosModal (botones SÍ/NO y zona drag), FiltrosComparacionCategorias, SugeridosTablaConFiltros, ListaPreciosTablaConFiltros — todas las combinaciones de clase pasan por `cn()`.
- **Control Aumentos — zebra y filtros (2026-04)**: `TablaAumentos.tsx` elimina `bg-blue-50/50` en filas alternadas y usa token `bg-muted/40`; además centraliza clases repetidas de filas en constantes/helper (`getAumentosRowBackgroundClass`) y normaliza textos de filtros en MAYÚSCULAS (`BUSCAR POR DESCRIPCIÓN O CÓDIGO...`, contador `CON VARIACIÓN`).
- **Encabezados de tabla abreviados (2026-03):** para convivir con el header global de 2 líneas y recorte, se acortan labels largos en columnas angostas (`PROD. PROVISTOS`, `COL. ARCHIVO`, `DESC. PROVEEDOR`, `PX. VTA. SUG.`, `CANT. URG.`, `PX. FINAL`, `MARGEN`, `CANT. PED.`, `CANT. REC.`).
- **Eliminación de estilos inline estructurales**: anchos de columnas en `TablaPedidoUrgente`, `TablaReposicion` y `ComparacionCategoriasClient` migrados a utilidades Tailwind (`w-[x%]`) y clases globales; plantilla de impresión de stock (`PrintStock`) sin atributos `style`, usando solo clases CSS internas.
- **Sidebar — Sincronización DUX (persistente y accionable)**: `SyncStatusIndicator` permanece siempre visible en la slidenav. En reposo usa **`DuxSyncStyleButton`** con textos según área (**PROD.** vs **COMPRAS**). Fuera de **Finanzas**, el click ejecuta **`POST /api/sync-lista-precios-tienda`**. En **Finanzas**, el mismo botón ejecuta **`sincronizarComprobantesProveedorDesdeDuxAction`** (toasts alineados con **`/finanzas/tesoreria`**). Durante ejecución: **`SINCRONIZANDO PROD.`** (lista precios) o **`SINCRONIZANDO COMPRAS`** (compras).
- **Pedido Reposición — Configuración (2026-03)**: `PUNTO REPOSIC.` admite valor `0` en el flujo completo (modal + action + servicio). La validación de `cant` configurada se mantiene en entero mínimo `1`.
- **`/tienda/litros` — Cálculo de Lts**: selector **FORMA DE CÁLCULO** (`POR PAREDES`, `POR MÓDULO`, `PILETA`) + selector **TIPO DE PINTURA** (fuente `prod_rendimientos`, antes `tipos_pintura_rendimientos`).  
  - **POR PAREDES**: ocho columnas (anchos aprox. 20% / 15% / 15% / 15% / 10% / 10% / 10% / 5%): `SUPERFICIE` (texto `Pared 1`, `Pared 2`, … por fila), `CANT.`, `LARGO`, `ANCHO` (**LARGO** y **ANCHO**: `InputDimensionMts` + sufijo **Mts.**; **CANT.** sin unidad), `MTS2` (`cant × largo × ancho`), `1 MANO`, `2 MANOS`, `ACCIONES` (eliminar). Cálculos en vivo: `1 MANO = MTS2 / rendimiento`, `2 MANOS = 1 MANO × 2`; totales y litros con un decimal. Fila `TOTAL`: celda vacía con `colSpan={3}` (superficie + cant + largo) y texto `TOTAL` en la columna **ANCHO** alineado a la derecha (`!text-right`, `celda-datos--flush-right`) para acercarlo a los totales numéricos; pie resaltado con `border-t-2 border-primary`, `bg-muted/50`, totales en **`font-bold`** (`CALC_LITROS_FOOTER_*` en `TiendaCalcLitrosPageClient.tsx`); botón `+` debajo (mismo bloque, borde superior continuo).  
  - **POR MÓDULO**: arriba, tabla de una fila con `LARGO`, `ANCHO`, `ALTO` (`InputDimensionMts` + **Mts.**), `INCLUYE TECHO` (dimensiones del módulo). Debajo, tabla de **cinco columnas** (`SUPERFICIE`, **`TAMAÑO`**, `MTS2`, `1 MANO`, `2 MANOS`) y **cinco filas fijas** (`Pared 1` … `Pared 4`, `Techo`). **`TAMAÑO`**: texto de la multiplicación con un decimal (`formatTamanoMts` en `@/lib/tiendaCalculosLts`): Pared 1/2 = largo × alto; Pared 3/4 = ancho × alto; Techo = largo × ancho si **incluye techo**, si no **—** (muted). **MTS2**: mismas áreas que antes. **1 MANO** = MTS2 ÷ rendimiento; **2 MANOS** = 1 MANO × 2. Fila `TOTAL`: **`TOTAL`** con `colSpan={2}` (SUPERFICIE + **TAMAÑO**), alineado a la derecha; mismo estilo de pie que **POR PAREDES** (`border-t-2 border-primary`, `bg-muted/50`, valores en **negrita**).
  - **PILETA**: misma estructura y fórmulas que **POR MÓDULO**, con **LARGO**, **ANCHO**, **PROFUNDIDAD** en `InputDimensionMts` + **Mts.**, columna **`TAMAÑO`**: Pared 1/2 = largo × profundidad; Pared 3/4 = ancho × profundidad; **Piso** = largo × ancho. Última fila **Piso** (en lugar de **Techo**), y **PISO** en la cabecera de la fila superior con texto fijo **Siempre incluido** (sin checkbox; el área de piso **largo × ancho** siempre entra en el cálculo). Pie de totales igual al de **POR MÓDULO** (`colSpan={2}` en **TOTAL**, mismas clases de resaltado).

### Auditoría cerrada

No quedan usos de `bg-white`, `text-slate-*`, `bg-slate-*` ni `border-slate-*` en `src/`. No quedan `className={\`...\`}` en componentes. Estados de éxito/advertencia no deben usar paletas genéricas (`emerald-*`, `amber-*`, `blue-*`): usar `@/lib/ui-classes` y tokens de tema. Anchos de `<col>` en tablas fijas: preferir `className="w-[x%]"` en lugar de `style` salvo casos dinámicos. Las tarjetas que envuelven la tabla principal en páginas estándar usan **`card-tabla-envoltorio`** (sin **`shadow-[0_4px_12px_rgba(...)]`** duplicado). Nuevas pantallas o filtros deben seguir esta guía y el checklist de PR.

---

*Última actualización (2026-04-21): componente `ModalMicroLabel` (CVA `modalMicroLabelVariants`, variantes `align`); refactor en `PedidoHistoriaDetalleModal`; patrón Design System en §3.1 y fila en §2; Guía para IA punto 7.*

*Última actualización: alta de `ToolbarActionButton` (CVA `density` + pass-through de `variant`/`size` de shadcn, manejo accesible de `loading` con `aria-busy` y `Loader2`); baja de `src/lib/actionButtons.ts` (código muerto con template literals). Checklist PR §4 y catálogo §3.1 alineados.*

*Última actualización (2026-04-21): catálogo hoja `fin_bal_cat_gasto` (sin proveedor en la fila de catálogo); detalle en columna **GASTO FINAL** (`fin_bal_gasto_final`: proveedor + sucursal + mensual). Ver `BACKEND_GUIDELINES` §2.5e.*

*Última actualización (2026-04-21): `/finanzas/balance/gastos/catalogo` — columna **GASTO FINAL** (`fin_bal_gasto_final`): proveedor + sucursal + mensual; `listarFinBalGastosJerarquia()` expone `asignacionesFinales`. Modales `CrearEditarFinBalGastoFinalModal` / `EliminarFinBalGastoFinalModal` + actions `*FinBalGastoFinal*`; página carga `listarSucursalesParaGastos()` (`global_sucursales` con `centro_costo` y `genera_balance`; `FinBalGastosCatalogoPageClient` fusiona la sucursal actual en **editar** si la fila legacy no está en esa lista).*

*Última actualización (2026-04-23): **GASTO FINAL** — se permiten varias filas con el mismo gasto de catálogo + proveedor + sucursal (sin índice único en BD); `CrearEditarFinBalGastoFinalModal` lista todos los proveedores del modal sin filtrar asignaciones previas. Si ya hay otra fila con la misma sucursal y proveedor, **COMENTARIOS** obligatorio y distinto al resto (aviso bajo el campo + deshabilitar **Guardar** hasta cumplirlo); el servicio valida lo mismo.*

*Última actualización (2026-04-23): **Gasto único** — en alta (`GASTO MENSUAL` = NO), **DÍA DEVENGADO** se fija al calendario de hoy en Argentina (máx. 28) y el select queda deshabilitado; el servidor ignora el día enviado en create si `gastoMensual === false`. Helper `diaDevengadoFinBalDesdeCalendarioArgentina` en `@/lib/fechaArgentina`.*

*Última actualización (2026-04-23): **`/finanzas/balance/gastos`** — filtros alineados al patrón global (`FilaFiltrosDesplegables` ×2, contador + limpiar en fila 2); **Mes** = 12 meses; **Año** = 2026…2046; entrada sin query **`redirect`** a mes/año **hoy AR**; rubro/gasto/sucursal/proveedor/pagado; acciones y modales de monto; ver `BACKEND_GUIDELINES` §2.5e.*

*Última actualización (2026-04-24): **Balance mensual** — tabla única alineada, cabecera `#0072BB`, filas resultado `#a9d6f1` / `#063652`, edición de ventas por sucursal; excepción de color en “Guía para IA” §2; detalle bajo **`ClassicFilteredTableLayout`**; backend **`BACKEND_GUIDELINES` §2.5f**.*

*Última actualización (2026-04-24): **`card-tabla-envoltorio`** — token de sombra **`--card-tabla-envoltorio-shadow`**; Guía para IA §2; catálogo §2; checklist PR §4; auditoría cerrada; columnas documentadas de **`/pedidos/enviar`** alineadas al código (incluye **PROVEEDOR**).*

*Última actualización (2026-04-27): **Comp. Proveedores** — encabezados de export Excel ajustados: **Act. Proveedor** usa `CODIGO` (antes `CODIGO TIENDA`), y **Act. Margen** usa `CODIGO` + `PORC UTILIDAD` (antes `CODIGO TIENDA` + `MARGEN`).*

*Última actualización (2026-04-24): **`VincularModal`** — columna **OFICIAL** sin botón “Marcar como proveedor oficial”; detalle en § Tienda — Modal Vínculos.*

*Última actualización (2026-04-21): **Proveedores** — `ProveedorForm`: prefijo **opcional** (sin `required` HTML); **PROVEEDOR MERCADERÍA** sigue siendo SI/NO obligatorio vía Zod. **Filtros Tienda** (`FiltrosTienda.tsx`): opciones de proveedor con `key={p.id}`; si no hay prefijo, solo se muestra el nombre (sin corchetes vacíos). **Calc. Tintométrico** (`TiendaCalcTintometricoPageClient.tsx`): valor del `Select` = `id` del proveedor (no prefijo); etiqueta `[prefijo]` o `[codigoUnico]` si falta prefijo. **Vincular / Seleccionar producto** (`VincularModal` + `SeleccionarProductoModal`): exclusión de duplicados por **`idsProveedoresYaVinculados`** (`proveedorId`), no por prefijo.*

---

## 6. Organización en Cursor (prompts y reglas persistentes)

- Archivo recomendado para acceso rápido a prompts operativos: `.cursor/prompts.md`.
- `.cursor/prompts.md` incluye el bloque **Dream Team de 5 agentes** con perfiles de arquitectura frontend/backend y auditoría; para cambios de UI priorizar el perfil frontend o auditor frontend según el objetivo.
- Reglas persistentes activas en `.cursor/rules/`:
  - `manuales-obligatorios.mdc`: obliga lectura de `FRONTEND_GUIDELINES.md` y `BACKEND_GUIDELINES.md` antes de codificar.
  - `flujo-fullstack-end-to-end.mdc`: define ciclo de implementación end-to-end y cierre con retroalimentación documental.
- Módulo **Pedido De Mercadería** (`/pedidos/*`): las opciones de **SUCURSAL** deben venir de `global_sucursales` con `pedido = true` (no hardcodear listado fijo). Si una sucursal queda deshabilitada en DB, no debe aparecer en filtros/selectores ni operar por URL.
- Si se agrega un nuevo patrón visual, clase global, componente compartido o convención de UI, debe actualizarse este documento y mantenerse alineado con las reglas de `.cursor/rules/`.

---

**Para IA:** El archivo `.cursorrules` en la raíz indica que este documento (FRONTEND_GUIDELINES.md) es la **referencia obligatoria** al crear o modificar código frontend. Usar la sección "Guía para IA" y el checklist de la sección 4 en cada tarea.
