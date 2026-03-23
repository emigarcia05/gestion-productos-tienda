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
   - **Siempre** combina clases con `cn()` de `@/lib/utils.ts`. **No** uses template literals en `className` (ej. `` className={`${x} ...`} ``), incluyendo el `body` de `layout.tsx`.  
   - Ejemplo correcto: `className={cn("flex gap-2", isActive && "bg-primary/10")}`.

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
6. **Nueva página con filtros y tabla**  
   - Estructura: `SectionHeader` o `ClassicPageHeader` → `FilterBar` (con `filtros-contenedor-tienda bg-card`) → contenido (tabla con `<Table variant="compact">`).  
   - Si la página tiene **input de búsqueda con debounce**: usa el hook `useFiltrosConBusqueda` y el componente `FiltroBusquedaInput` (ver sección 1, punto 3). No reimplementes debounce ni restauración de foco.  
   - Selects de filtros: `FILTER_SELECT_WRAPPER_CLASS`, `SELECT_TRIGGER_FILTER_CLASS`, `SelectContent` con `position="popper" side="bottom" align="start" className="select-content-filtro"`.  
   - Contador de resultados: `cn(FILTER_COUNT_CLASS, "ml-auto")` si va alineado a la derecha; texto del contador en MAYÚSCULAS (PRODUCTO(S), ÍTEM(S), etc.).

7. **Nuevo modal con tabla**  
   - Usar `ModalTablaConFiltros` de `@/components/shared/ModalTablaConFiltros.tsx` (single o multi selección). Para modales genéricos: `AppModal` de `@/components/shared/AppModal.tsx` con cuerpo `bg-card`.
   - `AppModal` (wrapper estándar) expone variantes con **CVA** para evitar duplicación de clases:
     - `size`: `"sm" | "md" | "lg" | "xl"` (default `"md"` = `sm:max-w-lg`).
     - `padding`: `"sm" | "default" | "lg"` (default `"default"`).
     - `scrollBody`: `boolean` (default `true`) controla el overflow del cuerpo sin reescribir clases.
     - `hideBodyScrollbars`: `boolean` (default `false`) — con `scrollBody`, oculta barras del área gris (`.app-modal__scroll-area`) y de la card (`.app-modal__body`); ver `globals.css`.
     - `bodyShellClassName`: `string?` — se combina con el `div` gris que envuelve la card (`p-4` por defecto). Ej. `p-1.5 sm:p-2` en modales compactos (`VincularModal`).
   - Cuando el modal tiene una **tabla + bloque inferior fijo** (ej. resúmenes como `TOTAL PEDIDO`), el contenedor de tabla debe consumir el espacio con `flex-1 min-h-0` y **no** debe forzarse con `h-0` u otros height absolutos. Además, como `.contenedor-tabla-gestion` tiene `height: 100%` en `globals.css`, si la cascada lo impide, sobrescribir de forma garantizada con `style={{ height: "auto" }}` (y aplicar `min-h-0 overflow-hidden` en el wrapper inmediato) evita solapes/recortes y deja el scroll exclusivamente en la tabla.
   - Si necesitás alinear un bloque inferior con las mismas columnas de la tabla, **no** usar `grid-cols` con porcentajes que superen 100%. Usar `fr` proporcionales que sumen el mismo total que la tabla, o preferir **`TableFooter` (`<tfoot>`) dentro del mismo `<Table>`** con `colSpan` en las columnas previas. **`PedidoHistoriaDetalleModal`:** totales **TOTAL PEDIDO** en **`<section aria-label="Totales del pedido">`** + **grid** **`5fr_55fr_10fr_15fr_15fr`** **fuera** del **`data-slot="table-container"`** (ver punto 7).
  - **`PedidoHistoriaDetalleModal`:** título visible del modal (AppModal): **Recepcion Del Pedido**. `AppModal` `sm:max-w-[62.4rem]` (≈ +30% sobre 48rem). Tabla **5% + 55% + 10% + 15% + 15%**: columna **lista de verificación** (icono **Check** en cabecera; por fila **`<Input>`** vacío **`readOnly`**, **`tabIndex={-1}`**, **`pointer-events-none`**, `aria-label="Lista de verificación"` — **no** se escribe a mano): **OK** (`aria-label="OK"`, **Check**) copia **CANT. PEDIDA** en **CANT. RECIBIDA** y marca verificado → ícono **Check** en celda y fila **`bg-muted/50`** **`cursor-not-allowed`** con celdas **`opacity-60`**; **OK** deshabilitado si ya verificado; **Editar** copia **CANT. PEDIDA** en **CANT. RECIBIDA**, limpia verificación y deja la fila en modo edición para ajustar la cantidad; **Cesto** persiste **0** en cant. recibida y marca verificado; guardar cantidad por **blur** del input de cantidad borra verificación hasta nuevo **OK**/cesto; **DESCRIPCIÓN**, **CANT. PEDIDA**, **CANT. RECIBIDA**, **ACCIONES**; sin **COD. TIENDA** (`title` en descripción con código si existe). (1) Resumen: **dos columnas** en `sm`: bloque proveedor / metadatos **~85%** y columna **FECHA FACTURA** ~**15%** (`GRID_CAPAS_SUP_PEDIDO_HISTORIA` = `85fr_15fr`; sin `div` hueco `hidden sm:block`). Grid del resumen: **`items-center`** (alineación vertical entre columnas en todos los breakpoints). Columna proveedor: **`justify-center gap-0.5 py-0`** (sin **`mt-0.5`** en el segundo párrafo; el aire entre líneas es el **`gap-0.5`** del `flex-col`). Columna fecha (`<label>`): **`flex flex-col justify-center gap-0.5 py-0 px-0 text-left`**; micro-etiqueta **`leading-tight text-left`**. (2) Contenedor **grid** que envuelve la fila de alta + tabla de ítems: **`grid-cols-1`** **`grid-rows-[auto_minmax(0,1fr)]`** **`gap-x-3`** **`gap-y-0`** (sin espacio vertical entre fila de búsqueda y tabla; **`gap-x-3`** = separación horizontal vía *column-gap*). Fila **Agregar producto**: **tres columnas** **70% + 15% + 15%** (input búsqueda | input cantidad con `placeholder="CANT."` y `aria-label="Cant. recibida (nuevo ítem)"` | botón **Agregar**), sin alinear columna a columna con la tabla (`GRID_FILA_AGREGAR_PEDIDO_HISTORIA` = `70fr_15fr_15fr`, móvil **`gap-y-3`** sin *column-gap*; en **`sm`**: **`gap-x-2`** **`gap-y-0`**, **`sm:items-center`** (hueco solo *entre* columnas; bordes exteriores al borde de la sección); columnas hijas: **`flex flex-col items-center justify-center gap-1.5 py-0`** (sin **`px-*`**). Búsqueda **`text-left`**, cantidad **`text-center`**. La sección de alta tiene título **AGREGAR PRODUCTO A LA RECEPCIÓN** (`<span>` `MODAL_MICRO_LABEL_CLASS` + **`text-foreground`** (título en color principal, no muted) + **`p-0 m-0 mb-1 box-border block w-full text-center font-bold`**); la `<section>` usa **`flex flex-col gap-0 pt-0 pb-1.5 pr-3 pl-0 sm:pt-0 sm:pb-2 sm:pr-4 sm:pl-0`** (mismo padding horizontal que el panel resumen del modal; sin **`gap`** entre título y grid salvo el **`mb-1`** del título) y **`aria-labelledby`** al `<span>`. Contenedor **columna** principal del cuerpo del modal: **`gap-0`** entre el **resumen** y el **grid** (alta + tabla), para evitar hueco vertical excesivo. Panel resumen (envoltorio grid proveedor + **FECHA FACTURA**): **`pr-3 pl-0 pt-0 pb-0 sm:pr-4 sm:pl-0 sm:pt-0 sm:pb-0`** (solo padding derecho; sin **`pl`** ni **`pt`**; **`pb-0`**). Sección **AGREGAR PRODUCTO A LA RECEPCIÓN**: **`flex flex-col gap-0 pt-0 pb-1.5 pr-3 pl-0 sm:pt-0 sm:pb-2 sm:pr-4 sm:pl-0`** (homologado al envoltorio del resumen); separación título ↔ fila: **`mb-1`** en el `<span>`. Celdas del grid solo **`py-0`** (sin **`px-*`**). El acople con el resumen sigue con **`gap-0`** en la columna del modal. **`GRID_CAPAS_SUP_PEDIDO_HISTORIA`**: **`gap-2`** en columna única / **`sm:gap-0`**. **`GRID_FILA_AGREGAR_PEDIDO_HISTORIA`**: **`gap-x-0 gap-y-3`** (móvil); **`sm:gap-x-2 sm:gap-y-0`**. (3) Bloque **Ítems del pedido**: `<section aria-label="Ítems del pedido">`; `<Table>` solo **`thead` + `tbody`** (sin **`tfoot`**). **`.contenedor-tabla-gestion`** **`flex flex-col`** **`overflow-hidden`**: solo un hijo **`div`** **`flex-1 min-h-0 overflow-x-hidden overflow-y-auto`** envuelve la **`<Table>`** (scroll no cubre totales). **`<section aria-label="Totales del pedido">`** es **hermana** de ese **`div`** (fuera del **`overflow-y-auto`**), con **`GRID_PEDIDO_HISTORIA_TABLA_COLS`**, **`min-w-0` `items-center`**, **`border-t border-border`**, **`bg-background`**, **`shrink-0`**, padding horizontal como el panel resumen (**`pr-3 pl-0 sm:pr-4 sm:pl-0`**) y **`py-2`**: sin celdas huecas; **`col-start-4`** **TOTAL PEDIDO** (`text-sm font-semibold tabular-nums`), **`col-start-5`**: **`celda-datos celda-datos--flush-left`** **`flex`** **`items-center`** **`justify-start`** **`gap-0`** **`border-b-0`** (**.celda-datos--flush-left** fuerza **`padding-left: 0`** frente al shorthand **`padding`** de **`.celda-datos`**). (**sin** **`tabla-bloque-secundario-cell-divider`** en el pie; la columna **ACCIONES** del **`tbody`** sigue usando el divisor). **`Input`** **`ml-0` `h-9` `w-full` `min-w-0` `pl-0` `pr-3` `py-1`** (base **`Input`**: **`pl-3 pr-3`** para que **`tailwind-merge`** resuelva **`pl-0`**; distinto de **FECHA FACTURA**, que usa **`px-3`** en el propio campo); **`text-center`** **`font-semibold`** **`tabular-nums`**; **`inputBorderClassName`**; `inputMode="decimal"` `autoComplete="off"`). `MODAL_SECTION_CARD_CLASS` = `bg-transparent`. `fechaRecepcion` sin persistencia backend hasta definir campo. **Flujo secuencial** (pedido no **RECIBIDO**): foco inicial en **`FECHA FACTURA`** (`ref`); sin fecha (`value` vacío) la sección **AGREGAR PRODUCTO** y la tabla llevan **`pointer-events-none` `opacity-50` `cursor-not-allowed`** y controles **`disabled`**; con fecha habilitados alta y tabla. **Total Pedido** (`aria-label="Total Pedido"`) **`disabled`** hasta que exista al menos una fila y **todas** tengan checklist confirmado; nueva fila reexige confirmar todas. Botón principal **Registrar En Dux** habilitado solo con fecha, checklist completo en todas las filas y total normalizado **> 0**; tras éxito cierra el modal (`onOpenChange(false)`).

8. **Tablas (encabezado fijo + paginación)**  
- **Un solo diseño** para toda la app (referencia: Comp. Proveedores). Siempre usar `Table` de `@/components/ui/table`; aplica la clase `.tabla-gestion-compacta`. No usar `<table>` en crudo ni otras clases de tabla. Encabezados (`TableHead`) en MAYÚSCULAS. No sobrescribir padding ni altura en celdas (el diseño global manda).  
   - **Encabezado fijo (obligatorio)**: el encabezado de la tabla debe estar fijo y **no moverse con el scroll**. `TableHeader` (`<thead>`) usa **`sticky top-0 z-20`** y **`bg-primary`** (fondo opaco); `TableHead` (`<th>`) añade **`sticky top-0 z-20`**. **`globals.css`** (`.tabla-gestion-compacta thead th`) refuerza **`position: sticky`**, **`top: 0`** y **`z-index: 20`**. **Crítico:** el wrapper **`data-slot="table-container"`** del componente **`Table` no debe llevar **`overflow-y-auto`** ni **`overflow-x-hidden`/`auto`**: en CSS, si un eje de overflow no es `visible`, el otro pasa a comportarse como `auto` y ese nodo se convierte en scrollport intermedio; al crecer con la tabla, el sticky del `<thead>` deja de anclarse al contenedor que el usuario desplaza. El scroll vertical (y el horizontal, si aplica) debe estar **solo** en un ancestro (p. ej. **`.contenedor-tabla-gestion`** o un **`div`** con **`overflow-y-auto`** en modales). Iconos en cabecera sobre **`bg-primary`**: **`text-primary-foreground`** (no **`text-foreground`**).  
   - **Paginación estándar**: todas las tablas de la app muestran **100 ítems por página** (`PAGE_SIZE` en `@/lib/pagination`). Cuando el total de filas supera 100, se muestran controles de paginación debajo de la tabla.  
   - **Páginas con URL** (Pedido Urgente, Tienda, Stock): usar `PaginacionTabla` de `@/components/shared/PaginacionTabla.tsx` con `basePath` y `params` (query actual sin `pagina`).  
   - **Páginas con datos en cliente** (Lista precios, Sugeridos): usar `PaginacionClient` de `@/components/shared/PaginacionClient.tsx` con `paginaActual`, `totalPaginas` y `onPaginaChange`.  
   - En el backend, las consultas que alimentan tablas deben usar `skip` y `take` (p. ej. `take: PAGE_SIZE`, `skip: (pagina - 1) * PAGE_SIZE`) y devolver `total` y `totalPaginas` para que la UI muestre la paginación correctamente.

9. **Al terminar un cambio**  
   - Recorre el checklist de la sección 4. Si añades una clase global nueva en `globals.css`, regístrala en la sección 2 de este documento.
   - Si ajustas elementos de **slidenav/sidebar**, mantener componentes compactos y consistentes:
     - **Ritmo vertical** (`Sidebar.tsx`): entre **usuario y la 1.ª línea** y entre **2.ª línea y logo**, mismo espacio **intermedio** (`gap-3` / `pt-3` ≈ 12px). Entre **1.ª línea y navegación** y entre **sync/import y 2.ª línea**, mismo espacio **reducido** (`pt-2` ≈ 8px).
     - **Progreso import / sync** (`ImportStatusIndicator`, `SyncStatusIndicator`): **`MensajeProceso` `variant="sidebar"`** solo cuando hay **proceso en curso** (fondo/borde azul proceso en `globals.css`). `ImportStatusIndicator` solo visible con import activa. `SyncStatusIndicator` en **reposo**: línea 1 muestra **`SINCRONIZACION DUX`** y línea 2 **`Últ. Act. dd/mm hh:mm`**. En hover se **cambia solo el texto** (fade): línea 1 pasa a **`SINCRONIZAR DUX`** y la segunda línea se oculta sin cambiar fondo ni elevar el bloque; misma altura compacta (~`min-h-[3.5rem]`, dos líneas centradas) para fundirse con la slidenav. En **sync en curso**: `<MensajeProceso mensaje="SINCRONIZANDO DUX" detalle={…} />`.
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
   - SelectContent: `position="popper" side="bottom" align="start" className="select-content-filtro"`.

3. **Input de búsqueda en filtros (reutilización)**
   - **Hook:** `useFiltrosConBusqueda` en `@/lib/hooks/useFiltrosConBusqueda.ts`: estado `q`, debounce, restauración de foco (opcional con `focusStorageKey`) y `isDebouncing`. Llamar `prepareNavigate()` antes de `window.location.href` cuando se use `focusStorageKey`.
   - **Componente:** `FiltroBusquedaInput` en `@/components/shared/FiltroBusquedaInput.tsx`: icono Search, input con estilo unificado, botón X y Loader. Usar junto al hook para nueva pantallas con filtro de búsqueda (ej. FiltrosProductos, FiltrosTienda, FiltrosStock).
   - **Nota**: Si la página ya usa filtros por URL (Server Component) y necesitás una segunda fila con búsqueda (ej. “Generar Pedido”), agregá `q` en `searchParams`, pasalo al componente de filtros, y debounceá la navegación con `useFiltrosConBusqueda` (placeholder en MAYÚSCULAS).
   - **Pedido Urgente** (`PedidoUrgentePageClient`): **solo SUCURSAL** es obligatoria para listar productos; **PROVEEDOR**, filtro **PEDIDO** y búsqueda acotan. Mensaje sin sucursal: *«Seleccioná una sucursal para ver los productos.»* En cabecera solo el botón **Generar Pedido** (`GenerarPedidoToolbarButton`); **no** hay **Guardar Cambios**. Cantidades: modal de cantidad o cesto (`upsertPedidoUrgenteMercaderiaItemAction`).
   - **Generar pedido (PDF / WhatsApp)**: usar `GenerarPedidoToolbarButton`. Texto del botón de cabecera por defecto: **Generar Pedido** (también en **Urgente** y **Tintométrico**). Abre un **`AppModal`** con `SUCURSAL`, `PROVEEDOR`, **TIPO DE PEDIDO** (multi). El botón del footer del modal solo se habilita con los **tres** completos y **`hayItems === true`**. Rutas: `/pedidos/enviar`, **Pedido Urgente**, **Pedido Tintométrico**, **Pedido Reposición**.
   - **Página `/pedidos/enviar` (tabla previa)**: sin filtros en URL muestra **todos** los ítems con `cant_pedir > 0` (`getItemsTablaEnviarPedido`); cada filtro activo (**SUCURSAL**, **PROVEEDOR**, **TIPO**, `q`) **reduce** la grilla. Vacío sin filtros: *«No hay ítems con cantidad a pedir.»*; vacío con algún filtro: *«No hay ítems para generar el pedido con los filtros seleccionados.»*
- En la barra de filtros de **Generar Pedido**, el orden de desplegables es `SUCURSAL` → `PROVEEDOR` → `TIPO DE PEDIDO`.
- En `Pedido Reposición`, el orden de desplegables es `SUCURSAL` → `PROVEEDOR` → `MARCA` → `RUBRO` → `CONFIGURADO` (sin `SUB-RUBRO`).

4. **Modal con tabla y filtros**
   - Usar `ModalTablaConFiltros` de `@/components/shared/ModalTablaConFiltros.tsx` (single o multi selección).

5. **Variantes: contador debajo**
   - **Contador debajo a la derecha**: cuando el diseño requiera el número de ítems en una fila inferior alineada a la derecha (ej. Pedido Urgente), usar una tercera fila dentro del `FilterBar`: `<div className="flex justify-end w-full"><span className={FILTER_COUNT_CLASS}>…</span></div>`. No incluir el contador dentro de `FilterRowSelection`.
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
- **Columnas** (misma jerarquía visual **unificada**, sin `tabla-bloque-*` en este modal): `OFICIAL`, `PREFIJO`, `PX. FINAL COMPRA`, `VARIAC.`, `MARGEN S/ IVA`, `DESVINC.` (ícono). Celdas con `celda-datos` / `celda-mono` / `celda-numero` / `celda-destacado` como en la grilla tienda donde aplique. Márgenes con `calcMargenSinIvaPct` como `TablaTienda`.
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
| `.modal-app`, `.modal-app__header`, `.modal-app__body`, `.modal-app__footer` | Modales con tabla y filtros. |
| `.input-filtro-unificado` | Input y SelectTrigger de filtros (borde primary, altura 2.5rem). |
| `.fila-filtros-5`, `.fila-filtros-desplegables` | Grid 5 columnas para Selects de filtros. |
| `.tabla-gestion-compacta.tabla-vinculos-modal` | Solo **modal Vínculos** (Tienda): `width: 100%`, `table-layout: fixed`, padding horizontal ~3px; **`thead th`** permite varias líneas en títulos largos; última columna compacta. No aplicar al resto de tablas. |
| `.tabla-gestion-compacta` | **Diseño único** de tablas (referencia: Comp. Proveedores). Usar siempre `<Table>` de `@/components/ui/table`; no usar otra clase. **Encabezado fijo obligatorio**: al hacer scroll los encabezados no desaparecen (`position: sticky` en `globals.css`). **`thead th`**: compacto — padding vertical ~**`py-1`**, **`line-height: 1`**, **`white-space: nowrap`**, altura **`--tabla-thead-height`** (2.25rem); **`TableHead`** refuerza **`text-xs` `leading-none` `align-middle`**. **Modal Vínculos** (`.tabla-vinculos-modal`): **`thead th`** puede crecer en alto (`height: auto`, títulos multilínea). **TableHead sin negrita** (`font-normal`). **Inputs y Select** en celdas: fondo transparente, recuadro #0072bb. **Select en tablas**: texto en negro, sin bold (`globals.css`). |
| `.tabla-bloque-secundario-head`, `.tabla-bloque-secundario-head-divider` | Columnas de **información secundaria** en `<thead>`: fondo `var(--primary)` explícito (opaco bajo sticky). `*-divider`: primera columna de cada sub-bloque; el divisor blanco se dibuja con `::before` absoluto (`2px`, `primary-foreground`) sobre el `th` sticky para evitar artefactos al hacer scroll (ej. `TablaTienda`: MARGEN vs MEJOR PROV.). |
| `.tabla-bloque-secundario-cell`, `.tabla-bloque-secundario-cell-divider` | Celdas de **tbody** secundarias; fondo transparente (cebra). `*-divider`: línea vertical **#0072bb** con `box-shadow: inset 1px 0 0 #0072bb` (evita artefactos con `border-collapse: collapse` y scroll). **No** usar en el modal **Vínculos**. |
| `--tabla-thead-height`, `--tabla-body-row-min-height`, `--tabla-body-cell-padding-y`, `--tabla-body-cell-padding-x` | **`--tabla-thead-height`** = **2.25rem**; **`--tabla-body-row-min-height`** = **2rem**; padding vertical celdas ~**`py-0.5`** (**0.125rem**); inputs/botones en celdas ~**1.75rem**. Sin cambio de **`font-size`** en **`tbody tr:hover td`** (evita saltos). |
| `.celda-datos` | Celdas de datos; usa las mismas variables de padding y min-height que la tabla oficial. |
| `.celda-datos.celda-datos--flush-left` | Anula **`padding-left`** con **`!important`** (especificidad doble clase) cuando **`!pl-0`** de Tailwind no gana al atajo **`padding`** de **`.celda-datos`**; usar con **`Input`** **`pl-0` `pr-3`** (base **`Input`**: **`pl-3 pr-3`**, no **`px-3`**, para que **`tailwind-merge`** anule bien el lado izquierdo). |
| `.celda-destacado` | Celdas “destacadas” sin negrita (font-weight normal) para cumplir el estilo de tablas. |
| `.contenedor-pagina-con-filtros` | Espaciado vertical entre header, filtros y tabla. |
| `.contenedor-tabla-gestion.no-scrollbar` | Oculta la barra vertical del contenedor de tabla (`scrollbar-width: none` / webkit); mantiene `overflow-y: auto`. Casos puntuales (ej. **Ver Pedido**). |
| `.app-modal__scroll-area.no-scrollbar`, `.app-modal__body.no-scrollbar` | Misma idea para los scrollports del cuerpo de **`AppModal`** cuando se usa **`hideBodyScrollbars`**. |
| *(retiradas)* `.modal-vinculos-*`, `.btn-convertir-proveedor-principal*`, `.btn-desvincular-icono`, `.modal-vinculos-footer` | El modal **Vínculos con Proveedores** pasó a `<Table>` estándar; no reintroducir estas clases. |
| `@/lib/ui-classes` | Constantes reutilizables: `BADGE_SUCCESS_TINT_CLASS`, `TEXT_SUCCESS_CLASS`, `TEXT_WARNING_CLASS`, `ICON_WARNING_INTERACTIVE_CLASS`, `IMPORT_STAT_BADGE_CLASSES` (badges de importación / estados positivos y avisos con tokens `primary`, `accent`, `accent2`). |
| `PAGE_SIZE` (`@/lib/pagination`) | Tamaño de página estándar para tablas: 100 ítems. |
| `PaginacionTabla` (`@/components/shared/PaginacionTabla.tsx`) | Paginación por URL: `basePath`, `params`, `paginaActual`, `totalPaginas`, `total`, `pageSize`. |
| `PaginacionClient` (`@/components/shared/PaginacionClient.tsx`) | Paginación por estado: `paginaActual`, `totalPaginas`, `onPaginaChange`. |
| `TableEmptyState` + CVA (`@/components/shared/TableEmptyState.tsx`) | Mensajes de lista/tabla vacía; `EmptyTableRow` en `ui/table` reutiliza las mismas variantes. |
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

### `PedidoHistoriaDetalleModal` (`src/components/pedidos/PedidoHistoriaDetalleModal.tsx`)

Modal del módulo **Historial Pedidos** para operar la recepción de ítems del pedido (tabla, cantidades recibidas, alta de productos, etc.). Usa **`AppModal`**.

- **Título (`AppModal`, prop `title`):** **Recepcion Del Pedido** (title case).
- **Resumen superior (columna proveedor):** sin micro-etiqueta “Nombre proveedor”; el nombre del proveedor es el primer nodo visible (`<p>` `text-sm font-semibold`). Contenedor **`flex-col justify-center gap-0.5 py-0`** **`text-center sm:text-left`**; padding horizontal **`CELDA_RESUMEN_PROVEEDOR_PADDING_X`**. Línea secundaria (**sucursal - dd/mm hh:mm**) sin **`mt-*`** (separación vía **`gap-0.5`**). Grid resumen: **`items-center`**. Sin estado PEDIDO/RECIBIDO en esa línea.
- **Resumen superior (simetría de márgenes):** aplicar padding horizontal uniforme en el panel (`px-3 sm:px-4`) para que proveedor y fecha queden equilibrados respecto de los bordes del modal. Mantener grid `w-full` y evitar forzados asimétricos (`pl-0`/`pr-0`/`mr-0`) en las dos columnas de cabecera.
- **Resumen superior (padding izquierdo):** el panel de resumen compensa el `px` del cuerpo de `AppModal` con margen negativo (`-ml-3 sm:-ml-4`) para que no tenga padding lateral izquierdo visible.
- **Tabla ítems + totales:** pie **TOTAL PEDIDO** fuera del `<table>` y **fuera** del **`div`** con **`overflow-y-auto`** que envuelve solo la **`<Table>`** (**`<section aria-label="Totales del pedido">`** hermana bajo **`.contenedor-tabla-gestion`** **`flex flex-col`**: scroll **`flex-1 min-h-0 overflow-y-auto`**, totales **`shrink-0`** **`border-t`** **`bg-background`** **`py-2`**); ver punto 7.
- **Scroll en Recepción:** cuando la grilla de ítems supera el alto visible, el desplazamiento vertical debe ocurrir solo en el contenedor de filas (tbody) del bloque de tabla; header y totales permanecen fijos. En este modal, el contenedor de filas usa `no-scrollbar` para ocultar la barra visual sin perder scroll con rueda/trackpad.
- **Alta de nuevos ítems:** se realiza con botón primario **`(+ ) Agregar Producto`** dentro del modal de recepción. Al hacer click, abre `AgregarProductosModal`, donde se selecciona el producto en tabla, se carga **CANT.** y se confirma con **Agregar Producto**.
- **Alta de nuevos ítems (padding izquierdo):** la sección de alta compensa el `px` del cuerpo de `AppModal` con margen negativo (`-ml-3 sm:-ml-4`) para eliminar el padding lateral izquierdo visible en el bloque de filtro + botón.
- **Filtro previo de alta:** arriba del botón `(+ ) Agregar Producto` se muestra `FiltroBusquedaInput` con placeholder **BUSCAR POR DESCRIPCIÓN...** y `LimpiarFiltrosButton` (ícono cesto) para limpiar el texto. Ese valor se usa como búsqueda inicial al abrir `AgregarProductosModal`.
- **Orden en filtros de `AgregarProductosModal`:** **DESCRIPCIÓN** (`FiltroBusquedaInput`) → **CANT.** (`Input`) → **cesto** (`LimpiarFiltrosButton`) en la misma fila. La tabla muestra primera columna de checkbox de selección; en modo `singleConfirm` solo puede quedar 1 fila marcada a la vez. El botón **Agregar Producto** del footer se habilita solo cuando hay una fila seleccionada y **CANT.** > 0.
- **Nota:** el texto `AGREGAR PRODUCTO A LA RECEPCIÓN` se mantiene solo como label de accesibilidad (sr-only) y no se muestra visualmente; la acción visible es el botón `(+ ) Agregar Producto`.
- **Lista de verificación / acciones:** el campo de la primera columna no admite tipeo; al abrir en estado **SIN RECEPCION**, la columna **CANT. RECIBIDA** inicia vacía para todas las filas y se completa de forma secuencial por acción del usuario. **OK** copia **cant. pedida** en **cant. recibida** y confirma checklist; **Editar** copia **cant. pedida** en **cant. recibida**, limpia confirmación y abre controles de edición (`-`, input, `+`); **cesto** guarda **0** y confirma checklist. **Registrar En Dux** al completar cierra el modal.
- **Visualización de `CANT. RECIBIDA`:** mostrar vacío solo cuando el valor es `null` (sin cargar). Si el valor guardado es `0` (por acción del cesto), debe verse explícitamente `0` en la celda.
- **Edición en CANT. RECIBIDA:** la columna se ensancha para soportar controles inline en edición (`-`, input, `+`, `check`). El botón `check` dentro de la celda confirma checklist con el número editado. Al ampliar esa columna, se incrementa también el ancho del `AppModal` para conservar legibilidad.
- **Orden de ítems en tabla de recepción:** ordenar en dos niveles: (1) ítems **no verificados** primero y ítems con checklist **TRUE** al final; (2) dentro de cada grupo, ordenar por **DESCRIPCIÓN** alfabéticamente (A→Z, `localeCompare` en `es`, case-insensitive).

Layout, grillas y reglas de tabla: sección **Guía para IA**, punto 7 (`PedidoHistoriaDetalleModal`).

### `PedidoHistoriaLecturaModal` — **Ver Pedido** (`src/components/pedidos/PedidoHistoriaLecturaModal.tsx`)

- Solo lectura. Con pedido **Recepcionado**: tabla **DESCRIPCIÓN** (`w-[52%]`) | columna estrecha (`w-[10%]`, cabecera con **`sr-only`** "Diferencia cantidades") con **`AlertTriangle`** + **`Tooltip`** solo si cant. recibida ≠ cant. pedida — color vía token de marca **`accent2`** (`ICON_WARNING_INTERACTIVE_CLASS` en `@/lib/ui-classes`), no clases `amber-*` sueltas. Sin texto de resumen bajo la subcabecera sobre cantidad de ítems con diferencia; **CANT. RECIBIDA** sin **negrita** ni color condicional por diferencia (el detalle va en tooltip del ícono). Celdas vacías: string vacío (sin `—`). Con estado **Pedido** (no recepcionado): **DESCRIPCIÓN** + **CANT. PEDIDA** únicamente; footer **`AppModal`**: botón primario **Recepcion Pedida** (solo si **`esEditor`** y **`onIrARecepcion`**) a la izquierda de **Cerrar** — cierra **Ver Pedido** y el padre abre **`PedidoHistoriaDetalleModal`** (mismo `pedidoHistoriaId`).

### `HistorialPedidosPageClient` (`src/components/pedidos/HistorialPedidosPageClient.tsx`)

Listado **Historial Pedidos** (`/pedidos/historial`). La página pasa **`esEditor`** (`rol === "editor"`): en modo **simple** solo se muestran **Ver Detalles** y **Descargar PDF**; **Recepción** y **Borrar** solo con editor (alineado a mutaciones en **`pedidosHistoria`**). **`FiltrosHistorialPedidos`**: **`estado`** en URL — sin `estado` o vacío, la página lista solo **`PEDIDO`** (pendientes de recepción); opciones **PEDIDO**, **RECIBIDO**, **TODOS** (`estado=ALL`); **Limpiar filtros** restablece **`PEDIDO`**. Parámetro URL **`q`** con **`useFiltrosConBusqueda`** (400 ms) + **`FiltroBusquedaInput`** en **`FilterRowSearch`**, **`focusStorageKey`** **`filtros-historial-pedidos-focus`**; al buscar se listan solo pedidos con algún ítem cuya descripción en catálogo coincida (backend: **`listarPedidosHistoria`**). **`PaginacionTabla`** incluye **`q`** en **`params`**. Última columna **ACCIONES** (`tabla-bloque-secundario-*` alineado al patrón de tabla gestión), celdas con **`flex items-center justify-center gap-2`**. Botones **`size="icon-xs"`** con **`Tooltip`**: **Recepción De Mercadería** (`PackageCheck`) → **`PedidoHistoriaDetalleModal`**; **Ver Detalles** (`Eye`) → **`PedidoHistoriaLecturaModal`** (solo lectura, título **Ver Pedido**; **`AppModal`** **`size="xl"`** (`sm:max-w-3xl`), **`scrollBody={false}`** para que la card sea **`flex flex-col` `overflow-hidden`** y el **único scroll vertical** sea **`.contenedor-tabla-gestion`** bajo la cabecera fija — patrón equivalente a *header / `flex-1 overflow-y-auto` con tabla + `thead` sticky / footer*; cabecera del cuerpo: **badge** **Pedido** / **Recepcionado** y nombre proveedor en **una fila** (`flex items-center gap-2`), sucursal + fecha debajo; **`.contenedor-tabla-gestion`** **`no-scrollbar`** **`no-scroll-x`**; en **Ver Pedido** ver **`PedidoHistoriaLecturaModal`**; sin inputs); **Descargar PDF** (`Download`, **`descargarPdfPedidoHistoriaAction`** + **`descargarPdfBase64`** desde `@/lib/descargarPdfBase64`, loader **`Loader2`** en la fila mientras corre); **Borrar** (`Trash2`, hover **destructive**) → **`PedidoHistoriaBorrarConfirmModal`** (texto de confirmación, **Cancelar** outline / **Sí, Borrar** destructive). Tras cerrar recepción o borrar, **`router.refresh()`** mantiene el listado al día.

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
- **Accesibilidad**: `role="status"`, `aria-live="polite"`.

### Slidenav — Botón de usuario (perfil) (`src/components/SelectorRol.tsx`)

En la slidenav se usa `SelectorRol` con `compact` para renderizar un **botón de una sola línea**:

- **Formato**: ícono `User` + texto **`SIMPLE` / `EDITOR`** (según `rolActual`).
- **Interacción**
  - En **SIMPLE**: click abre modal de contraseña para pasar a **EDITOR**.
  - En **EDITOR**: click vuelve a **SIMPLE** sin modal.
- **Feedback visual**: el botón debe tener hover claro (ej. `hover:bg-sidebar-accent/80`) y `focus-visible:ring-*` para accesibilidad.

#### Modal “Acceso De Editor” (mismo archivo)

- El modal se adapta al diseño estándar usando `AppModal` (header corporativo + footer con botonera).
- Botones y título respetan el Title Case (ej. `Acceso De Editor`, `Activar Modo Editor`).

### Slidenav — Sincronización DUX (`src/components/layout/SyncStatusIndicator.tsx`)

Botón/indicador persistente en la parte inferior de la slidenav.

- **Estados**
  - **Reposo**: muestra “Sincronización DUX” + “Últ. Act. dd/mm hh:mm”.
  - **Consulta (progreso)**: muestra “Sincronizando DUX” + “X de Y”.
- **Feedback visual por estado**
  - **Reposo**: `bg-sidebar-accent` con hover suave.
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

### Sincronización DUX — Solo desde la slidenav

Regla de UX: la acción de sincronizar/importar datos de DUX **no debe aparecer como botón en encabezados de módulos**.  
Debe ejecutarse **solo** desde el indicador/botón persistente de la slidenav (`SyncStatusIndicator`).

### Orden y labels — LISTA PROVEEDORES (sidebar)

En `Sidebar` (`src/components/layout/Sidebar.tsx`), el orden estándar de submódulos en `LISTA PROVEEDORES` es:
1. `Lista Px Proveedores` (`/proveedores/lista-precios`)
2. `Px. Vta. Sugeridos` (`/proveedores/sugeridos`)
3. `Comp. Por Cat.` (`/proveedores/comparacion-categorias`)
4. `Lista Proveedores` (`/proveedores/lista`)

### Stock — No mostrar modal al entrar (`/stock`)

Regla de UX: al abrir **Control Stock** no se debe interrumpir con un modal de “¿Desea sincronizar?”.  
La sincronización se inicia solo desde los botones existentes (header y/o slidenav).

## 4. Checklist de PR (Cursor / desarrollador)

Antes de dar por terminada una tarea de frontend:

- [ ] No hay estilos inline ni clases hardcodeadas (`bg-white`, `text-slate-400`, `emerald-*`, `amber-*`, etc.); se usan tokens (`bg-card`, `text-muted-foreground`, `primary`/`accent2`) o `@/lib/ui-classes`. Excepción aceptable: anchos dinámicos (p. ej. barra de progreso `%`) o el patrón documentado `style={{ height: "auto" }}` en modales con tabla.
- [ ] Las clases condicionales o combinadas usan `cn(...)`.
- [ ] Tablas usan `Table` de `@/components/ui/table` con `variant="compact"` cuando aplique; encabezado fijo (al hacer scroll los encabezados no desaparecen).
- [ ] Filtros usan `FilterBar`, `FilaFiltrosDesplegables`, `INPUT_FILTER_CLASS`, `FILTER_SELECT_WRAPPER_CLASS`. Input de búsqueda: `useFiltrosConBusqueda` + `FiltroBusquedaInput`.
- [ ] Encabezados de página usan `SectionHeader` o `ClassicPageHeader` (implementación única vía `PageSectionHeader`; no duplicar markup de `.section-header`).
- [ ] Mensajes de tabla/lista vacía reutilizan `TableEmptyRow` o `TableEmptyState` (variantes CVA), sin copiar `py-* text-muted-foreground text-center` sueltos.
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
- **Filtros**: FiltrosProductos, FiltrosTienda, FiltrosStock, FiltrosPedidoUrgente, BuscadorSimple con **useFiltrosConBusqueda** + **FiltroBusquedaInput**. `cn(FILTER_COUNT_CLASS, "ml-auto")` en TablaAumentos, FiltrosComparacionCategorias, SugeridosTablaConFiltros, ListaPreciosTablaConFiltros. **Pedido Urgente**: contador en fila debajo a la derecha. **Tablas**: encabezado fijo, 100 ítems por página, paginación con `PaginacionTabla` (URL) o `PaginacionClient` (estado cliente); ver sección 1 punto 8. Pedido Urgente, Pedido Reposición y Control Stock usan el contenedor estándar `.contenedor-tabla-gestion` para que el encabezado permanezca siempre visible al hacer scroll interno de filas. **Control Stock**: se elimina el filtro `SUB-RUBRO` y se agrega el desplegable `ORDEN` con opción única `TIEMPO SIN CONTROL` para ordenar por `ÚLT. EXPORT. EXCEL`.
- **TablaTienda / Comp. Proveedores** (`TablaTienda.tsx`, clase `tabla-tienda-listado` en `globals.css`): **tres grupos de columnas** separados con `tabla-bloque-secundario-head-divider` / `tabla-bloque-secundario-cell-divider` al **inicio** de cada grupo (solo línea vertical; sin fondo muted en secundarias). **1ra importancia** (sin clases de bloque): `COD. TIENDA`, `DESCRIPCIÓN`, `PX. COMPRA FINAL`. **2da**: `MARGEN S/ IVA` (`calcMargenSinIvaPct`, `fmtPctEntero`). **3ra**: `MEJOR PROV.` (divider) + `DIF.` (`tabla-bloque-secundario-head` / `tabla-bloque-secundario-cell` en la última columna). Encabezados secundarios **sin** `px-3 py-2 text-xs`. Anchos: 10% / 50% / 10% / 10% / 10% / 10%.
- **Modal Vínculos** (`VincularModal.tsx`): tabla sin `tabla-bloque-*`; `AppModal` con `bodyShellClassName` compacto; sin borde/card envolviendo la tabla; encabezado de ítem en dos líneas (descripción + metadatos unidos).
- **Encabezado sticky + divisores**: `tabla-bloque-secundario-head*` con fondo `primary` opaco; separadores **verticales en thead** (`*-head-divider`) en blanco (`primary-foreground`). En **tbody**, `tabla-bloque-secundario-cell-divider` usa `box-shadow` inset **#0072bb** en lugar de `border-left` (`border-collapse: collapse`). Separación **horizontal entre filas**: `border-bottom` blanco (`var(--primary-foreground)`) en `.tabla-gestion-compacta tbody tr`. `TableHead` sin utilidad `bg-transparent` para no competir con `globals.css`.
- **Control Aumentos (Export Excel)**: la columna `"COSTO"` del Excel exportado proviene de `px_compra_final` (campo `pxCompraFinal` en `precios_proveedores`), manteniendo el nombre `"COSTO"` y exportando solo ítems con variación real (`pctAumento !== 0`).
- **Altura de filas en tablas**: **`--tabla-thead-height: 2.25rem`**; **`--tabla-body-row-min-height: 2rem`**; **`TableCell`**: **`text-xs` `leading-tight` `align-middle`**; **`TableRow`**: **`transition-[background-color]`** (sin afectar layout). **`globals.css`**: **`tbody td`** con **`line-height: 1.25`**; **sin** zoom de texto en hover de fila. Inputs en celdas forzados a **~1.75rem** vía **`globals.css`** (las utilidades `h-6`/`h-7` en JSX quedan alineadas a ese valor).
- **ui/tooltip.tsx**, **ui/dialog.tsx**, **ui/sonner.tsx**: tokens (border-border, bg-popover, bg-background) y configuración del toaster vía clase global `.toaster` (sin `style` inline).
- **Modales y listados**: ImportarModal, ImportarListaPreciosModal, TablaProductosFiltrada, AppModal con `bg-card`, `text-muted-foreground`, `bg-muted` y `cn()` en todos los classNames combinados.
- **Páginas (src/app/)**: `app/importar/page.tsx`, `app/proveedores/page.tsx`, `app/pedidos/urgente/page.tsx`, `app/proveedores/gestion/page.tsx`, `app/tienda/page.tsx`, `app/stock/page.tsx` — Separator `bg-border`; Card `border-border bg-card`; tablas con 100 ítems por página y barra de paginación al pie cuando hay más de una página (`PaginacionTabla` o `PaginacionClient`).
- **Componentes con `cn()`**: TablaAumentos, SyncButton, SyncDuxHeaderButton, UploadZone, ProveedorAlternativoRow, ImportarModal, ImportarListaPreciosModal (botones SÍ/NO y zona drag), FiltrosComparacionCategorias, SugeridosTablaConFiltros, ListaPreciosTablaConFiltros — todas las combinaciones de clase pasan por `cn()`.
- **Eliminación de estilos inline estructurales**: anchos de columnas en `TablaPedidoUrgente`, `TablaReposicion` y `ComparacionCategoriasClient` migrados a utilidades Tailwind (`w-[x%]`) y clases globales; plantilla de impresión de stock (`PrintStock`) sin atributos `style`, usando solo clases CSS internas.
- **Sidebar — Sincronización DUX (persistente y accionable)**: `SyncStatusIndicator` permanece siempre visible en la slidenav. En reposo muestra bloque centrado con "Sincronización DUX", "Última Consulta Disponible" y fecha en formato Argentina (`dd/mm hh:mm`) solo si existe última sync exitosa. El bloque completo funciona como botón para iniciar `POST /api/sync-lista-precios-tienda` sin modal de confirmación; durante ejecución mantiene el mensaje de progreso reutilizable.

### Auditoría cerrada

No quedan usos de `bg-white`, `text-slate-*`, `bg-slate-*` ni `border-slate-*` en `src/`. No quedan `className={\`...\`}` en componentes. Estados de éxito/advertencia no deben usar paletas genéricas (`emerald-*`, `amber-*`, `blue-*`): usar `@/lib/ui-classes` y tokens de tema. Anchos de `<col>` en tablas fijas: preferir `className="w-[x%]"` en lugar de `style` salvo casos dinámicos. Nuevas pantallas o filtros deben seguir esta guía y el checklist de PR.

---

*Última actualización: auditoría de tokens — `@/lib/ui-classes`, sustitución de `emerald-*`/`amber-*`/`blue-*` en importación y lectura de historial; `<col>` en Vínculos sin `style` inline; `PedidoHistoriaLecturaModal` con celdas vacías sin `—`.*

---

## 6. Organización en Cursor (prompts y reglas persistentes)

- Archivo recomendado para acceso rápido a prompts operativos: `.cursor/prompts.md`.
- Reglas persistentes activas en `.cursor/rules/`:
  - `manuales-obligatorios.mdc`: obliga lectura de `FRONTEND_GUIDELINES.md` y `BACKEND_GUIDELINES.md` antes de codificar.
  - `flujo-fullstack-end-to-end.mdc`: define ciclo de implementación end-to-end y cierre con retroalimentación documental.
- Si se agrega un nuevo patrón visual, clase global, componente compartido o convención de UI, debe actualizarse este documento y mantenerse alineado con las reglas de `.cursor/rules/`.

---

**Para IA:** El archivo `.cursorrules` en la raíz indica que este documento (FRONTEND_GUIDELINES.md) es la **referencia obligatoria** al crear o modificar código frontend. Usar la sección "Guía para IA" y el checklist de la sección 4 en cada tarea.
