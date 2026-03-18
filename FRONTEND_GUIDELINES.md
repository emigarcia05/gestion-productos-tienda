# Guía de Frontend — Auditoría y Convenciones

Documento vivo: se actualiza con cada corrección o patrón detectado en auditorías. Stack: **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, **shadcn/ui**, **Geist**, **lucide-react**, **sonner**.

---

## Guía para IA (crear o modificar código frontend)

**Cuando crees o modifiques cualquier código frontend en este proyecto, usa este documento como única referencia.** Antes de proponer o escribir código:

1. **Consultar esta guía**  
   Revisa las secciones 1 (Patrones), 2 (Clases globales), 3 (Reglas técnicas) y 4 (Checklist PR). Aplica los patrones existentes; no inventes estilos ni estructuras nuevas que rompan la convención.

2. **Estilos**  
   - **Nunca** uses `bg-white`, `text-slate-*`, `bg-slate-*`, `border-slate-*`. Usa **siempre** tokens: `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, `bg-primary`, etc.  
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

8. **Tablas (encabezado fijo + paginación)**  
- **Un solo diseño** para toda la app (referencia: Comp. Proveedores). Siempre usar `Table` de `@/components/ui/table`; aplica la clase `.tabla-gestion-compacta`. No usar `<table>` en crudo ni otras clases de tabla. Encabezados (`TableHead`) en MAYÚSCULAS. No sobrescribir padding ni altura en celdas (el diseño global manda).  
   - **Encabezado fijo (obligatorio)**: el encabezado de la tabla debe estar fijo y **no moverse con el scroll**. Cuando el usuario hace scroll, los encabezados permanecen visibles en la parte superior (implementado con `position: sticky` por celda `<th>` en `globals.css`). La tabla debe ir dentro de `.contenedor-tabla-gestion` (contenedor con `overflow-y: auto`) para que el encabezado fijo funcione correctamente.  
   - **Paginación estándar**: todas las tablas de la app muestran **100 ítems por página** (`PAGE_SIZE` en `@/lib/pagination`). Cuando el total de filas supera 100, se muestran controles de paginación debajo de la tabla.  
   - **Páginas con URL** (Pedido Urgente, Tienda, Stock): usar `PaginacionTabla` de `@/components/shared/PaginacionTabla.tsx` con `basePath` y `params` (query actual sin `pagina`).  
   - **Páginas con datos en cliente** (Lista precios, Sugeridos): usar `PaginacionClient` de `@/components/shared/PaginacionClient.tsx` con `paginaActual`, `totalPaginas` y `onPaginaChange`.  
   - En el backend, las consultas que alimentan tablas deben usar `skip` y `take` (p. ej. `take: PAGE_SIZE`, `skip: (pagina - 1) * PAGE_SIZE`) y devolver `total` y `totalPaginas` para que la UI muestre la paginación correctamente.

9. **Al terminar un cambio**  
   - Recorre el checklist de la sección 4. Si añades una clase global nueva en `globals.css`, regístrala en la sección 2 de este documento.
   - Si ajustas elementos de **slidenav/sidebar**, mantener componentes compactos y consistentes:
     - `SyncStatusIndicator` (sidebar): siempre **2 líneas centradas**.
       - Reposo: "Sincronización DUX" + "Últ. Act. dd/mm hh:mm".
       - En curso: "Sincronizando DUX" + "X de Y".
     - Estilo de botones de sidebar: usar tokens (`bg-sidebar-accent`, `text-sidebar-foreground`) y hover suave (`bg-sidebar-accent/80`).

**Referencia rápida de tokens (usar en lugar de valores fijos):**

| Evitar | Usar |
|--------|------|
| `bg-white` | `bg-card` o `bg-background` |
| `text-slate-400`, `text-slate-500`, `text-slate-600` | `text-muted-foreground` |
| `bg-slate-100`, fondos grises | `bg-muted` |
| `border-slate-200` | `border-border` |
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
   - **Nota**: Si la página ya usa filtros por URL (Server Component) y necesitás una segunda fila con búsqueda (ej. “Enviar Pedido”), agregá `q` en `searchParams`, pasalo al componente de filtros, y debounceá la navegación con `useFiltrosConBusqueda` (placeholder en MAYÚSCULAS).

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
  - Encabezados secundarios: `tabla-bloque-secundario-head` / `tabla-bloque-secundario-head-divider` (esta última con línea divisoria vertical).
  - Celdas secundarias: `tabla-bloque-secundario-cell` / `tabla-bloque-secundario-cell-divider`.
- Uso recomendado:
  - Aplicar estas clases solo a columnas de **información secundaria** (no editable o de resumen).
  - Mantener siempre el orden lógico: primero las columnas principales, luego el bloque secundario.

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
| `.tabla-gestion-compacta` | **Diseño único** de tablas (referencia: Comp. Proveedores). Usar siempre `<Table>` de `@/components/ui/table`; no usar otra clase. **Encabezado fijo obligatorio**: al hacer scroll los encabezados no desaparecen (`position: sticky` en `globals.css`). Altura desde variables (abajo). **TableHead sin negrita** (usa `font-normal`). **Inputs y listas desplegables (select)** dentro de la tabla: fondo transparente, recuadro #0072bb; el contenido del select se ajusta al alto máximo de la fila. **Listas desplegables en tablas**: texto en negro, sin bold (definido en `globals.css`). |
| `.tabla-bloque-secundario-head`, `.tabla-bloque-secundario-head-divider` | Encabezados de columnas de **información secundaria** (bloque a la derecha): fondo más claro (`bg-muted` suavizado), **mismo color de texto que columnas principales** (`primary-foreground`). La variante `*-divider` usa línea vertical blanca para separar el bloque. |
| `.tabla-bloque-secundario-cell`, `.tabla-bloque-secundario-cell-divider` | Celdas de cuerpo de **información secundaria** (ej. STOCK, CANT. A PEDIR, MEJOR PROV., DIF.): fondo más claro, **mismo color de texto que columnas principales** (`foreground`). La variante `*-divider` agrega línea divisoria vertical en gris. |
| `--tabla-thead-height`, `--tabla-body-row-min-height`, `--tabla-body-cell-padding-y`, `--tabla-body-cell-padding-x` | Altura oficial de tablas (referencia: módulo Comp. Proveedores). No sobrescribir padding/height en celdas. |
| `.celda-datos` | Celdas de datos; usa las mismas variables de padding y min-height que la tabla oficial. |
| `.celda-destacado` | Celdas “destacadas” sin negrita (font-weight normal) para cumplir el estilo de tablas. |
| `.contenedor-pagina-con-filtros` | Espaciado vertical entre header, filtros y tabla. |
| `PAGE_SIZE` (`@/lib/pagination`) | Tamaño de página estándar para tablas: 100 ítems. |
| `PaginacionTabla` (`@/components/shared/PaginacionTabla.tsx`) | Paginación por URL: `basePath`, `params`, `paginaActual`, `totalPaginas`, `total`, `pageSize`. |
| `PaginacionClient` (`@/components/shared/PaginacionClient.tsx`) | Paginación por estado: `paginaActual`, `totalPaginas`, `onPaginaChange`. |
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
  - **`showCloseButton`**: `boolean` (default `true`).
  - **`className`** / **`bodyClassName`**: overrides puntuales (evitar duplicar estilos base).

### `ModalTablaConFiltros` (`src/components/shared/ModalTablaConFiltros.tsx`)

Modal reutilizable de **título + filtros + tabla**, con dos modos:

- **Single** (default): selección por **doble clic** en fila (definido por el padre con `onRowDoubleClick`).
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

- **Notas de implementación**
  - **Estilos de tabla**: las celdas repetidas (header/body) y estilos de fila usan **CVA** para evitar duplicación.
  - **Accesibilidad**: los checkboxes incluyen `aria-label` (no hay texto visible).

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

### `ClassicPageHeader` (`src/components/shared/ClassicPageHeader.tsx`)

Encabezado estándar para páginas de layout clásico (alineado con `.section-header` en `globals.css`).

- **Props**
  - **`title`**: `string` (title case).
  - **`subtitle`**: `string?`.
  - **`actions`**: `ReactNode?` (botones a la derecha, tamaño uniforme `h-10 px-4`).
  - **`className`**: `string?`.

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

### Sincronización DUX — Solo desde la slidenav

Regla de UX: la acción de sincronizar/importar datos de DUX **no debe aparecer como botón en encabezados de módulos**.  
Debe ejecutarse **solo** desde el indicador/botón persistente de la slidenav (`SyncStatusIndicator`).

### Stock — No mostrar modal al entrar (`/stock`)

Regla de UX: al abrir **Control Stock** no se debe interrumpir con un modal de “¿Desea sincronizar?”.  
La sincronización se inicia solo desde los botones existentes (header y/o slidenav).

## 4. Checklist de PR (Cursor / desarrollador)

Antes de dar por terminada una tarea de frontend:

- [ ] No hay estilos inline ni clases hardcodeadas (`bg-white`, `text-slate-400`, etc.); se usan tokens (`bg-card`, `text-muted-foreground`).
- [ ] Las clases condicionales o combinadas usan `cn(...)`.
- [ ] Tablas usan `Table` de `@/components/ui/table` con `variant="compact"` cuando aplique; encabezado fijo (al hacer scroll los encabezados no desaparecen).
- [ ] Filtros usan `FilterBar`, `FilaFiltrosDesplegables`, `INPUT_FILTER_CLASS`, `FILTER_SELECT_WRAPPER_CLASS`. Input de búsqueda: `useFiltrosConBusqueda` + `FiltroBusquedaInput`.
- [ ] Encabezados de página usan `SectionHeader` o `ClassicPageHeader` con fondo por defecto (no sobrescribir con `bg-white`).
- [ ] Títulos de modales y botones: title case. Sidebar: módulo en MAYÚSCULAS, submódulo con primera letra de cada palabra en mayúscula (title case). Filtros, desplegables y encabezados de tablas: MAYÚSCULAS. Abreviaciones con punto final (Px., Cx., Dto., etc.).
- [ ] Iconos: `lucide-react`. Toasts: `sonner`. Fuente: Geist (vía layout/tema).
- [ ] No hay `any`; validación de datos con Zod donde aplique.
- [ ] Si se añade una clase global nueva, se registra en este documento (sección 2).

---

## 5. Hallazgos de auditoría y correcciones aplicadas

### Correcciones ya aplicadas

- **SectionHeader**: eliminado `bg-white`; clase `.section-header` (fondo `var(--card)`). `cn()` en header. Subtítulo `<h3>`.
- **Toolbars (Proveedores, Tienda, Pedidos)**: tokens `text-muted-foreground`, `hover:bg-muted`, `hover:text-foreground`.
- **Filtros**: FiltrosProductos, FiltrosTienda, FiltrosStock, FiltrosPedidoUrgente, BuscadorSimple con **useFiltrosConBusqueda** + **FiltroBusquedaInput**. `cn(FILTER_COUNT_CLASS, "ml-auto")` en TablaAumentos, FiltrosComparacionCategorias, SugeridosTablaConFiltros, ListaPreciosTablaConFiltros. **Pedido Urgente**: contador en fila debajo a la derecha. **Tablas**: encabezado fijo, 100 ítems por página, paginación con `PaginacionTabla` (URL) o `PaginacionClient` (estado cliente); ver sección 1 punto 8. Pedido Urgente, Pedido Reposición y Control Stock usan el contenedor estándar `.contenedor-tabla-gestion` para que el encabezado permanezca siempre visible al hacer scroll interno de filas. **Control Stock**: se elimina el filtro `SUB-RUBRO` y se agrega el desplegable `ORDEN` con opción única `TIEMPO SIN CONTROL` para ordenar por `ÚLT. EXPORT. EXCEL`.
- **TablaTienda / Comp. Proveedores**: reemplazo de la columna `✓` por columnas secundarias con estilo `tabla-bloque-secundario-*`: `MEJOR PROV.` (prefijo del proveedor no-oficial con menor `px_compra_final`) y `DIF.` (porcentaje entero de mejora). En filas sin mejora se muestran vacías. Anchos definidos: `COD. TIENDA` 14%, `DESCRIPCIÓN` 50%, `PX. COMPRA FINAL` 12%, `MEJOR PROV.` 12%, `DIF.` 12%.
- **Control Aumentos (Export Excel)**: la columna `"COSTO"` del Excel exportado proviene de `px_compra_final` (campo `pxCompraFinal` en `precios_proveedores`), manteniendo el nombre `"COSTO"` y exportando solo ítems con variación real (`pctAumento !== 0`).
- **Altura de filas en tablas**: todas las tablas compactas usan `--tabla-body-row-min-height: 2.25rem` para filas y `.celda-datos` para celdas. En Pedido Urgente los `Input` de cantidad (`TablaPedidoUrgente`) y los botones de borrar se ajustan a esta altura (inputs con `h-6` y botones `size="icon-xs"`) para que el contenido respete la altura fija definida para el módulo "Comp. Por Cat.".
- **ui/tooltip.tsx**, **ui/dialog.tsx**, **ui/sonner.tsx**: tokens (border-border, bg-popover, bg-background) y configuración del toaster vía clase global `.toaster` (sin `style` inline).
- **Modales y listados**: ImportarModal, ImportarListaPreciosModal, TablaProductosFiltrada, AppModal con `bg-card`, `text-muted-foreground`, `bg-muted` y `cn()` en todos los classNames combinados.
- **Páginas (src/app/)**: `app/importar/page.tsx`, `app/proveedores/page.tsx`, `app/pedidos/urgente/page.tsx`, `app/proveedores/gestion/page.tsx`, `app/tienda/page.tsx`, `app/stock/page.tsx` — Separator `bg-border`; Card `border-border bg-card`; tablas con 100 ítems por página y barra de paginación al pie cuando hay más de una página (`PaginacionTabla` o `PaginacionClient`).
- **Componentes con `cn()`**: TablaAumentos, SyncButton, SyncDuxHeaderButton, UploadZone, ProveedorAlternativoRow, ImportarModal, ImportarListaPreciosModal (botones SÍ/NO y zona drag), FiltrosComparacionCategorias, SugeridosTablaConFiltros, ListaPreciosTablaConFiltros — todas las combinaciones de clase pasan por `cn()`.
- **Eliminación de estilos inline estructurales**: anchos de columnas en `TablaPedidoUrgente`, `TablaReposicion` y `ComparacionCategoriasClient` migrados a utilidades Tailwind (`w-[x%]`) y clases globales; plantilla de impresión de stock (`PrintStock`) sin atributos `style`, usando solo clases CSS internas.
- **Sidebar — Sincronización DUX (persistente y accionable)**: `SyncStatusIndicator` permanece siempre visible en la slidenav. En reposo muestra bloque centrado con "Sincronización DUX", "Última Consulta Disponible" y fecha en formato Argentina (`dd/mm hh:mm`) solo si existe última sync exitosa. El bloque completo funciona como botón para iniciar `POST /api/sync-lista-precios-tienda` sin modal de confirmación; durante ejecución mantiene el mensaje de progreso reutilizable.

### Auditoría cerrada

No quedan usos de `bg-white`, `text-slate-*`, `bg-slate-*` ni `border-slate-*` en `src/`. No quedan `className={\`...\`}` en componentes. Nuevas pantallas o filtros deben seguir esta guía y el checklist de PR.

---

*Última actualización: sidebar con bloque permanente de Sincronización DUX (centrado, con última consulta disponible y click directo para iniciar sync), manteniendo indicador de progreso durante ejecución.*

---

## 6. Organización en Cursor (prompts y reglas persistentes)

- Archivo recomendado para acceso rápido a prompts operativos: `.cursor/prompts.md`.
- Reglas persistentes activas en `.cursor/rules/`:
  - `manuales-obligatorios.mdc`: obliga lectura de `FRONTEND_GUIDELINES.md` y `BACKEND_GUIDELINES.md` antes de codificar.
  - `flujo-fullstack-end-to-end.mdc`: define ciclo de implementación end-to-end y cierre con retroalimentación documental.
- Si se agrega un nuevo patrón visual, clase global, componente compartido o convención de UI, debe actualizarse este documento y mantenerse alineado con las reglas de `.cursor/rules/`.

---

**Para IA:** El archivo `.cursorrules` en la raíz indica que este documento (FRONTEND_GUIDELINES.md) es la **referencia obligatoria** al crear o modificar código frontend. Usar la sección "Guía para IA" y el checklist de la sección 4 en cada tarea.
