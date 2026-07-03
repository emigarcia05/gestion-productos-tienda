# Guía de Frontend — Auditoría y Convenciones

Documento vivo: se actualiza con cada corrección o patrón detectado en auditorías. Stack: **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, **shadcn/ui**, **Geist**, **lucide-react**, **sonner**.

**Entrada por defecto (`/`):** redirige a **`/gestion-productos/proveedores/sugeridos`** (módulo Gestión Productos, misma pantalla que usa el rol simple al abrir **Lista Proveedores**). El selector de macro-áreas (`MAIN_APP_AREAS` en `main-app-areas.ts`) puede seguir apuntando la entrada del área a otra ruta interna; no duplicar redirects sin alinear ambos.

---

## Guía para IA (crear o modificar código frontend)

**Cuando crees o modifiques cualquier código frontend en este proyecto, usa este documento como única referencia.** Antes de proponer o escribir código:

1. **Consultar esta guía**  
   Revisa las secciones 1 (Patrones), 2 (Clases globales), 3 (Reglas técnicas) y 4 (Checklist PR). Aplica los patrones existentes; no inventes estilos ni estructuras nuevas que rompan la convención.

2. **Estilos**  
   - **Nunca** uses `bg-white`, `text-slate-*`, `bg-slate-*`, `border-slate-*`. Usa **siempre** tokens: `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, `bg-primary`, etc.  
   - **No** uses utilidades de paleta genérica (`emerald-*`, `amber-*`, `blue-*`, etc.) para éxito, advertencia o resaltados: usá **`@/lib/ui-classes`** (`BADGE_SUCCESS_TINT_CLASS`, `TEXT_SUCCESS_CLASS`, `TEXT_WARNING_CLASS`, `ICON_WARNING_INTERACTIVE_CLASS`, **`CALLOUT_WARNING_CLASS`**, `IMPORT_STAT_BADGE_CLASSES`) o tokens **`primary`**, **`accent`**, **`accent2`** (amarillo de marca) en combinación con `cn()`.  
   - **Banners y avisos no destructivos:** usar **`CALLOUT_WARNING_CLASS`** en `<p>` / `<div>` de aviso (Balance mensual, configuraciones faltantes, etc.). Está prohibido el patrón `border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100` o cualquier combinación de `*-amber-*` (incluido `dark:`).  
   - **Nunca duplicar utilidades por eje** dentro de la misma `className` (`px-2 px-3`, `min-w-[40rem] min-w-[44rem]`, `text-sm text-base`, `gap-2 gap-4`, `flex-col` + `flex-row`, `grid-cols-1` + `grid-cols-2`, `text-center` + `text-left`, `w-full` + `w-auto` en el mismo nodo salvo override intencional vía `cn()`). Mantener **una sola** utilidad por eje. **Legado a corregir:** cadenas tipo `px-4 px-6 px-8` (simulación responsive) deben colapsarse a **`px-8`** (o el valor único que defina el layout; **`ClassicFilteredTableLayout`** usa `density`: `default` → `px-8`, `compact` → `px-6`).  
   - **Cascarón de página de área:** páginas y `*PageClient` que ocupan toda la pantalla deben usar la clase global **`.area-page-shell`** (opcional **`bg-gris`** si el módulo lo requiere) en lugar de duplicar `flex h-screen … flex-col overflow-hidden` o `flex h-screen min-h-0 flex-col overflow-hidden`. **No** combinar `.area-page-shell` con esas utilidades: la clase global ya las incluye en `globals.css`.  
   - **Política desktop-only (obligatoria):** no usar variantes responsive/mobile en clases Tailwind (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`, `max-*`, etc.). Definir solo clases base (desktop) y mantener una única versión visual.
   - **Excepción acordada**: la pantalla **Balance mensual** (`FinanzasBalanceMensualPageClient`) usa **hex fijos de informe** en el encabezado de la grilla (`#0072BB` + texto blanco) y en las filas de **resultado operativo / resultado ejercicio** (fondo `#a9d6f1`, texto `#063652`). No extrapolar este patrón a otras pantallas sin actualizar esta guía. Detalle en la subsección **Balance mensual** bajo `ClassicFilteredTableLayout`. **Ventas Mensuales** (`FinBalVtasPageClient`, `/finanzas/balance/vtas`): barra **`FilterBar`** + **`FilaFiltrosDesplegables`** (5 columnas: **MES**, **AÑO**, **SUCURSAL**, slot **`col-span-2`** con contador **REGISTRO(S)** + **`LimpiarFiltrosButton`**); cada desplegable en **`FiltroIndividualContainer`** (`input-filtro-unificado`, `select-content-filtro`, máscara **MAYÚSCULAS** en opción “todos” y meses); sin etiquetas fuera del trigger; la **carga** de datos va en **`CrearFinBalVtasModal`** (botón **Nueva Carga** en `actions`), no en la barra de filtros. En modo editor, **Eliminar** por fila: botón ícono **`Trash2`** con **`TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS`**, `aria-label` descriptivo.  
   - **Siempre** combina clases con `cn()` de `@/lib/utils.ts`. **No** uses template literals en `className` (ej. `` className={`${x} ...`} ``), incluyendo el `body` de `layout.tsx`.  
   - **`AppModal`** (`size`): el CVA ya aplica `max-w-md` … `max-w-3xl`. **No** repetir el mismo `max-w-*` en `className` salvo un ancho distinto al del `size` (ej. `max-w-[66rem]` en recepción).
   - **Etiquetas de campo en modales (global):** todo **label** de input, **Select**, fecha, etc. dentro de **`AppModal`**, **`.modal-app`** o **`[data-slot="dialog-content"]`** debe verse en **negro** (`var(--foreground)` / `text-foreground`), **no** `text-muted-foreground`. **`globals.css`** fuerza `color: var(--modal-field-label-color)` en `label`, `[data-slot="label"]`, **`.modal-field-label`**, **`.modal-micro-label`** y **`dt`** de formularios en el cuerpo del modal. Constantes: **`MODAL_FIELD_LABEL_CLASS`**, **`MODAL_MICRO_LABEL_CLASS`** (`@/lib/ui-classes`). Texto auxiliar (ayudas, vacíos, contadores) puede seguir **`text-muted-foreground`**.
   - **Micro-etiquetas en modales densos:** usar **`ModalMicroLabel`** (ya incluye color foreground), no repetir la cadena legacy en `<span>` sueltos.
   - **`DialogHeader` / `DialogFooter`** (`components/ui/dialog.tsx`): una sola alineación y una sola dirección de flex por eje (sin `text-center` + `text-left` ni `flex-col-reverse` + `flex-row` duplicados).
   - Ejemplo correcto: `className={cn("flex gap-2", isActive && "bg-primary/10")}`.
  - **Tarjeta envoltorio de tabla**: cuando la grilla principal vaya dentro de un `Card` (ej. Comp. Proveedores, `/pedidos/enviar`), usar clase global **`card-tabla-envoltorio`** en el **`Card`** de shadcn; la sombra sale de **`--card-tabla-envoltorio-shadow`** en **`globals.css`**. Si la card debe crecer en un flex column (p. ej. proveedores), usar **`className={cn("card-tabla-envoltorio", "flex-1")}`**. En páginas que no usan `Card` (ej. Pedido Urgente / Tintométrico), aplicar directamente `.contenedor-tabla-gestion` como en Comp. Proveedores. **No** repetir utilidades largas ni **`shadow-[0_4px_12px_rgba(0,0,0,0.05)]`** (valor mágico duplicado).

3. **Texto en mayúscula inicial (title case)**  
   - **Títulos de modales** y **textos de botones**: cada palabra con primera letra en mayúscula. Ejemplos: "Importar Lista De Precios", "Nueva Importación".  
   - **Sidebar**: nombre del **módulo** en MAYÚSCULAS (ej. "PEDIDO MERCADERIA", "ANALISIS DE PRECIOS"). Nombre del **submódulo** o **agrupador desplegable** dentro de un módulo: title case (ej. "Lista Precios", "Lista Proveedores", "Cx Compra", "Pedido Urgente", "Px. Vta. Sugerido").  
   - Encabezados de página (SectionHeader/ClassicPageHeader): title case. Aplicar también a `title`/`aria-label` cuando sean etiquetas de UI.
4. **Abreviaciones con punto**  
   - Toda abreviatura en la UI (encabezados, labels, placeholders, tooltips, nombres de archivo generados) debe terminar en punto. Ejemplos: Px., Cx., Dto., Desc., Cant., Prov., Cod., Cód., Sug., Disp., Ext., Transp., Finan., Vta., Comp., Cat., Últ., Mín., Act.
5. **Mayúsculas en filtros y tablas**  
   - **Filtros**: contador de resultados (ej. "X PRODUCTO(S)", "X ÍTEM(S)"), `aria-label` del FilterBar ("FILTROS DE BÚSQUEDA") y placeholders de búsqueda en mayúsculas (ej. "BUSCAR POR DESCRIPCIÓN O CÓDIGO...").  
   - **Opciones de filtros desplegables**: placeholders de Select (PROVEEDOR, MARCA, RUBRO, etc.) y opciones por defecto (PROVEEDORES, TODAS, SELECCIONAR, etc.) en MAYÚSCULAS.  
  - **Encabezados de tablas**: todo el texto de `<TableHead>` en **MAYÚSCULAS y negrita** (`font-bold` en el componente; refuerzo en `globals.css` en `.tabla-gestion-compacta thead th` con `font-weight: var(--font-weight-bold)`). Ej.: PROVEEDOR, DESCRIPCIÓN, CANT. PRODUCTOS. Las abreviaciones en mayúsculas también llevan punto (PX., CX., DTO., etc.). **No** añadir `font-normal` ni `font-medium` en `className` de `TableHead` salvo excepción documentada (anularía la regla).
  - **Columnas de selección** (checkbox/tilde): el encabezado debe ser una **tilde** (ícono `Check`), no texto alternativo como “SELECCIÓN”.
6. **Nueva página con filtros y tabla**  
   - Estructura: `SectionHeader` o `ClassicPageHeader` → `FilterBar` (con `filtros-contenedor-tienda bg-card`) → contenido (tabla con `<Table variant="compact">`).  
   - Si la página tiene **input de búsqueda con debounce**: usa el hook `useFiltrosConBusqueda` y el componente `FiltroBusquedaInput` (ver sección 1, punto 3). No reimplementes debounce ni restauración de foco.  
   - Selects de filtros: `FILTER_SELECT_WRAPPER_CLASS`, `SELECT_TRIGGER_FILTER_CLASS`, `SelectContent` con `position="popper" side="bottom" align="start" className="select-content-filtro"`.  
   - Contador de resultados: `cn(FILTER_COUNT_CLASS, "ml-auto")` si va alineado a la derecha; texto del contador en MAYÚSCULAS (PRODUCTO(S), ÍTEM(S), etc.).

7. **Nuevo modal con tabla**  
   - Usar `ModalTablaConFiltros` de `@/components/shared/ModalTablaConFiltros.tsx` (single o multi selección). Para modales genéricos: `AppModal` de `@/components/shared/AppModal.tsx` con cuerpo `bg-card`.
   - **Botones en modales (obligatorio):** siempre `Button` de `@/components/ui/button`. **Prohibido** `<button>` con utilidades sueltas (`bg-muted/60`, `px-3 py-1.5 rounded-lg`, etc.). CTA principal (adjuntar archivo, confirmar, ítem de lista accionable): `variant="default"` (primary azul, texto blanco). Cancelar / secundario: `variant="outline"`. Pares **SÍ / NO**: **`ModalSiNoChoice`** (`@/components/shared/ModalSiNoChoice.tsx`) — opción activa `default`, inactiva `outline`. Modos o pestañas en el cuerpo: fila de `Button` `size="sm"` con la misma regla activo/inactivo. Excepciones documentadas: celdas de calendario, checkboxes de tabla, disparadores de tooltip, barras de gráfico interactivas.
   - **Etiquetas de campo:** `<label>`, `<Label>` (`data-slot="label"`), **`ModalMicroLabel`** o **`MODAL_FIELD_LABEL_CLASS`** / **`MODAL_MICRO_LABEL_CLASS`** — color **`text-foreground`** (regla global en **`globals.css`**; ver punto 2 de la Guía para IA).
   - Micro-etiquetas de campo en modales densos: **`ModalMicroLabel`** (`@/components/shared/ModalMicroLabel.tsx`, CVA `align`).
   - `AppModal` (wrapper estándar) expone variantes con **CVA** para evitar duplicación de clases:
    - `size`: `"sm" | "md" | "lg" | "xl"` (default `"md"` = `max-w-lg`).
     - `padding`: `"sm" | "default" | "lg"` (default `"default"`).
     - `scrollBody`: `boolean` (default `true`) controla el overflow del cuerpo sin reescribir clases.
     - `hideBodyScrollbars`: `boolean` (default `false`) — con `scrollBody`, oculta barras del área gris (`.app-modal__scroll-area`) y de la card (`.app-modal__body`); ver `globals.css`.
    - `bodyShellClassName`: `string?` — se combina con el `div` gris que envuelve la card (`p-4` por defecto). Ej. `p-2` en modales compactos (`VincularModal`).
   - Cuando el modal tiene una **tabla + bloque inferior fijo** (ej. resúmenes como `TOTAL PEDIDO`), el contenedor de tabla debe consumir el espacio con `flex-1 min-h-0` y **no** debe forzarse con `h-0` u otros height absolutos. Además, como `.contenedor-tabla-gestion` tiene `height: 100%` en `globals.css`, si la cascada lo impide, sobrescribir de forma garantizada con `style={{ height: "auto" }}` (y aplicar `min-h-0 overflow-hidden` en el wrapper inmediato) evita solapes/recortes y deja el scroll exclusivamente en la tabla.
   - Si necesitás alinear un bloque inferior con las mismas columnas de la tabla, **no** usar `grid-cols` con porcentajes que superen 100%. Usar `fr` proporcionales que sumen el mismo total que la tabla, o preferir **`TableFooter` (`<tfoot>`) dentro del mismo `<Table>`** con `colSpan` en las columnas previas. **`PedidoHistoriaDetalleModal`:** totales **TOTAL PEDIDO** en **`<section aria-label="Totales del pedido">`** + **grid** **`5fr_55fr_10fr_15fr_15fr`** **fuera** del **`data-slot="table-container"`** (ver punto 7).
  - **`PedidoHistoriaDetalleModal`:** título visible del modal (AppModal): **Recepcion Pedido**. `AppModal` `sm:max-w-[62.4rem]` (≈ +30% sobre 48rem). Tabla **5% + 55% + 10% + 15% + 15%**: columna **lista de verificación** (icono **Check** en cabecera; por fila **`<Input>`** vacío **`readOnly`**, **`tabIndex={-1}`**, **`pointer-events-none`**, `aria-label="Lista de verificación"` — **no** se escribe a mano): **OK** (`aria-label="OK"`, **Check**) copia **CANT. PEDIDA** en **CANT. RECIBIDA** y marca verificado → ícono **Check** en **`rounded-full bg-primary/20`** (tamaño compacto), fila verificada **`recepcion-fila-verificada`**: fondo gris intermedio neutro vía **`tabla-recepcion-pedido`** en `globals.css`, **`cursor-not-allowed`**, texto legible (**`text-foreground`**, descripción **`font-medium`**); pendiente **`recepcion-fila-pendiente`**: cebra estándar; **OK** deshabilitado si ya verificado; **Editar** copia **CANT. PEDIDA** en **CANT. RECIBIDA**, limpia verificación y deja la fila en modo edición para ajustar la cantidad; **Cesto** persiste **0** en cant. recibida y marca verificado; la cantidad editada solo se confirma con **Confirmar Edición** (check junto al input); si el valor cambió y el input pierde el foco, se muestra aviso y se reenfoca (no se persiste en estado sin ese check); mientras hay edición abierta, **`inert`** en resumen, alta, pie de totales, **`thead`** y filas que no editan, más footer deshabilitado e **`onOpenChange`** que impide cerrar (X, overlay, Escape) hasta confirmar; **DESCRIPCIÓN**, **CANT. PEDIDA**, **CANT. RECIBIDA**, **ACCIONES**; sin **COD. TIENDA** (`title` en descripción con código si existe). (1) Resumen: **dos columnas** en `sm`: bloque proveedor / metadatos **~85%** y columna **FECHA FACTURA** ~**15%** (`GRID_CAPAS_SUP_PEDIDO_HISTORIA` = `85fr_15fr`; sin `div` hueco `hidden sm:block`). Grid del resumen: **`items-center`** (alineación vertical entre columnas en todos los breakpoints). Columna proveedor: **`justify-center gap-0.5 py-0`** (sin **`mt-0.5`** en el segundo párrafo; el aire entre líneas es el **`gap-0.5`** del `flex-col`). Columna fecha (`<label>`): **`flex flex-col justify-center gap-0.5 py-0 px-0 text-left`**; micro-etiqueta **`leading-tight text-left`**. (2) Contenedor **grid** que envuelve la fila de alta + tabla de ítems: **`grid-cols-1`** **`grid-rows-[auto_minmax(0,1fr)]`** **`gap-x-3`** **`gap-y-0`** (sin espacio vertical entre fila de búsqueda y tabla; **`gap-x-3`** = separación horizontal vía *column-gap*). Fila **Agregar producto** (filtrar ítems de la tabla + abrir alta): **`flex`** — bloque izquierdo **`FiltroBusquedaInput`** (placeholder **BUSCAR POR DESCRIPCIÓN...**, input **`h-10 min-h-10`**) + **`LimpiarFiltrosButton`**; bloque derecho botón **Agregar Producto** **`h-10 min-h-10`**; ancho acotado en escritorio (`sm:max-w-[36rem]`) para separar visualmente de la acción de alta (`sm:flex-row` **`justify-between`** **`items-center`** **`gap-x-10`**; móvil **`flex-col`** **`gap-3`**). La **CANT.** del producto nuevo solo se ingresa en **`AgregarProductosModal`**. La sección de alta tiene título **AGREGAR PRODUCTO A LA RECEPCIÓN** (`<span>` `MODAL_MICRO_LABEL_CLASS` + **`text-foreground`** (título en color principal, no muted) + **`p-0 m-0 mb-1 box-border block w-full text-center font-bold`**); la `<section>` usa **`flex flex-col gap-0 pt-0 pb-1.5 pr-3 pl-0 sm:pt-0 sm:pb-2 sm:pr-4 sm:pl-0`** (mismo padding horizontal que el panel resumen del modal; sin **`gap`** entre título y grid salvo el **`mb-1`** del título) y **`aria-labelledby`** al `<span>`. Contenedor **columna** principal del cuerpo del modal: **`gap-0`** entre el **resumen** y el **grid** (alta + tabla), para evitar hueco vertical excesivo. Panel resumen (envoltorio grid proveedor + **FECHA FACTURA**): **`pr-3 pl-0 pt-0 pb-0 sm:pr-4 sm:pl-0 sm:pt-0 sm:pb-0`** (solo padding derecho; sin **`pl`** ni **`pt`**; **`pb-0`**). Sección **AGREGAR PRODUCTO A LA RECEPCIÓN**: **`flex flex-col gap-0 pt-0 pb-1.5 pr-3 pl-0 sm:pt-0 sm:pb-2 sm:pr-4 sm:pl-0`** (homologado al envoltorio del resumen); separación título ↔ fila: **`mb-1`** en el `<span>`. Celdas del grid solo **`py-0`** (sin **`px-*`**). El acople con el resumen sigue con **`gap-0`** en la columna del modal. **`GRID_CAPAS_SUP_PEDIDO_HISTORIA`**: **`gap-2`** en columna única / **`sm:gap-0`**. (3) Bloque **Ítems del pedido**: `<section aria-label="Ítems del pedido">`; `<Table>` solo **`thead` + `tbody`** (sin **`tfoot`**). **`.contenedor-tabla-gestion`** **`flex flex-col`** **`overflow-hidden`**: solo un hijo **`div`** **`flex-1 min-h-0 overflow-x-hidden overflow-y-auto`** envuelve la **`<Table>`** (scroll no cubre totales). **`<section aria-label="Totales del pedido">`** es **hermana** de ese **`div`** (fuera del **`overflow-y-auto`**), con **`GRID_PEDIDO_HISTORIA_TABLA_COLS`**, **`min-w-0` `items-center`**, **`border-t border-border`**, **`bg-background`**, **`shrink-0`**, padding horizontal como el panel resumen (**`pr-3 pl-0 sm:pr-4 sm:pl-0`**) y **`py-2`**: sin celdas huecas; **`col-start-4`** **TOTAL PEDIDO** (`text-sm font-semibold tabular-nums`), **`col-start-5`**: **`celda-datos celda-datos--flush-left`** **`flex`** **`items-center`** **`justify-start`** **`gap-0`** **`border-b-0`** (**.celda-datos--flush-left** fuerza **`padding-left: 0`** frente al shorthand **`padding`** de **`.celda-datos`**). (**sin** **`tabla-bloque-secundario-cell-divider`** en el pie; la columna **ACCIONES** del **`tbody`** sigue usando el divisor). **`Input`** **`ml-0` `h-9` `w-full` `min-w-0` `pl-0` `pr-3` `py-1`** (base **`Input`**: **`pl-3 pr-3`** para que **`tailwind-merge`** resuelva **`pl-0`**; distinto de **FECHA FACTURA**, que usa **`px-3`** en el propio campo); **`text-center`** **`font-semibold`** **`tabular-nums`**; **`inputBorderClassName`**; `inputMode="decimal"` `autoComplete="off"`). `MODAL_SECTION_CARD_CLASS` = `bg-transparent`. `fechaRecepcion` sin persistencia backend hasta definir campo. **Flujo secuencial** (pedido no **RECIBIDO**): foco inicial en **`FECHA FACTURA`** (`ref`); sin fecha (`value` vacío) la sección **AGREGAR PRODUCTO** y la tabla llevan **`pointer-events-none` `opacity-50` `cursor-not-allowed`** y controles **`disabled`**; con fecha habilitados alta y tabla. **Total Pedido** (`aria-label="Total Pedido"`) **`disabled`** hasta que exista al menos una fila y **todas** tengan checklist confirmado. **`cargarDetalle`** (tras `getPedidoHistoriaDetalleAction`) **no** debe anular **`cantRecibida`** en ítems cuando el pedido está en **SIN RECEPCION**: los valores vienen del servidor y deben conservarse al refrescar (p. ej. tras **Agregar Producto**) para no borrar cantidades ya guardadas. Tras alta por **`agregarPedidoHistoriaItemAction`**, la fila nueva queda con checklist confirmado en cliente (la cant. recibida se ingresó y persistió en el alta); el foco vuelve al filtro de búsqueda de **AGREGAR PRODUCTO**. Botón principal **Registrar En Dux** habilitado solo con fecha, checklist completo en todas las filas y total normalizado **> 0**; tras éxito cierra el modal (`onOpenChange(false)`).

8. **Tablas (encabezado fijo + paginación)**  
   - **Un solo diseño** para toda la app (referencia: **Lista Px Proveedores** / `ListaPreciosTablaConFiltros`). Siempre usar `Table` de `@/components/ui/table`; aplica la clase `.tabla-gestion-compacta`. No usar `<table>` en crudo ni otras clases de tabla. Encabezados (`TableHead`) en **MAYÚSCULAS y negrita**. Celdas de datos con **`.celda-datos`**; **no** sobrescribir `py-*` / `px-*` ni altura en filas de datos (el diseño global manda: **`--tabla-body-row-min-height: 2rem`** en todas las tablas).
  - **Altura de encabezado (obligatorio y global):** todos los `th` de tablas con `.tabla-gestion-compacta` deben usar **siempre** la misma altura fija definida en `globals.css` (`--tabla-thead-height = 2.125rem`), valor tomado de la tabla de **Comp. Proveedores**. Este alto corresponde a **2 líneas** de texto y se aplica aunque una tabla tenga títulos de una sola línea; no se permite altura dinámica por tabla.
   - **Pie de totales fijo** (patrón `contenedor-tabla-gestion--pie-fijo`): en scroll, `scrollbar-gutter: stable` (`globals.css`). **Tesorería** y **Balance · Gastos** bajan los totales con **`.finanzas-resumen-tarjeta`** (borde #0072bb, contenido centrado) bajo el área con scroll, **sin** segunda `<table>` de pie. Cuando haga falta alinear un **pie** con las mismas columnas que el cuerpo, se puede usar una **segunda** `<table>` en **`.contenedor-tabla-gestion--pie-fijo-pie`** + **`usePieFijoColumnWidthsSync`** (`src/lib/hooks/usePieFijoColumnWidthsSync.ts`): ref en **`.contenedor-tabla-gestion--pie-fijo-scroll`**, ref en la `<table>` del pie, mismo número de `<col>` que de `th`. **`TablaGastos`:** `<table>` en crudo, totales en tarjetas **MONTO** / **PAGADO** / **PENDIENTE**; **`TablaTesoreriaCajas`:** `Table` de shadcn, pie en **`.finanzas-resumen-tarjeta`**: fila **tipo de valor** (**EFECTIVO**, **DIGITAL**, **CHEQUE**) y fila **disponibilidad** (**INMEDIATO**, **DIFERIDO**; cheques repartidos como `montoDisponible` / `montoChequesDiferidos`).
   - **Encabezado fijo (obligatorio)**: el encabezado de la tabla debe estar fijo y **no moverse con el scroll**. `TableHeader` (`<thead>`) usa **`sticky top-0 z-20`** y **`bg-primary`** (fondo opaco); `TableHead` (`<th>`) añade **`sticky top-0 z-20`**. **`globals.css`** (`.tabla-gestion-compacta thead th`) refuerza **`position: sticky`**, **`top: 0`** y **`z-index: 20`**. **Crítico:** el wrapper **`data-slot="table-container"`** del componente **`Table` no debe llevar **`overflow-y-auto`** ni **`overflow-x-hidden`/`auto`**: en CSS, si un eje de overflow no es `visible`, el otro pasa a comportarse como `auto` y ese nodo se convierte en scrollport intermedio; al crecer con la tabla, el sticky del `<thead>` deja de anclarse al contenedor que el usuario desplaza. El scroll vertical (y el horizontal, si aplica) debe estar **solo** en un ancestro (p. ej. **`.contenedor-tabla-gestion`** o un **`div`** con **`overflow-y-auto`** en modales). Iconos en cabecera sobre **`bg-primary`**: **`text-primary-foreground`** (no **`text-foreground`**).  
  - **Botón en `TableHead` (tilde/selección total):** si un encabezado incluye un `button`, ese botón debe adaptarse al alto fijo del `th` y **no** heredar dimensiones globales de `main button` (`h-10`, `py`, etc.). La normalización vive en `globals.css` (`.tabla-gestion-compacta thead th button`) para mantener una altura uniforme del encabezado entre módulos.
  - **Botones de solo ícono en celdas de tabla (`tbody`) — prohibición y formato obligatorio:** está **prohibido** usar `<Button variant="outline" size="icon-xs">` (o `icon-sm` / `icon` con `outline`) para acciones por fila que generen apariencia **neutra tipo documento** (`border`, `bg-background`, `shadow-xs`, hover `accent`), como el antiguo **Registrar pago** (`Banknote`) en `TablaGastos`. **Obligatorio:** fondo **`#0072BB`**, **ícono** (o texto mínimo **+** / **−**) en **blanco** (`text-white`), hover **`bg-[#0072BB]/90`**. Patrón: `variant="ghost"` + `size="icon"` + **`TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS`** + contenedor **`TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS`** (**`p-1.5`**). **`globals.css`** fuerza el cuadrado a **`calc(var(--tabla-body-row-min-height) - 0.75rem)`** con **`padding: 0.125rem`** para que **`size-9`** del `Button` **no** estire la fila por encima de **2rem**. Ícono: **`TABLE_ROW_ACTION_ICON_CLASS`**. Celda: **`.celda-datos--accion-relleno-fila`**. Si en la misma fila hay un **`Input`** entre **+**/**−**, dar al input **`self-center`**. **No** extrapolar a botones con **texto visible** de CTA en cabeceras, pies de modal o barras de herramientas: esos siguen `default` / `outline` / `secondary` del tema cuando corresponda.
   - **Paginación estándar**: todas las tablas de la app muestran **100 ítems por página** (`PAGE_SIZE` en `@/lib/pagination`). Cuando el total de filas supera 100, se muestran controles de paginación debajo de la tabla.  
   - **Pedido Urgente** (`TablaPedidoUrgente`): **sin** columna **VINC.** (el vínculo a tienda/Dux se refleja solo en los **subencabezados** del `tbody` y en **`estaVinculadoTienda`** en datos). **Subencabezados en el `tbody`** (no un segundo `<thead>`): si el bloque tiene al menos una fila, **`TablaSubencabezadoSeccionRow`** (`colSpan={7}`) con el texto fijo **Productos Registrados en Dux** / **Productos Sin Registrar en Dux** (MAYÚSCULAS vía el componente) antes de las filas con **`estaVinculadoTienda === true`** / **`false`**; orden siempre registrados primero. **Modales Balance** (detalle por tipo y rubro): misma fila de sección con **`totalBloque`** opcional (suma de rubros del tipo). **Columna PROVEEDOR** en **registrados Dux**: un solo proveedor vinculado → **`prefijo`**; varios (`miembrosAgrupacion` con más de un miembro) → solo el dígito **`n`** (ej. **`2`**, **`3`**); en **sin registrar** sigue **`prefijo`** salvo agrupación anómala (misma regla legacy: varios miembros sin Dux → celda vacía). **Bloques secundarios en cabecera y cuerpo** (`tabla-bloque-secundario-*`): primero **CANT. PED.** + **PROV. PED.** (prefijos con cantidad > 0; celdas **PROV. PED.** y cesto **sin** `tabla-bloque-secundario-cell-divider` para no enmarcar la columna) + cesto; luego **CONF. REPO.** + **CANT. REPO.**; cada sub-bloque arranca con **`*-divider`** en la primera columna del bloque (línea blanca en `thead`, **#0072bb** inset en `tbody` donde aplique **`*-cell-divider`**). **DESCRIPCIÓN** en agrupados = **`descripcion_tienda`** unificada en servidor. **CANT. PED.** = suma por `cod_ext`; doble clic abre modal **Elegir Proveedor** con **Proveedor 1**, **Proveedor 2**, … y botón **Pedir A Este Proveedor** por fila; borrar cantidad limpia todos los miembros con cantidad > 0.
   - **Páginas con URL** (Pedido Urgente, Tienda, Stock): usar `PaginacionTabla` de `@/components/shared/PaginacionTabla.tsx` con `basePath` y `params` (query actual sin `pagina`).  
   - **Páginas con datos en cliente** (Lista precios, Sugeridos): usar `PaginacionClient` de `@/components/shared/PaginacionClient.tsx` con `paginaActual`, `totalPaginas` y `onPaginaChange`.  
   - En el backend, las consultas que alimentan tablas deben usar `skip` y `take` (p. ej. `take: PAGE_SIZE`, `skip: (pagina - 1) * PAGE_SIZE`) y devolver `total` y `totalPaginas` para que la UI muestre la paginación correctamente.

9. **Zona horaria (Argentina)**  
   - Para mostrar **fecha/hora de negocio** (pedidos, historial, impresión stock, nombres de export) usar `@/lib/fechaArgentina` (misma regla que backend: `America/Argentina/Buenos_Aires`). No depender de la zona del navegador si el dato es un instante UTC (p. ej. `generadoAt` serializado como ISO).
   - Valores **solo día** persistidos como `@db.Date` (Prisma `Date` en medianoche UTC del calendario guardado): exponer `YYYY-MM-DD` con **`isoYmdFromPrismaDateOnly`**, no con **`dateToIsoYmdArgentina`** sobre ese `Date` (en Argentina quedaría el día anterior; afecta inputs `type="date"`, p. ej. **Editar Cheque**).

10. **Al terminar un cambio**  
   - Recorre el checklist de la sección 4. Si añades una clase global nueva en `globals.css`, regístrala en la sección 2 de este documento.
   - Si ajustas elementos de **slidenav/sidebar**, mantener componentes compactos y consistentes:
    - **Ritmo vertical** (`Sidebar.tsx`): **navegación** arriba (`pt-3 px-4`). Abajo (`mt-auto`, `px-4 pb-4`): **sync/import** → bloque **usuario + área/logo** (una misma sección visual): **regla horizontal** clara arriba del usuario (`flex justify-center` + `h-px w-[80%] bg-sidebar-foreground/85`) → **`SelectorRol` `compact`** (`mt-2` + wrapper `rounded-lg p-2`) → **`SidebarMainAppArea`** (`flex w-full min-w-0 flex-col` **`pt-2 pb-2`** + `className="pt-2"`), sin mezclar usuario y área en el mismo nodo DOM.
    - **Progreso import / sync** (`ImportStatusIndicator`, `SyncStatusIndicator`): `ImportStatusIndicator` solo visible con import activa; polling solo si **`pollEnabled`** (`rol === "editor"`). **`SyncStatusIndicator`**: botón fijo **`SINCRONIZAR`** + línea **`Últ. Act.: Hace …`** (más reciente entre productos y compras). **Simple**: click → sync **productos**. **Editor**: click → modal **`SincronizarDuxOpcionesModal`** (**Productos** / **Compras**). Con sync en curso el slot muestra **`SINCRONIZANDO…`** + progreso y ETA en minutos (`formatSyncEta.ts`). Toasts al finalizar productos/compras.
     - Resto de botones de sidebar (navegación, etc.): tokens (`bg-sidebar-accent`, `text-sidebar-foreground`) y hover suave (`bg-sidebar-accent/80`).

**Referencia rápida de tokens (usar en lugar de valores fijos):**

| Evitar | Usar |
|--------|------|
| `bg-white` | `bg-card` o `bg-background` |
| `text-slate-400`, `text-slate-500`, `text-slate-600` | `text-muted-foreground` |
| `bg-slate-100`, fondos grises | `bg-muted` |
| `border-slate-200` | `border-border` |
| `emerald-*`, `amber-*`, `blue-*` (éxito / aviso / “info”) | `@/lib/ui-classes` o `text-primary`, `bg-accent`, `text-accent2`, etc. |
| Banner/aviso `border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100` | **`CALLOUT_WARNING_CLASS`** (`@/lib/ui-classes`) — token `accent2` |
| Ícono `TriangleAlert` con `text-amber-600 dark:text-amber-500` | **`TEXT_WARNING_CLASS`** (`@/lib/ui-classes`) |
| `` className={`${a} ${b}`} `` | `className={cn(a, b)}` |
| `shadow-[0_4px_12px_rgba(0,0,0,0.05)]` en `Card` de tabla | `className={cn("card-tabla-envoltorio", …)}` + variable **`--card-tabla-envoltorio-shadow`** |
| `<div className="flex h-screen min-h-0 flex-col overflow-hidden">` o `h-screen flex flex-col overflow-hidden` (cascarón de página) | `<div className="area-page-shell">` o `area-page-shell bg-gris` |
| `<col style={{ width: "20%" }}>` con valor estático | `<col className="w-[20%]">` (solo usar `style` para anchos **dinámicos**) |
| `window.location.href = …` (navegación interna App Router) | `useRouter().push(url)` desde `next/navigation` |
| Utilidades duplicadas en una misma `className` (`px-2 px-3`, `min-w-[a] min-w-[b]`) | Mantener **una sola** utilidad por eje; el último valor gana en CSS y la duplicación oculta intención |

---

## Alcance de la auditoría (cerrada)

La auditoría de frontend se considera **terminada**. Se han aplicado:

- **Tokens de diseño**: eliminación de `bg-white`, `text-slate-*`, `bg-slate-*`, `border-slate-*` en favor de `bg-card`, `text-muted-foreground`, `bg-muted`, `border-border` en **toda** la app (páginas en `src/app/` y componentes en `src/components/`).
- **Utilidad `cn()`**: todas las combinaciones de clases usan `cn()` de `@/lib/utils.ts`; no quedan template literals `` `...${VAR}` `` en `className`.
- **Reutilización**: hook `useFiltrosConBusqueda` y componente `FiltroBusquedaInput`; todos los filtros con búsqueda migrados.
- **Documentación**: esta guía y `.cursorrules` alineados con los criterios anteriores.

Para nuevas funcionalidades, seguir el checklist de PR (sección 4) y los patrones de la sección 1.

### Revisión anti-código muerto (mantenimiento)

Registro de simplificaciones y reglas para que no reaparezcan patrones inútiles:

- **Estado no leído en UI**: si un `useState` solo recibe asignaciones y nunca se usa en el JSX (ni en props derivadas visibles), eliminarlo o exponer el valor (p. ej. bloque colapsable “Detalle técnico”, `toast` con acción copiar). Evita ruido en lint y confusión sobre la fuente de verdad del error (p. ej. `toast` + `errorMsg` ya cubren al usuario).
- **`useTransition`**: no duplicar un `pendingId` local si ningún `disabled`/estilo depende de la fila en curso; basta con `isPending` del hook cuando la UI no diferencia por ítem.
- **CVA sin uso**: borrar bloques `cva(...)` y tipos asociados si no hay referencias en el mismo módulo (revisar antes de commit).
- **Imports**: quitar imports de módulos no referenciados (`next/cache`, íconos, `cn`, constantes de `FilterBar`, etc.).
- **`LimpiarFiltrosButton`**: la prop `visible` está deprecada; mantenerla opcional en el tipo por compatibilidad pero **no** enlazarla en el cuerpo del componente (evita variables `_visible` no usadas).
- **`<colgroup>` / `<col>`**: anchos **porcentuales fijos** → `className="w-[20%]"` (o el porcentaje que corresponda); **conservar** `style={{ width: \`${pct}%\` }}` solo cuando el ancho es **dinámico** (barras, sync, pie sincronizado, etc.), como ya documenta la tabla de equivalencias en la “Guía para IA”.
- **`global-error.tsx`**: al reemplazar el root layout, debe importar **`./globals.css`** y componer UI con **`cn()`** y tokens (`bg-background`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`, etc.); no usar objetos `style={{}}` con hex sueltos salvo excepción documentada en otro módulo.
- **Props “túnel” sin uso:** no pasar props a subcomponentes internos si el hijo no las consume (p. ej. `competencias` en `FilaPxListas` cuando solo el modal padre las necesita).
- **Exports `@deprecated` en `ui-classes` y layout:** eliminar constantes, alias y props obsoletas cuando no queden referencias en `src/` (no dejar alias muertos “por si acaso”). Ej.: `MODAL_ASIGNAR_PRODUCTOS_MAX_WIDTH_CLASS`, prop `compact` en `SectionHeader`, `costosCompraDifierenParaInforme` en `aumentoCostoCompra.ts`.
- **Hooks huérfanos de sync legacy:** no conservar `useListaPreciosTiendaModalSync`, `useSyncListaPreciosStatusPoll` ni `SyncModal` si el flujo activo es **`SyncStatusIndicator`** + **`DuxSyncStyleButton`** (eliminados 2026-06-30).
- **Componentes huérfanos:** antes de crear un modal/página, verificar que un `*PageClient` o ruta App Router lo importe. Tras redirects (p. ej. `/precios-competencia` → Px Competencia), borrar la grilla standalone y filtros legacy del cluster, conservando modales compartidos (`AsociarUrlsCompetenciaModal`, `RelevamientoUltimoMensaje`, etc.).
- **Sync en sidebar:** el flujo activo es **`SyncStatusIndicator`** + **`DuxSyncStyleButton`**; no reintroducir `SyncDuxHeaderButton` / `StockCard` / `StockPageSyncGate` (eliminados 2026-06-04).
- **Paginación proveedores:** usar **`PaginacionTabla`** (URL) o **`PaginacionClient`** (estado cliente); no crear variantes locales (`PaginacionProductos` eliminado).
- **ESLint / React Compiler (Next.js 16):** reglas como `react-hooks/set-state-in-effect`, `react-hooks/immutability` (asignación a `window.location`) y `react-hooks/refs` (escribir `.current` en render) están activas. En este repo:
  - Tras abrir modal o sincronizar desde props/URL, si hace falta **`setState` dentro de `useEffect`**, envolver la actualización en **`queueMicrotask(() => { ... })`** para cumplir el linter sin cambiar el comportamiento observable.
  - Para cambiar la query de la app usar **`useRouter().push(\`${pathname}?${search}\`)`** en componentes cliente, no **`window.location.href`**.
  - Callbacks y refs “espejo” (p. ej. `onCompletoRef.current = onCompleto`) van en un **`useEffect`** dependiente del valor, no en el cuerpo del render.
  - Props o variables reservadas por API pero no usadas en el cuerpo: prefijo **`_`** (p. ej. `_total`, `_qActual`). `eslint.config.mjs` declara `argsIgnorePattern` / `varsIgnorePattern: "^_"` para `no-unused-vars`.

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
   - Contador: `FILTER_COUNT_CLASS` (incluye `filtro-count-label`). Cuando convive con `LimpiarFiltrosButton` global, reserva margen derecho para evitar superposición y mantiene truncado en una línea (sin reglas responsive).
   - `LimpiarFiltrosButton` (ícono cesto): **siempre visible** por regla global de UX, incluso sin filtros activos. Su acción sigue limpiando el estado de filtros actual.
   - **Sin búsqueda por descripción**: cuando una pantalla no tiene input de búsqueda y los filtros entran en una sola línea, ubicar las acciones en la **misma fila** usando un slot inline dentro de `FilaFiltrosDesplegables` (`FILTER_INLINE_ACTION_SLOT_CLASS`, por ejemplo con `col-span-2`) para compactar altura. Si no entra en una sola línea, usar `FilterRowNoSearchActions` como segunda fila.
   - SelectContent: `position="popper" side="bottom" align="start" className="select-content-filtro"`.
   - **Select con ítem numérico 0:** si el valor elegido es `0` y el trigger parece vacío o el texto no contrasta, el `Select` controlado debe armar `value` con `typeof estado === "number" ? String(estado) : undefined` (evita ambigüedades con Radix/shadcn), sumar al trigger `text-foreground` y `[&_[data-slot=select-value]]:text-foreground` junto a `SELECT_TRIGGER_FILTER_CLASS`, y opcionalmente mostrar el número como hijo de `SelectValue` (`String(estado)`). Referencia: **PLAZO DE PAGO** en `CrearEditarFinBalGastoFinalModal`.
   - **Finanzas — barra de filtros en página:** en **Balance · Gastos**, **Ventas Mensuales**, **Balance mensual**, **Tesorería**, **Flujo de fondo** y **Control Comprobantes**, cada `Select` (y en Control Comprobantes el trigger de **rango de fechas** cuando hay fechas aplicadas) va envuelto en `FiltroIndividualContainer` además de `LimpiarFiltrosButton`. Para **AÑO** / **MES** en Balance · Gastos y Balance mensual, la referencia de “filtro activo” es el calendario actual en Argentina (`dateToIsoYmdArgentina`): limpiar **año** navega al año de hoy manteniendo el mes elegido; limpiar **mes** navega al mes de hoy manteniendo el año. **Balance mensual** añade cesto global que navega al periodo completo actual AR.

3. **Input de búsqueda en filtros (reutilización)**
  - **Hook:** `useFiltrosConBusqueda` en `@/lib/hooks/useFiltrosConBusqueda.ts`: estado `q`, debounce, restauración de foco (opcional con `focusStorageKey`) y `isDebouncing`. Llamar `prepareNavigate()` antes de `router.push` / navegación que recargue la vista cuando se use `focusStorageKey`. El hook agrega un **commit diferido cancelable** (`commitDelayMs`) para evitar carreras: si el usuario vuelve a escribir mientras hay navegación pendiente, se cancela la búsqueda anterior.
  - **Regla UX anti-race (typing + recarga):** al sincronizar `qActual` desde URL, si el input de búsqueda sigue enfocado y el usuario ya escribió un valor más nuevo localmente, **no** sobrescribir ese texto con el valor de una navegación previa. Esto evita que se borre lo tipeado cuando el usuario hace una pausa corta y vuelve a escribir.
   - **Componente:** `FiltroBusquedaInput` en `@/components/shared/FiltroBusquedaInput.tsx`: icono Search, input con estilo unificado, tacho **`Trash2`** (`variant="primaryIcon"` + `filtro-individual-clear-btn`, mismo look que `LimpiarFiltrosButton`) y Loader. Usar junto al hook para nueva pantallas con filtro de búsqueda (ej. FiltrosProductos, FiltrosTienda, FiltrosStock).
   - **Nota**: Si la página ya usa filtros por URL (Server Component) y necesitás una segunda fila con búsqueda (ej. “Generar Pedido”), agregá `q` en `searchParams`, pasalo al componente de filtros, y debounceá la navegación con `useFiltrosConBusqueda` (placeholder en MAYÚSCULAS).
   - **Pedido Urgente** (`PedidoUrgentePageClient`): **solo SUCURSAL** es obligatoria para listar productos; las cantidades en **CANT. PED.** se sincronizan desde el servidor en cada `productos` (p. ej. tras `router.refresh()` al generar pedido) y se limpian al instante con `onGeneradoExito` en `GenerarPedidoToolbarButton`; **PROVEEDOR**, filtro **PEDIDO** y búsqueda acotan. Filtro **PEDIDO**: **`CUALQUIER TIPO PEDIDO`** y **`PEDIDO URGENTE`** listan todas las líneas **`lista_precios_provee`** con **`habilitado = true`**; las cantidades en **CANT. PED.** se rellenan si existen líneas urgente en **`prod_ped_merc`**. **`PEDIDO REPOSICION`** restringe a productos tienda configurados/elegibles en reposición (**`reposicion_cod_tienda`** en **`prod_ped_merc`**). Mensaje sin sucursal: *«Seleccioná una sucursal para ver los productos.»* En cabecera solo el botón **Generar Pedido** (`GenerarPedidoToolbarButton`); **no** hay **Guardar Cambios**. Cantidades: modal de cantidad o cesto (`upsertPedidoUrgenteMercaderiaItemAction`). Debajo de la tabla **no** mostrar texto resumen tipo **“Mostrando X de Y”**; si hay más de una página, renderizar solo `PaginacionTabla` alineada a la derecha. **Doble clic en fila:** si hay **varios proveedores** para el mismo vínculo tienda (`miembrosAgrupacion.length > 1`), abrir modal **Elegir Proveedor** — **también con filtro PROVEEDOR activo** (el backend sigue enviando todos los miembros del grupo); si no, abrir directamente **`CantidadPedidoUrgenteModal`**.
  - **Tabla Pedido Urgente (columnas y anchos)** (`TablaPedidoUrgente`): siete columnas vía `<colgroup>` (suma **100%**): **PROVEEDOR** **10%**, **DESCRIPCIÓN** **60%**, **CANT. PED.** **6%**, **PROV. PED.** **6%**, cesto **6%**, **CONF. REPO.** **6%**, **CANT. REPO.** **6%**. **Cesto** (eliminar cantidad pedida): el `Button` con **`TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS`** debe ir en contenedor **`flex … p-0`** (sin **`TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS`**/`p-1.5`) y overrides **`!size-7 max-h-7`** para no superar el alto fijo de fila **`2rem`** de `.tabla-gestion-compacta` (el `size="icon"` base es **`size-9`** y estiraba la fila). **PROV. PED.**: prefijo(es) del o de los proveedores con cantidad pedida > 0 (según **`cantPorId`** por `cod_ext`); en grupo, varios miembros con cantidad → prefijos unidos con **` · `**. **Sin** columna **VINC.** (registro Dux/tienda por subencabezados y **`estaVinculadoTienda`**). Bloques **`tabla-bloque-secundario-*`**: pedido (**CANT. PED.** con divisor de bloque, **PROV. PED.** y cesto sin divisor vertical en esas celdas, **CONF. REPO.** inicia bloque reposición) y reposición. Definir anchos con `<colgroup>` + `Table` `table-fixed` y un único contenedor `.contenedor-tabla-gestion`.
   - **Auto-refresh por Posición IVA (pedidos):** en **Generar Pedido**, **Pedido Urgente** y **Pedido Reposición**, montar **`PosicionIvaComparacionAutoRefresh`** con el token inicial del servidor (`getPosicionIvaComparacionRevisionToken`). El hook **`usePosicionIvaComparacionAutoRefresh`** consulta cada ~30 s (y al recuperar foco) si cambió el saldo efectivo de comparación (acumulado automático, saldo manual/débito/crédito **o** valor configurado en Posición IVA); si cambia, **`router.refresh()`** para actualizar proveedores resueltos sin recargar manualmente (útil si otra PC modificó Posición IVA).
   - **Generar pedido (PDF / WhatsApp)**: usar `GenerarPedidoToolbarButton`. Texto del botón de cabecera por defecto: **Generar Pedido** (también en **Urgente** y **Tintométrico**). Abre un **`AppModal`** con orden **`SUCURSAL` → `TIPO DE PEDIDO` (multi) → `PROVEEDOR`**. **TIPO** deshabilitado hasta elegir sucursal; **PROVEEDOR** deshabilitado hasta sucursal **y** al menos un tipo. **PROVEEDOR** solo lista proveedores con ítems y **cantidad a pedir > 0** para esa sucursal y esos tipos (`listarProveedoresConPedidoActivoAction`); en **`/pedidos/enviar`** el filtro URL usa el mismo criterio vía **`getEnviarPedidoData`**. Al cambiar sucursal se resetean tipo y proveedor. El botón del footer del modal solo se habilita con los **tres** completos y **`hayItems === true`**. Tras éxito (descarga PDF o envío WhatsApp) ejecutar `router.refresh()` para que se limpien las grillas afectadas (Urgente/Tintométrico). Rutas: `/pedidos/enviar`, **Pedido Urgente**, **Pedido Tintométrico**, **Pedido Reposición**.
   - **Pedido Tintométrico** (`/pedidos/tintometrico`): al guardar ítems, el backend arma `cod_ext` con **`buildCodExtTintometrico(codTienda, codTintometrico)`** para que no se pisen filas con la misma base y distinto COD.; al borrar, enviar el **`codExt`** de la fila (no solo `cod_tienda`).
  - **Px. Vta. Sugerido** (`/gestion-productos/proveedores/sugeridos`): la grilla lista ítems que coinciden con filtros y con **`habilitado = true`** (no exige `px_vta_sugerido` no nulo). La columna de encabezado es **`DESCRIPCIÓN`** y muestra descripción efectiva por `cod_ext`: primero **`descripcion_tienda`** (si existe en `prod_precios_tienda`), y como fallback **`descripcion_proveedor`** (`prod_precios_provee`). Si **`px_vta_sugerido`** viene nulo, la celda se muestra vacía (sin `$0`). En el payload de lectura (`getListaPreciosConOpcionesAction`), el campo **`pxVtaSugerido`** debe enviarse siempre para evitar celdas vacías por ausencia de mapeo.
   - **Página `/pedidos/enviar` (tabla previa)**: sin filtros en URL muestra **todos** los ítems con cantidad a pedir **> 0** según datos resueltos desde **`prod_ped_merc`** (`getItemsTablaEnviarPedido`); cada filtro activo (**SUCURSAL**, **PROVEEDOR**, **TIPO**, `q`) **reduce** la grilla. Vacío sin filtros: *«No hay ítems con cantidad a pedir.»*; vacío con algún filtro: *«No hay ítems para generar el pedido con los filtros seleccionados.»*
- **Tabla `/pedidos/enviar` (columnas, orden):** **TIPO PEDIDO** (**12%**, `prod_ped_merc.tipo_de_pedido`), **SUCURSAL** (**12%**, texto en MAYÚSCULAS), **PROVEEDOR** (**18%**), **DESCRIPCIÓN** (**48%**), **CANT. PEDIR** (**10%**). Envoltorio: **`Card`** con **`className="card-tabla-envoltorio"`** (o **`cn(..., "flex-1")`** si aplica).
- En la barra de filtros de **Generar Pedido** (`FiltrosEnviarPedido` y modal `GenerarPedidoToolbarButton`), el orden es `SUCURSAL` → `TIPO DE PEDIDO` → `PROVEEDOR`, con habilitación en cascada (ver ítem anterior). El desplegable **TIPO DE PEDIDO** (multi) muestra cada opción como **casilla** (`input type="checkbox"`) + etiqueta (URGENTE / TINTOMÉTRICO / REPOSICIÓN), no ícono ✓ a la derecha.
- En `Pedido Reposición`, el orden de desplegables es `SUCURSAL` → `PROVEEDOR` → `MARCA` → `RUBRO` → `CONFIGURADO` (sin `SUB-RUBRO`).
  - **Modal `ConfigurarReposicionModal`** (`src/components/pedidos/ConfigurarReposicionModal.tsx`): al abrir un ítem **sin** regla guardada (`idReposicion` y `formaPedir` vacíos), **PUNTO REPOSIC.** y la columna de cantidad (CANT. MAX. / CANT. FIJA) usan estado **string** (`puntoInput`, `cantInput`) para mostrar **vacío** en lugar de `0`. Tras elegir **FORMA PEDIR**, el tercer campo solo aparece cuando **PUNTO REPOSIC.** tiene un entero válido **≥ 0** (el **0** habilita la columna de cantidad). **Cantidad reposición** sigue exigiendo entero **≥ 1** al guardar; vacío o **0** no son válidos. Al editar una regla existente, se precargan los valores del servidor como texto. Helpers locales: `parsePuntoReposicionInput`, `parseCantReposicionInput`. La tabla bajo **Agregar esta configuración a estos productos** está **siempre** visible: primera fila = producto con el que se abrió el modal (`item.descripcionTienda`), sin botón quitar (celda **—**); filas siguientes = `productosAdicionales` con acción quitar.

4. **Modal con tabla y filtros**
   - Usar `ModalTablaConFiltros` de `@/components/shared/ModalTablaConFiltros.tsx` (single o multi selección).
   - **Limpieza en modales:** no usar `LimpiarFiltrosButton` (posición global del recuadro de filtros de página); ahorra espacio. Cada `Select` u otro control sin limpiar integrado va envuelto en `FiltroIndividualContainer` (`activo` / `onLimpiar`). Para búsqueda, preferir `FiltroBusquedaInput` (incluye X propia) en lugar de duplicar tachos.
   - **Estilo y tamaño del tacho individual (`filtro-individual-clear-btn`):** debe usar el mismo look del botón global `LimpiarFiltrosButton` (`variant="primaryIcon"` / `size="icon-lg"`) y, al mismo tiempo, ajustarse al control contenedor sin superarlo (regla CSS global en `globals.css` con `inline-size/block-size` limitados por `%` del wrapper). Debe conservar “aire” visual interno (inset) para que el botón no toque los contornos del filtro. Esta regla aplica en **Gestión de Productos**, **Finanzas** y debe reutilizarse igual en **Estadísticas**.

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
  - Columnas principales a la izquierda: DESCRIPCIÓN, FORMA PEDIR, PUNTO REPOSIC., **CANT. REPOSIC.** (valor persistido `prod_ped_merc.reposicion_cant_conf`, campo **`ItemReposicion.cant`** en `getReposicionData`), acciones (botón de basura).
  - Bloque secundario a la derecha: STOCK, CANT. A PEDIR.
- Clases globales:
  - Encabezados secundarios: `tabla-bloque-secundario-head` / `tabla-bloque-secundario-head-divider` (misma tipografía que el resto del encabezado; `*-divider` añade **solo** borde izquierdo entre sub-grupos).
  - Celdas secundarias: `tabla-bloque-secundario-cell` / `tabla-bloque-secundario-cell-divider` (sin fondo distinto; heredan cebra de fila; `*-divider` = línea vertical **#0072bb** vía `box-shadow` inset, no `border-left`, para que con encabezado sticky no se “cuele” el gris en la franja azul).
- Uso recomendado:
  - Aplicar estas clases solo a columnas de **información secundaria** (no editable o de resumen).
  - Mantener siempre el orden lógico: primero las columnas principales, luego el bloque secundario.
  - **No** añadir `px-3 py-2 text-xs` extra en cabeceras/celdas secundarias: el tamaño lo define `.tabla-gestion-compacta` / `.celda-datos`.
- **Varios sub-bloques:** en tablas con bloques secundarios (p. ej. **Pedido Reposición**), las columnas principales van sin `tabla-bloque-*`; cada grupo siguiente empieza con `*-divider` (línea vertical). La última columna del bloque derecho usa `*-head` / `*-cell` sin divider.

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
- **Columnas** (sin `tabla-bloque-*`; `<colgroup>` 5/15/45/15/10/10% con editor, 5/15/55/15/10% sin editor):
  1. **BASE** (`5%`, header con ícono `Check`): `<input type="checkbox">` por fila; solo una marcada a la vez. Refleja **`costo_compra_cod_ext`** (la fila tildada es la **base de comparación** para VARIACION y el costo **CX PROD.** en Cx Compra). Click persiste vía `establecerCostoListaTiendaAction(codTienda, codExt | null)` (`vinculos.ts`): cliquear una fila no marcada → setea esa como base; cliquear la ya marcada → destilda (FK a `null` = Cx. Prom.). Deshabilitado para no editores y mientras hay `isPending`.
  2. **PROVEEDOR** (`15%`): prefijo del proveedor (texto compacto).
  3. **DESCRIPCION** (`45%` / `55%`): `prod_precios_provee.descripcion_proveedor` (`ProductoCompleto.descripcion`); `truncate` + `title` con el texto completo.
  4. **PRECIO** (`15%`): `px_compra_final_sin_iva` (`pxCompraDeProducto(p)`).
  5. **VARIACION** (`10%`): % vs. fila tildada — `0%` (neutra) en la base; ↑ `+X.X%` (positiva) si la fila es más cara que la base; ↓ `-X.X%` (negativa) si más barata; `≈0%` si `|Δ%| < 1%`; `—` si no hay base tildada o algún precio es 0. Componente `VariacionVsBase` (usa los tokens `variacion-costo--*` / `variacion-costo-icon--*` ya existentes).
  6. **DESVINC.** (`10%`, solo rol editor; header con ícono `Trash2`): `Trash2` con `TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS` → `desvincularProducto`. Cualquier vínculo se puede desvincular; si la fila desvinculada era la base, el estado local de tildado pasa a `null` (el servicio ya limpia la FK vía `limpiarCodExtCostoListaSiCoincide`).
- **Encabezado del producto**: dos líneas — (1) descripción `text-sm font-semibold text-foreground` con `break-words`; (2) si hay datos, una sola línea `text-xs text-muted-foreground` con **Marca - Rubro - SubRubro** (solo valores no vacíos, unidos con ` - `). El mismo bloque (`flex shrink-0 flex-col gap-1 pb-2 text-center`) se repite en **`SeleccionarProductoModal`** (“Vincular Nuevo Producto”), recibiendo `itemDescripcion`, `marca`, `rubro`, `subRubro` desde **`VincularModal`**.
- **Props**: `costoTienda` se mantiene por compatibilidad pero ya no alimenta la columna VARIACION (la base ahora la marca el tilde).

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
import { usePathname, useRouter } from "next/navigation";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { cn } from "@/lib/utils";

export default function MiFiltros({ qActual, totalItems }: { qActual: string; totalItems: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { q, setQ, ref: inputRef, handleQChange, isDebouncing, prepareNavigate } = useFiltrosConBusqueda({
    qActual,
    debounceMs: 400,
    focusStorageKey: "mi-modulo-focus",
    onDebouncedSearch: (value) => {
      prepareNavigate();
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
  });
  return (
    <FilterBar className="filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <span className={FILTER_COUNT_CLASS}>{totalItems.toLocaleString()} ítems</span>
      </FilterRowSelection>
      <div className="flex items-center gap-2">
        <FilterRowSearch>
          <FiltroBusquedaInput id="mi-busqueda" placeholder="Buscar..." value={q} onChange={handleQChange} isDebouncing={isDebouncing} inputRef={inputRef} />
        </FilterRowSearch>
        <LimpiarFiltrosButton onClick={() => { setQ(""); router.push(pathname); }} />
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
| `--modal-field-label-color` | **`:root`**: color de etiquetas de campo en modales (`var(--foreground)`). Aplicado con `!important` en `.app-modal__body`, `.modal-app__body` y `[data-slot="dialog-content"]` a `label`, `[data-slot="label"]`, `.modal-field-label`, `.modal-micro-label`, `dt`. |
| `MODAL_FIELD_LABEL_CLASS`, `MODAL_MICRO_LABEL_CLASS` (`@/lib/ui-classes`) | Clases Tailwind para etiquetas en modales (foreground). **`ModalMicroLabel`** usa la micro constante vía CVA. |
| `.input-filtro-unificado` | Input y SelectTrigger de filtros (borde primary, altura 2.5rem). |
| `.fila-filtros-5`, `.fila-filtros-desplegables` | Grid 5 columnas para Selects de filtros. |
| `.tabla-gestion-compacta.tabla-vinculos-modal` | Variante de ancho para **modal Vínculos** (Tienda): `width: 100%`, `table-layout: fixed`; los encabezados usan la misma regla global de `tabla-gestion-compacta`. |
| `.tabla-gestion-compacta.tabla-recepcion-pedido` | **Recepcion Pedido** (`PedidoHistoriaDetalleModal`): **`recepcion-fila-pendiente`** cebra estándar; **`recepcion-fila-verificada`** fondo **gris intermedio** neutro (`color-mix(in oklab, var(--muted) 72%, var(--card) 28%)`, hover **84%/16%**), entre blanco/card y cebra celeste; misma altura de fila que el resto de tablas. |
| `.tabla-gestion-compacta.tabla-deuda-proveedores` | Solo **Finanzas / Venc. Provee. Merc.** (`/finanzas/deuda-proveedores`): misma altura de fila global (**2rem**); `.celda-proveedor-deuda` con **ellipsis** (`nowrap`, `overflow: hidden`); primera columna **PROVEEDOR** (tbody y tfoot) **centrada** en horizontal y vertical. |
| `.tabla-fila-altura-auto` | Excepción en **`tbody`**: filas auxiliares (subencabezado **Pedido Urgente**, detalle expandido **Precios Competencia**, etc.) con **`height: auto`**; el resto de filas de datos usan **`--tabla-body-row-min-height`** (**2rem**, referencia **Lista Px Proveedores**). |
| `.tabla-fila-seccion-subencabezado`, `.tabla-fila-seccion-subencabezado-celda` | Subencabezado de bloque en **`tbody`**: fondo **`var(--gris-inset)`** (`#e2e8f0`), **sin** bordes ni franja lateral; **alto fijo** = **`--tabla-thead-height`**. Componente **`TablaSubencabezadoSeccionRow`**: **`titulo`**, **`colSpan`**, **`totalBloque?`**. |
| `.tabla-gestion-compacta.tabla-flujo-de-fondo` | **Finanzas / Flujo De Fondo** (`/finanzas/venc-por-fecha`, `TablaFlujoDeFondo` / `TablaFlujoDeFondoDetalleDia`) y **reutilización** de **`TablaFlujoDeFondoDetalleDia`** en **Venc. Provee. Gastos** (`/finanzas/vencimientos-gastos`) y **Venc. Provee. Merc.** (`/finanzas/deuda-proveedores`, detalle por proveedor): **thead** sin sobrescrituras (mismo centrado global). **FECHA** (grilla principal) **centrada**; en el **modal** columnas **FECHA DEVENGADA**, **FECHA VENCIMIENTO**, **PROVEEDOR**, **DETALLE**, **MONTO** (fechas centradas, texto a la izquierda, importes con **`TD_NUM`**). **SALDO** negativo: `text-destructive` en la celda, **no** fila con tinte (cebra = card + primary 8 % impar/par). |
| `.tabla-gestion-compacta` | **Diseño único** de tablas (referencia: Comp. Proveedores). Usar siempre `<Table>` de `@/components/ui/table`; no usar otra clase. **Encabezado fijo obligatorio**: al hacer scroll los encabezados no desaparecen (`position: sticky` en `globals.css`). **`thead th`**: **`--tabla-thead-height`** es la **altura mínima** (referencia ≈ 2 líneas + padding); si el título lo requiere, el **`th` crece en altura** (texto con `word-break`, sin `line-clamp` ni `max-height` fijos); centrado horizontal y vertical del bloque de título; sin `nowrap` en encabezados. Tipografía de encabezado: **`text-xs`**, **`text-transform: uppercase`**, **`font-weight: var(--font-weight-bold)`** (alineado con `TableHead` → `font-bold`). **Inputs y Select** en celdas: fondo transparente, recuadro #0072bb. **Select en tablas**: texto en negro, sin bold (`globals.css`). **Hover global de filas (páginas y modales):** el resaltado es uniforme para toda la fila, sin distinción por columnas ni overlays por celda (`td:hover::before` desactivado). Los colores se definen por estado de fila (cebra `odd`/`even`, `hover`, `data-state="selected"`) y, en `hover`, el color de fuente de todas las celdas se fuerza a **`foreground`** para mantener contraste homogéneo. |
| `.tabla-bloque-secundario-head`, `.tabla-bloque-secundario-head-divider` | Columnas de **información secundaria** en `<thead>`: fondo `var(--primary)` explícito (opaco bajo sticky). `*-divider`: primera columna de cada sub-bloque; el divisor blanco se dibuja con `::before` absoluto (`2px`, `primary-foreground`) sobre el `th` sticky para evitar artefactos al hacer scroll (ej. `TablaTienda`: MARGEN vs MEJOR PROV.). |
| `.tabla-bloque-secundario-cell`, `.tabla-bloque-secundario-cell-divider` | Celdas de **tbody** secundarias; fondo transparente (cebra). `*-divider`: línea vertical **#0072bb** con `box-shadow: inset 1px 0 0 #0072bb` (evita artefactos con `border-collapse: collapse` y scroll). **No** usar en el modal **Vínculos**. |
| `--tabla-thead-height`, `--tabla-thead-lines`, `--tabla-thead-line-height`, `--tabla-thead-padding-y`, `--tabla-body-row-min-height`, `--tabla-body-cell-padding-y`, `--tabla-body-cell-padding-x` | **`--tabla-thead-height`** = `calc((0.75rem * --tabla-thead-line-height * --tabla-thead-lines) + (--tabla-thead-padding-y * 2))` usada como **`min-height`** del **`thead th`**; defaults `--tabla-thead-lines: 2`, `--tabla-thead-line-height: 1.15`, `--tabla-thead-padding-y: 0.2rem`; **`--tabla-body-row-min-height`** = **2rem**; padding vertical celdas ~**`py-0.5`** (**0.125rem**); inputs/botones en celdas ~**1.75rem**. Sin cambio de **`font-size`** en **`tbody tr:hover td`** (evita saltos). |
| `.celda-datos` | Celdas de datos; usa las mismas variables de padding y min-height que la tabla oficial. |
| `.celda-datos.celda-datos--flush-left` | Anula **`padding-left`** con **`!important`** (especificidad doble clase) cuando **`!pl-0`** de Tailwind no gana al atajo **`padding`** de **`.celda-datos`**; usar con **`Input`** **`pl-0` `pr-3`** (base **`Input`**: **`pl-3 pr-3`**, no **`px-3`**, para que **`tailwind-merge`** anule bien el lado izquierdo). |
| `.celda-datos.celda-datos--flush-right` | Anula **`padding-right`** con **`!important`** para campos al ras del borde derecho dentro de celdas `celda-datos` (ej. input de **TOTAL PEDIDO**). |
| `.celda-datos.celda-datos--accion-relleno-fila` | Anula **`padding`** de **`.celda-datos`** en columnas solo de acción; el aire al borde de fila lo aporta **`TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS`** (**`p-1.5`**). |
| `.tabla-check-toggle` | Checkbox/toggle compacto para columnas de **tilde** en tablas (`.tabla-gestion-compacta`): cuadrado (mismo alto/ancho) con tamaño derivado de `--tabla-body-row-min-height`, sin superar el alto de fila; borde **`#0072BB`**, fondo transparente y solo ícono **Check** en **`#0072BB`** al seleccionar. **Regla global:** toda columna de selección usa encabezado con tilde (`Check`). Reutilizar en tablas actuales y futuras para mantener consistencia visual. |
| `.celda-destacado` | Celdas “destacadas” sin negrita (font-weight normal) para cumplir el estilo de tablas. |
| `.celda-sublinea-tabla` | Segunda línea compacta en celdas de tabla (`font-size: 10px`, `line-height: 1`, `color: muted-foreground`); usar con `truncate` y `leading-none` bajo el texto principal sin alterar **`--tabla-body-row-min-height`**. |
| `.celda-sublinea-tabla-divisor` | Línea vertical **1px** entre bloques de sublínea (p. ej. descuentos que restan vs **CX. TRANSP.** que suma en lista precios); `height: 0.625rem`, `muted-foreground` al 45%. |
| `.lista-precios-sublinea-descuentos`, `.lista-precios-sublinea-descuento-item`, `.lista-precios-sublinea-regla-btn` | Modo **Desc. en fila** (`SublineaDescuentosListaPrecios`): marca + solo descuentos &gt; 0; botón **Info** abre `ReglaDescuentoItemListaPreciosModal` con condiciones de la regla ganadora. Legacy: `.lista-precios-sublinea-grid` (grilla 7 columnas fija, retirada de la UI). |
| `TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS` (`@/lib/ui-classes`) | Botones **solo ícono** relleno **`#0072BB`**: **`tabla-row-btn-filled-brand`**, **`aspect-square`**, **`!h-full`**, **`max-h-full`**, **`!w-auto`**, **`max-w-full`**, **`self-center`**, `size="icon"` + `variant="ghost"`. **Padding interno** **`0.5rem`** en **`globals.css`**. No usar **`!w-full`** (rompe el cuadrado). |
| `tabla-row-btn-filled-brand` | Marca botones excluidos de **`tbody td button`** fijo **1.75rem** en **`globals.css`**; **`padding: 0.5rem !important`**, **`max-height: 100%`**. |
| `TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS` (`@/lib/ui-classes`) | `flex` con **`h-full`**, **`min-h-0`**, **`p-1.5`**, **`items-center`**, **`justify-center`**, **`gap-1.5`**, **`box-border`** para agrupar botones **`TABLE_ROW_*`**. |
| `.contenedor-pagina-con-filtros` | Espaciado vertical entre header, filtros y tabla. |
| `.finanzas-resumen-tarjeta` | Totales bajo tablas de **Finanzas** (p. ej. **Balance · Gastos** / **`TablaGastos`** — **MONTO**, **PAGADO**, **PENDIENTE**; **Tesorería** / **`TablaTesoreriaCajas`**): borde **2px** **#0072bb**, `border-radius` suave, fondo **`var(--card)`**, `flex` columna, texto centrado. |
| `.no-scrollbar` | En **`globals.css`**: oculta barras del scrollport del mismo nodo (`scrollbar-width: none` / webkit); mantiene **`overflow-y-auto`** / **`overflow-x-auto`** (rueda/táctil). Usar en el **div** que hace scroll (p. ej. hijo interno de **`contenedor-tabla-gestion`**, **`AppModal`** con **`hideBodyScrollbars`**, tabla dentro de modal en **Flujo De Fondos**). Antes solo existían variantes acopladas a `.contenedor-tabla-gestion` / `.app-modal__*`; la regla es única para toda la app. |
| *(retiradas)* `.modal-vinculos-*`, `.btn-convertir-proveedor-principal*`, `.btn-desvincular-icono`, `.modal-vinculos-footer` | El modal **Vínculos con Proveedores** pasó a `<Table>` estándar; no reintroducir estas clases. |
| `@/lib/ui-classes` | Constantes reutilizables: `BADGE_SUCCESS_TINT_CLASS`, `TEXT_SUCCESS_CLASS`, `TEXT_WARNING_CLASS`, `ICON_WARNING_INTERACTIVE_CLASS`, `IMPORT_STAT_BADGE_CLASSES` (badges de importación / estados positivos y avisos con tokens `primary`, `accent`, `accent2`). |
| `PAGE_SIZE` (`@/lib/pagination`) | Tamaño de página estándar para tablas: 100 ítems. |
| `PaginacionTabla` (`@/components/shared/PaginacionTabla.tsx`) | Paginación por URL: `basePath`, `params`, `paginaActual`, `totalPaginas`, `total`, `pageSize`. |
| `PaginacionClient` (`@/components/shared/PaginacionClient.tsx`) | Paginación por estado: `paginaActual`, `totalPaginas`, `onPaginaChange`. |
| `TableEmptyState` + CVA (`@/components/shared/TableEmptyState.tsx`) | Mensajes de lista/tabla vacía; `EmptyTableRow` en `ui/table` reutiliza las mismas variantes. |
| `ModalMicroLabel` + CVA (`@/components/shared/ModalMicroLabel.tsx`) | Micro-etiquetas MAYÚSCULAS en modales (campos/secciones densas); variantes `align`: `left` \| `center`. |
| `--gris-canvas`, `--gris` (`bg-gris`) | Lienzo de app: páginas (`ClassicFilteredTableLayout` tone gray), shell, marco de **`AppModal`** (`#cbd5e1`). |
| `--gris-inset` (`bg-gris-inset`) | Inset dentro de card blanca: subfilas de tabla (`.tabla-fila-seccion-subencabezado`, `.tabla-fila-detalle-competencia`); valor histórico `#e2e8f0`. |
| `--border`, `--input` | Alias de **`--gris-inset`** (visibles sobre **`--gris-canvas`**). |
| `--primary`, `--card`, `--muted-foreground`, `--border` | Tokens de tema; **no** usar `bg-white`, `text-slate-*`, `border-slate-*` en componentes. |
| `.area-page-shell` | Cascarón de página de área (Finanzas, Estadísticas, Proveedores, Tienda, etc.) — `flex` columna, `height: 100vh`, `min-height: 0`, `overflow: hidden`. Combinar con **`bg-gris`** solo cuando el módulo lo requiera (Cx Compra, Px Competencia, calc. vendedor). **SSOT**: reemplaza `flex h-screen min-h-0 flex-col overflow-hidden` y la variante corta `h-screen flex flex-col overflow-hidden`. **No** duplicar esas utilidades encima de la clase global. |
| `CALLOUT_WARNING_CLASS` (`@/lib/ui-classes`) | Banner/aviso no destructivo (token `accent2`): `rounded-md border border-accent2/40 bg-accent2/10 px-3 py-2 text-xs text-foreground`. **Prohibido** crear avisos con `border-amber-*`, `bg-amber-*`, `text-amber-*` (paleta genérica). |

---

## 3. Reglas técnicas estrictas

| Área | Regla |
|------|--------|
| **Tipado** | TypeScript 5.9+. No `any`. Esquemas Zod para validación. |
| **Estilos** | Siempre `cn()` de `@/lib/utils.ts` para combinar clases. No concatenar con `` `...${VAR}` ``. |
| **Tokens** | Solo variables del tema: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`. Evitar `bg-white`, `text-slate-*`, `bg-slate-*`. |
| **Estructura** | Rutas en `src/app/`; componentes base shadcn en `src/components/ui/`; compartidos en `src/components/shared/`. |
| **Texto UI** | Títulos de modales y botones: title case. Sidebar: módulo en MAYÚSCULAS, submódulo con primera letra de cada palabra en mayúscula (title case). Filtros y desplegables: MAYÚSCULAS. **Encabezados de tablas de datos**: MAYÚSCULAS y **negrita**. Toda abreviatura termina con punto (Px., Cx., Dto., Cod., etc.). |
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
  - La clase CSS global **`.btn-primario-gestion`** (`globals.css`) sigue vigente para no romper los call sites existentes, pero para nuevas toolbars **preferir `ToolbarActionButton`**. Migrar call sites restantes (`ExportarStockButton`, `ImprimirStockButton`, etc.) en iteraciones dedicadas; **`SyncDuxHeaderButton`** y **`SyncButton`** ya no existen (sync en **`SyncStatusIndicator`**).

### `ModalTablaConFiltros` (`src/components/shared/ModalTablaConFiltros.tsx`)

Modal reutilizable de **título + filtros + tabla** con modos:

- **Single** (default): selección por **doble clic** en fila (definido por el padre con `onRowDoubleClick`).
- **SingleConfirm**: selección por **click** en fila + confirmación con botón (default: `confirmSingleLabel="AGREGAR"`).
- **Multi**: selección por checkbox + confirmación con botón.
- **MultiQuantity**: columna **CANT** con input entero positivo por fila + confirmación con botón (ej. **Seleccione Una Base** en pedido tintométrico).

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

- **Props multiQuantity**
  - **`selectionMode`**: `"multiQuantity"` (obligatorio).
  - **`onConfirmQuantity(items)`**: `{ id, cantidad }[]` solo con filas con cantidad &gt; 0; si resuelve OK, el modal se cierra.
  - **`confirmQuantityLabel(count)`**: texto del botón (default: `AGREGAR N BASE(S)`).
  - **`confirmPending`**: `boolean?` (deshabilita acciones y muestra loader).
  - Input **CANT**: enteros positivos; clase global **`tabla-celda-cant`** en la celda para que el input ocupe todo el alto/ancho de la fila (2rem) con borde visible en los cuatro lados; fila resaltada cuando tiene cantidad válida; doble clic en fila lo delega al padre (ej. agregar con cantidad 1).

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
- **Validación de sobrestock (otra sucursal):** al confirmar **Generar Pedido**, la primera llamada es `generarPdfEnviarPedidoAction` **sin** `confirmarSobreStock`. El servidor valida antes del snapshot: para cada línea del pedido con **`cod_tienda`**, si en la **otra** sucursal hay sobrestock (stock en `prod_precios_tienda` vs tope resuelto con filas REPOSICIÓN en **`prod_ped_merc`**), responde `SOBRESTOCK_REQUIERE_CONFIRMACION:…` **sin persistir** (aplica con cualquier combinación de tipos URGENTE / TINTOMÉTRICO / REPOSICIÓN). El cliente llama `getSobreStockReposicionParaModalAction` y abre **`SobreStockReposicionAdvertenciaModal`**. **Confirmar Cant. Pedida** reintenta con `confirmarSobreStock: true`.
- **Reposición — proveedor prioritario distinto:** si **`tipos`** incluye **REPOSICIÓN** y hay ítems con cantidad a pedir &gt; 0 cuyo proveedor ganador (`elegirListaPrecioProveedorReposicion`) **no** es el proveedor elegido en el modal **pero el producto está vinculado a ese proveedor** (`prod_precios_provee.cod_tienda`), la primera llamada responde `REPOSICION_PROVEEDOR_PRIORITARIO_REQUIERE_CONFIRMACION:…` **sin persistir**. El cliente abre **`ReposicionProveedorPrioritarioModal`** (tilde por ítem). **Generar Pedido** en ese modal reintenta con `confirmarReposicionProveedorPrioritario: true` y `itemsReposicionProveedorPrioritario` (puede ser vacío). Los ítems marcados se **agregan al mismo PDF** del proveedor elegido (un solo pedido). El modal de sobrestock, si aplica, se muestra **después** de confirmar este paso.

### `ReposicionProveedorPrioritarioModal` (`src/components/shared/ReposicionProveedorPrioritarioModal.tsx`)

- **Rol:** opt-in antes de generar pedido de **REPOSICIÓN** cuando hay productos asignados a otro proveedor por menor costo comparable (orquestado por `GenerarPedidoToolbarButton`).
- **Props:** `open`, `onOpenChange`, `items` (`ReposicionProveedorPrioritarioItem[]`), `proveedorPedidoEtiqueta` (proveedor elegido en Generar Pedido), `pending?`, `onConfirmar(seleccionados)`.
- **Copy:** *«Estos productos están asignados a [proveedor prioritario], pero por temas de stock y logística podés incluirlos en el pedido de [proveedor del pedido].»*
- **Tabla:** columna **tilde** (`tabla-check-toggle` cuadrado, alto acorde a fila 2rem), **DESCRIPCIÓN**, **CANT.** Fila seleccionada: `bg-primary/15`. Botón activo: relleno `primary` + ícono `Check`. Copy por grupo de proveedor en el párrafo superior (proveedor asignado ya no va en columna).
- **Ancho:** `AppModal` `size="lg"` + `className="max-w-[50.4rem]"` (−30 % sobre `72rem` base).
- **Datos:** `getReposicionProveedorPrioritarioParaModalAction` → `getReposicionItemsProveedorPrioritarioAlternativo`.

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

Modal del submódulo **Recepcion Pedido** (ruta `/pedidos/historial`) para operar la recepción de ítems del pedido (tabla, cantidades recibidas, alta de productos, etc.). Usa **`AppModal`**.

- **Título (`AppModal`, prop `title`):** **Recepcion Pedido** (title case).
- **Altura del modal:** mantener altura fija en recepción (`h-[95vh] max-h-[95vh]`) para que el tamaño del modal no cambie según cantidad de filas; el scroll queda dentro de la tabla.
- **Resumen superior (columna proveedor):** sin micro-etiqueta “Nombre proveedor”; el nombre del proveedor es el primer nodo visible (`<p>` `text-sm font-semibold`). Contenedor **`flex-col justify-center gap-0.5 py-0 text-left`**; padding horizontal **`CELDA_RESUMEN_PROVEEDOR_PADDING_X`**. Línea secundaria (**sucursal - dd/mm hh:mm**) sin **`mt-*`** (separación vía **`gap-0.5`**). Grid resumen: **`items-center`**. Sin estado PEDIDO/RECIBIDO en esa línea.
- **Resumen superior (borde a borde):** el panel de resumen se renderiza sin padding lateral ni márgenes negativos (`py-0`), con grid `w-full` para ocupar todo el ancho disponible del cuerpo.
- **Tabla ítems + totales:** pie **TOTAL PEDIDO** fuera del `<table>` y **fuera** del **`div`** con **`overflow-y-auto`** que envuelve solo la **`<Table>`** (**`<section aria-label="Totales del pedido">`** hermana bajo **`.contenedor-tabla-gestion`** **`flex flex-col`**: scroll **`flex-1 min-h-0 overflow-y-auto`**, totales **`shrink-0`** **`border-t`** **`bg-background`** **`py-2`**); ver punto 7.
- **Scroll en Recepción:** cuando la grilla de ítems supera el alto visible, el desplazamiento vertical debe ocurrir solo en el contenedor de filas (tbody) del bloque de tabla; header y totales permanecen fijos. En este modal, el contenedor de filas usa `no-scrollbar` para ocultar la barra visual sin perder scroll con rueda/trackpad y **no** debe tener `max-h` fijo, para que aproveche todo el alto disponible del cuerpo.
- **Alta de nuevos ítems:** se realiza con botón primario **`(+ ) Agregar Producto`** dentro del modal de recepción. Al hacer click, abre `AgregarProductosModal`, donde se selecciona el producto en tabla, se carga **CANT.** y se confirma con **Agregar Producto**.
- **Alta de nuevos ítems (borde a borde):** la sección de alta no usa márgenes negativos ni padding lateral manual; el bloque de filtro + botón toma el ancho completo disponible.
- **Altura fila alta (Recepción):** en la fila **filtro + Agregar Producto**, el **`FiltroBusquedaInput`** lleva `className="h-10 min-h-10"` y el botón **Agregar Producto** **`h-10 min-h-10`** (la X del input sustituye al cesto global del modal). Bordes/ring `#0072bb`, `rounded-md`, `text-sm`, `px-3 py-1`; ancho desktop según contenido.
- **Filtro previo de alta:** arriba del botón `(+ ) Agregar Producto` se muestra `FiltroBusquedaInput` con placeholder **BUSCAR POR DESCRIPCIÓN...** (limpieza con la X del componente). Ese valor se usa como búsqueda inicial al abrir `AgregarProductosModal`.
- **Filtro por descripción (tabla de recepción):** el input de la fila de alta también filtra en vivo los ítems visibles de la tabla por `DESCRIPCIÓN` (case-insensitive). Si no hay coincidencias, mostrar estado vacío específico de búsqueda.
- **Limpieza automática del filtro:** cada vez que una fila pasa a checklist **TRUE** (OK, cesto o check de edición), el filtro por descripción de la tabla de recepción se limpia automáticamente.
- **Alta de producto y checklist:** al agregar una nueva fila en recepción, el ítem nuevo se marca confirmado y las confirmaciones previas de ítems existentes deben preservarse (no resetear checklist al recargar detalle).
- **Fila de acciones de alta (Recepción):** en `PedidoHistoriaDetalleModal`, **filtro** + **Agregar Producto** en `flex` con separación horizontal fija (`justify-between items-center gap-x-10`): bloque izquierdo acotado (`max-w-[36rem]`) para que el input de búsqueda no estire todo el ancho; bloque derecho **Agregar Producto** con ancho por contenido.
- **Separación funcional en fila de alta:** mantener dos bloques en la misma fila (filtro a la izquierda y acción a la derecha).
- **Espaciado vertical fila alta:** la fila `filtro + agregar` lleva padding superior leve (`pt-1`) para separarla visualmente del bloque resumen.
- **Ancho/alto del botón Agregar (fila recepción):** altura **`h-10 min-h-10`** (misma que cesto e input de esa fila); ancho según contenido en layout desktop.
- **Orden en filtros de `AgregarProductosModal`:** **DESCRIPCIÓN** (`FiltroBusquedaInput`, X integrada) → **CANT.** (`Input` dentro de `FiltroIndividualContainer` para tacho solo si hay valor). La tabla muestra primera columna de checkbox de selección; en modo `singleConfirm` solo puede quedar 1 fila marcada a la vez. El botón **Agregar Producto** del footer se habilita solo cuando hay una fila seleccionada y **CANT.** > 0.
- **Nota:** el texto `AGREGAR PRODUCTO A LA RECEPCIÓN` se mantiene solo como label de accesibilidad (sr-only) y no se muestra visualmente; la acción visible es el botón `(+ ) Agregar Producto`.
- **Lista de verificación / acciones:** el campo de la primera columna no admite tipeo; al abrir en estado **SIN RECEPCION**, la columna **CANT. RECIBIDA** inicia vacía para todas las filas y se completa de forma secuencial por acción del usuario. **OK** copia **cant. pedida** en **cant. recibida** y confirma checklist; **Editar** copia **cant. pedida** en **cant. recibida**, limpia confirmación y abre controles de edición (`-`, input, `+`); **cesto** coloca **0** y confirma checklist en UI. **Registrar En Dux** (único disparador de registro en DUX): gate `puedeRegistrarEnDux`. Secuencia: fiscal (`PREGUNTA` si aplica) → abre **`ElegirPersonalRecepcionModal`**; al pulsar **Seleccionar** en una fila, la app queda en espera (`pending={guardando === "post"}`) hasta completar guardar recepción local → `registrarRecepcionCompraDuxAction` → `marcarPedidoHistoriaRegistradoAction` (estado **RECEPCIONADO**). Tras éxito, modal **Pedido Recepcionado** (`AppModal` `size="sm"`) con comprobante/`id_compra`; **Aceptar** cierra ese modal, **Elegir Personal** y **Recepcion Pedido**. Cancelar en fiscal o personal aborta sin guardar ni POST.
- **Persistencia diferida (Recepción):** agregar producto, editar cantidades y confirmar checklist son cambios locales del modal; no deben persistirse en BD hasta ejecutar **Registrar En Dux** (al confirmar personal) o **Guardar Corrección** en pedidos recepcionados.
- **Persistencia de TOTAL PEDIDO:** al registrar en DUX vía POST, el modal envía `totalPedido` a backend para persistirlo en `prod_ped_historial.total`. Si el pedido ya está **RECEPCIONADO**, al reabrir el modal el input **TOTAL PEDIDO** se precarga con ese valor guardado.
- **Input TOTAL PEDIDO (tipeo):** visual **AR** (`$` + miles `.` + decimales `,`, máx. **2** cifras decimales). El usuario puede tipear **`,` o `.`** como separador decimal: si aparecen ambos, el **separador decimal** es el que queda **más a la derecha**; el otro solo agrupa. Repeticiones seguidas del **mismo** separador (`,,` / `..`) se colapsan a **uno** (el resto se ignora).
- **Pedido ya recepcionado (corrección):** cuando el pedido está en estado **RECEPCIONADO**, el footer muestra **Corregir Recepcion**. Al activarlo, el modal habilita los mismos campos cargados para permitir edición y cambia la acción a **Guardar Corrección**; al guardar persiste los cambios y vuelve al modo bloqueado (sin exportación Excel).
- **Checklist inicial en corrección:** al cargar un pedido en estado **RECEPCIONADO**, la lista de verificación inicia con todos los ítems marcados como revisados (según la última recepción persistida), para que en **Corregir Recepcion** el usuario solo ajuste diferencias puntuales y no tenga que rehacer toda la confirmación.
- **Corrección en recepcionado (persistencia):** durante **Guardar Corrección**, las ediciones de **CANT. RECIBIDA** y el alta por **Agregar Producto** se persisten sobre `prod_ped_historial_merc` aun cuando la cabecera esté en estado **RECEPCIONADO**; la corrección no debe mostrar bloqueo por “Pedido ya recepcionado” en ese flujo.
- **Guías post-exportación (PROCESOS):** las guías paso a paso para importar en DUX **no** se abren automáticamente al exportar Excel. Están centralizadas en **`/gestion-productos/procesos`** (`ProcesosPageClient` + `PROCESOS_INSTRUCTIVOS` en `src/lib/procesos-instructivos.ts`). Layout: grid **`25% | 75%`** (columnas). Columna izquierda: un solo `aside` (`bg-card`, borde) con título **Módulo** (`h2`, mismo estilo que `tituloGuia` en la columna derecha) + `Select` arriba y listado de procesos abajo (`labelCorto`: **Imp. Stock**, **Imp. Compra**), scroll en la lista si hace falta. **Títulos del módulo:** primera letra de cada palabra en mayúscula vía `formatoTituloProcesos` (no `uppercase` en UI). Columna derecha (`ProcesoInstructivoCarrusel`): (1) **título** (`tituloGuia`); (2) **carrete** (sin contorno; solo flechas y números); (3) **bloque contenido** (borde **#0072BB**) con **texto** (`h-28`, scroll, texto negro) + **imagen** (90% centrada, sin borde propio); flechas = únicos botones; números = `<span>` indicativos; Imágenes: `importar_stock_{1..5}.png`, `importar_compra_{1..5}.png` (sin recuadro cyan de guía; fondo transparente en esos píxeles). Sidebar: enlace directo **PROCESOS** (sin submódulos). Cada proceso se lista solo si el rol tiene permiso del módulo de origen (stock / pedidos).
- **Confirmación de comprobante fiscal previo al POST DUX:** antes de invocar `registrarRecepcionCompraDuxAction` en **Registrar En Dux**, `PedidoHistoriaDetalleModal` consulta `detalle.proveedorIva` (campo expuesto por `getPedidoHistoriaDetalle`):
  - Si `proveedorIva ∈ {SIEMPRE, NUNCA}` → la regla del enum prevalece y el POST se invoca **sin abrir modal** (`SIEMPRE → FACTURA`, `NUNCA → Comprobante_Compra`).
  - Si `proveedorIva === PREGUNTA` → se abre `ConfirmarComprobanteFiscalModal` (`src/components/pedidos/ConfirmarComprobanteFiscalModal.tsx`, **AppModal**, `size="sm"`, `max-w-md`, título **Confirmar Comprobante Fiscal**) con la pregunta **¿La compra genera comprobante fiscal?** y dos botones: **Si** (decisión `true` → **FACTURA**) y **No** (decisión `false` → Comprobante_Compra). El padre orquesta la promesa con un `useRef<((value: boolean | "cancelado") => void) | null>` (`decisionFiscalResolverRef`) y un `useState<boolean>` (`confirmarFiscalOpen`).
  - **Cancelar** (cierre por overlay/ESC) resuelve la promesa como `"cancelado"` y aborta el flujo entero: no se abre el selector de personal ni se ejecuta POST. El padre se asegura de que cualquier promesa pendiente quede limpia al reabrir el modal de detalle (`useEffect` que resuelve el resolver con `"cancelado"` y resetea `confirmarFiscalOpen = false`).
  - El componente `ConfirmarComprobanteFiscalModal` **no** cierra el modal por sí mismo al elegir Si/No: deja que el padre decida cuándo cerrarlo (típicamente apenas resuelva la promesa). El prop `pending` se enlaza al estado de `guardando != null` para deshabilitar los botones mientras la Action está en curso. Diseño minimalista: pregunta principal en `text-sm text-foreground` + microayuda en `text-xs text-muted-foreground` indicando el mapeo (`SI → FACTURA`, `NO → Comprobante_Compra`).
- **Selector de personal DUX (`ElegirPersonalRecepcionModal`):** el POST v2/compras exige `id_personal`. Catálogo en `global_personal` vía `listGlobalPersonalAction`. Componente: `src/components/pedidos/ElegirPersonalRecepcionModal.tsx` — **AppModal** `size="md"` + `className="max-w-[35.2rem]"` (~+10% sobre `max-w-lg`); título **Elegir Personal**; al abrir carga la lista; tabla compacta **NOMBRE** + **SELECCIONAR** (columna `w-[6.5rem]`, botón **Check** por fila; spinner solo en la fila elegida); búsqueda por nombre (`Input` MAYÚSCULAS, sin etiqueta visible); **Cancelar** / overlay / ESC cierran sin POST (bloqueados mientras `pending`). El POST y el marcado **RECEPCIONADO** se disparan en `onSeleccionar` del padre (`PedidoHistoriaDetalleModal`); el modal **no** se cierra al elegir fila hasta que el usuario confirme **Aceptar** en el modal de éxito. Hoy solo enlazado a **Registrar En Dux**.
- **COMPROBANTE en recepción DUX:** correlativo en `prod_ped_ult_comp` **por tipo** (FACTURA vs Comprobante_Compra; ver `BACKEND_GUIDELINES` §2.8), reservado en `prepararRecepcionCompraDatos` al ejecutar POST.
- **Manejo defensivo de Server Actions en recepción:** en `PedidoHistoriaDetalleModal`, cualquier llamada async crítica (`guardarRecepcionPedidoHistoriaAction`, `registrarRecepcionCompraDuxAction`, `marcarPedidoHistoriaRegistradoAction`) debe ir envuelta en `try/catch` además del chequeo `res.ok`, para evitar que excepciones transport/runtime muestren el error genérico de Server Components en producción.
- **Cartel de diagnóstico copiable:** si ocurre error en cargar detalle, guardar recepción o flujo **Registrar En Dux**, además del `toast` y del mensaje en la tabla vacía cuando aplica, se muestra debajo del resumen (**FECHA FACTURA**) un **`role="alert"`** con título **Error técnico (copiar y enviar a soporte)**, texto en `<pre>` monoespaciado (`select-all`, scroll vertical acotado), botones **Ocultar cartel** y **Copiar detalle** (`navigator.clipboard` + toast). El contenido incluye prefijo `[Recepcion Pedido · <contexto> · ISO-8601]` y el mensaje bruto para que el usuario lo pegue a soporte/desarrollo. Si el mensaje sugiere *action not found* o *digest* de Server Components, se muestra una **pista operativa** en `text-muted-foreground`.
- **Carga del detalle (Transport):** **`PedidoHistoriaDetalleModal`** y **`PedidoHistoriaLecturaModal`** llaman **`fetchPedidoHistoriaDetalle`** contra **`GET /api/pedidos-historia/[id]/detalle`** (cookies `same-origin`). Así la respuesta es JSON HTTP y no depende del pipeline Flight/RSC que en producción a veces reduce el fallo a un digest sin mensaje útil.
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

Listado **Recepcion Pedido** (`/pedidos/historial`; sidebar y subtítulo de página). Todas las acciones están habilitadas para cualquier usuario con acceso a `pedidos`: **Recepción**, **Ver Detalles** y **Borrar**. **`FiltrosHistorialPedidos`**: **`estado`** en URL — sin `estado` o vacío, la página lista solo **`PENDIENTE`**; opciones visibles: **PENDIENTE**, **RECEPCIONADO**, **TODOS** (`estado=ALL`); **Limpiar filtros** restablece **`PENDIENTE`**. Compatibilidad legacy: el backend acepta `SIN RECEPCION` y lo normaliza a `PENDIENTE`. Parámetro URL **`q`** con **`useFiltrosConBusqueda`** (**700 ms**) + **`FiltroBusquedaInput`** en **`FilterRowSearch`**, **`focusStorageKey`** **`filtros-historial-pedidos-focus`**; al buscar se listan solo pedidos con algún ítem cuya descripción en catálogo coincida (backend: **`listarPedidosHistoria`**). **`PaginacionTabla`** incluye **`q`** en **`params`**. Última columna **ACCIONES** (`tabla-bloque-secundario-*` alineado al patrón de tabla gestión), celdas con **`flex items-center justify-center gap-2`**. Botones **`size="icon-xs"`** con **`Tooltip`**: **Recepción De Mercadería** (`PackageCheck`) → **`PedidoHistoriaDetalleModal`**; **Ver Detalles** (`Eye`) → **`PedidoHistoriaLecturaModal`** (solo lectura, título **Ver Pedido**; **`AppModal`** **`size="xl"`** (`sm:max-w-3xl`), **`scrollBody={false}`** para que la card sea **`flex flex-col` `overflow-hidden`** y el **único scroll vertical** sea **`.contenedor-tabla-gestion`** bajo la cabecera fija — patrón equivalente a *header / `flex-1 overflow-y-auto` con tabla + `thead` sticky / footer*; cabecera del cuerpo: **badge** **Pendiente** / **Recepcionado** y nombre proveedor en **una fila** (`flex items-center gap-2`), sucursal + fecha debajo; **`.contenedor-tabla-gestion`** **`no-scrollbar`** **`no-scroll-x`**; en **Ver Pedido** ver **`PedidoHistoriaLecturaModal`**; sin inputs); dentro de **Ver Pedido** la botonera incluye **Descargar PDF** (`Download`, **`descargarPdfPedidoHistoriaAction`** + **`descargarPdfBase64`** desde `@/lib/descargarPdfBase64`, loader **`Loader2`** mientras corre); **Borrar** (`Trash2`, hover **destructive**) → **`PedidoHistoriaBorrarConfirmModal`** (texto de confirmación, **Cancelar** outline / **Sí, Borrar** destructive). Tras cerrar recepción o borrar, **`router.refresh()`** mantiene el listado al día.
- **Descripción en Historial (fuente correcta):** cuando un ítem proviene de un producto vinculado, la columna **DESCRIPCIÓN** debe reflejar el producto de `prod_precios_tienda` resuelto por la vinculación (**`cod_tienda`** / `codTiendaVinculo`) y no depender solo de coincidencia por `cod_ext` del proveedor activo; así se evita mostrar genéricos como *PRODUCTO VARIOS* en productos vinculados.

### `FiltroBusquedaInput` (`src/components/shared/FiltroBusquedaInput.tsx`)

Input unificado para búsqueda en filtros (ícono Search + tacho `primaryIcon` / `filtro-individual-clear-btn` + loader). Wrapper **`filtro-individual-container`**. Usar junto a `useFiltrosConBusqueda`.

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
  - **`treatEmptyNormalizedAsBlank`**: `boolean?` — si `true`, `valueNormalized === ""` muestra el campo vacío (no `$0,00`) y al borrar hasta cero centavos se emite `""` (p. ej. **`ActualizarMontoCajaTesoreriaModal`** en tesorería).
- **Reglas de tipeo**
  - Máscara **POS**: al **enfocar**, el primer dígito **reemplaza** el valor mostrado; los siguientes desplazan hacia la izquierda (centavos). Mismo comportamiento en **`PorcentajeCentInput`**.
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
  - **`contentWidth`**: `"default" | "wide150" | "full"` (default `"default"`). **`wide150`**: ancho completo (`max-w-none`) + padding horizontal reducido en el módulo (Comp. Categorias).
  - **`density`**: `"default" | "compact"` (default `"default"`).
  - **`filtersAriaLabel`**: `string` (default `"Filtros"`), para accesibilidad del bloque `role="search"`.
  - **`className`** / **`contentClassName`**: overrides puntuales.

### Balance mensual (`src/components/finanzas/FinanzasBalanceMensualPageClient.tsx`)

Página **Finanzas → Balance → Balance mensual** (`/finanzas/balance/mensual`). Objetivo: **una sola tabla en CSS Grid** con columna **Concepto** + una columna por **Global** y cada sucursal con `genera_balance`, para alinear importes en la misma línea visual.

- **Layout**: `grid-template-columns: minmax(10.5rem, 1.05fr) repeat(N, minmax(6.75rem, 1fr))`; contenedor con `overflow-x-auto` y ancho mínimo para scroll en pantallas chicas.
- **Altura de fila (obligatoria en este grid)**: **todas** las filas (incluida la cabecera de columnas) usan la misma altura fija **`h-10` (2,5 rem)**, tomada como referencia de la fila **Resultado operativo** (una línea `text-sm` sin botones). Celdas: `flex items-center`, `py-0`, `px-3`. En columnas de **Global y sucursal**, el sublayout interno es **`25%` + `75%`** (`grid-cols-[25%_75%]`): el **25%** izquierdo muestra el botón **histórico** (ícono **BarChart2**, “Ver Evolución Mensual De La Fila”) en **Ventas**, **Costos Variables**, **Resultado operativo**, **Costos Fijos**, **Resultado del ejercicio**, **Margen contribución** y **Punto de equilibrio** (total de la fila en esa columna, no un gasto individual); el **75%** derecho muestra el importe alineado a la derecha. El modal **`BalanceMensualGastoHistoricoModal`** arma la serie con **`listarSerieHistorialFilaBalanceMensualAction`** (misma regla que **`resumenBalanceMensualDesdeFilas`**, ventana de meses hacia atrás; **Margen contribución** en % en el gráfico). **No** hay botón directo al desglose por rubro en la grilla: el modal **BalanceMensualDetallePorRubroModal** se abre **solo** si el historial se abrió desde **Costo variable** o **Costo fijo** y el usuario **hace clic en la barra** del mes deseado; los datos de ese periodo se cargan con **`cargarFilasBalanceMensualPeriodoAction`**. Si el historial se abre desde una fila de detalle (**`BalanceMensualDetalleGastosRubroModal`**) sigue el modo **gasto individual** (`listarHistoricoMontosGastoFinalBalanceAction`): las barras **no** abren el detalle por rubro. Botones: `TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS` + `TABLE_ROW_ACTION_ICON_CLASS` (`@/lib/ui-classes`) con override compacto **`!h-7 !w-7 !p-1`**. Constantes `CLASE_FILA_BALANCE_MENSUAL_GRID` / `CLASE_CELDA_BALANCE_MENSUAL` / `CLASE_BOTON_ACCION_BALANCE_MENSUAL` en el componente.
- **Cabecera de columnas** (Concepto / Global / sucursales): fondo **`#0072BB`**, texto **blanco**, **negrita** (`font-bold`), **mayúsculas** vía estilos del texto (títulos de columna y celda «Concepto»), divisores `border-white/20`. *Es la excepción documentada en la guía para IA (punto 2 de estilos).*
- **Filas de datos**: orden lógico — **Ventas**, **Costos Variables**, **Resultado operativo**, **Costos Fijos**, **Resultado ejercicio**, **Margen Contribución** (%), **Punto de Equilibrio** ($ o `—`), **Margen Contribución Histórico**, **Punto de Equilibrio Histórico** (últimos dos con `—` hasta backend). Etiquetas de costos en el mismo color que Ventas (`text-foreground`).
- **Filas resultado** (operativo y ejercicio): fondo **`#a9d6f1`**, texto **`#063652`**, **negrita** en concepto e importes; en la columna Concepto **`pl-10`** para indentar. Constantes `BG_FILA_RESULTADO` / `FG_FILA_RESULTADO` en el componente.
- **Ventas en Balance mensual**: la fila **Ventas** es **solo lectura**: los montos salen de **`fin_bal_vtas`** según mes/año. Cargar o ajustar ventas solo en **Finanzas → Ventas Mensuales** (`/finanzas/balance/vtas`): **`CrearFinBalVtasModal`**, **`crearFinBalVtasAction`** y grilla de registros (`FinBalVtasPageClient`); no hay lápiz ni modal de edición en Balance mensual.
- **Modales de drill-down** (detalle por rubro → gastos por rubro → líneas de gasto → historial por gasto): cadena orquestada en **`FinanzasBalanceMensualPageClient`**. **Footer:** solo botón **Volver** (sin **Cerrar**); si no hay `onVolver`, el modal cierra con `onOpenChange(false)`. **Títulos** (mayúsculas en subtítulo `SUCURSAL — AÑO — MES` centrado, negro): *Historial gasto por mes* (grilla), *Detalle costos variables/fijos por rubro*, *Detalle de gasto en …*, *Detalle de gasto* (líneas). **Columna Hist.** (última, fija): clases compartidas **`BALANCE_MODAL_COL_HISTORIAL_CLASS`**, **`BALANCE_MODAL_TH_HISTORIAL_CLASS`**, **`BALANCE_MODAL_TD_HISTORIAL_CLASS`**, **`BALANCE_MODAL_BOTON_HISTORIAL_CLASS`** y tooltip **`BALANCE_MODAL_HISTORIAL_RUBRO_TITLE`** en `@/lib/ui-classes` (divisor **`border-l-2 border-[#0072BB]`**, fondo **`bg-muted/35`**). Botón **`ChartNoAxesColumn`** solo si hay **`gastoFinalId`** válido (líneas y gastos agregados) o si **`historialRubroDisponible`** resuelve id vía **`resolverGastoFinalIdHistorialRubro`** (gasto de mayor monto del rubro; tooltip aclara que no es el total del rubro). **Stack de modales:** al abrir detalle por rubro desde barra del historial CV/CF en grilla, se oculta el historial (`historicoOpen=false`) conservando su estado; **Volver** o **X** en detalle por rubro reabre el historial; cerrar el historial con **X** cierra en cascada el detalle por rubro si estaba abierto desde esa barra (`detalleRubrosDesdeHistoricoGrilla`). **`BalanceMensualGastoHistoricoModal`**: reset de serie vacía con **`queueMicrotask`** (ESLint `react-hooks/set-state-in-effect`).
- **Filtros**: mes y año en `FilterBar` + `ClassicFilteredTableLayout` (`contentWidth="full"`): cada Select en `FiltroIndividualContainer` (referencia hoy AR) y `LimpiarFiltrosButton` en `col-span-3` que navega al periodo actual AR. Aviso ámbar si no hay sucursales con `genera_balance`.

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

**Integración:** `EmptyTableRow` (`@/components/ui/table`) y `ModalTablaConFiltros` usan estas variantes para no duplicar utilidades. Paneles secundarios pueden usar `<TableEmptyState as="p" … />` para mantener densidad y tokens.

### `MensajeProceso` (`src/components/shared/MensajeProceso.tsx`)

Indicador de **proceso en curso** (modal, importación, barra lateral). Clases globales `.mensaje-proceso` / `.mensaje-proceso--sidebar`; contenedor variantado con **CVA** (`mensajeProcesoVariants`).

- **Props**
  - **`mensaje`**: `string`.
  - **`detalle`**: `{ procesados: number; total: number } | string | null | undefined` — objeto muestra “X de Y” con locale `es-AR`.
  - **`variant`**: `"default" | "sidebar"`.
  - **`className`**: `string?`.
  - **`onDoubleClick`**: `() => void?` — si está definido, el contenedor usa **`cursor-pointer`** y **`title`** *«Doble Clic Para Cancelar Sincronización»* (p. ej. sync lista precios en slidenav).
- **Accesibilidad**: `role="status"`, `aria-live="polite"`.

### Etiquetas de campo en modales (regla global)

- **Alcance:** todos los modales (`AppModal`, `.modal-app`, `Dialog` con `[data-slot="dialog-content"]`).
- **Color obligatorio:** **`var(--foreground)`** (negro de la UI). **Prohibido** `text-muted-foreground` en etiquetas de inputs, desplegables, fechas y micro-etiquetas de campo.
- **Implementación:** `globals.css` (`--modal-field-label-color` + selectores en `.app-modal__body`, `.modal-app__body`, `[data-slot="dialog-content"]`). Constantes **`MODAL_FIELD_LABEL_CLASS`** y **`MODAL_MICRO_LABEL_CLASS`** en `@/lib/ui-classes`.
- **Excepciones:** textos de ayuda, estados vacíos, metadatos secundarios y contadores (ej. `12 / 10000`) siguen **`text-muted-foreground`**.

### `ModalMicroLabel` (`src/components/shared/ModalMicroLabel.tsx`)

Etiqueta visual **compacta** para títulos de campo o bloques dentro de modales (tipografía en MAYÚSCULAS alineada a filtros/tablas). Implementación con **CVA** (`modalMicroLabelVariants`, base **`MODAL_MICRO_LABEL_CLASS`** → **`text-foreground`**).

- **Props**
  - **`children`**: `ReactNode` — texto en MAYÚSCULAS (según guía de mayúsculas en filtros cuando aplique).
  - **`align`** (CVA): `"left"` (default) \| `"center"` — controla `text-left` / `text-center` y `w-full leading-tight`.
  - **`className`**: `string?` — combina con `cn()` para overrides puntuales (ej. `mb-1 block`).
  - Resto: atributos nativos de `<span>` (`id`, `ref`, etc.).
- **Accesibilidad**: es un `<span>` con clases **`modal-micro-label`** y **`modal-field-label`**; si precede a un control, envolver en `<label>` (como en **FECHA FACTURA** de `PedidoHistoriaDetalleModal`) o asociar el control con `aria-labelledby` / `aria-label` explícito en el input.
- **Cuándo usarlo**: micro-etiquetas sobre inputs o separación de secciones en modales densos; no duplicar la cadena legacy con `text-muted-foreground`.

### `DuxSyncStyleButton` (`src/components/shared/DuxSyncStyleButton.tsx`)

Botón de **dos líneas** con **swap al hover** en la primera (misma interacción que el sync de lista precios en slidenav). Implementado con **CVA** (`duxSyncStyleButtonVariants`, `duxSyncStyleSecondaryVariants`).

- **Props**
  - **`lineIdle`** / **`lineHover`**: `string` — texto línea 1 en reposo vs hover (ambos visibles con cross-fade; si `busy` o `disabled`, no se aplica hover).
  - **`secondary`**: `ReactNode` — segunda línea (ej. `Últ. Act.: …`); en hover se colapsa (`max-h-0` + opacidad), igual que en slidenav.
  - **`surface`**: `"sidebar"` (default, `bg-sidebar-accent` + `text-sidebar-foreground`) | `"card"` (`border` + `bg-card` + `text-foreground`, hover `bg-muted/60`) para uso fuera de la slidenav si hiciera falta.
  - **`busy`**: `boolean` — cursor espera y opacidad atenuada; alinea línea 1 sin efecto hover.
  - **`progreso`**: `{ mensaje, detalle? }` — reemplaza el botón por **`MensajeProceso`** `variant="sidebar"` (clases `.mensaje-proceso--sidebar`: fondo azul claro + texto `foreground`; detalle en `#0072BB`). Línea 2 = **X de Y · ~N min restantes** (string o `{ procesados, total }`). Usado en **`SyncStatusIndicator`** durante sync productos/compras. **`onProgresoDoubleClick`** para cancelar.
  - Resto: atributos estándar de `<button>` (`onClick`, `disabled`, `aria-label`, `className`, etc.).
- **Uso**: `SyncStatusIndicator` (lista precios, compras).

### `formatLastCompletedAtElapsed` (`src/lib/formatElapsedSince.ts`)

Helper compartido para textos **Últ. Act.: Hace …** (bloques de 15 min. bajo 1 h; luego horas/días). Usado por `SyncStatusIndicator` (lista precios y compras según área).

### Slidenav — Áreas principales (`src/lib/main-app-areas.ts`, `src/components/shared/SidebarMainAppArea.tsx`)

La app se divide en **tres áreas** de alto nivel; el resto de rutas actuales pertenecen a **Gestión Productos** (comportamiento por defecto).

- **`MAIN_APP_AREAS`**: cada ítem tiene `id`, `label` (title case en datos), `statusLabel` (ej. **Terminada** / **A construir**), `href` (entrada al elegir el área). En slidenav y modal, el nombre visible usa **`areaLabelMayusculas(label)`** (`toLocaleUpperCase("es")`) → **MAYÚSCULAS** (ej. **GESTIÓN PRODUCTOS**).
- **`getMainAppAreaIdFromPathname(pathname)`**: `/finanzas` y `/finanzas/*` → **Finanzas**; `/estadisticas-productos` y subrutas → **Estadísticas Productos**; cualquier otra ruta → **Gestión Productos** (incluye `/`, `/proveedores`, `/tienda`, `/stock`, `/pedidos`, `/importar`, etc.).
- **Navegación lateral por área activa** (`Sidebar.tsx`): en **Gestión Productos** el orden de módulos es **PEDIDO MERCADERIA** (simple) → **AYUDA VENDEDOR** (simple) → **ANALISIS DE PRECIOS** (editor). Dentro de **PEDIDO MERCADERIA**: **Generar Pedido** → agrupador **Conf. Pedido** (sin ruta; ícono `ListChecks`) con **Urgente**, **Tintométrico** y **Reposición** → **Recepcion Pedido** (`/gestion-productos/pedidos/historial`; subtítulo de página; antes **Historial Pedidos**). El agrupador **Conf. Pedido** auto-expande si la ruta activa es un hijo. Módulos retirados (no existen más): **LISTA TIENDA** y **Control Aumentos** (este último eliminado por completo el 2026-05-28; será reimplementado más adelante). El módulo top-level **LISTA PROVEEDORES** fue absorbido dentro de **ANALISIS DE PRECIOS** (2026-06-19) como agrupador desplegable homónimo. Con área **Finanzas** se muestran, en este orden, dos bloques: primero **`BALANCE`** (`Scale`) con submódulos **Gastos** → `/finanzas/balance/gastos` (`Receipt`) y **Catálogo Gastos** → `/finanzas/balance/gastos/catalogo` (`FolderTree`); luego **`FINANZAS`** (`Landmark`) con **Tesorería** → `/finanzas/tesoreria` (`Banknote`), **Flujo De Fondo** → `/finanzas/venc-por-fecha` (`CalendarDays`), **Venc. Provee. Merc.** → `/finanzas/deuda-proveedores` (`Wallet`), **Venc. Provee. Gastos** → `/finanzas/vencimientos-gastos` (`CalendarClock`) y **Control Comprobantes** → `/finanzas/control-comprobantes` (`FileSearch`) (todos `PERMISOS.finanzas.acceso`). `getOpenModule` abre **BALANCE** para rutas `/finanzas/balance/*` y **FINANZAS** para el resto de `/finanzas/*`. En **Estadísticas Productos** no hay módulos en sidebar todavía (mensaje vacío).
- **`SidebarMainAppArea`** (client): recibe **`esEditor`** desde `Sidebar` (`rol === "editor"`). Con **`showLogo` y `showLabel`**, el **nombre del área** no va dentro del botón del logo (ese botón usa `max-w-[45%]`): se renderiza **encima**, en un contenedor **`w-full min-w-0 px-1 text-center`** con `role="status"` + `aria-live="polite"`, y el `<span>` del nombre con **`w-full text-center`** + tipografía sidebar (`whitespace-nowrap`, `text-[13px]`, `leading-none`) para una sola línea centrada en todo el ancho del sidebar; el texto del nombre pasa por **`areaLabelMayusculas`**. **Rol `editor`:** el **logo** es `<button>` + `Image` (`alt=""`) con `aria-label` **Elegir Área De La Aplicación**; el click abre **`Dialog` + `AppModal`** **Áreas De La Aplicación** con las **tres** opciones (`MAIN_APP_AREAS`, `router.push` al `href` de cada área). **Rol `simple`:** el logo es un **`<div>`** decorativo (sin modal): **Finanzas** y **Estadísticas Productos** no se ofrecen en el selector — solo **Gestión Productos** como área de trabajo. Con **`showLabel` y sin logo** (`showLogo={false}`), el nombre sigue en `role="status"` con **`pb-0.5`** en el `<span>`. En el modal (solo editor), la opción de la ruta actual resaltada (`border-sidebar-indicator`, `bg-sidebar-accent/40`); íconos `lucide-react` por opción (`Boxes`, `Landmark`, `BarChart3`). Variantes **CVA**: `areaOptionVariants`, `areaTitleVariants` / `areaStatusVariants` (`context`: `sidebar` | `modal`).
- **`/finanzas`**: **`permanentRedirect`** a **`/finanzas/tesoreria`** (`src/app/finanzas/page.tsx`); no hay pantalla de resumen. La entrada del área **Finanzas** en el modal de áreas usa **`MAIN_APP_AREAS`** → mismo destino (`src/lib/main-app-areas.ts`). En sidebar, **Tesorería** se considera activa también si la ruta es exactamente **`/finanzas`** (hasta completar el redirect).
- **`/finanzas/tesoreria`**: **`ClassicFilteredTableLayout`** título **Finanzas**, subtítulo **Tesorería**. Incluye bloque de filtros con tres desplegables (**ENTIDAD**, **TITULAR**, **TIPO CAJA**), cada uno en `FiltroIndividualContainer`, y `LimpiarFiltrosButton` inline en la misma fila (`FilterBar` + `FilaFiltrosDesplegables` + `FILTER_INLINE_ACTION_SLOT_CLASS`) cuando el contenido entra en una línea. **`actions`** (solo `editor`): botón **Nueva Caja** (`h-10 px-4`, `Plus`) que abre **`NuevaCajaTesoreriaModal`** (título visible: **Crear Caja**). Modal (`AppModal`) con alta en orden: **TIPO CAJA**, **ENTIDAD** (`Select` + botón **`+`** → **`CrearEntidadTesoreriaModal`**, título **Crear Entidad**: CRUD sobre `fin_tesoreria_entidades`), **TITULAR**, **TIPO VALOR**, **DISPONIBILIDAD** (al cambiar **TIPO CAJA** se actualizan **TIPO VALOR** y **DISPONIBILIDAD** según `cajasTesoreriaTipos`); guarda con `crearCajaTesoreriaAction` y `router.refresh()`. **ENTIDAD** se muestra en MAYÚSCULAS (nombre del catálogo); **TITULAR** en MAYÚSCULAS y se persiste en MAYÚSCULAS. **TITULAR** se elige por desplegable fijo (sin texto libre) con estos valores: `SUC. GUAYMALLEN`, `SUC. MAIPU`, `WALTER GARCIA`, `FERNANDO PANAIA`, `EMILIANO GARCIA`, `VANESA GARCIA`, `COORPORATIVO`. Tabla **`TablaTesoreriaCajas`**: **`contenedor-tabla-gestion--pie-fijo`** (scroll solo el cuerpo; bajo el scroll, **dos filas** de tarjetas **`.finanzas-resumen-tarjeta`**, alineado a **Balance · Gastos**; `scrollbar-gutter: stable` en **`contenedor-tabla-gestion--pie-fijo-scroll`** vía `globals.css`). Columnas en orden: **ÚLT. ACTUALIZACIÓN** (primera; celda con **flex**: franja fija `size-9` alineada para ícono o hueco, fecha `flex-1 text-right tabular-nums`; sin divisor visible entre ambas; si &gt; **5 días** sin actualizar monto: **`TriangleAlert`** en caja **`border-2`/`bg-accent2`** con trazo blanco reforzado y `text-white`), **TIPO CAJA** (etiqueta con `etiquetaTipoCajaEnPantalla`), **ENTIDAD**, **TITULAR**, **MONTO** (`$` + `fmtPrecio`, entero) y **ACCIONES** (10 %, solo `editor`, bloque `tabla-bloque-secundario-*`): **Editar monto** (filas no **CHEQUE** → **`ActualizarMontoCajaTesoreriaModal`**), **Ver cheques** (**CHEQUE** → **`ChequesCajaTesoreriaModal`**), **Editar caja**. `<colgroup>`: 15 % **ÚLT. ACT.**, 15 % **TIPO CAJA**, 20 % **ENTIDAD**, 20 % **TITULAR**, 20 % **MONTO**, 10 % **ACCIONES** (sin **ACCIONES**, **MONTO** 30 %). Pie de resumen: **fila 1** subtotales por **tipo de valor** (**EFECTIVO**, **DIGITAL**, **CHEQUE** total por caja); **fila 2** **INMEDIATO** / **DIFERIDO** (cajas no cheque por `disponibilidad`; cajas **CHEQUE** con cheques no transferidos: acreditación ≤ hoy AR → **INMEDIATO**, &gt; hoy → **DIFERIDO**, mismos importes que **MONTO** por fila); la tabla no muestra **TIPO VALOR** ni **DISPONIBILIDAD** (siguen en **`EditarCajaTesoreriaModal`**). Rol **`simple`**: doble clic en fila **CHEQUE** abre **`ChequesCajaTesoreriaModal`** (título visible: **Detalles De Cheques**): encima de la tabla, **`ModalMicroLabel` “Tenencia”** + **`Select`** (`input-filtro-unificado`, `select-content-filtro`) **ACTUALES** (`tenencia = TIENDA` y `fecha_transferencia` nula) / **TRANSFERIDOS** (`tenencia` **DEPOSITADO** o **PROVEEDOR**; valor API `transferidos`). Filtro **ACTUALES**: columnas **RECIBIDO** (`fecha_recibido`), **TIPO**, **TENEDOR**, **EMISOR**, **MONTO**, **ACREDITACION** (`fecha_acreditacion`), **DÍAS** (acreditación − hoy AR; `diasTextoAcreditacionMenosHoyArgentina`) y **ACCIONES** (editor: **Transferir** si `tenencia === TIENDA` y no transferido / **Editar** / **Borrar**); orden filas por **DÍAS** ascendente. Filtro **TRANSFERIDOS** (`transferidos` en API): **RECIBIDO**, **EMISOR**, **TRANSFERENCIA** (`fecha_transferencia`, día calendario AR), **TENEDOR** (celda con custodia `tenencia`), **MONTO**, **ACCIONES** (**Editar** / **Borrar**); orden por **TRANSFERENCIA** descendente. Listado vía `listarChequesPorCajaAction` con `cajaId` y `tenenciaFiltro` (sin parámetro **vista**). **`AltaChequeTesoreriaModal`** (**Registrar Cheque**): **FECHA RECIBIDO** (default día Argentina) inmediatamente antes de **FECHA ACREDITACIÓN**; doble clic en cualquiera de esos campos abre el **calendario nativo** del navegador (`type="date"` oculto + `showPicker()`). **Pago Proveedor** desde **Destino Cheque** llama directo `marcarEntregaProveedorFinTesoreriaChequeAction` (custodia **PROVEEDOR**, sin modal intermedio). Los cheques transferidos se conservan en BD **500 días** y luego se purgan al listar o al transferir (ver `BACKEND_GUIDELINES` §2.5c, cheques). Filas con altura fija y botones ajustados al alto de fila mediante `TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS` donde aplique. El ícono lápiz abre **`EditarCajaTesoreriaModal`** (campos en orden: **TITULAR**, **ENTIDAD** (`Select` + **`+`** → **`CrearEntidadTesoreriaModal`**), **TIPO DE CAJA**, **TIPO DE VALOR**, **DISPONIBILIDAD**; **Eliminar caja** (solo desde este modal) abre **`EliminarCajaTesoreriaModal`** embebido con confirmación; **Guardar** con `entidadId`, `tipoValor`/`disponibilidad` explícitos vía `editarCajaTesoreriaAction`; conserva monto). Sin paginación. Datos desde `listarCajasTesoreria` (servidor). `PERMISOS.finanzas.acceso`. La consulta de compras DUX queda solo en **`SyncStatusIndicator`** (slidenav, área Finanzas).
- **`PedidoHistoriaDetalleModal` — `TOTAL PEDIDO` (`MontoArInput`)**: input con patrón **POS** (desplazamiento de centavos). Reglas: solo admite dígitos (`0-9`) y borrado (`Backspace`/`Delete`); **no** admite `.` ni `,`; el display inicia siempre en **`0,00`** y cada dígito nuevo desplaza el valor (ej. `1 -> 0,01`, `12 -> 0,12`, `123 -> 1,23`). Límite máximo: **`99.999.999,99`**.
- **`/finanzas/deuda-proveedores`**: **`ClassicFilteredTableLayout`** título **Finanzas**, subtítulo **Venc. Provee. Merc.** (nombre visible; la URL se mantiene por compatibilidad). Tabla **`TablaDeudaProveedores`**: columnas **PROVEEDOR** (encabezado y celdas centrados en vertical y horizontal; nombres largos con salto de línea), **DEUDA TOTAL**, **VENCIDA**, **5 DÍAS**, **30 DÍAS**, **45 DÍAS**, **60 DÍAS** (importes `$` + `es-AR` 2 dec., alineados a la derecha). Reparto del saldo por vencimiento según servicio (ver `BACKEND_GUIDELINES` §2.5a). Contador **X PROVEEDOR(ES) CON DEUDA**. Doble clic sobre proveedor abre modal **Detalle De Vencimientos** (`Dialog` + `AppModal` + `TablaFlujoDeFondoDetalleDia`) con título simple (sin subtítulo de proveedor/corte) y grilla de 5 columnas: **FECHA DEVENGADA**, **FECHA VENCIMIENTO**, **PROVEEDOR**, **DETALLE**, **MONTO**. Sin paginación. `PERMISOS.finanzas.acceso`. Ruta legacy **`/finanzas/venc-proveedores-mercaderia`** redirige permanentemente a esta URL.
- **`/finanzas/vencimientos-gastos`**: **`FinanzasVencimientosGastosPageClient`**: mismo ancho de contenido que **`/finanzas/deuda-proveedores`** (`ClassicFilteredTableLayout` con `contentWidth` por defecto = `max-w-7xl mx-auto` + padding de `contenedor-pagina-con-filtros`). Proveedores con `proveedorMercaderia === false` y obligación de gasto de balance vencida (`fecha_venc` &lt; hoy AR, pendiente a hoy &gt; 0). **`TablaVencimientosGastosNoMercaderia`**: envoltorio `flex flex-1 min-h-0 flex-col gap-2 px-4 pb-4 sm:px-6 lg:px-8` alineado con **`TablaDeudaProveedores`**; columnas **PROVEEDOR**, **TOTAL VENCIDO**; doble clic abre **`Dialog`** + **`AppModal`** (título **Detalle De Vencimientos**, sin subtítulo adicional) + **`TablaFlujoDeFondoDetalleDia`** filtrada en cliente por proveedor con 5 columnas: **FECHA DEVENGADA**, **FECHA VENCIMIENTO**, **PROVEEDOR**, **DETALLE**, **MONTO**; **`emptyMessage`** en mayúsculas acorde a este contexto (la grilla compartida con Flujo de Fondo usa el mensaje por defecto orientado al día). Datos: `listarObligacionesGastoVencidasNoMercaderia` en `finBalGastoMensualBalance.service.ts`. `PERMISOS.finanzas.acceso`.
- **`/finanzas/venc-por-fecha`**: **`src/app/finanzas/venc-por-fecha/page.tsx`** (servidor) + **`FinanzasVencPorFechaPageClient`**. **`ClassicFilteredTableLayout`** `contentWidth="full"`, título **Finanzas**, subtítulo **Flujo De Fondo**; **`filters`**: **FilterBar** con Select **PROVEEDOR** en `FiltroIndividualContainer` + **`LimpiarFiltrosButton`**. Rango: **hoy** (AR) a **hoy+150** — venc. de comprobantes **y** imputaciones de balance (ver `BACKEND_GUIDELINES` §2.5a). **Vista:** **`TablaFlujoDeFondo`**: cuatro columnas (**FECHA**, **VENCIMIENTO DEL DÍA**, **CAJA DISPONIBLE**, **SALDO**); cálculo en servidor con **`calcularFilasFlujoDeFondo`** (`@/lib/flujoDeFondoFilas.ts`). **SALDO** negativo: `text-destructive font-semibold` en la celda. Con filtro **PROVEEDOR**, la columna **VENCIMIENTO DEL DÍA** y el modal restringen a ese proveedor (CAJA/SALDO siguen con totales globales). **Paginación** 100, `pagina`. **Doble clic** → modal **`TablaFlujoDeFondoDetalleDia`**. `PERMISOS.finanzas.acceso`.
- **`/finanzas/control-comprobantes`**: **`ClassicFilteredTableLayout`** título **Finanzas**, subtítulo **Control Comprobantes**. Tabla **`TablaControlComprobantes`** con columnas: **CONTROLADO** (primera), **FECHA COMP.** (segunda), **PROVEEDOR**, **SUCURSAL**, **COMPROBANTE**, **TOTAL**, **MONTO APLICADO** y **VENCIMIENTO**. La vista usa **filtros de una sola línea** (sin búsqueda por descripción): **PROVEEDOR**, **SUCURSAL**, **PAGADO** (solo opción `PENDIENTE`), **VENCIDO** (solo opción `VENCIDO`) y **CONTROLADO** (solo opción `NO`). En **VENCIMIENTO** se muestra monto solo si existe saldo vencido según regla backend (`vencimientoSaldo > 0`); caso contrario la celda queda vacía. **CONTROLADO** es de solo lectura: renderiza `tabla-check-toggle` (alto autoajustado) sin interacción directa en celda; si está en `true` se pinta con **fondo azul (`primary`) + tilde blanca** para contraste. La marcación se realiza por **doble click en fila** (solo `editor`), que abre `AppModal` dinámico de confirmación: si está en `false` pregunta por marcar como **"Controlado"**; si está en `true` pregunta por marcar como **"No Controlado"**. Al confirmar llama a `actualizarControladoComprobanteAction` + `router.refresh()`.
- **Nuevo patrón global de filtros por fecha (fila 2 con flecha):** usar `FilterRowDateRange` + `FILTER_DATE_RANGE_TRIGGER_CLASS` (`@/components/FilterBar`). La segunda fila no contiene búsqueda de descripción: muestra un trigger con ícono/flecha que abre **`FiltroRangoFechasCalendarioModal`** (`@/components/shared/FiltroRangoFechasCalendarioModal.tsx`): calendario mensual (semana inicia lunes), navegación mes anterior/siguiente, **primer click** en un día = fecha desde, **segundo click** = fecha hasta (si el segundo es anterior al primero se intercambian); al completar el segundo click se aplica el rango y se cierra el modal. Botones **Limpiar** (borra rango y cierra) y **Cerrar** (cierra sin aplicar cambio si no se completó el segundo click).
- **`/finanzas/control-comprobantes`**: **`ClassicFilteredTableLayout`** título **Finanzas**, subtítulo **Control Comprobantes**. Tabla **`TablaControlComprobantes`** con columnas: **CONTROLADO** (primera), **FECHA COMP.** (segunda), **PROVEEDOR**, **SUCURSAL**, **COMPROBANTE**, **TOTAL**, **MONTO APLICADO** y **VENCIMIENTO**. La vista usa **filtro doble fila**: primera fila con **PROVEEDOR**, **SUCURSAL**, **PAGADO** (solo `PENDIENTE`), **VENCIDO** (solo `VENCIDO`) y **CONTROLADO** (solo `NO`); segunda fila con filtro de rango de fechas por flecha. En **VENCIMIENTO** se muestra monto solo si existe saldo vencido según regla backend (`vencimientoSaldo > 0`); caso contrario la celda queda vacía. **CONTROLADO** es de solo lectura: renderiza `tabla-check-toggle` (alto autoajustado) sin interacción directa en celda; si está en `true` se pinta con **fondo azul (`primary`) + tilde blanca** para contraste. La marcación se realiza por **doble click en fila** (solo `editor`), que abre `AppModal` dinámico de confirmación: si está en `false` pregunta por marcar como **"Controlado"**; si está en `true` pregunta por marcar como **"No Controlado"**. Al confirmar llama a `actualizarControladoComprobanteAction` + `router.refresh()`.
- **Layout Finder (catálogos jerárquicos):** componentes compartidos en `@/components/shared/catalogo-finder/` — **`CatalogoFinderColumn`** (header **`bg-primary`** como `TableHead`, título centrado; botón **`+`** con **`TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS`** — **`CATALOGO_FINDER_COLUMN_NOVO_BUTTON_COMPACT_CLASS`** `size-6` en header `h-8`, **`CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS`** `size-7` con subtítulo), **`CatalogoFinderRow`**, **`CatalogoFinderEmpty`**. Usado en **Balance · Catálogo Gastos** (5 columnas) y **Comp. Categorias · Categorias** (3 columnas).
- **`/finanzas/balance/gastos/catalogo`**: **`ClassicFilteredTableLayout`** título **FINANZAS**, subtítulo **Balance · Catálogo Gastos** (submódulo **Catálogo Gastos** dentro del módulo **BALANCE**, ícono `FolderTree`). Página dedicada al mantenimiento del catálogo jerárquico `fin_bal_gasto_tipo → fin_bal_gasto_rubro → fin_bal_cat_gasto` (ver `BACKEND_GUIDELINES` §2.5e) **+ catálogo maestro de proveedores "no-mercadería"** (modal desde el header). **Layout tipo Finder** con **`grid grid-cols-5 gap-3`** (desktop único): **TIPOS** · **RUBROS** · **GASTOS** · **GASTO FINAL** · **INDICADOR**. Las cuatro primeras columnas en cascada; **INDICADOR** resume **SUCURSALES** y **PROVEEDORES** con actividad para el gasto seleccionado. El catálogo maestro de proveedores no-mercadería se abre con el botón **PROVEEDORES** del header (modal lista + **`ProveedorModal`**). Cada columna es una `<section>` con borde y `rounded-lg`, header en `bg-muted/60` que muestra el **título** (uppercase tracking), un **subtítulo contextual** (contador de hijos o prompt `Seleccioná un tipo/rubro`) y un botón **`+ Nuevo`** (solo `editor`, `size="sm"`, `h-8`, ícono `Plus`). El body de la columna es `flex-1 overflow-y-auto` y renderiza filas `FilaCatalogo`. **Selección en cascada:** click en un tipo selecciona y puebla la columna de rubros (reset del rubro y del gasto); click en un rubro selecciona y puebla la columna de gastos (reset del gasto); click en un gasto selecciona y puebla **GASTO FINAL**. Estado seleccionado: `bg-primary/10` + `ChevronRight` en color `primary`. Filas: `truncate` para el nombre + meta auxiliar (`N rubros` / `N gastos`) en `text-[11px]`, con acciones **editar** (ícono `Pencil`) y **eliminar** (ícono `Trash2`, color destructive) ocultas por defecto y visibles en `group-hover`/`group-focus-within` (solo `editor`). Click/Enter/Space en la fila dispara la selección; los `<Button>` de acción usan `e.stopPropagation()` para no activarla. Estados vacíos con **`TableEmptyState`** (wrapper local **`EmptyState`** en `FinBalGastosCatalogoPageClient`). Las mutaciones de tipo/rubro/gasto usan **`CrearEditarFinBalCatalogoItemModal`** y **`EliminarFinBalCatalogoItemModal`** (`nivel: "tipo" | "rubro" | "gasto"`). El modal de catálogo solo persiste **NOMBRE**; en **alta de gasto** (`esAltaGastoSoloNombre`) solo se muestra NOMBRE (sin contexto rubro). La tabla hoja `fin_bal_cat_gasto` no tiene proveedor. **Columna GASTOS:** filas con `meta` = conteo de asignaciones finales (`fin_bal_gasto_final`). **Columna GASTO FINAL:** `CrearEditarFinBalGastoFinalModal` + `EliminarFinBalGastoFinalModal` — **TIPO DE GASTO** MENSUAL / EVENTUAL; **mensual** → sucursal obligatoria (`Select` desde `listarSucursalesParaGastos`, `centro_costo = true`); **eventual** → sucursal bloqueada (**NO APLICA**) y persistencia `sucursal_id` **NULL**; **DÍA DEVENGADO**, **PLAZO DE PAGO** e **IVA** según `BACKEND_GUIDELINES` §2.5e. El modal de eliminación de tipo/rubro/gasto es `AppModal size="sm"` con **Sí, Eliminar**; `onDelete: Restrict` en jerarquía. **Importante**: si en alta/edición el usuario marca `PROVEEDOR MERCADERÍA = SI`, ese proveedor saldrá del listado (quedará visible en `/gestion-productos/proveedores/lista`). **Permiso:** `PERMISOS.finanzas.acceso` (rol `simple` ve la jerarquía + lista de proveedores en modo lectura, sin botones de mutación).
- **`/finanzas/balance/gastos`**: **`ClassicFilteredTableLayout`** `contentWidth="full"`, título **Balance**, subtítulo **Gastos**. **Filtros** (`FilterBar` `filtros-contenedor-tienda bg-card`): **fila 1** `FilterRowSelection` + `FilaFiltrosDesplegables` — **SUCURSAL**, **PROVEEDOR**, **RUBRO**, **GASTO** (opciones acotadas según otras dimensiones), **ESTADO** (**CON MONTO Y PENDIENTE** = `monto > 0` y `pagado < monto`, saldo `monto − pagado` > 0: sin pagar o pago parcial; **CON MONTO Y PAGADO** = `monto > 0` y `pagado > 0`; **SIN MONTO** = `monto === 0`); cada dimensión en `FiltroIndividualContainer`; patrón global de Select (`input-filtro-unificado`, `SelectContent` `position="popper"` `side="bottom"` `align="start"` `select-content-filtro`, primera opción con valor `none` muestra el **nombre de la dimensión** en el trigger, no la palabra «TODOS»). **Fila 2** — misma retícula: **Año**, **Mes** (también con `FiltroIndividualContainer` respecto a hoy AR) y, en `col-span-3` (`FILTER_INLINE_ACTION_SLOT_CLASS`), contador **`FILTER_COUNT_CLASS`** (**X GASTO(S)**) + **`LimpiarFiltrosButton`** (dimensiones de grilla; no cambia el periodo de la URL). Select **Mes**: los **12 meses** del año. Select **Año**: **2026–2046** (`ANIOS_FILTRO_BALANCE_GASTOS` en `FinanzasBalanceGastosPageClient`). Sin `mes`/`anio` en la URL, el servidor **`redirect`** a **`?mes=&anio=`** del **mes y año actuales en Argentina**. Query validada con `mesAnioQuerySchema`. Solo `editor`: **Cargar Datos Mes.** llama `cargarFinBalGastoMensualMesAction({ mes, anio })`. Tabla **`TablaGastos`**: **FECHA**, **SUCURSAL**, **TIPO GASTO**, **RUBRO** (8% c/u), **GASTO** y **PROVEEDOR** (15% c/u), **MONTO**, **PAGADO**, **DEVENGADO** (8% c/u; muestra **pendiente de pago sobre el devengado**: acumulado proporcional hasta hoy − **PAGADO**, mínimo 0); con `editor`, **ACCIONES** (14%, `tabla-bloque-secundario-*`, `bg-muted/25`): **Registrar pago** (`Banknote`) → **Editar** (`Pencil`) → **Eliminar** (`Trash2`), luego **separador vertical** `#0072BB` y **evolución mensual** (`BarChart2`). Sin **ACCIONES** (rol `simple`), el ícono de evolución mensual sigue en la celda **MONTO** (junto al importe). **Scroll** único a la derecha de toda la tabla (incluye **ACCIONES**). Sin columna **MONTO VENCIDO**. Sin **ACCIONES** (rol `simple`), el `colgroup` aplica la misma proporción de las 9 columnas de datos escalada a 100%. **Editar monto** → `EditarMontoFinBalGastoMensualModal`: fila **Ult. Monto $… — Repetir Monto** (aplica el monto del mes anterior y cierra); **Eliminar** → `EliminarFinBalGastoMensualModal`. Banda bajo el scroll (`w-full` como la tabla, `border-t`), **tarjetas** compactas **centradas** con totales **MONTO** / **PAGADO** / **PENDIENTE** (suma por fila de `max(0, monto − pagado)` sobre el listado visible; `—` si el total es 0) (`aria-live="polite"`); sin fila de pie en la tabla. `PERMISOS.finanzas.acceso`.
- **`/finanzas/balance/vtas`**: **`ClassicFilteredTableLayout`** `contentWidth="full"`, título **FINANZAS**, subtítulo **Ventas Mensuales**. **Filtros** en una sola **`FilaFiltrosDesplegables`**: **MES** / **AÑO** / **SUCURSAL** (valor `none` = sin filtrar por esa dimensión; etiquetas **MAYÚSCULAS**) + **`col-span-2`**: **`FILTER_COUNT_CLASS`** (**X REGISTRO(S)**) + **`LimpiarFiltrosButton`**. Listado completo desde servidor (`listarFinBalVtas`); el filtrado es en cliente. Solo `editor`: **`actions`** — botón **Nueva Carga** abre **`CrearFinBalVtasModal`**: fila **MES/AÑO** y una fila por sucursal (`genera_balance`) con **`MontoArInput`**; precarga del periodo y guardado masivo con **`guardarFinBalVtasCargaPeriodoAction`** (mínimo un monto; upsert si ya existía). Tabla **Registros**: **PERIODO**, **SUCURSAL**, **MONTO**, **ALTA**, **ACCIONES** (eliminar). `PERMISOS.finanzas.acceso`.
- **`BalanceMensualGastoHistoricoModal`** (evolución mensual por `gastoFinalId`): debajo de cada barra, **mes y año** (`etiquetaMes`), **monto** y **variación % entera** vs. el mes anterior (`ArrowUp` / `ArrowDown`; **0%** sin flecha; **—** si no hay mes anterior o el anterior tenía monto 0 y el actual no). El **número del porcentaje** usa **`text-foreground`** y **`text-[11px]`** (`font-medium`); solo la **flecha** lleva color (sube **`text-destructive`**, baja **`TEXT_SUCCESS_CLASS`**).
- Rutas placeholder: **`/estadisticas-productos`** (página “A construir” con `SectionHeader`).
- **Jerarquía canónica de URLs (2026-06-19):** SSOT en **`src/lib/gestionProductosRoutes.ts`** (`GP_ROUTES`). Prefijo **`/gestion-productos/{módulo}/{agrupador}/{submódulo}`** alineado al sidebar. Rewrites en `next.config.ts` sirven páginas internas (`src/app/pedidos`, `proveedores`, `tienda`, …); redirects permanentes desde URLs legacy y canónicas anteriores.
  - **Pedido Mercaderia:** `/gestion-productos/pedido-mercaderia/generar-pedido`, `/gestion-productos/pedido-mercaderia/conf-pedido/{urgente|tintometrico|reposicion}`, `/gestion-productos/pedido-mercaderia/recepcion-pedido`.
  - **Ayuda Vendedor:** `/gestion-productos/ayuda-vendedor/px-venta/{px-vta-sugerido|px-tintometrico}`, `/gestion-productos/ayuda-vendedor/{calc-litros|procesos|cargar-gasto|control-stock}`.
  - **Análisis de Precios:** `/gestion-productos/analisis-precios/lista-proveedores/{lista-precios|lista}` (reglas descuentos vía modal en Lista Precios, sin ítem sidebar), `/gestion-productos/analisis-precios/cx-y-px-tienda/{cx-compra|px-listas}`, `/gestion-productos/analisis-precios/px-competencia`, `/gestion-productos/analisis-precios/comp-categorias/{comparacion|categorias}`.
  - Entrada por defecto (`/` y modal área Gestión Productos): **`GP_ROUTES.defaultEntry`** → Px. Vta. Sugerido.
  - Compatibilidad: redirects desde `/pedidos/*`, `/proveedores/*`, `/tienda/*`, `/stock`, `/procesos`, `/cargar-gasto`, `/precios-competencia` y rutas canónicas **2026-03** (`/gestion-productos/pedidos/*`, `/gestion-productos/proveedores/*`, etc.).

### Slidenav — Botón de usuario (perfil) (`src/components/SelectorRol.tsx`)

En la slidenav se usa `SelectorRol` con `compact` para renderizar un **botón de una sola línea**, montado en **`Sidebar`** **encima** del bloque **nombre del área + logo** (bloque inferior `mt-auto`, después de **sync/import**, no en la cabecera).

- **Contenedor dedicado**: el `SelectorRol` se renderiza dentro de su propio wrapper (`rounded-lg p-2`, sin borde ni fondo) separado del bloque `SidebarMainAppArea` para mantener independencia visual/estructural.

- **Formato**: ícono `User` (`aria-hidden`) + texto **`SIMPLE` / `EDITOR`** (según `rolActual`).
- **Interacción**
  - En **SIMPLE**: click abre modal de contraseña para pasar a **EDITOR**.
  - En **EDITOR**: click vuelve a **SIMPLE** sin modal.
- **Superficie del botón**: usar la clase global **`sidebar-user-switcher-surface`** (definida en `globals.css`) para fijar el fondo corporativo del selector en **`#021D36`** (`--sidebar-user-switcher-bg`) y texto `var(--sidebar-foreground)`. Reutilizar esta clase/token cuando se necesite el mismo patrón visual.
- **Feedback visual**: mantener `focus-visible:ring-*` para accesibilidad sin sobrescribir el color base.

#### Modal “Acceso De Editor” (mismo archivo)

- El modal se adapta al diseño estándar usando `AppModal` (header corporativo + footer con botonera).
- Botones y título respetan el Title Case (ej. `Acceso De Editor`, `Activar Modo Editor`).

### Slidenav — Sincronización DUX (`src/components/layout/SyncStatusIndicator.tsx`)

Botón persistente en la parte inferior de la slidenav. Markup en **`DuxSyncStyleButton`** (`surface="sidebar"`).

- **Etiqueta:** siempre **`SINCRONIZAR`** (sin variantes por área ni hover distinto).
- **Simple:** un click inicia sync de **productos** (`POST /api/sync-lista-precios-tienda` encadenado).
- **Editor:** click abre **`SincronizarDuxOpcionesModal`** con **Productos** y **Compras** (`sincronizarComprobantesProveedorDesdeDuxAction`).
- **Mutex UI:** si corre sync de productos, compras o arranque pendiente → botón **disabled** + `busy` (no segundo click).
- **Últ. Act.:** timestamp más reciente entre lista precios y compras (`formatLastCompletedAtElapsed`).
- **Progreso en curso:** el mismo slot pasa a **`MensajeProceso`** `variant="sidebar"` vía prop **`progreso`** de **`DuxSyncStyleButton`** (mismas clases que importación: `.mensaje-proceso--sidebar`, fondo azul claro, texto oscuro). Línea 1 **`SINCRONIZANDO…`** + línea 2 con **X de Y · ~N min restantes**. ETA: productos (`remainingMinutes` del status lista) y compras (status compras). Helpers: `formatSyncEta.ts`.

### Sincronización DUX — Slidenav

Regla de UX: la sincronización DUX **no debe duplicarse** en encabezados de módulos; se inicia desde **`SyncStatusIndicator`** en la slidenav (modal de opciones para **editor**).

### Comp. Categorias — Comparacion

Layout compartido en `@/lib/comparacionCategoriasLayout.ts`: **`contentWidth="wide150"`** + **`COMP_CATEGORIAS_PAGE_CONTENT_CLASS`**. **Comparacion**: stack vertical **`COMP_CATEGORIAS_COMPARISON_STACK_CLASS`** (`gap-3`) — panel selector **`flex-[2]` (40 %)** + panel tabla **`flex-[3]` (60 %)**; grid Finder 4 columnas **`h-full`**. Modales **Asignar Productos** y **Agregar Referencia De Competencia**: ancho compartido **`MODAL_COMP_CATEGORIAS_BUSQUEDA_MAX_WIDTH_CLASS`** (`!max-w-[151.2rem]`).

Submódulo **Comparacion** (`ComparacionCategoriasClient.tsx`): sin `FilterBar`. Arriba, selector en cascada (`ComparacionCategoriaSelector`, **4 columnas** `grid-cols-[1fr_1fr_1fr_2fr]` → **20 % / 20 % / 20 % / 40 %**: CATEGORÍA · SUBCATEGORÍA · PRESENTACIÓN · REFERENCIA COMPETENCIA; filas del Finder **sin** línea `meta` de conteos). **CRUD de dimensiones** en la misma pantalla si `comparacionCategorias.editar`: **`+`** por columna y editar/eliminar al hover en cada fila → `CrearEditarComparacionCategoriaModal` / `EliminarComparacionCategoriaModal`. **Auto-selección en cascada** (`resolverSeleccionCascadaUnica`): si un nivel tiene **una sola** opción (p. ej. una subcategoría bajo la categoría elegida), se selecciona sola y continúa hasta presentación; al llegar a presentación única se cargan productos. La ruta **Categorias** quedó unificada (redirect a Comparacion). Al elegir una **presentación**, se cargan los productos asignados (`getProductosPorPresentacionAction` → filas de `prod_precios_provee` vía `id_presentacion`).

**Columna Referencia competencia** (`ComparacionReferenciaCompetenciaColumn`): grilla sin fila de encabezados — **COMP. 12 %** · **PRODUCTO 70 %** (`line-clamp-2`) · **PX. 13 %** · **basura 5 %**; celdas **centradas**; botón basura por fila; selección única con **`CATALOGO_FINDER_ROW_SELECTED_CLASS`**; **+ Nuevo** agrega referencia.

Columnas bloque principal: **TILDE 3 %** · **PROVEEDOR 7 %** · **DESCRIPCIÓN 40 %** (32 % si hay columna acciones) · **DTO. EXTRA 6 %** · **COSTO 8 %** · **VAR 7 %** (`scrollX` en tabla). **DTO. EXTRA** — input entero 0–99 con máscara `%` (`PorcentajeEnteroMaskInput`, `formatDtoExtraComparacionMask` / `parseDtoExtraComparacionMask` en `comparacionCategoriasFormat.ts`; default **0%**); componente **`CeldaDtoExtraComparacion`**; recálculo instantáneo de **COSTO**, **VAR** y márgenes vía `dtoExtraDraft`; persistencia al blur (`actualizarDtoExtraComparacionAction`, `prod_comp_cat`). Bloque secundario (`tabla-bloque-secundario-*`): **MARG. SEG. REF. 7 %** — `calcMargenSegunPxReferencia` (2 dec. + `%`); **PX. CALC. 8 %** — calculado (`calcPxManualDesdeDifPctReferencia`, máscara **`formatPxManualEnteroMask`**); **DIF % REF. MAN. 7 %** — **input** (`CeldaDifPxRefManualComparacion`, `PorcentajeEnteroMaskInput` con `signed`; default **0%**); **MARG. CALC. 7 %** — calculado (`calcMargenManualDesdeDifPctReferencia`, `fmtMargenComparacionPct`, 2 dec.); recálculo en cliente vía `difPxRefManualDraft`; persistencia al blur del input → **`dif_px_ref_manual`** (`actualizarDifPxRefManualComparacionAction`, misma tabla **`prod_comp_item`**). Acciones **8 %**. Modales **Asignar productos** y **Elegir referencia**: **`MODAL_COMP_CATEGORIAS_BUSQUEDA_MAX_WIDTH_CLASS`** (`!max-w-[151.2rem]`); stack de filtros **`MODAL_COMP_CATEGORIAS_FILTROS_STACK_CLASS`** (select entidad + input búsqueda); tabla **`MODAL_COMP_CATEGORIAS_TABLA_COLUMN_WIDTHS_PCT`** `[5,15,65,15]`; búsqueda multi-término (AND).

### Sincronización DUX — Slidenav (detalle técnico)

Regla de UX: la sincronización de **lista de precios tienda** y **comprobantes de compra** no debe duplicarse en encabezados de módulos; ambas se disparan desde **`SyncStatusIndicator`** (modal **Productos** / **Compras** para **editor**). No hay botón duplicado en **`/finanzas/tesoreria`**.

### SSOT — Progreso de consultas API DUX (GET/POST)

**Regla canónica (obligatoria para nuevos flujos DUX ERP):** todo proceso largo que consulte la **API DUX ERP** (`erp.duxsoftware.com.ar`, ítems, compras, modificación de costos, etc.) — ya sea **GET** o **POST** — debe:

1. **Mutex en UI:** mientras un flujo DUX está activo, **`SyncStatusIndicator`** queda **deshabilitado** (sin iniciar otro sync). Backend: mutex en `sync_dux_status` y/o **409** en rutas API cuando aplique.
2. **No** duplicar banners de progreso en páginas/modales para esos flujos (el disparador es el botón **SINCRONIZAR** en sidebar).
3. **Lotes y pausa** (backend, `BACKEND_GUIDELINES` §1.10c): **50 ítems por lote**; **≥ 5 s** entre lotes (`duxApiBatchPolicy.ts`).

| Flujo | API | Disparo UI | Mutex |
|-------|-----|------------|-------|
| Sync lista precios tienda | `GET`/`POST` `/api/sync-lista-precios-tienda` | **SINCRONIZAR** (simple o modal **Productos**) | botón disabled |
| Sync compras | DUX comprobantes | Modal **Compras** (solo **editor**) | botón disabled |
| Import lista proveedor | Excel (no DUX ERP) | **`ImportStatusIndicator`** (segundo nodo sidebar) | independiente |
| Sync competencia (scraping URLs) | HTTP externo, no DUX ERP | **`CompetenciaSyncProgresoBanner`** en página ⚠️ pendiente migrar | independiente |
| Recepción pedido → DUX | POST `v2/compras` | Estado local en modal ⚠️ pendiente migrar | sin mutex global |

**Excepciones documentadas (no extrapolar sin actualizar esta tabla):** import Excel y scraping competencia no usan la API DUX ERP; hoy tienen UI propia. **Act. Cx.** exporta Excel en la página (sin sidebar). **Recepción DUX** es POST puntual en modal — aún sin slot sidebar.

**Checklist PR (flujos DUX nuevos):** ¿mutex en botón **SINCRONIZAR**? ¿sin banner duplicado en la página? ¿lotes de **50** y pausa **5 s** vía `duxApiBatchPolicy.ts`?

### Orden y labels — Sidebar Gestión Productos (`Sidebar.tsx`)

**AYUDA VENDEDOR** (rol **simple**): agrupador **Px Venta** (sin ruta; ícono `CircleDollarSign`) → **Px. Vta. Sugerido** + **Px Tintométrico**; luego **Calc. Litros**, **Procesos**, **Control Stock**. El agrupador auto-expande si la ruta activa es un hijo. **Cargar Gasto** (`/gestion-productos/cargar-gasto`, solo **editor**): abre al entrar el modal **`GastoUnicoBalanceModal`** (**Nuevo Gasto Eventual**, mismo flujo que **GASTO EVENTUAL** en `/finanzas/balance/gastos`); periodo = mes/año calendario Argentina.

**ANALISIS DE PRECIOS** (rol **editor**, orden): agrupador desplegable **`LISTA PROVEEDORES`** (sin ruta; ícono `Handshake`) → **Lista Precios** (toolbar: **`CotizacionUsdListaPreciosControl`**, **`ReglasDescuentosListaPrecioModal`** — cotización USD y CRUD reglas descuentos; permisos `listaPrecios.acciones.gestionarCotizacionUsd` / `gestionarReglasDescuentos`), **Lista Proveedores**; agrupador **`Cx y Px Tienda`** (sin ruta; ícono `Layers`) → **Cx Compra** + **Px Listas**; agrupador **`Comparacion`** (sin ruta; ícono `GitCompare`) → **Px Competencia** (`/gestion-productos/analisis-precios/px-competencia`) + **Categorias** (`/gestion-productos/analisis-precios/comp-categorias/comparacion`, permiso `comparacionCategorias.acceso`; alta/edición/baja de categoría/subcategoría/presentación en selector si `comparacionCategorias.editar`; ruta legacy **Categorias** → redirect Comparacion). Los agrupadores se abren al click (**acordeón**: solo **uno** abierto a la vez dentro del mismo módulo top-level; al abrir otro se cierran el resto) y auto-expanden si la ruta activa es un hijo. **`Cx Compra`**: grilla con **CX PROD.** + **`ActCxButton`** (Excel costos + modal opcional PDF informe aumentos). **`Px Competencia`** (`/gestion-productos/tienda/cx-px-tienda`, rewrite → `/tienda/cx-px`): listado paginado **solo** de productos con **`comparar_competencia = true`**; header **`Prod. Comparar`** + **`Gestionar Competidores`** + **`Comparar Precios Competencia`** (`SincronizarCompetenciaModal`; permiso `competenciaPrecios.editar`). **`CompetenciaSyncProgresoBanner`** sobre filtros. Filtros **`FiltrosPxListas`**: **MARCA**, **RUBRO**, **PX PROMEDIO** (DIF TIENDA vs promedio; query `filtroPxPromedio`) + búsqueda. Grilla **`TablaPxListas`**: **DESCRIPCIÓN**, **PX PROMEDIO**, **DIF TIENDA**, **ACCIONES** (detalle expandido por competidor; asociar/relevar URLs; quitar de comparación). DIF TIENDA compara `px_lista_tienda` (DUX) vs promedio competidores. **Eliminado (2026-05-28, reimplementar):** columna **DET PRECIO**, **PX LISTA**, **MARCACION**, filtros `detPrecio` / `ordenMarcacion`, **`ExportarPxButton`**, `guardarPxListaTiendaAction`. Componentes conservados para la próxima versión (no usados en grilla): `PxListaCxPxCelda`, `MarcacionPxListaCelda`. Permiso `PERMISOS.cxPxTienda.acceso`. `@/components/px-listas/`.

### Stock — No mostrar modal al entrar (`/stock`)

Regla de UX: al abrir **Control Stock** no se debe interrumpir con un modal de “¿Desea sincronizar?”.  
La sincronización se inicia solo desde los botones existentes (header y/o slidenav).

### Stock — Acciones del encabezado (Control Stock)

- En `Control Stock`, la zona de acciones del encabezado muestra solo acciones de salida (**Exportar** / **Imprimir**) alineadas a la derecha.
- El botón **Editar Coeficientes** ya no se muestra en esta pantalla.
- **Exportar Excel** (`TablaStock`): columna **STOCK** con **−** / input / **+** / botón **Check** (confirmar control sin variación: deja el stock igual al de BD). El **Check** queda **`disabled`** mientras haya **variación** (stock editado ≠ BD); al editar con variación se quita la confirmación previa. Columna **ÚLT. CONTROL** (antes export Excel): muestra fecha persistida, o **Pendiente** + tilde si hay variación o confirmación en sesión. Al **Exportar Excel**: el `.xls` solo incluye ítems con **variación** (todas las páginas visitadas); la persistencia de **ÚLT. CONTROL** (`registrarExportacionExcelStock`) aplica a ítems con variación **o** confirmación. Si solo hay confirmaciones sin variación, se registra control sin descargar Excel.

### Ayuda Vendedor — `Px Tintométrico` (`/tienda/tintometrico`) y `Calc. Litros` (`/tienda/litros`)

- Rutas canónicas bajo **Ayuda Vendedor** (`/gestion-productos/tienda/calc-tintometrico`, `/gestion-productos/tienda/calc-litros`); la URL antigua `/tienda/tinto-lts` redirige (308) a tintométrico.
- Ambos usan encabezado estándar (`SectionHeader`) con título **Ayuda Vendedor** y subtítulo **Px Tintométrico** o **Calc. Litros** según la pantalla.
- No renderizan bloque de filtros (`FilterBar`).
- **Px Tintométrico** (antes **Calc. Tintométrico**): cálculo local en cliente (sin persistencia de montos). Una card `bg-card` a ancho útil (`max-w-xl` centrada para el formulario) con título en mayúsculas **CÁLCULO DE PX TINTOMÉTRICO** + línea `bg-primary` al `70%`; grilla etiqueta/campo: `Proveedor` (`Select` con `SELECT_TRIGGER_FILTER_CLASS`), `Px. Compra` (`Input` entero), `Px Lista Tienda` (solo lectura, múltiplo de 100). Solo proveedores con `coeficienteTintometrico > 1` en el desplegable. **Editar Coeficientes** solo `editor`; modal `EditarCoeficientesModal` con tabla de dos columnas (**PROVEEDOR** y **COEFICIENTE** editable), persistencia en DB y botón **Guardar** deshabilitado cuando no hay cambios (o durante guardado).
- **Calc. Litros**: cálculo local; card única a ancho completo del contenedor con título **CALCULO DE LTS** + línea `bg-primary` al `70%`; selectores **FORMA DE CÁLCULO** y **TIPO DE PINTURA**; tablas según forma (paredes, módulo, pileta). **EDITAR RENDIMIENTOS** solo `editor` (modal CRUD `prod_rendimientos`, antes `tipos_pintura_rendimientos`). Los campos **LARGO**, **ANCHO**, **ALTO** y **PROFUNDIDAD** (dimensiones en metros) usan `InputDimensionMts` en `TiendaCalcLitrosPageClient.tsx`: `Input` con `pr-10` + sufijo visual **Mts.** (`text-muted-foreground`, `pointer-events-none`, `aria-hidden`); el valor sigue siendo solo el número; `aria-label` incluye «en metros».
- Sidebar por rol: **simple** → **PEDIDO MERCADERIA** + **AYUDA VENDEDOR**; **editor** → los cuatro módulos. **Cx Compra** solo **editor** (`PERMISOS.tienda.acceso`).

## 4. Checklist de PR (Cursor / desarrollador)

Antes de dar por terminada una tarea de frontend:

- [ ] No hay estilos inline ni clases hardcodeadas (`bg-white`, `text-slate-400`, `emerald-*`, `amber-*`, etc.); se usan tokens (`bg-card`, `text-muted-foreground`, `primary`/`accent2`) o `@/lib/ui-classes` (incluido **`CALLOUT_WARNING_CLASS`** para banners y **`TEXT_WARNING_CLASS`** / **`ICON_WARNING_INTERACTIVE_CLASS`** para íconos de aviso). Excepción aceptable: anchos dinámicos (p. ej. barra de progreso `%`) o el patrón documentado `style={{ height: "auto" }}` en modales con tabla. **`Card`** que envuelve la tabla principal: **`card-tabla-envoltorio`**, no sombras arbitrarias **`shadow-[0_4px_12px_rgba(...)]`** ni la cadena larga de utilidades duplicada.
- [ ] **Anchos de columna estáticos** en tablas con `<colgroup>`: usar `<col className="w-[x%]" />` (ver `VincularModal`, `ComparacionCategoriasClient`, `TablaFlujoDeFondo`). `style={{ width }}` queda solo para anchos verdaderamente dinámicos (p. ej. `esEditor ? "24%" : "36%"`).
- [ ] **Cascarón de página de área**: páginas y `*PageClient` que ocupan toda la pantalla usan **`.area-page-shell`**, no la cadena `flex h-screen min-h-0 flex-col overflow-hidden`.
- [ ] **Sin utilidades Tailwind duplicadas por eje** en una misma `className` (ej. `px-2 px-3`, `px-4 px-6 px-8`, `gap-2 gap-4`, `grid-cols-1` + `grid-cols-2`, `flex-col` + `flex-row`, `min-w-[a] min-w-[b]`, `text-sm text-base`): mantener una sola y usar `cn()` para overrides condicionales.
- [ ] Las clases condicionales o combinadas usan `cn(...)`.
- [ ] Tablas usan `Table` de `@/components/ui/table` con `variant="compact"` cuando aplique; encabezado fijo (al hacer scroll los encabezados no desaparecen).
- [ ] Filtros usan `FilterBar`, `FilaFiltrosDesplegables`, `INPUT_FILTER_CLASS`, `FILTER_SELECT_WRAPPER_CLASS`. Input de búsqueda: `useFiltrosConBusqueda` + `FiltroBusquedaInput`.
- [ ] Encabezados de página usan `SectionHeader` o `ClassicPageHeader` (implementación única vía `PageSectionHeader`; no duplicar markup de `.section-header`).
- [ ] Mensajes de tabla/lista vacía reutilizan `TableEmptyRow` o `TableEmptyState` (variantes CVA), sin copiar `py-* text-muted-foreground text-center` sueltos.
- [ ] Botones de toolbar con **ícono + label** (y/o estado async): usan `ToolbarActionButton` (`src/components/shared/ToolbarActionButton.tsx`) o `Button` de shadcn **sin** repetir `gap-2 shrink-0` (el `Button` base ya los aporta) ni dimensionar el `<svg>` con `h-4 w-4 shrink-0` (el `Button` lo hace vía `[&_svg:not([class*='size-'])]:size-4`).
- [ ] Títulos de modales y botones: title case. Sidebar: módulo en MAYÚSCULAS, submódulo con primera letra de cada palabra en mayúscula (title case). Filtros y desplegables: MAYÚSCULAS. Encabezados de tablas de datos: MAYÚSCULAS y negrita. Abreviaciones con punto final (Px., Cx., Dto., etc.).
- [ ] **Modales:** etiquetas de campos (`label`, `Label`, `ModalMicroLabel`, `MODAL_*_LABEL_CLASS`) en **`text-foreground`**; no `text-muted-foreground` en etiquetas de controles (ayudas y mensajes secundarios exceptuados).
- [ ] Iconos: `lucide-react`. Toasts: `sonner`. Fuente: Geist (vía layout/tema).
- [ ] No hay `any`; validación de datos con Zod donde aplique.
- [ ] Si se añade una clase global nueva, se registra en este documento (sección 2).

---

## 5. Hallazgos de auditoría y correcciones aplicadas

### Auditoría 2026-06-30 (código muerto, layout y navegación)

- **Cascarón `.area-page-shell` unificado** en todo `src/`: eliminadas duplicaciones `h-screen flex flex-col overflow-hidden` (con y sin `bg-gris`) en páginas de proveedores, pedidos/historial, Cx Compra, Px Competencia, calc. vendedor y ayuda (`CargarGastoPageClient`, `ProcesosPageClient`). Regla: no apilar utilidades flex/altura encima de `.area-page-shell`.
- **Navegación App Router:** migrados los últimos `window.location.href` en filtros (`FiltrosTienda`, `FiltrosProductos`, `FiltrosPedidoUrgente`), `SelectorProveedor` y `pedidos/historial/error.tsx` a **`useRouter().push()`**.
- **Componentes/hooks huérfanos eliminados:** `SyncModal.tsx`, `useListaPreciosTiendaModalSync.ts`, `useSyncListaPreciosStatusPoll.ts`, `listaPreciosTiendaSync.types.ts` (flujo activo: sidebar **`SyncStatusIndicator`**).
- **Exports deprecados sin uso:** alias `MODAL_ASIGNAR_PRODUCTOS_MAX_WIDTH_CLASS` / `MODAL_REFERENCIA_COMPETENCIA_MAX_WIDTH_CLASS`; prop `compact` en `SectionHeader`; `costosCompraDifierenParaInforme` en `aumentoCostoCompra.ts`.
- **Comp. Categorías — desktop-only:** `COMP_CATEGORIAS_PAGE_CONTENT_CLASS` colapsado de `!px-3 sm:!px-4 md:!px-5` a **`!px-5`** (política sin breakpoints responsive).
- **ESLint `src --max-warnings 0`:** sin errores ni advertencias tras la pasada.

### Auditoría 2026-05-07 (Finanzas — nuevas pantallas)

Aplicada en archivos recién agregados al árbol y pantallas adyacentes para mantener cero inconsistencias:

- **`FinanzasBalanceMensualPageClient.tsx`** (`/finanzas/balance/mensual`):
  - Aviso «no hay sucursales con `genera_balance` activo» migrado de `border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100` a **`CALLOUT_WARNING_CLASS`** (`@/lib/ui-classes`).
  - Eliminadas utilidades duplicadas en una misma `className`: `min-w-[min(100%,40rem)] min-w-[44rem]` → **`min-w-[44rem]`**; `px-2 px-3` → **`(sin override)`** (queda el padding heredado de `CLASE_CELDA_BALANCE_MENSUAL` = `px-3`).
- **`TablaFlujoDeFondo.tsx`** (`/finanzas/venc-por-fecha`, modal de Detalle de día reutilizado por **Venc. Provee. Merc.** y **Venc. Provee. Gastos**):
  - `<col className="w-[25%]">` en grilla principal (4 columnas); modal mantiene `COL_WIDTH_CLASSES_MODAL`. El `style` queda reservado para casos verdaderamente dinámicos.
  - Limpieza de utilidades redundantes con `.contenedor-tabla-gestion` (`rounded-md border border-border bg-card flex flex-col` quedan en la clase global).
- **`TablaTesoreriaCajas.tsx`** (`/finanzas/tesoreria`): alerta por desactualización — **`TriangleAlert`** en recuadro sólido **`accent2`** + trazo blanco (`text-white`, `strokeWidth`); orden de columnas **ÚLT. ACT.** → **TIPO CAJA** → **ENTIDAD** → **TITULAR** → **MONTO** → **ACCIONES**; **`ColgroupAnchos`** + **`COL_WIDTHS_PCT_CON_ACCIONES`** / **`COL_WIDTHS_PCT_SIN_ACCIONES`** (6 columnas con acciones o 5 sin; anchos en % por `<col>`, suma 100); celda **ÚLT. ACT.**: **`gap-0`** entre recuadro del ícono y el texto de fecha; en **ACCIONES** (editor) no hay eliminar en la grilla — la baja es solo desde **Editar caja** (ver §1 **`/finanzas/tesoreria`**).
- **Cascarón de página de área** (nueva clase global **`.area-page-shell`** en `globals.css`): reemplaza la cadena duplicada `flex h-screen min-h-0 flex-col overflow-hidden` en:
  - `src/app/finanzas/flujo-de-fondo/page.tsx`
  - `src/app/finanzas/venc-por-fecha/page.tsx`
  - `src/app/finanzas/control-comprobantes/page.tsx`
  - `src/components/finanzas/FinanzasBalanceMensualPageClient.tsx`
  - `src/components/finanzas/FinanzasBalanceGastosPageClient.tsx`
  - `src/components/finanzas/FinanzasDeudaProveedoresPageClient.tsx`
  - `src/components/finanzas/FinanzasVencimientosGastosPageClient.tsx`
  - `src/components/finanzas/FinanzasTesoreriaPageClient.tsx`
- **`@/lib/ui-classes`** ahora exporta **`CALLOUT_WARNING_CLASS`** para banners/avisos no destructivos. Reusa `accent2` (amarillo de marca) y queda alineado con `TEXT_WARNING_CLASS` / `ICON_WARNING_INTERACTIVE_CLASS`.

### Auditoría 2026-05-07 (Refactor — utilidades duplicadas y shadcn)

Pasada de consistencia **desktop-only** y tokens/`AppModal` / `ModalMicroLabel`:

- **Padding horizontal:** eliminado legado **`px-4 px-6 px-8`** → **`px-8`** en `src/app` (proveedores, importar), **`Navbar`**, **`TiendaCalcLitrosPageClient`**, **`TiendaCalcTintometricoPageClient`**. Tablas Finanzas: **`px-8 pb-4`** en **`TablaDeudaProveedores`**, **`TablaVencimientosGastosNoMercaderia`**, **`TablaControlComprobantes`**. **`ClassicFilteredTableLayout`**: `density` **`default` → `px-8`**, **`compact` → `px-6`** (sin simular breakpoints con tres `px-*`).
- **`components/ui/dialog`:** **`DialogHeader`** solo **`text-left`**; **`DialogFooter`** **`flex flex-row justify-end gap-2`** (sin `flex-col-reverse` + `flex-row` ni `gap` duplicado).
- **Grillas:** una sola **`grid-cols-*`** por nodo en **`PedidoHistoriaDetalleModal`** (**`GRID_CAPAS_SUP_PEDIDO_HISTORIA`**), **`AgregarProductosModal`**, **`TiendaCalcLitrosPageClient`**, **`GastoUnicoBalanceModal`**, **`NuevoItemTintometricoModal`**, **`GestionCategoriasModal`**.
- **`PedidoHistoriaDetalleModal`:** fila **Agregar Producto** sin `flex-col`/`flex-row` conflictivos ni `w-full`/`w-auto` duplicados; **`bodyClassName="py-2.5"`**; título **Recepcion Pedido**; en checklist con pedido bloqueado, celda vacía (sin **`—`**).
- **`AppModal`:** no duplicar **`max-w-*`** de **`size`**; **`ConfirmarComprobanteFiscalModal`** (`size="sm"`), **`CrearEditarFinBalGastoFinalModal`** ancho **`size="lg"`** (`max-w-xl`).
- **`CrearEditarFinBalGastoFinalModal`:** campos con **`ModalMicroLabel`**; **GENERA IVA CRÉDITO** (`SIEMPRE` / `NUNCA` / `PREGUNTA`) ubicado debajo de **PLAZO DE PAGO** (columna `fin_bal_gasto_final.iva`). En **Nuevo Gasto Final**, todos los selects obligatorios deben elegirse explícitamente (sin default: tipo, sucursal, proveedor, IVA; si **MENSUAL**, día devengado y plazo). **COMENTARIOS** es el único campo opcional. **EVENTUAL** exceptúa **DÍA DEVENGADO** y **PLAZO DE PAGO** (bloqueados, `null` al guardar; en **editar**, `hasChanges` no compara día/plazo salvo que tipo siga siendo **MENSUAL** en origen y destino).
- **`FinBalGastosCatalogoPageClient`:** **`TableEmptyState`** en el wrapper **`EmptyState`**; modal proveedores: prefijo vacío sin **`—`**.
- **`ProveedorModal` / `ProveedorForm`:** **Editar Proveedor**, **Guardar Cambios** (title case).
- **Carrusel de procesos** (`ProcesoInstructivoCarrusel`): layout en columna flex (título, carrete sin contorno, bloque texto+imagen con borde compartido);

### Correcciones ya aplicadas

- **Tokens de éxito/advertencia (2026-03)**: creado `@/lib/ui-classes` con clases basadas en `primary`, `accent`, `accent2`. Sustituidos `emerald-*`, `amber-*`, `blue-*` en `ImportarModal`, `ImportarListaPreciosModal`, `ImportResultContext`, `UploadZone`, `app/importar/page.tsx`, `AccionMasivaModal`. **`PedidoHistoriaLecturaModal`**: ícono de diferencia con `ICON_WARNING_INTERACTIVE_CLASS`, celdas vacías sin `—`. **`VincularModal`**: `<col>` con `className="w-[x%]"` en lugar de `style`.
- **SectionHeader**: eliminado `bg-white`; clase `.section-header` (fondo `var(--card)`). `cn()` en header. Subtítulo `<h3>`.
- **Toolbars (Proveedores, Tienda, Pedidos)**: tokens `text-muted-foreground`, `hover:bg-muted`, `hover:text-foreground`.
- **Filtros**: FiltrosProductos, FiltrosTienda, FiltrosStock, FiltrosPedidoUrgente, BuscadorSimple con **useFiltrosConBusqueda** + **FiltroBusquedaInput**. `cn(FILTER_COUNT_CLASS, "ml-auto")` en SugeridosTablaConFiltros, ListaPreciosTablaConFiltros. **Pedido Urgente**: sin contador “Mostrando X de Y” bajo la tabla (solo paginación cuando aplica). **Tablas**: encabezado fijo, 100 ítems por página, paginación con `PaginacionTabla` (URL) o `PaginacionClient` (estado cliente); ver sección 1 punto 8. Pedido Urgente, Pedido Reposición y Control Stock usan el contenedor estándar `.contenedor-tabla-gestion` para que el encabezado permanezca siempre visible al hacer scroll interno de filas. **Control Stock**: se elimina el filtro `SUB-RUBRO` y se agrega el desplegable `ORDEN` con opción **SEGUN TIEMPO CONTROL** (`ultima_exportacion_excel`). En tabla: **DESCRIPCIÓN (40%)**, **STOCK (30%)** (− / cantidad / + / **Check** confirmación), **VARIACIÓN (15%)**, **ÚLT. CONTROL (15%)**. **VARIACIÓN**: flecha **azul** / **roja** + delta si el stock editado ≠ BD; **0** (sin flecha) si el ítem fue confirmado con **Check** (control sin ajuste). **ÚLT. CONTROL**: fecha tras exportar; **Pendiente** en sesión si hay variación o confirmación.
- **Regla transversal Gestión Productos (filtros PROVEEDOR)**: en rutas canónicas `/gestion-productos/*`, cualquier `Select`/filtro de **PROVEEDOR** debe listar únicamente proveedores con `proveedor_mercaderia = true` (catálogo `global_proveedores`). Esto aplica a páginas de Proveedores, Tienda, Pedidos y Stock, incluyendo modales que consultan proveedores vía actions compartidas (`vinculos`, etc.).
- **TablaTienda / Cx Compra** (`TablaTienda.tsx`, clase `tabla-tienda-listado`): cinco columnas **12/38/10/28/12 %** — **COD. TIENDA**, **DESCRIPCIÓN**, **VINCULACIÓN** (`-` o contador), **CX PROD.** (`CeldaCxProdTienda`), **ACCIONES** (▼/▲ detalle + **Link2** vincular). Subfilas con estilos `tabla-fila-detalle-competencia-*` (`CxCompraVinculosDetalle.tsx`): **mismo alto fijo** que filas principales (`--tabla-body-row-min-height`); columna **CX PROD.** en subfila = grilla **2 col** (`.cx-compra-subfila-cx-prod`: base + variación | precio, una línea). **`SeleccionarProductoModal`** solo desde ACCIONES. Utilidades en `@/lib/vinculosTiendaUi.ts`. **`ItemTiendaParaTabla.cxProd`**: `CxProdDatosFila`.
- **CeldaCxProdTienda** (`@/components/shared/CeldaCxProdTienda.tsx`): grid 2 columnas — `Select` (**CX. PROM.** + proveedores vinculados) + monto `$` con `fmtPrecio`; `guardarCostoCxProdTiendaAction` + `router.refresh()`. Usado en **`TablaTienda`** (Cx Compra).
- **Vínculos en grilla:** ícono **Link2** abre directamente **`SeleccionarProductoModal`** (**Vincular Nuevo Producto**); gestión de vínculos existentes (BASE, desvincular) en subfilas **`CxCompraVinculosDetalle`** (chevron expandir). Badge **PROPIO** en **VINCULACIÓN**; filtro **VINCULADO=NO** excluye propios.
- **Encabezado sticky + divisores**: `tabla-bloque-secundario-head*` con fondo `primary` opaco; separadores **verticales en thead** (`*-head-divider`) en blanco (`primary-foreground`). En **tbody**, `tabla-bloque-secundario-cell-divider` usa `box-shadow` inset **#0072bb** en lugar de `border-left` (`border-collapse: collapse`). Separación **horizontal entre filas**: `border-bottom` blanco (`var(--primary-foreground)`) en `.tabla-gestion-compacta tbody tr`. `TableHead` sin utilidad `bg-transparent` para no competir con `globals.css`.
- **Altura de filas en tablas**: **`thead th`**: **altura fija** con **`height/min-height/max-height`** vía **`--tabla-thead-height`** (**2.125rem**, referencia Cx Compra / `TablaTienda`; siempre fijo para dos líneas); **`--tabla-body-row-min-height: 2rem`**; **`TableCell`**: **`text-xs` `leading-tight` `align-middle`**; **`TableRow`**: **`transition-[background-color]`** (sin afectar layout). **`globals.css`**: **`tbody td`** con **`line-height: 1.25`**; **sin** zoom de texto en hover de fila. Inputs en celdas forzados a **~1.75rem** vía **`globals.css`** (las utilidades `h-6`/`h-7` en JSX quedan alineadas a ese valor).
- **ui/tooltip.tsx**, **ui/dialog.tsx**, **ui/sonner.tsx**: tokens (border-border, bg-popover, bg-background) y configuración del toaster vía clase global `.toaster` (sin `style` inline).
- **Modales y listados**: ImportarModal, ImportarListaPreciosModal, TablaProductosFiltrada, AppModal con `bg-card`, `text-muted-foreground`, `bg-muted` y `cn()` en todos los classNames combinados.
- **Páginas (src/app/)**: `app/importar/page.tsx`, `app/proveedores/page.tsx`, `app/pedidos/urgente/page.tsx`, `app/proveedores/gestion/page.tsx`, `app/tienda/page.tsx`, `app/stock/page.tsx` — Separator `bg-border`; Card `border-border bg-card`; tablas con 100 ítems por página y barra de paginación al pie cuando hay más de una página (`PaginacionTabla` o `PaginacionClient`).
- **Tarjeta envoltorio de tabla (2026-04-24)**: clase **`.card-tabla-envoltorio`** + variable **`--card-tabla-envoltorio-shadow`** en `globals.css`; sustituida la cadena repetida de utilidades y **`shadow-[0_4px_12px_rgba(0,0,0,0.05)]`** en `proveedores/page.tsx`, `pedidos/enviar/page.tsx`, `PedidoUrgentePageClient.tsx`, `PedidoTintometricoPageClient.tsx`.
- **Componentes con `cn()`**: UploadZone, ProveedorAlternativoRow, ImportarModal, ImportarListaPreciosModal (botones SÍ/NO y zona drag), SugeridosTablaConFiltros, ListaPreciosTablaConFiltros — todas las combinaciones de clase pasan por `cn()`.
- **Encabezados de tabla abreviados (2026-03):** para convivir con el header global de 2 líneas y recorte, se acortan labels largos en columnas angostas (`CANT. VINCULADOS`, `COL. ARCHIVO`, `DESC. PROVEEDOR`, `PX. VTA. SUG.`, `CANT. URG.`, `PX. FINAL`, `MARGEN`, `CANT. PED.`, `CANT. REC.`).
- **Eliminación de estilos inline estructurales**: anchos de columnas en `TablaPedidoUrgente`, `TablaReposicion` y `ComparacionCategoriasClient` migrados a utilidades Tailwind (`w-[x%]`) y clases globales; plantilla de impresión de stock (`PrintStock`) sin atributos `style`, usando solo clases CSS internas.
- **Sidebar — Sincronización DUX**: `SyncStatusIndicator` con botón **`SINCRONIZAR`**; **simple** → productos; **editor** → modal **Productos** / **Compras**; durante sync muestra progreso y ETA en el mismo slot.
- **Pedido Reposición — Configuración (2026-03)**: `PUNTO REPOSIC.` admite valor `0` en el flujo completo (modal + action + servicio). La validación de `cant` configurada se mantiene en entero mínimo `1`. Desde 2026-04, el modal/Action ya no envía `idProveedor` para guardar: la configuración se persiste por `cod_tienda`. El **proveedor mostrado** en filtros/Generar pedido se **recalcula en cada carga** (`getReposicionData`, `getItemsTablaEnviarPedido`): vínculos `prod_precios_provee.cod_tienda` + menor costo comparable según Posición IVA (misma regla que Urgente: sin IVA si saldo acumulado &gt; 0, con IVA si ≤ 0). Al cambiar Posición IVA, recargar **Generar pedido** o **Reposición** para ver proveedores actualizados.
- **`/tienda/litros` — Cálculo de Lts**: selector **FORMA DE CÁLCULO** (`POR PAREDES`, `POR MÓDULO`, `PILETA`) + selector **TIPO DE PINTURA** (fuente `prod_rendimientos`, antes `tipos_pintura_rendimientos`).  
  - **POR PAREDES**: ocho columnas (anchos aprox. 20% / 15% / 15% / 15% / 10% / 10% / 10% / 5%): `SUPERFICIE` (texto `Pared 1`, `Pared 2`, … por fila), `CANT.`, `LARGO`, `ANCHO` (**LARGO** y **ANCHO**: `InputDimensionMts` + sufijo **Mts.**; **CANT.** sin unidad), `MTS2` (`cant × largo × ancho`), `1 MANO`, `2 MANOS`, `ACCIONES` (eliminar). Cálculos en vivo: `1 MANO = MTS2 / rendimiento`, `2 MANOS = 1 MANO × 2`; totales y litros con un decimal. Fila `TOTAL`: celda vacía con `colSpan={3}` (superficie + cant + largo) y texto `TOTAL` en la columna **ANCHO** alineado a la derecha (`!text-right`, `celda-datos--flush-right`) para acercarlo a los totales numéricos; pie resaltado con `border-t-2 border-primary`, `bg-muted/50`, totales en **`font-bold`** (`CALC_LITROS_FOOTER_*` en `TiendaCalcLitrosPageClient.tsx`); botón `+` debajo (mismo bloque, borde superior continuo).  
  - **POR MÓDULO**: arriba, tabla de una fila con `LARGO`, `ANCHO`, `ALTO` (`InputDimensionMts` + **Mts.**), `INCLUYE TECHO` (dimensiones del módulo). Debajo, tabla de **cinco columnas** (`SUPERFICIE`, **`TAMAÑO`**, `MTS2`, `1 MANO`, `2 MANOS`) y **cinco filas fijas** (`Pared 1` … `Pared 4`, `Techo`). **`TAMAÑO`**: texto de la multiplicación con un decimal (`formatTamanoMts` en `@/lib/tiendaCalculosLts`): Pared 1/2 = largo × alto; Pared 3/4 = ancho × alto; Techo = largo × ancho si **incluye techo**, si no **—** (muted). **MTS2**: mismas áreas que antes. **1 MANO** = MTS2 ÷ rendimiento; **2 MANOS** = 1 MANO × 2. Fila `TOTAL`: **`TOTAL`** con `colSpan={2}` (SUPERFICIE + **TAMAÑO**), alineado a la derecha; mismo estilo de pie que **POR PAREDES** (`border-t-2 border-primary`, `bg-muted/50`, valores en **negrita**).
  - **PILETA**: misma estructura y fórmulas que **POR MÓDULO**, con **LARGO**, **ANCHO**, **PROFUNDIDAD** en `InputDimensionMts` + **Mts.**, columna **`TAMAÑO`**: Pared 1/2 = largo × profundidad; Pared 3/4 = ancho × profundidad; **Piso** = largo × ancho. Última fila **Piso** (en lugar de **Techo**), y **PISO** en la cabecera de la fila superior con texto fijo **Siempre incluido** (sin checkbox; el área de piso **largo × ancho** siempre entra en el cálculo). Pie de totales igual al de **POR MÓDULO** (`colSpan={2}` en **TOTAL**, mismas clases de resaltado).

### Auditoría 2026-06-04 (Frontend — código muerto y lint)

- **ESLint `src` en cero** (`--max-warnings 0`): imports/types no usados en lista precios y proveedores; `queueMicrotask` en **`SeleccionarProductoModal`** (`set-state-in-effect`); `aria-selected` en **`AgregarProveedorUrlCompetenciaModal`**.
- **Eliminados 15 componentes huérfanos** (sin import desde rutas activas): cluster legacy Px Competencia (`CompetenciaPreciosPageClient`, `CompetenciaPreciosTabla`, `FiltrosCompetenciaPrecios`, `EditarUrlVinculoModal`), `PxListaCxPxCelda`, `SyncDuxHeaderButton`, `SyncButton`, `StockCard`, `StockPageSyncGate`, `PaginacionProductos`, `ProveedoresSubmoduleToolbar`, `PedidosSectionActions`, `SelectorSucursal`, `EditarMontoFinBalGastoMensualModal`, `RegistrarPagoFinBalGastoMensualModal`.
- **`TablaPxListas`**: quitada prop `competencias` en `FilaPxListas` (solo la usa el modal padre).
- **`RelevamientoUltimoMensaje`**: aviso no destructivo migrado de `amber-*` a **`CALLOUT_WARNING_CLASS`**.
- **`ui-classes`**: baja de exports `@deprecated` sin referencias (`TABLE_ROW_ICON_BUTTON_CLASS`, `TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS`).
- **§5.1 Px Competencia** alineado a **`TablaPxListas`** + **`FiltrosPxListas`** (sin documentar grillas borradas).

### Auditoría cerrada

No quedan usos de `bg-white`, `text-slate-*`, `bg-slate-*` ni `border-slate-*` en `src/`. No quedan `className={\`...\`}` en componentes. Estados de éxito/advertencia no deben usar paletas genéricas (`emerald-*`, `amber-*`, `blue-*`): usar `@/lib/ui-classes` y tokens de tema. Anchos de `<col>` en tablas fijas: preferir `className="w-[x%]"` en lugar de `style` salvo casos dinámicos. Las tarjetas que envuelven la tabla principal en páginas estándar usan **`card-tabla-envoltorio`** (sin **`shadow-[0_4px_12px_rgba(...)]`** duplicado). Nuevas pantallas o filtros deben seguir esta guía y el checklist de PR.

---

*Última actualización (2026-05-11): **Cheques tesorería — `@db.Date` en UI:** el API arma `fechaRecibidoIso` / `fechaAcreditacionIso` / `fechaTransferidoIso` con **`isoYmdFromPrismaDateOnly`** (`fechaArgentina.ts`); **`EditarChequeTesoreriaModal`** y la grilla muestran el mismo día que en BD. Ver §9 zona horaria y `BACKEND_GUIDELINES` §2.5c.*

*Última actualización (2026-05-11): **`TablaTesoreriaCajas`** — sin ícono **Eliminar** en la grilla; **Eliminar caja** solo desde **`EditarCajaTesoreriaModal`** (`FinanzasTesoreriaPageClient` ya no monta **`EliminarCajaTesoreriaModal`** a nivel página). Ver §1 **`/finanzas/tesoreria`**.*

*Última actualización (2026-05-11): **Acreditar cheque en cuenta** — `AcreditarChequeTesoreriaModal` lista solo cajas con **`tipo_caja = BANCO`** (`listarCajasTesoreriaTipoBancoAction`); `transferirChequeFinTesoreria` valida el mismo criterio. Ver §1 **`/finanzas/tesoreria`** (cheques).*

*Última actualización (2026-05-22): **`TablaTesoreriaCajas`** — columnas reordenadas y % de `<col>`; **ACCIONES**: **Editar monto** / **Ver cheques** (**CHEQUE**) / **Editar caja**; sin doble clic para monto en **editor**; rol **simple**: doble clic en **CHEQUE** → cheques. **`ActualizarMontoCajaTesoreriaModal`**: **MONTO** (`MontoArInput`) inicia vacío al abrir; **Guardar** deshabilitado hasta ingresar un monto distinto al persistido. Ver §1 **`/finanzas/tesoreria`**.*

*Última actualización (2026-05-21): **`CrearEntidadTesoreriaModal`** (título **Crear Entidad**) — CRUD `fin_tesoreria_entidades`; **`NuevaCajaTesoreriaModal`** orden **TIPO CAJA** → **ENTIDAD** (+) → **TITULAR** → **TIPO VALOR** → **DISPONIBILIDAD**; **`EditarCajaTesoreriaModal`**: **ENTIDAD** con **`+`**. Ver §1 **`/finanzas/tesoreria`**.*

*Última actualización (2026-05-20): **`/finanzas/tesoreria`** — catálogo **`fin_tesoreria_entidades`** (`listarEntidadesFinTesoreriaAction`); columna y filtro **ENTIDAD** (`entidadId` / `entidadNombre`); **`NuevaCajaTesoreriaModal`** / **`EditarCajaTesoreriaModal`** con **ENTIDAD** por `Select`; **`EditarCajaTesoreriaModal`**: orden **TITULAR** → **ENTIDAD** → **TIPO DE CAJA** → **TIPO DE VALOR** → **DISPONIBILIDAD**; **`ActualizarMontoCajaTesoreriaModal`**: solo lectura **ENTIDAD** y **TITULAR**; **MONTO** abre vacío. Ver §1 **`/finanzas/tesoreria`**.*

*Última actualización (2026-05-19): **`/finanzas/tesoreria`** — **TIPO CAJA** (`BANCO` \| `BILLETERA_DIGITAL` \| `CHEQUE` \| enum **`EFECTIVO`** mostrado como **CAJA LOCAL** \| **`TARJETAS_A_COBRAR`** como **TARJETAS A COBRAR**; catálogo BD `fin_tesoreria_tipo_caja`; columnas **TIPO VALOR** y **DISPONIBILIDAD**; `OPCIONES_TIPO_CAJA_TESORERIA_UI` / filtro con `etiquetaTipoCajaEnPantalla`. Ver §1 **`/finanzas/tesoreria`**.*

*Última actualización (2026-05-11): **`ChequesCajaTesoreriaModal`** — solo filtro **Tenencia** (sin **Vista**); ícono **Transferir** (antes “acreditar”) solo en **ACTUALES** con `tenencia === TIENDA` y cheque no transferido; modal **Destino Cheque** (`DestinoChequeTesoreriaModal`): ambos botones CTA **`Button`** **default**; si el cheque está **al día** (`chequePuedeAcreditarsePorFechaArgentina`) se ofrecen **Acreditar En Cuenta Propia** y **Pago Proveedor**; si está **diferido**, aviso **`CALLOUT_WARNING_CLASS`** y solo **Pago Proveedor**. **Acreditar En Cuenta Propia** → **`AcreditarChequeTesoreriaModal`** (listado solo cajas **`tipo_caja = BANCO`**, `listarCajasTesoreriaTipoBancoAction`; columna **ACCIONES**: `Button` **`size="icon"`** con **`BadgeCheck`**, **`Loader2`** al enviar; `transferirFinTesoreriaChequeAction`). **Pago Proveedor** en **Destino Cheque** abre **`ElegirProveedorPagoChequeTesoreriaModal`** (proveedores `proveedor_mercaderia`, búsqueda, **`listarProveedoresMercaderiaParaPagoChequeTesoreriaAction`**); al elegir fila → `marcarEntregaProveedorFinTesoreriaChequeAction` (`chequeId`, `proveedorId`). **Detalles De Cheques**: `AppModal` `xl` + **`max-w-[calc(48rem*1.3)]`**; `colgroup` cinco/seis columnas (**TRANSFERIDOS**) o siete/ocho (**ACTUALES**) según filtro y rol.*

*Última actualización (2026-05-20): **Sidebar Gestión Productos** — módulos **AYUDA VENDEDOR** y **ANALISIS DE PRECIOS**; eliminados **LISTA TIENDA** y **Control Aumentos** (redirect a Control Stock).*

*Última actualización (2026-05-28): **Control de Aumentos eliminado por completo** — se borran página `/tienda/aumentos`, redirects en `next.config.ts`, servicio `controlAumentos.service.ts`, componentes `TablaAumentos` / `AumentosPageWithActions` / `ExportarAumentosButton`, interfaces (`ItemAumento`, `GrupoAumento`, `ControlAumentosData`), CSS exclusivo (`--altura-paneles-aumentos`, `.paneles-aumentos`) y comentarios JSDoc residuales. Se reimplementará más adelante; datos históricos preservados.*

*Última actualización (2026-05-28): **Vinculación tienda ↔ proveedor 100 % manual** — `prod_precios_tienda.cod_ext` pasa a nullable (migración `20260528130000_prod_precios_tienda_cod_ext_nullable`); el sync DUX deja de escribir `cod_ext` y `proveedor`; se elimina la vinculación automática `vincularProveedoresPorCodExt` y el fallback legacy por `cod_ext` en Pedido Reposición / Generar Pedido / Sobre Stock. Filtro **PROV. VINC.** del listado **Vinc. Con Prov.** pasa a usar `idProveedor` (CUID) sobre `listaPreciosProveedores`. Datos legacy (`cod_ext`, `proveedor`) preservados como snapshot histórico. Ver `BACKEND_GUIDELINES` §1.4.2.*

*Última actualización (2026-05-28): **Renombre columna costo Cx** — FK de costo en `prod_precios_tienda`: `cx_px_cx_cod_ext` (Prisma `cxPxCxCodExt`; payload `getVinculos`: `cxPxCxCodExt`). Migración `20260528160000_prod_precios_tienda_cx_px_cx_cod_ext`.*

*Última actualización (2026-05-28): **Drop tabla `prod_precios_tienda_marcacion`** — eliminada del esquema y BD (`20260528270000_drop_prod_precios_tienda_marcacion`); sin persistencia de DET PRECIO / px manual / marcación hasta reimplementar.*

*Última actualización (2026-05-28): **Renombre columna PX LISTA** — FK competidor en `prod_precios_tienda`: `cx_px_px_comp_ref` (Prisma `cxPxPxCompRef`; `ItemCxPxTiendaParaTabla.cxPxPxCompRef`). Migración `20260528170000_prod_precios_tienda_cx_px_px_comp_ref`.*

*Última actualización (2026-05-28): **Modal Vínculos Con Proveedores — nuevas columnas** — `VincularModal` rediseña la tabla a 6 columnas (5/15/45/15/10/10% con editor; 5/15/55/15/10% sin editor): **BASE** (checkbox de fila, único, tildado = `cx_px_cx_cod_ext`), **PROVEEDOR** (prefijo), **DESCRIPCION** (`descripcion_proveedor`), **PRECIO** (`px_compra_final_sin_iva`), **VARIACION** (dinámica vs. fila tildada: ↑/↓ + % o `—` si sin base) y **DESVINC.** (`Trash2`, solo editor). Click en BASE persiste vía `establecerCostoListaTiendaAction(codTienda, codExt | null)`; la action acepta `null` para destildar (= Cx. Prom., usa `limpiarCodExtCostoLista`). Se eliminan los componentes `DifCosto` y `esOficial` (la base ahora se marca explícita).*

*Última actualización (2026-05-20): **Vinculacion Con Prov.** — se eliminan columna **TILDE** (selección masiva) y acción **Exportar Prov. Menor Costo** (Excel Act. Proveedor / Act. Margen).*

*Última actualización (2026-05-27): **Vinc. Con Prov.** — solo **editor** (`PERMISOS.tienda.acceso`); módulo **ANALISIS DE PRECIOS** en sidebar.*

*Última actualización (2026-06-24): **`/finanzas/posicion-iva`** — **`ConfigurarIvaComparacionPedidosControl`**: modal **Conf. IVA Saldo para Comparacion Costo** con una sola fila **POSICION IVA** + **`MontoArSaldoEnteroInput`** (máscara `$` / miles `.` / enteros; tecla **`-`** para signo). Solo **editor**.*

*Última actualización (2026-06-24): **Sidebar — SINCRONIZAR** — botón unificado; **simple** sync productos al click; **editor** modal **Productos**/**Compras**; durante sync el slot muestra **SINCRONIZANDO…** + progreso y ETA (`formatSyncEta.ts`).*

*Última actualización (2026-06-24): **Flujo De Fondo** (`/finanzas/venc-por-fecha`) — eliminada columna **VTOS ACUMULADOS**; nueva fórmula **SALDO**/**CAJA** en **`calcularFilasFlujoDeFondo`** (ver `BACKEND_GUIDELINES` §2.5a).*

*Última actualización (2026-06-24): **`CrearFinBalVtasModal`** — carga masiva por periodo: **MES/AÑO** + una fila por sucursal (`MontoArInput`); precarga existentes; **`guardarFinBalVtasCargaPeriodoAction`** (upsert, mínimo un monto).*

*Última actualización (2026-06-24): **`MontoArSaldoEnteroInput`** (`@/components/shared/MontoArSaldoEnteroInput.tsx`) — variante de **`MontoArInput`** para saldos enteros con signo (p. ej. posición IVA). Helpers en **`montoArMask`**: `montoArPesosEnterosSignedToDisplay`, `montoArSaldoEnteroPartsToPesos`.*

*Última actualización (2026-05-27): **`/finanzas/posicion-iva`** — import solo **TXT alícuotas** (62 caracteres). Modal **Importar IVA Débito (Alícuotas)**; IVA de columna **IVA DÉBITO** = valor del archivo (sin fórmula 21 %).*

*Última actualización (2026-05-27): **Control Stock** — botón **Check** en **STOCK** (confirmar sin variación); columna **ÚLT. CONTROL**; export Excel solo con variación; persistencia de control con variación o confirmación al exportar. Ver §1 **Stock — Acciones del encabezado**.*

*Última actualización (2026-05-27): **Control Stock — export Excel** — solo ítems con **variación** de stock; incluye ajustes de **todas las páginas** visitadas en la sesión, no solo la página visible. Ver §1 **Stock — Acciones del encabezado**.*

*Última actualización (2026-05-27): **`/finanzas/tesoreria`** — caja **CHEQUE**: columna **ÚLT. ACTUALIZACIÓN** se refresca al registrar un cheque, acreditarlo en cuenta o registrar pago a proveedor (backend `touchUltActualizacionCajaTesoreria`). Ver §1 **`/finanzas/tesoreria`**.*

*Última actualización (2026-05-26): **`ChequesCajaTesoreriaModal`** — **TRANSFERIDOS**: orden por **`fecha_acreditacion`** descendente (más reciente primero; alineado a `listarChequesPorCajaId`). Ver §1 **`/finanzas/tesoreria`** (cheques).*

*Última actualización (2026-05-26): **`ChequesCajaTesoreriaModal`** — filtro **TRANSFERIDOS**: `<colgroup>` **10%** / **25%** / **10%** / **25%** / **20%** / **10%** (RECIBIDO / EMISOR / TRANSFERENCIA / TENEDOR / MONTO / ACCIONES editor); lectura **10%** / **28%** / **10%** / **28%** / **24%**. Ver §1 **`/finanzas/tesoreria`** (cheques).*

*Última actualización (2026-05-16): **`ChequesCajaTesoreriaModal`** — **ACTUALES**: tabla **RECIBIDO** … **DÍAS**, **ACCIONES** (**Transferir** / **Editar** / **Borrar**), orden **DÍAS** ↑; **TRANSFERIDOS**: **RECIBIDO**, **EMISOR**, **TRANSFERENCIA**, **TENEDOR** (`cajaDestinoEtiqueta` / `proveedorNombre` / `tenencia`), **MONTO**, **ACCIONES** (**Editar**/**Borrar**), orden **`fecha_acreditacion`** ↓; **`AltaChequeTesoreriaModal`**: **Registrar Cheque**; **FECHA RECIBIDO** / **FECHA ACREDITACIÓN**: ícono **`CalendarDays`** (botón **`ghost`** a la derecha) o doble clic → `showPicker` en `input type="date"` oculto; sin **Entrega Proveedor**. **`EditarChequeTesoreriaModal`**: **FECHA RECIBIDO** → `fecha_recibido`; **FECHA ACREDITACIÓN** → `fecha_acreditacion` (`actualizarFinTesoreriaChequeAction`).*
*Última actualización (2026-05-11): **Pago proveedor — fecha transferencia** — **`ElegirProveedorPagoChequeTesoreriaModal`**: **FECHA TRANSFERENCIA** (`type="date"` + **`CalendarDays`**) antes de **Buscar**; default hoy AR; **`marcarEntregaProveedorFinTesoreriaChequeAction`** envía `fechaTransferencia`. Ver §1 **`/finanzas/tesoreria`** (cheques).*

*Última actualización (2026-05-23): **`ElegirProveedorPagoChequeTesoreriaModal`** (título **Proveedores De Mercadería**) — tabla **PROVEEDOR** (solo `nombre`) + **ACCIONES** (`Button` **`size="icon"`** **`variant="ghost"`** + **`TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS`**, ícono **`Check`** / **`Loader2`** al enviar); sin columna **PREF.**; búsqueda sigue matcheando `prefijo` en filtro. Ver §1 **`/finanzas/tesoreria`** (cheques).*

*Última actualización (2026-05-18): **Pago proveedor cheque** — **`ElegirProveedorPagoChequeTesoreriaModal`** tras **Pago Proveedor** en **`DestinoChequeTesoreriaModal`**; **`marcarEntregaProveedorFinTesoreriaChequeAction`** con `proveedorId`; columna **`proveedor_id`** en `fin_tesoreria_cheques`.*

*Última actualización (2026-05-13): **`ChequesCajaTesoreriaModal`** — listado unificado por **Tenencia** (sin filtro **Vista** ni columnas **ENTREGA.** / **DESTINO.**); ver §1 **`/finanzas/tesoreria`**.*

*Última actualización (2026-04-21): componente `ModalMicroLabel` (CVA `modalMicroLabelVariants`, variantes `align`); refactor en `PedidoHistoriaDetalleModal`; patrón Design System en §3.1 y fila en §2; Guía para IA punto 7.*

*Última actualización: alta de `ToolbarActionButton` (CVA `density` + pass-through de `variant`/`size` de shadcn, manejo accesible de `loading` con `aria-busy` y `Loader2`); baja de `src/lib/actionButtons.ts` (código muerto con template literals). Checklist PR §4 y catálogo §3.1 alineados.*

*Última actualización (2026-04-21): catálogo hoja `fin_bal_cat_gasto` (sin proveedor en la fila de catálogo); detalle en columna **GASTO FINAL** (`fin_bal_gasto_final`: proveedor + sucursal + mensual). Ver `BACKEND_GUIDELINES` §2.5e.*

*Última actualización (2026-04-21): `/finanzas/balance/gastos/catalogo` — columna **GASTO FINAL** (`fin_bal_gasto_final`): proveedor + sucursal + mensual; `listarFinBalGastosJerarquia()` expone `asignacionesFinales`. Modales `CrearEditarFinBalGastoFinalModal` / `EliminarFinBalGastoFinalModal` + actions `*FinBalGastoFinal*`; página carga `listarSucursalesParaGastos()` (`global_sucursales` con `centro_costo` y `genera_balance`; `FinBalGastosCatalogoPageClient` fusiona la sucursal actual en **editar** si la fila legacy no está en esa lista).*

*Última actualización (2026-04-23): **GASTO FINAL** — se permiten varias filas con el mismo gasto de catálogo + proveedor + sucursal (sin índice único en BD); `CrearEditarFinBalGastoFinalModal` lista todos los proveedores del modal sin filtrar asignaciones previas. **COMENTARIOS** es opcional; si hay otra fila con la misma sucursal y proveedor, se muestra un aviso informativo. Solo se bloquea **Guardar** si el texto no vacío coincide (normalizado) con otra fila hermana; `validarComentariosParaTriplaGastoFinalRepetida` en servicio aplica la misma regla.*

*Última actualización (2026-05-08): **Gasto eventual** (`TIPO = EVENTUAL`): **DÍA DEVENGADO** y **PLAZO DE PAGO** quedan **deshabilitados** (placeholder “VACÍO”); al guardar se envían `null` y en BD deben persistir `NULL` (`fin_bal_gasto_final_campos_mensual_eventual_chk`). **MENSUAL**: ambos `Select` habilitados (día 1–28, plazo 0–30).*

*Última actualización (2026-04-30): **GASTO FINAL** muestra campo **PLAZO DE PAGO** debajo de **DÍA DEVENGADO** en `CrearEditarFinBalGastoFinalModal`. Es obligatorio y solo acepta enteros del **0 al 30**. Se persiste en `fin_bal_gasto_final.plazo_pago_dias` y se usa para calcular vencimientos (`fechaDevengo + plazoPago`).*

*Última actualización (2026-05-08): **`CrearEditarFinBalGastoFinalModal`** — si **TIPO = MENSUAL**, **DÍA DEVENGADO** y **PLAZO DE PAGO** están **habilitados** (`Select` 1..28 y 0..30). Si **TIPO = EVENTUAL**, **deshabilitados** (sin persistir día/plazo en catálogo; `null` en request y en columna).*

*Última actualización (2026-05-08): **Nuevo Gasto Final** — sin valores por defecto en alta (`TIPO`, **SUCURSAL**, **PROVEEDOR**, **IVA** y, si aplica, **DÍA** + **PLAZO** hasta selección explícita); **COMENTARIOS** opcional; **Guardar** deshabilitado hasta completar lo obligatorio.*

*Última actualización (2026-05-05): **`FinBalGastosCatalogoPageClient`** (columna **GASTO FINAL**) ordena etiquetas en la tarjeta de detalle como **TIPO**, **SUCURSAL**, **PROVEEDOR**, **DIA DEVENGADO**, **PLAZO DE PAGO**; las etiquetas se renderizan en **negrita** y en color **`text-foreground`** (negro del tema).*

*Última actualización (2026-05-05): **`/finanzas/balance/gastos`** — acciones en header: **GASTO FIJO** (ícono **+**, carga imputaciones del mes) y **GASTO EVENTUAL** (ícono **+**, abre modal eventual). Antes: “Cargar Mes” / “Gasto Único”; luego **CARGAR GASTOS FIJOS** / **CARGAR GASTO EVENTUAL**. En el modal de carga eventual, el título es **Gasto Eventual** (lista) / **Cargar Gasto Eventual** (formulario).*

*Última actualización (2026-05-04): **Pedido Tintométrico → Recepción**: al generar pedido, el snapshot de historial debe conservar `cod_tienda` real del ítem tintométrico (resuelto desde `cod_ext` tintométrico) para que en recepción se muestre la descripción de `prod_precios_tienda` y no caiga en genéricos como “PRODUCTO VARIOS”.*

*Última actualización (2026-05-05): en `GastoUnicoBalanceModal` (carga eventual), el formulario incluye **MONTO**, **PAGADO** (ícono tilde dentro del input, `Button` `variant="primaryIcon"` `size="icon"`, copia **MONTO** a **PAGADO**), **FECHA DE GASTO** (obligatoria y acotada al período `mes/anio`) y **PLAZO DE PAGO** (`Select` 0..30). Si `PAGADO === MONTO`, **PLAZO DE PAGO** se bloquea y deja de ser obligatorio.*

*Última actualización (2026-05-05): filtros globales — `FilterBar` incorpora `FiltroIndividualContainer` para limpieza individual por filtro activo (tacho al margen derecho del filtro) y `LimpiarFiltrosButton` se posiciona en el margen derecho inferior del recuadro para limpieza global.*

*Última actualización (2026-05-05): **Modales con filtros** — sin `LimpiarFiltrosButton`; solo `FiltroIndividualContainer` por control (o `FiltroBusquedaInput` con X). Aplica a modales de selección/listado y a `GastoUnicoBalanceModal` (SUCURSAL / RUBRO).*

*Última actualización (2026-05-05): `filtro-individual-clear-btn` se limita por tamaño del contenedor (no puede ser más grande que el filtro). Regla global en `globals.css` y alcance explícito para Gestión de Productos, Finanzas y futuras pantallas de Estadísticas.*

*Última actualización (2026-05-05): `FiltroIndividualContainer` usa `Button` con `variant="primaryIcon"` y `size="icon-lg"` para igualar estilo visual de `LimpiarFiltrosButton` (mismo lenguaje de color/sombra), manteniendo el límite de tamaño por contenedor.*

*Última actualización (2026-05-05): `FILTER_COUNT_CLASS` agrega `filtro-count-label` para evitar superposición con `LimpiarFiltrosButton` global (reserva de margen derecho + truncado en una línea, sin comportamiento responsive).*

*Última actualización (2026-05-05): `filtro-individual-clear-btn` aumenta inset visual (padding respecto del borde del filtro) para que el botón no llegue a los contornos del contenedor.*
*Última actualización (2026-05-05): `filtro-individual-clear-btn` se posiciona con `top/bottom` internos y `height:auto` forzado para evitar que herede la altura completa del contenedor.*

*Última actualización (2026-05-05): **Botones solo ícono en celdas de tabla** — prohibido `variant="outline"` + `size="icon-xs"` (apariencia neutra `bg-background` / `hover:bg-accent`). Obligatorio fondo **`#0072BB`** e ícono (o +/−) blanco vía `TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS` + `variant="ghost"` + `size="icon"`; migrado en tablas y modales de grilla afectados.*

*Última actualización (2026-05-05): **Botones de acción en fila** — `TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS` (`aspect-square`, alto = alto útil del wrapper); `TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS` con `p-1.5`; `.celda-datos--accion-relleno-fila` cuando la celda es solo acción; `Button` fusiona `className` con `cn(buttonVariants({ variant, size }), className)`.*

*Última actualización (2026-05-05): **`tabla-row-btn-filled-brand`** — padding **`0.5rem`** simétrico en **`globals.css`** (anula **`main button`** `padding: 0 1rem`); clase incluida en **`TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS`**.*

*Última actualización (2026-05-21): **Alto de fila unificado** — **`--tabla-body-row-min-height: 2rem`**; botones **`tabla-row-btn-filled-brand`** con tamaño **`calc(2rem - 0.75rem)`** para no estirar filas (`size-9` del Button); **Precios Competencia** alineado al patrón **`TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS`**.*

*Última actualización (2026-05-27): **`/gestion-productos/proveedores/lista-precios`** — la grilla elimina columnas **MARCA** y **RUBRO** (se mantienen en barra de filtros), agrega columna **ACCIONES** con botón ícono **Editar** por fila (`TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS`) y abre modal en modo individual usando el mismo componente de **Edición Masiva**.*

*Última actualización (2026-05-27): **`ListaPreciosTablaConFiltros`** — vista principal: **COD. EXT.**, **PROV.** (solo sin filtro proveedor), **DESCRIPCION** (tienda + proveedor + marca/rubro), **PX. LISTA PROV.**, **PX. FINAL**, **ACCIONES** (chevron detalle + editar + vincular REX si editor). Subfila con **DESC. PROV./MARCA/RUBRO/CANT./FINAN.** y **CX. TRANSP.** reutiliza clases `tabla-fila-detalle-competencia-*`; vacíos numéricos muestran **—**.*

*Última actualización (2026-06-13): **Lista precios — modal Editar producto** — **PX. LISTA PROVEEDOR** con **`MontoArInput`** (`$`, miles `.`, decimales `,`); descuentos y **CX. TRANSPORTE** con **`PorcentajeCentInput`** + sufijo **`%`**; todos los campos numéricos admiten **0**; al **enfocar**, el **primer dígito** reemplaza el valor previo y los siguientes desplazan (máscara POS).*

*Última actualización (2026-05-27): **Porcentajes lista precios** — en **`EdicionMasivaListaPreciosModal`**, descuentos y **CX. TRANSPORTE** usan **`PorcentajeCentInput`** + `@/lib/porcentajeCentMask` (máscara POS; válido **≥ 0** y **&lt; 100**). Tabla/subfila: `fmtPorcentajeTabla`. Backend: `porcentajeListaPreciosSchema`.*

*Última actualización (2026-05-28): **Px Competencia — limpieza DET PRECIO / export Excel** — se quitan DET PRECIO, PX LISTA, MARCACION editables, `ExportarPxButton`, `exportarPxDiffAction` y filtros `detPrecio` / `ordenMarcacion`. Grilla reducida a comparación competidores (PX PROMEDIO, DIF TIENDA). Reimplementación pendiente.*

*Última actualización (2026-06-02): **PDF aumentos** — cálculo por **costo compra**: viejo = `prod_precios_tienda.costo_compra`, nuevo = `prod_precios_provee.px_compra_final_sin_iva` vía `costo_compra_cod_ext`; fórmula `((nuevo/viejo)−1)×100`. Layout: **RESUMEN** / **DETALLE** (salto de página), tabla con encabezados centrados. **`ExportarResumenAumentosButton`** en Cx Compra; **`ExportarCxButton`**: solo Excel.*

*Última actualización (2026-05-28): **`Cx & Px Tienda`** — **`ExportarPxButton`**: mismo criterio que **Exportar Cx** para precios de venta — `px_lista_tienda` (DUX) vs **PX LISTA** (competidor / **PX. PROM.**); Excel **CODIGO** + **PORC UTILIDAD** (marcación) solo diferencias.*

*Última actualización (2026-05-27): **`Cx & Px Tienda`** — **`ExportarCxButton`**: control de costos = **CX PROD.** en grilla (proveedor o promedio **CX. PROM.**) vs `costo_compra` DUX; Excel solo diferencias.*

*Última actualización (2026-05-27): **`EdicionMasivaListaPreciosModal`** — formulario en grilla **etiqueta derecha / control izquierda** (`grid-cols-[1.35fr_minmax(0,1fr)]`); separadores horizontales suaves **`border-primary/30`** entre bloques: **MARCA/RUBRO** → descuentos → **CX. TRANSPORTE** → **COTIZACIÓN DÓLAR** (modo fila: **PX. LISTA PROVEEDOR** arriba con divisor previo).*

*Última actualización (2026-05-27): **`/gestion-productos/pedidos/generar-pedido`** — en el filtro desplegable **TIPO DE PEDIDO** se elimina el checkbox cuadrado por opción; cada opción se selecciona al hacer click en toda la fila y marca estado con ícono **Check** (tilde) a la derecha.*

*Última actualización (2026-05-27): **Filtros desplegables (regla global de UX)** — en `FilterBar` y filtros equivalentes, la máscara/placeholder del filtro (**PROVEEDOR**, **MARCA**, **RUBRO**, **SUCURSAL**, etc.) no debe repetirse como `SelectItem` dentro de la lista desplegable. El estado “sin filtro” se representa con `value` vacío (`undefined` en `Select`) y limpieza mediante `onLimpiar`/`LimpiarFiltrosButton`.*

*Última actualización (2026-05-05): **`TABLE_ROW_*`** — botón **`aspect-square`** (ancho = alto útil); **`TABLE_ROW_CELL_*`** incluye **`p-1.5`**; **`tbody td button`** fijo **1.75rem** excluye **`.tabla-row-btn-filled-brand`**.*

*Última actualización (2026-05-06): **`/finanzas/balance/gastos/catalogo`** — se retira la columna fija **PROVEEDORES** del layout Finder; la gestión pasa a botón de header **PROVEEDORES** que abre modal dedicado (lista + filtro por nombre + botón **Agregar Proveedor** para editor).*

*Última actualización (2026-05-06): **`GASTO FINAL`** (catálogo gastos) — tarjetas muestran **NOMBRE DE GASTO** + separador y orden fijo de datos (`SUCURSAL`, `PROVEEDOR`, `DIA DEVENGADO`, `PLAZO PAGO`, `IVA CRÉDITO`, `TIPO`); acciones **Editar/Eliminar** en overlay centrado al hover con botones ícono compactos.*

*Última actualización (2026-05-06): modal **PROVEEDORES** en `/finanzas/balance/gastos/catalogo` — la acción por fila usa botón ícono **Editar** (Pencil) con formato de botón de acción compacto, en lugar de texto.*

*Última actualización (2026-05-06): `/finanzas/balance/gastos/catalogo` agrega 5ta columna **INDICADOR** dividida en `SUCURSALES` y `PROVEEDORES`; para el gasto seleccionado, `SUCURSALES` usa la misma fuente del modal de gasto final (`listarSucursalesParaGastos`, `centro_costo = true`) y marca con tilde las que tienen asignación activa; `PROVEEDORES` lista proveedores activos del gasto seleccionado.*

*Última actualización (2026-05-06): columna **INDICADOR** (`/finanzas/balance/gastos/catalogo`) — headers `SUCURSALES`/`PROVEEDORES` centrados sobre fondo `bg-muted/60`; en `SUCURSALES` el tilde queda alineado a la izquierda de cada fila y `CORPORATIVO` se ordena al final del listado cuando existe en `global_sucursales`.*

*Última actualización (2026-05-06): `/finanzas/balance/gastos` unifica modales **Editar Monto** + **Registrar Pago** en un único modal **Registrar Monto y Pago** (dos inputs); `PAGADO` se habilita solo cuando `MONTO` tiene dato y conserva botón de pago total (tilde) dentro del input.*

*Última actualización (2026-05-06): **`BalanceMensualGastoHistoricoModal`** — bajo cada barra: variación **% entera** vs. mes anterior con **`ArrowUp`** / **`ArrowDown`** (0% sin flecha; **—** sin base comparable).*

*Última actualización (2026-05-07): `/finanzas/balance/mensual` — el botón **Histórico** (`BarChart2`) del cuadro principal deja de estar en placeholder y abre `BalanceMensualGastoHistoricoModal` (mismo gráfico “Evolución Mensual Del Gasto”). En filas **Costos Variables** / **Costos Fijos** resuelve el `gastoFinalId` con mayor impacto de la celda (global o sucursal) para abrir la serie mensual.*

*Última actualización (2026-05-06): **`/finanzas/balance/vtas`** — filtros unificados (`FilterBar`, `FilaFiltrosDesplegables`, `FiltroIndividualContainer`, opciones **MES**/**AÑO**/**SUCURSAL** en MAYÚSCULAS); alta en **`CrearFinBalVtasModal**.*

*Última actualización (2026-05-07): `/finanzas/balance/gastos/catalogo` — en **INDICADOR → SUCURSALES**, la segunda columna (nombre de sucursal) queda alineada a la izquierda (`text-left`), manteniendo la primera columna para tildes.*

*Última actualización (2026-05-07): `/finanzas/balance/mensual` — se compacta la subcolumna de acciones por celda de `30%` a `25%` (`grid-cols-[25%_75%]`) para reducir la separación visual entre botones cuando hay dos acciones.*

*Última actualización (2026-05-07): **Catálogo Gastos — Gasto Final** — el control persistido como `fin_bal_gasto_final.iva` se etiqueta en modal **GENERA IVA CRÉDITO** y se muestra debajo de **PLAZO DE PAGO**.*

*Última actualización (2026-05-08): **Catálogo Gastos — Gasto Final** (columna, tarjeta `FilaCatalogo`) — línea **IVA CRÉDITO:** con texto **`SIEMPRE` / `NUNCA` / `PREGUNTA`** (mismo enum que el modal), ubicada entre **PLAZO PAGO** y **TIPO**.*

*Última actualización (2026-05-07): **Auditoría refactor (utilidades + shadcn)** — `px-8`/`px-6` sin triplicar `px-*`; `DialogHeader`/`DialogFooter` con una sola regla por eje; grillas sin `grid-cols-1` + `grid-cols-*` duplicados; `AppModal` `size` sin `max-w-*` redundante; `ModalMicroLabel` en `CrearEditarFinBalGastoFinalModal`; `TableEmptyState` en catálogo gastos; `PedidoHistoriaDetalleModal` y modales instructivos alineados a §2 y §5.*

*Última actualización (2026-05-07): **Auditoría Finanzas — nuevas pantallas**. Alta de `CALLOUT_WARNING_CLASS` (`@/lib/ui-classes`) y de la clase global `.area-page-shell` (`globals.css`) como SSOT del cascarón de página de área (Finanzas, Estadísticas). Migrados a `CALLOUT_WARNING_CLASS`/`TEXT_WARNING_CLASS` los avisos amber-* en `FinanzasBalanceMensualPageClient` y `TablaTesoreriaCajas`. `<col style={{ width }}>` con valores estáticos en `TablaFlujoDeFondo` migrado a `<col className="w-[x%]">`. Eliminadas utilidades Tailwind duplicadas (`px-2 px-3`, `min-w-[a] min-w-[b]`). Reglas reforzadas en Guía para IA §2 y catálogo §2; checklist de PR en §4 ya cubre los casos.*

*Última actualización (2026-05-05): en `TablaGastos` (Balance · Gastos), columna **ACCIONES**: **Registrar Pago** → **Editar** → **Eliminar** con botones cuadrados `TABLE_ROW_*`; **Evolución mensual** (`BarChart2`) pasa a columna propia **HISTORIAL** al extremo derecho con formato de bloque secundario (`tabla-bloque-secundario-*`).*

*Última actualización (2026-05-05): `RegistrarPagoFinBalGastoMensualModal` usa el patrón de `GastoUnicoBalanceModal` para **PAGADO**: botón ícono dentro del input (check) para completar **pago total**; la persistencia se confirma con **Guardar**.*

*Última actualización (2026-05-05): en `CrearEditarFinBalGastoFinalModal` (`Nuevo/Editar Gasto Final`), **PLAZO DE PAGO = 0** debe verse explícitamente en el trigger del `Select` (valor numérico válido), sin tratarse como vacío.*

*Última actualización (2026-05-05): en `GastoUnicoBalanceModal` (formulario de carga eventual), el control de pago total en **PAGADO** es solo ícono (tilde) dentro del input, con `variant="primaryIcon"` según patrón documentado de botones ícono primarios.*

*Última actualización (2026-04-23): **`/finanzas/balance/gastos`** — filtros alineados al patrón global (`FilaFiltrosDesplegables` ×2, contador + limpiar en fila 2); **Mes** = 12 meses; **Año** = 2026…2046; entrada sin query **`redirect`** a mes/año **hoy AR**; rubro/gasto/sucursal/proveedor/pagado; acciones y modales de monto; ver `BACKEND_GUIDELINES` §2.5e.*

*Última actualización (2026-05-11): **Balance mensual** — histórico desde la **grilla**: serie del **total de la fila** por columna (**`listarSerieHistorialFilaBalanceMensualAction`**); desglose por rubro al clic en barra solo si el historial se abrió desde **Costos Variables** o **Costos Fijos**; desde detalle de líneas/rubros sigue el histórico por **gasto final**.*

*Última actualización (2026-05-24): **Balance mensual — modales de detalle (auditoría cerrada)**: constantes **Hist.** centralizadas en **`ui-classes`**; columna **Hist.** condicionada a **`gastoFinalId`** / **`historialRubroDisponible`**; stack historial ↔ detalle por rubro desde barra CV/CF; solo **Volver** en footer; tooltip rubro = gasto de mayor impacto; **`ProcesoInstructivoCarrusel`** / **`ProcesosPageClient`** alineados a ESLint `set-state-in-effect`.*

*Última actualización (2026-05-24): **Balance mensual — modales de detalle**: columna **Hist.** solo muestra botón si hay **`gastoFinalId`** válido (misma regla en modal de líneas que en gastos por rubro); **`BalanceMensualGastoHistoricoModal`** resetea serie vacía con **`queueMicrotask`** (ESLint `react-hooks/set-state-in-effect`).*

*Última actualización (2026-05-11): **Balance mensual** — filas **Costos Variables** / **Costos Fijos** en la grilla; **`/finanzas/balance/vtas`**: nombre de módulo **Ventas Mensuales** (sidebar + subtítulo de página).*

*Última actualización (2026-05-10): **Balance mensual** — **Evolución mensual del gasto**: desglose por rubro solo al hacer **clic en una barra** del gráfico; eliminado acceso directo con ícono panel; acción **`cargarFilasBalanceMensualPeriodoAction`** para el periodo elegido.*

*Última actualización (2026-05-10): **Balance mensual** — fila **Ventas** solo lectura; cargar/editar montos solo en **`/finanzas/balance/vtas`** (`CrearFinBalVtasModal` / `FinBalVtasPageClient`); eliminado **`EditarVentasBalanceMensualModal`**. Ver § Balance mensual bajo `ClassicFilteredTableLayout` y `BACKEND_GUIDELINES` §2.5f.*

*Última actualización (2026-04-24): **Balance mensual** — tabla única alineada, cabecera `#0072BB`, filas resultado `#a9d6f1` / `#063652`; excepción de color en “Guía para IA” §2; detalle bajo **`ClassicFilteredTableLayout`**; backend **`BACKEND_GUIDELINES` §2.5f**.*

*Última actualización (2026-04-24): **`card-tabla-envoltorio`** — token de sombra **`--card-tabla-envoltorio-shadow`**; Guía para IA §2; catálogo §2; checklist PR §4; auditoría cerrada; columnas documentadas de **`/pedidos/enviar`** alineadas al código (incluye **PROVEEDOR**).*

*Última actualización (2026-04-28): **Generar Pedido** (`/pedidos/enviar` / `/gestion-productos/pedidos/generar-pedido`) — tabla previa desde **`prod_ped_merc`** (`getItemsTablaEnviarPedido`); ver `BACKEND_GUIDELINES` §`prod_ped_merc`.*

*Última actualización (2026-05-20): **Vinculacion Con Prov.** — **`FiltrosTienda`**: orden **MARCA** → **RUBRO** → **SUB-RUBRO** → **PROV. VINC.** → **VINCULADO** (antes **PROVEEDORES** en primer lugar).*

*Última actualización (2026-05-11): **Vinculacion Con Prov.** — título/sidebar; grilla **TILDE** / **COD. TIENDA** / **DESCRIPCIÓN** / **VINCULACIÓN**; filtro URL **`vinculado=no|si`** (**VINCULADO** en `FiltrosTienda`, reemplaza **COSTO** / `mejorPrecio`).*

*Última actualización (2026-04-27): **Comp. Proveedores** — encabezados de export Excel ajustados: **Act. Proveedor** usa `CODIGO` (antes `CODIGO TIENDA`), y **Act. Margen** usa `CODIGO` + `PORC UTILIDAD` (antes `CODIGO TIENDA` + `MARGEN`).*

*Última actualización (2026-05-20): **`VincularModal`** — columnas **PREFIJO**, **PX. FINAL**, **VARIAC.** + ícono **Trash2** (desvincular); sin **MARGEN** (§ Tienda — Modal Vínculos).*

*Última actualización (2026-05-26): **`SeleccionarProductoModal`** — filas cuyo `prod_precios_provee.cod_tienda` apunta a otro ítem se muestran **bloqueadas** (`opacity-60`, `cursor-not-allowed`, ícono `Lock`); doble clic abre sub-modal **Producto Ya Vinculado** con `cod_tienda` y descripción del ítem destino. `listarProductosProveedoresParaVincular` incluye `tiendaVinculada` (`{ codTienda, descripcion }`).*

*Última actualización (2026-05-28): **Producto TiendaColor** — nueva columna `prod_precios_tienda.es_producto_propio` (migración `20260528120000_add_es_producto_propio_tienda`). **`VincularModal`** suma a la izquierda de **Vincular Nuevo Producto** un botón toggle **Producto TiendaColor** (ícono `Tag`; siempre `variant="default"` con `aria-pressed={esPropio}` — mismo estilo azul que el resto de CTAs del modal) que llama `setProductoPropioTiendaAction`. Si el ítem ya tiene vínculos vigentes, el servicio rechaza con error legible (no desvincula automáticamente). Mientras `esPropio = true`: el botón Vincular Nuevo Producto se oculta y el cuerpo del modal muestra un aviso centrado con ícono Tag + descripción ("este ítem está marcado como producto propio…"). **`TablaTienda`** (columna VINCULACIÓN) muestra `Badge` **PROPIO** (`variant="secondary"`, `font-semibold tracking-wide`) cuando `item.esProductoPropio = true`, reemplazando el contador. Filtro **VINCULADO = NO** (`getTiendaPageData`) excluye los productos propios.*

*Última actualización (2026-04-21): **Proveedores** — `ProveedorForm`: prefijo **opcional** (sin `required` HTML); **PROVEEDOR MERCADERÍA** sigue siendo SI/NO obligatorio vía Zod. **Filtros Tienda** (`FiltrosTienda.tsx`): opciones de proveedor con `key={p.id}`; si no hay prefijo, solo se muestra el nombre (sin corchetes vacíos). **Calc. Tintométrico** (`TiendaCalcTintometricoPageClient.tsx`): valor del `Select` = `id` del proveedor (no prefijo); etiqueta `[prefijo]` o `[codigoUnico]` si falta prefijo. **Vincular / Seleccionar producto** (`VincularModal` + `SeleccionarProductoModal`): exclusión de duplicados por **`idsProveedoresYaVinculados`** (`proveedorId`), no por prefijo.*

*Última actualización (2026-05-05): **Frontend desktop-only** — se elimina el uso de variantes responsive/mobile en `src/` (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`, `max-*`), dejando clases base únicas para escritorio.*

---

## 5.1 Módulo Px Listas (precios multi-lista DUX)

- **Pantalla canónica:** `/gestion-productos/tienda/px-listas` (rewrite → `/tienda/px-listas`). Título y sidebar: **Px Listas**. Permiso: `PERMISOS.cxPxTienda.acceso` (solo editor).
- **Layout:** `area-page-shell` + `ClassicFilteredTableLayout`. **FilterBar** `filtros-contenedor-tienda bg-card` (mismo patrón que **Px Competencia** / **Cx Compra**): fila 1 `FilaFiltrosDesplegables` — **MARCA**, **RUBRO**, **SUB-RUBRO**, **ACTUALIZAR** (SI/NO: ítems con PX en staging `prod_tienda_precios_edicion` pendiente de **Act. Px**) en `FiltroIndividualContainer` + `FILTER_SELECT_WRAPPER_CLASS`, `SelectTrigger` **`input-filtro-unificado`**, `SelectContent` `select-content-filtro`; sin ítems «TODAS/TODOS» (estado vacío = `value` `undefined` + placeholder en trigger); cascada marca → limpia rubro/sub-rubro, rubro → limpia sub-rubro. Fila 2: `FilterRowSearch` `flex-1` + `FiltroBusquedaInput` + `LimpiarFiltrosButton` + `FILTER_COUNT_CLASS` (`X PRODUCTO(S)`).
- **Componentes:** `src/components/px-listas-precios/*` — `FiltrosPxListasPrecios`, `TablaPxListasPrecios`, `PxListasPreciosPageClient`, **`ActPxListasButton`** (header).
- **Exportación DUX:** botón **Act. Px.** → un Excel **por** `nombre_lista`; columnas **CODIGO** + **IMPORTE** (PX entero desde `prod_tienda_precios_edicion`); al exportar se **eliminan** las filas exportadas (cierra la act. pendiente); si no hay filas → **`ModalSinProductosExportar`**; archivo **`Act. {nombre_lista} dd-mm hh-mm.xls`**; `exportarPxListasMargenAction` + `router.refresh()` en cliente.
- **Tabla:** clase `tabla-px-listas-listado tabla-px-listas-precios` (scroll horizontal si hay muchas listas). **DESCRIPCIÓN** + por cada fila de `prod_tienda_listas_precios`: subcabecera con `nombre_lista` (MAYÚSCULAS), columnas **PX. CALC.** (entero, solo lectura) y **MARG. MAN.** (2 decimales + `%`; editable). Al blur se calcula PX y persiste en **`prod_tienda_precios_edicion`** (solo la celda/lista editada). Clase **`px-lista-input--edicion`** = negrita si hay staging (`pxEdicion`). **Resaltado** (`.celda-px-listas-actualizar`): filas/celdas con staging pendiente de **Act. Px**.
- **Clases globales:** `.tabla-px-listas-precios` — `table-layout: auto`, `width: max-content`; inputs MARGEN en `globals.css` bajo `.tabla-px-listas-precios tbody td.celda-marcacion-col`; `.celda-px-listas-actualizar` para pendientes de actualizar en DUX.

## 5.2 Módulo Px Competencia

- **Pantalla canónica:** **`TablaPxListas`** / **`PxListasPageClient`** en `/gestion-productos/tienda/cx-px-tienda` (título de página y sidebar: **Px Competencia**). **`/gestion-productos/precios-competencia`** (y legacy `/proveedores/competencia-precios`) **redirigen** aquí. **No** mantener grilla standalone legacy (`CompetenciaPreciosTabla`, `FiltrosCompetenciaPrecios`, `CompetenciaPreciosPageClient` — eliminados 2026-06-04). Componentes activos en `src/components/precios-competencia/*`: `AsociarUrlsCompetenciaModal`, `RelevamientoUltimoMensaje`, `SincronizarCompetenciaModal`, etc.
- **Permisos:** acceso/edición lista → `PERMISOS.cxPxTienda.acceso`; botones **Asociar URL** y **Relevar URLs** (columna ACCIONES, `RefreshCw`) → `PERMISOS.competenciaPrecios.editar`; relevar por ítem usa `relevarUrlsProductoCompetenciaAction` (todos los vínculos del producto, sin sync masivo).
- **Ruta histórica** (solo redirect): `/precios-competencia`. **Permiso standalone** (gestión/sync si se reexpone): `PERMISOS.competenciaPrecios.acceso`.
- **Layout:** `area-page-shell` + `ClassicFilteredTableLayout` (`title` **Px Competencia**; ancho de contenido **default** `max-w-7xl`, igual que **Px. Vta. Sugeridos** y **Lista Px Proveedores**). **FilterBar** `filtros-contenedor-tienda bg-card`: fila 1 `FilaFiltrosDesplegables` (5 selects); fila 2 `flex items-center gap-3` con búsqueda (`FilterRowSearch` `flex-1`), `LimpiarFiltrosButton` y contador `FILTER_COUNT_CLASS`. Banner de sync sin `mx-8` (ancho del bloque de filtros).
- **Componentes:** `src/components/precios-competencia/*` (no bajo `proveedores/`).
- **Tabla** (`TablaPxListas`): **DESCRIPCIÓN**, **PX PROMEDIO**, **DIF TIENDA**, **ACCIONES** (`<colgroup>` **46% + 18% + 18% + 18%**). Detalle expandido: **`PxListasDetalleCompetenciaFilas`** con estilos **`tabla-fila-detalle-competencia-*`** (fondo **`var(--gris-inset)`**, alto fijo **`--tabla-body-row-min-height`**).
- **Filtros** (`FiltrosPxListas` en `px-listas/`): **MARCA**, **RUBRO**, **PX PROMEDIO** (DIF TIENDA vs promedio; query `filtroPxPromedio`) + **`FiltroBusquedaInput`** + contador. Búsqueda vía `filtroTexto` en servicios de listado (términos parciales, igual que lista precios). Constantes UI: `@/lib/pxListasFiltros` / `@/lib/competenciaPreciosFiltros` según pantalla.
- **Vínculo manual:** botón **Asociar URLs** por fila → `AsociarUrlsCompetenciaModal` (`max-w-[54rem]`, ~50 % más ancho que `lg`): solo competidores con URL (o **Px Sugerido**); buscador + botón **+** siempre visibles cuando hay competidores registrados (buscador deshabilitado si la lista está vacía); botón **+** abre `AgregarProveedorUrlCompetenciaModal` (proveedores sin URL). Grilla: **Relevar** (`RefreshCw`, solo ese vínculo vía `relevarUrlVinculoCompetenciaAction`) + basura (quitar fila) | **Proveedor** | **Ficha de Producto** | **URL**; en la columna URL, tacho dentro del input solo vacía el campo (el competidor sigue en la lista hasta **Guardar**); al guardar sin URL se desvincula como con el tacho de fila. **Guardar** persiste cambios y bajas. `RelevamientoUltimoMensaje` bajo filas editables.
- **Contrato Px. sugerido** (`BACKEND_GUIDELINES.md` § *Contrato backend → frontend*): **`idProveedor`** en **`AltaCompetidorModal`** y **`ConfiguracionCompetidorModal`** (selector `getProveedoresMercaderia` → solo `global_proveedores` con `proveedor_mercaderia = true`; valor `Proveedor.id`; `null` = SIN PROVEEDOR). **`vinculosPorCompetencia[*].pxCompetencia` / `estado`** vienen ya resueltos del servidor (sugerido proveedor → `OK`; si no, scraping); la grilla **no** debe reimplementar esa prioridad en cliente.
- **Alta / edición competidor:** `CompetidorProveedorNombrePaginaFields` compartido por **`AltaCompetidorModal`** y **`ConfiguracionCompetidorModal`**. Orden: **PROVEEDOR** → **NOMBRE** → **PAGINA** (`web`). Con proveedor distinto de **SIN PROVEEDOR**, **NOMBRE** queda bloqueado y se rellena con `global_proveedores.nombre` (`getProveedores`). Editar además incluye `CompetenciaExtraccionReglasEditor`.
- **Acciones (editor):** **Prod. Comparar** (`Plus` + **`AgregarProductoComparacionModal`**: catálogo `prod_tienda` con `comparar_competencia = false`; selección single → `agregarProductoComparacionAction`) + **Gestionar Competidores** + **Comparar Precios Competencia** (`SincronizarCompetenciaModal` …). Columna **ACCIONES**: **Quitar de comparación** (`Trash2`, `quitarProductoComparacionAction`; conserva URLs en BD). Grilla vacía: mensaje orientando a **Prod. Comparar**.
- **Vínculo URL:** en **`AsociarUrlsCompetenciaModal`**, si el competidor tiene reglas de extracción, selector **Tipo de página** (`tipo_pagina` en vínculo) que elige qué regla aplica al relevar. Avisos de último relevamiento: **`RelevamientoUltimoMensaje`** con **`CALLOUT_WARNING_CLASS`** (no `amber-*`) para estados no destructivos.
- **Sidebar:** **ANALISIS DE PRECIOS** agrupa **`LISTA PROVEEDORES`** (desplegable: **Lista Precios**, **Lista Proveedores**; reglas descuentos en modal desde toolbar Lista Precios), **`Cx y Px Tienda`** (desplegable: **Cx Compra**, **Px Listas**), **`Comparacion`** (desplegable: **Px Competencia**, **Categorias**).

*Última actualización (2026-05-28): el submódulo **Vinculacion Con Prov.** / **Vinc. Con Prov.** pasa a llamarse **Cx Compra** en título de página y sidebar; la URL canónica sigue siendo **`/gestion-productos/tienda/comp-proveedores`**.*

*Última actualización (2026-05-28): **`ExportarCxButton`** se mueve de **Cx & Px Tienda** a **Cx Compra** (`CompProveedoresPageClient`); **Cx & Px Tienda** conserva solo **`ExportarPxButton`**.*

*Última actualización (2026-05-28): columna FK de costo en `prod_precios_tienda`: **`costo_compra_cod_ext`** (Prisma **`costoCompraCodExt`**; antes `cx_px_cx_cod_ext` / `cxPxCxCodExt`). Migración **`20260528200000_prod_precios_tienda_costo_compra_cod_ext`**.*

*Última actualización (2026-05-30): **Producto propio** restaurado en **Cx Compra** — `es_producto_propio`, **`VincularCxCompraModal`**, badge **PROPIO**, migración **`20260530120000`**.*

*Última actualización (2026-05-28): **Retiro Cx & Px Tienda** — eliminadas `px_lista_cx_px`, `cx_px_px_comp_ref` (migración **`20260528210000`**). **Cx Compra**: vínculos + **CX PROD.** + **Exportar Cx**.*

*Última actualización (2026-05-28): **Px Listas** — módulo en `/gestion-productos/tienda/cx-px-tienda` (rewrite `/tienda/cx-px`), sidebar debajo de **Cx Compra**; grilla inicial con **PX. LISTA DUX**; algoritmo de comparación con competencia pendiente de reimplementar.*

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

*Última actualización (2026-05-21): **Etiquetas de campo en modales** — regla global: color `foreground` (negro de UI), no `muted`, en `label` / `Label` / `ModalMicroLabel` / `MODAL_*_LABEL_CLASS`; `globals.css` (`--modal-field-label-color`) en `.app-modal__body`, `.modal-app__body` y `[data-slot="dialog-content"]`; migración de micro-etiquetas legacy en modales Finanzas a `ModalMicroLabel`.*

*Última actualización (2026-06-16): **PDF matriz lista precios + REX** — **`ConvertirPdfListaPreciosModal`**: proveedor obligatorio; conversión guarda en **`prod_precios_rex`** (upsert por proveedor + **`descripcionExport`**); botones **Guardar Precios** y **Descargar Excel**; preview **DESCRIPCIÓN | PX. LISTA**.*

*Última actualización (2026-06-30): **Auditoría frontend — código muerto y layout** — `.area-page-shell` unificado en proveedores/pedidos/tienda; últimos `window.location.href` → `router.push`; eliminados `SyncModal` y hooks de sync huérfanos; exports `@deprecated` sin referencias; `COMP_CATEGORIAS_PAGE_CONTENT_CLASS` sin breakpoints; ejemplo de filtros en §1 actualizado.*

*Última actualización (2026-06-16): **Lista precios — Crear Producto** — botón **`CrearProductoListaPreciosModal`** (`btn-primario-gestion`, ícono **Plus**) en toolbar (permiso **`importarLista`** + editor); modal **`max-w-3xl`**; formulario en grilla **20% etiqueta / 80% control** (**PROVEEDOR**, **MARCA** opc., **CÓD. PROVEEDOR**, **DESCRIPCIÓN PROV.**, **PX. LISTA** con **`MontoArInput`**); persiste en **`prod_precios_provee`** vía **`crearProductoListaPrecioAction`** (upsert como import CSV).*

*Última actualización (2026-06-24): **`GET /api/import-lista-precios/status`** — sin permiso de import/editor responde **200** con estado inactivo (`importProgressIdleState`), no **403** (evita ruido en logs al navegar en modo simple). **`ImportStatusIndicator`**: `pollEnabled` default **false**; sidebar pasa `rol === "editor"`. **Crear producto** en Lista Precios: solo modo **editor** (UI + `importarLista` en permisos).*

*Última actualización (2026-06-16): **Lista precios — vínculo REX (histórico 1:1)** — versión anterior bloqueaba REX ya usados en otro `cod_ext`; reemplazada por N:1 en migración `20260616150000`.*

*Última actualización (2026-06-04): **Subfilas expandibles** (`.tabla-fila-detalle-competencia`, Cx Compra, Px Competencia, Lista Px): alto fijo **`--tabla-body-row-min-height`** (2rem), igual que filas principales; eliminado override Cx Compra de 4.25rem y layout apilado con espaciadores; **CX PROD.** en subfila Cx Compra = una línea (base + variación | precio).*

*Última actualización (2026-06-04): **Auditoría frontend código muerto** — 15 componentes huérfanos eliminados; ESLint `src` sin warnings; reglas anti-código muerto ampliadas en § «Revisión anti-código muerto»; §5.1 Px Competencia actualizado.*

*Última actualización (2026-06-04): **API DUX — lotes y pausa** — § SSOT progreso: **50 ítems/lote**, **5 s** entre lotes; ver `BACKEND_GUIDELINES` §1.10c y `duxApiBatchPolicy.ts`.*

*Última actualización (2026-06-04): **Px Listas — export solo diff margen** — Excel incluye ítems solo si PORC UTILIDAD efectivo ≠ margen desde precio DUX (4 dec.).*

*Última actualización (2026-06-04): **Px Listas — export Excel por lista** — **Act. Px.** genera un `.xls` por `nombre_lista` (**CODIGO**, **PORC UTILIDAD**); archivo **`Act. {nombre_lista} dd-mm hh-mm.xls`**. Ver §5.1.*

*Última actualización (2026-06-04): **Act. Cx. — modal PDF aumentos** — Excel **`Act Cx dd-mm hh-mm.xls`**; tras exportar, modal **¿Desea exportar el informe de aumento?**; PDF vía `exportarResumenAumentosPxAction`.*

*Última actualización (2026-06-10): **Sidebar — `Cx y Px Tienda`** — agrupador colapsable en **ANALISIS DE PRECIOS** (sin `href`; hijos **Cx Compra** y **Px Listas**); patrón `SubmoduleItem` sin ruta + `children` en `Sidebar.tsx`.*

*Última actualización (2026-06-10): **Comp. Categorias — múltiples referencias competencia** — panel REFERENCIA COMPETENCIA con lista, radio activa y agregar/quitar por ítem.*

*Última actualización (2026-06-16): **Comp. Categorias — DTO. EXTRA / DIF PX REF MANUAL** — valor por defecto **0%** (`null` → 0 en máscara y grilla); inputs con **`PorcentajeEnteroMaskInput`** (máscara POS; contenedor **`.input-mascara-sufijo`** + sufijo **`.input-mascara-sufijo__pct`** en flex, fijo al hover de fila en tablas).*

*Última actualización (2026-06-16): **`/gestion-productos/proveedores/lista-precios`** — botones **Exportar Lista** / **Importar Lista**; exportación (`ExportarListaPreciosButton` + `exportarListaPreciosAction`) de **todos** los ítems filtrados (sin paginación) a Excel `.xls` (`exportListaPreciosExcelClient.ts`).*

*Última actualización (2026-06-16): **`ListaPreciosTablaConFiltros`** — filtro desplegable **VINCULADO** (opciones **SI** / **NO**) junto a **HABILITADO**; filtra por vínculo `prod_precios_provee.id_precio_rex` → `prod_precios_rex`. Participa en filtros dinámicos (proveedor/marca/rubro), exportación y mensaje vacío inicial.*

*Última actualización (2026-06-16): **`ListaPreciosTablaConFiltros`** — columna **ACCIONES** (solo editor): botón **Eliminar** (`Trash2` + `EliminarListaPrecioModal`) borra la fila en `prod_precios_provee`; confirmación destructiva con `AppModal`.*

*Última actualización (2026-06-16): **`ListaPreciosTablaConFiltros`** — columna **DESCRIPCION**: bajo el título principal (`celda-destacado`) muestra **`marca`** de `prod_precios_provee` en segunda línea con **`.celda-sublinea-tabla`** (solo si hay valor); fila mantiene alto fijo **2rem**.*

*Última actualización (2026-06-16): **`ListaPreciosTablaConFiltros`** — botón **Desc. en fila** (toggle en barra de filtros): sublínea en **`.lista-precios-sublinea-grid`** (marca + **Prov./Marca/Rubro/Cant./Finan.** con **`ArrowDown`** + **Transp.** con **`ArrowUp`**), columnas fijas centradas y separadas por **`.lista-precios-sublinea-divisor`**. Sin expansión por ítem (retirado chevron ▼/▲ en **ACCIONES** — ver 2026-06-19).*

*Última actualización (2026-06-16): **`ImportarListaPreciosModal`** — mapeo CSV opcional **MARCA** (`campoDestinoListaPreciosSchema` / `aplicarMapeoListaPrecios`); no es requerida en badges de validación.*

*Última actualización (2026-06-16): **`EdicionMasivaListaPreciosModal`** — edición masiva aplica a **todos** los productos del filtro activo (`total` en `ListaPreciosFiltrosExportSnapshot`), no solo a la página visible; el servidor resuelve ítems con `listarListaPreciosFiltradaParaExport`.*

*Última actualización (2026-06-13): **Ayuda Vendedor — Cargar Gasto** — ruta `/gestion-productos/cargar-gasto` (rewrite → `/cargar-gasto`); sidebar en **AYUDA VENDEDOR**; abre **`GastoUnicoBalanceModal`** al cargar; solo **editor** (`PERMISOS.ayudaVendedor.cargarGasto`).*

*Última actualización (2026-06-13): **Comp. Categorias — margen manual** — tabla `prod_comp_margen_manual` (`margen_manual` entero por `cod_ext`); input **DIF PX REF MANUAL** persiste margen vía `actualizarMargenManualComparacionAction`; **PX MANUAL** y **MARGEN MANUAL** calculados en cliente. Migración **`20260613150000_comp_margen_manual`** (reemplaza `prod_comp_px_manual`; valores legacy anulados).*

*Última actualización (2026-06-11): **Comp. Categorias — VAR solo entre costos** — base automática = costo más bajo; tilde manual opcional; referencia competencia solo para margen.*

*Última actualización (2026-06-11): **Comp. Categorias — columna MARGEN (SEGÚN PX REFERENCIA)** — bloque secundario con divisor; `calcMargenSegunPxReferencia` en `@/lib/calculos.ts`.*

*Última actualización (2026-06-11): **Comp. Categorias — layout 40/60** — selector `flex-[2]`, tabla `flex-[3]`, `gap-3` entre paneles (`comparacionCategoriasLayout.ts`).*

*Última actualización (2026-06-16): **Comp. Categorias — modales búsqueda unificados** — `AsignarProductosModal` y `ElegirReferenciaCompetenciaModal` comparten `MODAL_COMP_CATEGORIAS_BUSQUEDA_MAX_WIDTH_CLASS`, `MODAL_COMP_CATEGORIAS_FILTROS_STACK_CLASS`, `MODAL_COMP_CATEGORIAS_TABLA_COLUMN_WIDTHS_PCT` y clases de celda. Filtro 1: proveedor / competidor; filtro 2: búsqueda multi-término.*

*Última actualización (2026-06-16): **Comp. Categorias — modales búsqueda** — `AsignarProductosModal` y `ElegirReferenciaCompetenciaModal` comparten `MODAL_COMP_CATEGORIAS_BUSQUEDA_MAX_WIDTH_CLASS` (`!max-w-[151.2rem]`). `listarProductosProveedoresParaVincular` usa AND multi-término + `matchByMultiTerm` (proveedor, descripción, códigos, marca, rubro).*

*Última actualización (2026-06-16): **`ElegirReferenciaCompetenciaModal`** — ancho **`!max-w-[151.2rem]`** (+20 % sobre `MODAL_ASIGNAR_PRODUCTOS` / `126rem`); constante `MODAL_REFERENCIA_COMPETENCIA_MAX_WIDTH_CLASS` en `@/lib/comparacionCategoriasLayout`.*

*Última actualización (2026-06-11): **Comp. Categorias — referencia competencia** — banner + `ElegirReferenciaCompetenciaModal`; VAR con tilde manual o precio referencia (Px Competencia).*

*Última actualización (2026-06-16): **`AgregarProductoComparacionModal`** — ancho **`max-w-[105rem]`** (+25 % sobre `ModalTablaConFiltros` `84rem`); columnas CHECK 5 % / COD. TIENDA 10 % / MARCA 20 % / DESCRIPCIÓN 65 %; búsqueda multi-término por contiene (`matchByMultiTerm` en `buscarProductosTiendaParaComparacion`).*

*Última actualización (2026-06-10): **`FiltroBusquedaInput`** — limpiar con **`Trash2`** + **`primaryIcon`** / **`filtro-individual-clear-btn`** (fondo primary, ícono blanco); deja de usar botón ghost con **X**.*

*Última actualización (2026-06-10): **Px Competencia — catálogo explícito** — columna **`comparar_competencia`** en `prod_tienda`; grilla solo productos agregados; botón **Prod. Comparar** + modal **`AgregarProductoComparacionModal`**; quitar con **`Trash2`** (URLs conservadas).*

*Última actualización (2026-06-10): **Act. Cx. — tolerancia de comparación** — solo exporta ítems con `|costo_compra − px_compra_final_sin_iva| ≥ 0,01` (`costosCompraDifieren`); diffs menores a 1 centavo no generan fila (alineado al **COSTO** a 2 decimales del Excel).*

*Última actualización (2026-06-04): **Act. Cx. — export Excel** — eliminado flujo POST DUX + polling en sidebar; **`ActCxButton`** genera `.xls` (**CODIGO**, **COSTO**) vía `exportarCostoCxDiffAction`; sin progreso en `SyncStatusIndicator`.*

*Última actualización (2026-06-04): **Recepción pedidos** — eliminados flujo Excel y **Descargar Recepcion**; botón **Registrar En Dux** (POST DUX + personal + modal éxito); ver § `PedidoHistoriaDetalleModal`.*

*Última actualización (2026-06-19): **Comp. Categorias unificado** — sidebar: agrupador **Comparacion** → **Px Competencia** + **Categorias** (pantalla unificada; subtítulo **Categorias**); ruta legacy `/categorias` redirect a Comparacion. Selector (`ComparacionCategoriaSelector`): **`+`**, editar/eliminar por fila, auto-selección en cascada si un nivel tiene una sola opción.*

*Última actualización (2026-06-19): **Cotización USD lista precios** — toolbar **`CotizacionUsdListaPreciosControl`** (`listaPrecios.acciones.gestionarCotizacionUsd` + `esEditor()`); lectura para import/lista; **`ImportarListaPreciosModal`** avisa cotización vigente si **Precio en dólares** = SÍ; sin campo `cotizacion_dolar` en modales de ítem (`EdicionMasivaListaPreciosModal`). Tras guardar cotización: `router.refresh()` + `reloadNonce` en grilla. Ver BACKEND_GUIDELINES §1.8e.*

*Última actualización (2026-06-19): **Rubros en lista precios** — desplegables de **RUBRO** (filtros, edición masiva, reglas descuentos) usan nombres distintos de **`prod_tienda.rubro`** (`rubrosProdTienda.service.ts`); reglas resuelven FK en `prod_rubros_lista` al listar catálogo.*

*Última actualización (2026-06-19): **Reglas descuentos — modal en Lista Precios** — `ReglasDescuentosListaPrecioModal` en toolbar de Lista Precios (`listaPrecios.acciones.gestionarReglasDescuentos` + `esEditor()` en actions). `AppModal` `size="xl"` + `sm:max-w-[57.6rem]` (−20 % sobre `72rem`); **filtros** en `FilterBar` (`FilaFiltrosDesplegables`: **TIPO DESC.**, **PROVEEDOR**, **MARCA**, **RUBRO**; cada `Select` en `FiltroIndividualContainer`, `input-filtro-unificado`, `select-content-filtro`; patrón modal); filtrado en cliente por `campo` / `idProveedor` / `idMarca` / `idRubro`. Tabla `tabla-vinculos-modal` con `colgroup` **10/22/22/18/10/18** (PROVEEDOR prefijo · MARCA · RUBRO | CAMPO · DESC | ACC; divisores `tabla-bloque-secundario-*-divider` entre bloques; comodín = celda vacía; sin columna **ESPEC.**); columna **DESC**: porcentaje + `ArrowDown` (descuento) / `ArrowUp` (costo, p. ej. **CX. TRANSP.**); orden cliente `ordenarReglasDescuentoListaPrecio` (proveedor → marca → rubro, `localeCompare` `es`); scroll interno `max-h-[min(46.4vh,25.6rem)]`. Sin ítem sidebar **Reglas Descuentos**. CRUD anidado: `CrearEditarReglaDescuentoListaPrecioModal` / `EliminarReglaDescuentoListaPrecioModal`.*

*Última actualización (2026-06-19): **`ListaPreciosTablaConFiltros`** — retirado botón **Ver descuentos** (chevron ▼/▲) por fila en **ACCIONES**. Dos vistas globales: (1) descripción + marca en sublínea; (2) toggle **Desc. en fila** muestra descuentos inline en **DESCRIPCION**. Sin subfila expandible ni estado `expandidos` por ítem.*

*Última actualización (2026-06-19): **URLs alineadas al sidebar** — SSOT `src/lib/gestionProductosRoutes.ts` (`GP_ROUTES`, `isGpRouteActive`, `getGpSidebarModule`, `REVALIDATE_*`). Canónicas: `/gestion-productos/pedido-mercaderia/*`, `/gestion-productos/ayuda-vendedor/*`, `/gestion-productos/analisis-precios/*`. `next.config.ts`: rewrites canónica→`src/app/*` + redirects 308 desde legacy y canónicas 2026-03. Sidebar y `redirect()` usan `GP_ROUTES`.*

*Última actualización (2026-06-19): **Lista precios — columnas %** — `ListaPreciosTablaConFiltros` (`tabla-lista-precios-proveedor`): **COD. EXT.** 8%, **DESCRIPCION** 51%, **MARCA** 8%, **RUBRO** 8%, **DESC.** 2% (ícono `%` → `DescuentosAplicadosListaPreciosModal`; cada ítem con **Info** → `ReglaDescuentoItemListaPreciosModal`), **PX. FINAL** 8%, **ACCIONES** 9%. Retirados **PROV.**, **PX. LISTA PROV.** y toggle **Desc. en fila**.*

*Última actualización (2026-07-02): **Comp. Categorias — persistencia unificada** — `DTO. EXTRA` y `DIF % REF. MAN.` en tabla **`prod_comp_cat`** (`ComparacionItem`); catálogo maestro en **`prod_comp_categorias`**; migración **`20260702120000_prod_comp_item_unify_ajustes`**. UI sin cambios de contrato (`dtoExtraComparacion`, `difPxRefManualComparacion`).*

*Última actualización (2026-07-03): **Desc. específico — Reglas Descuentos** — `ReglasDescuentosListaPrecioModal` con pestañas **Por Dimensión** (reglas `prod_precios_provee_reglas`, sin cambios) y **Desc. Específico** (`ReglasDescEspecificasListaPreciosPanel`: CRUD `CrearEditarReglaDescEspecialModal` / `EliminarReglaDescEspecialModal`; agregar productos vía `ReglaDescEspecialAgregarProductosModal` + `ModalTablaConFiltros` `selectionMode="multi"`). Botón **Nueva Regla** del footer solo en pestaña dimensional; en específico el panel tiene **Nueva Regla Desc. Específico**. **`DescuentosAplicadosListaPreciosModal`**: si `descEspecial > 0`, ítem **Espec.** con **Info** → `ReglaDescuentoItemListaPreciosModal` muestra nombre de regla (`reglaEspecifica`). Sin edición de descuentos en **Editar producto**. Ver BACKEND_GUIDELINES §1.8d-b.*

---

**Para IA:** El archivo `.cursorrules` en la raíz indica que este documento (FRONTEND_GUIDELINES.md) es la **referencia obligatoria** al crear o modificar código frontend. Usar la sección "Guía para IA" y el checklist de la sección 4 en cada tarea.
