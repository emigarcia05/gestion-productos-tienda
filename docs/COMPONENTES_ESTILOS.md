# Componentes y estilos reutilizables

Documentación de componentes compartidos y clases CSS globales para mantener consistencia y evitar duplicación. Todo debe derivar de `src/app/globals.css` y de este documento.

---

## Indicador de proceso en curso (MensajeProceso)

### Descripción

Indica al usuario que una operación está en curso (sincronizar, importar, guardar, etc.). Estilo unificado en toda la app: borde y acentos en azul corporativo **#0072BB**, texto en `foreground`.

### Clases CSS globales (`src/app/globals.css`)

| Clase | Uso |
|-------|-----|
| `.mensaje-proceso` | Contenedor base: borde y fondo suave en azul `#0072BB`, padding y tipografía. |
| `.mensaje-proceso__detalle` | Detalle numérico o secundario (ej. "1.234 de 5.000"): color azul `#0072BB`, font-weight 600. En variante sidebar es la 2.ª fila ("X de Y"). |
| `.mensaje-proceso--sidebar` | Barra lateral: mismo alto que el bloque de usuario (min-height 3.5rem), texto en dos filas — 1.ª: mensaje (ej. "Exportando", "Importando"); 2.ª: "X de Y". |
| `.mensaje-proceso__linea1` | Primera fila del mensaje en variante sidebar (uso interno del componente). |

**No duplicar** estos estilos en otros archivos; cualquier variante debe usar estas clases o el componente `<MensajeProceso />`.

### Componente React

**Ubicación:** `src/components/shared/MensajeProceso.tsx`

**Props:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `mensaje` | `string` | Texto principal (ej. "Sincronizando!", "Importando!", "Guardando!"). |
| `detalle` | `{ procesados: number; total: number }` \| `string` \| `null` \| `undefined` | Opcional. Objeto → "X de Y" formateado; string → tal cual; null/undefined → no se muestra. |
| `variant` | `"default"` \| `"sidebar"` | "default" = bloque estándar; "sidebar" = compacto para barra lateral. Por defecto: "default". |
| `className` | `string` | Clases adicionales para el contenedor. |

**Ejemplos:**

```tsx
// Barra lateral (sincronización)
<MensajeProceso
  variant="sidebar"
  mensaje="Sincronizando!"
  detalle={{ procesados: 100, total: 500 }}
/>

// Modal de importación (solo mensaje)
<MensajeProceso mensaje="Importando!" detalle="…" />

// Con total conocido sin progreso incremental
<MensajeProceso mensaje="Importando!" detalle={{ procesados: 0, total: filas.length }} />
```

### Dónde se usa

- **SyncStatusIndicator** (`src/components/layout/SyncStatusIndicator.tsx`): progreso de sincronización en la sidebar.
- **ImportarListaPreciosModal** (`src/components/proveedores/ImportarListaPreciosModal.tsx`): mensaje "Importando!" mientras se ejecuta la importación.

### Accesibilidad

El componente renderiza `role="status"` y `aria-live="polite"` para que lectores de pantalla anuncien actualizaciones.

---

## Fila de filtros desplegables (Fila 1 del FilterBar)

### Regla (obligatoria en toda la app)

En **toda la aplicación**, la primera fila de filtros (la de los Selects desplegables) sigue el mismo formato:

- **Siempre 5 columnas.** El contenedor debe usar exactamente 5 columnas en todos los módulos que tengan barra de filtros con desplegables. No se usa 4, 6 ni otro número: la fila tiene exactamente 5 huecos (slots).
- **Cada módulo coloca de 1 a 5 filtros** en esa fila. Los slots no usados quedan vacíos; los Selects no se expanden para ocupar todo el ancho. Así se mantiene el mismo aspecto visual en Lista Precios, Sugeridos, Tienda, Control Aumentos y Pedido Urgente.
- **Cada filtro ocupa siempre el mismo tamaño**: mismo ancho para todos (1/5 del ancho de la fila), independientemente de si tienen valor seleccionado o no.
- La fila ocupa todo el ancho disponible (`w-full`).

Al agregar una **nueva página con filtros desplegables**, hay que usar el componente `<FilaFiltrosDesplegables>` y este mismo formato (siempre 5 columnas) para no romper la uniformidad del diseño.

### Componente compartido: FilaFiltrosDesplegables

**Ubicación:** `src/components/FilterBar.tsx` (exportado junto con `FilterBar`, `FilterRowSelection`, etc.).

**Uso:** Envuelve los wrappers de cada Select (cada uno con `FILTER_SELECT_WRAPPER_CLASS`). No se añaden divs vacíos para los slots sin filtro; el grid ya reserva las 5 columnas.

```tsx
import FilterBar, { FilterRowSelection, FilaFiltrosDesplegables, FILTER_SELECT_WRAPPER_CLASS, ... } from "@/components/FilterBar";

<FilterRowSelection>
  <FilaFiltrosDesplegables>
    <div className={FILTER_SELECT_WRAPPER_CLASS}>
      <Select>…</Select>
    </div>
    {/* de 1 a 5 slots; el resto queda vacío */}
  </FilaFiltrosDesplegables>
</FilterRowSelection>
```

### Implementación (clases en globals.css)

- **Contenedor:** La clase `.fila-filtros-5` (y el componente `FilaFiltrosDesplegables`) aplican `grid grid-cols-5 gap-3 w-full`. Cada hijo (`> div`) tiene `min-width: 0` y `width: 100%`; los triggers de los Select con ancho completo y texto con ellipsis.
- **Cada celda:** `FILTER_SELECT_WRAPPER_CLASS` (`min-w-0 flex-1`) en el wrapper de cada Select, dentro del grid.

### Distancia simétrica (encabezado ↔ filtros ↔ tabla)

La distancia desde el **recuadro de filtros** hasta el **encabezado** y hasta la **tabla** debe ser la misma en toda la app. Todo se controla desde **clases y variables globales** en `globals.css`; al cambiar ahí, se actualiza en todas las páginas.

- **Clase global del contenedor:** `.contenedor-pagina-con-filtros`. Se aplica al div que envuelve filtros + tabla (p. ej. en `ClassicFilteredTableLayout` y en la página de Control Aumentos). Define `padding-top` y `padding-bottom` con `var(--espacio-filtros-vertical)`.
- **Variable en `:root`:** `--espacio-filtros-vertical` (p. ej. `1rem`). Cambiarla modifica el hueco arriba y abajo del recuadro en toda la app.
- **Debajo del recuadro:** el recuadro (`.seccion-filtros`) usa `margin-bottom: var(--filtros-margin-bottom-tabla)`, y `--filtros-margin-bottom-tabla` = `var(--espacio-filtros-vertical)`. Entre el bloque de filtros y el de la tabla no se usa `gap` extra.

**Regla:** Cualquier página con estructura encabezado → filtros → tabla debe usar la clase `.contenedor-pagina-con-filtros` en el contenedor de contenido para heredar el espaciado simétrico sin duplicar estilos.

**Cuando FilterBar y contenido (tabla/cards) están en el mismo componente** (p. ej. Control Aumentos): el contenedor que envuelve FilterBar y el bloque de contenido debe usar `gap-0` entre ambos. No insertar `Separator` ni `gap` entre el FilterBar y el inicio del contenido; así la única distancia es el `margin-bottom` del recuadro (variable global) y se mantiene la misma que entre encabezado y filtros.

### Dónde se usa

- **Lista Tienda – Comp. Px. Prov.** (`/tienda`): 4 filtros (Marca, Rubro, SubRubro, COSTO). `FilaFiltrosDesplegables` con 4 slots usados; 5.º slot vacío.
- **Control Aumentos** (`/tienda/aumentos`): 3 filtros (MARCA, RUBRO, SUB-RUBRO). `FilaFiltrosDesplegables` con 3 slots usados; 2 slots vacíos.
- **Lista Precios** (`/proveedores/lista-precios`): 5 filtros (Proveedor, Marca, Rubro, Habilitado). `FilaFiltrosDesplegables` con las 5 columnas ocupadas.
- **Px Vta. Sugeridos** (`/proveedores/sugeridos`): 2 filtros (Proveedor, Marca). `FilaFiltrosDesplegables` con 2 slots usados; 3 slots vacíos.
- **Pedido Urgente** (`/pedidos/urgente`): 2 filtros (Sucursal, Proveedor). `FilaFiltrosDesplegables` con 2 slots usados; 3 slots vacíos. **Obligatorio** usar la misma fila de 5 columnas para uniformidad.

---

## Panel con cabecera primaria

Para bloques con cabecera de color primario (ej. columnas Marca/Rubro/SubRubro en Control Aumentos, o lista “Productos con variación”).

### Clases CSS globales (`globals.css`)

| Clase | Uso |
|-------|-----|
| `.panel-con-cabecera` | Contenedor: flex column, borde `var(--border)`, fondo `var(--card)`, overflow y min-height para scroll. |
| `.panel-cabecera-primary` | Cabecera: fondo `var(--primary)`, padding. |
| `.panel-cabecera-primary h3` | Título: texto `var(--primary-foreground)`, uppercase, centrado. |

**Variable:** `--altura-paneles-aumentos` (ej. `36vh`) para altura fija. Clase `.paneles-aumentos` aplica `height: var(--altura-paneles-aumentos)`.

**No duplicar** bordes `border-slate-200`, `bg-white` ni `text-white` en estos paneles; usar siempre las clases anteriores y tokens del tema.

### Dónde se usa

- **TablaAumentos** (`src/components/tienda/TablaAumentos.tsx`): `ColumnaGrupo` (Marca, Rubro, Sub-Rubro) y el bloque “Productos con variación”.

---

## Sidebar (navegación)

El aside de navegación no debe usar sombra inline. La sombra se define en una variable y se aplica mediante una clase global.

### Variable y clase en `globals.css`

| Variable / Clase | Uso |
|------------------|-----|
| `--sidebar-shadow` (en `:root`) | Valor de `box-shadow` del aside (ej. `2px 0 8px rgba(0, 0, 0, 0.06)`). |
| `.sidebar-container` | Aplica `box-shadow: var(--sidebar-shadow)` al contenedor del aside. |

**Regla:** En el componente Sidebar usar la clase `sidebar-container` junto con las demás clases del aside. No usar `shadow-[...]` ni `style={{ boxShadow: ... }}` para la sombra de la barra lateral.

### Dónde se usa

- **Sidebar** (`src/components/layout/Sidebar.tsx`): el `<aside>` incluye la clase `sidebar-container` para heredar la sombra desde `globals.css`.

---

## Lista de filas con zebra (div-based)

Cuando el listado no es una `<table>` sino una secuencia de `<div>` (ej. lista de productos en Control Aumentos), usar los mismos tokens que las tablas para bordes, fondos y texto.

### Regla

- **Contenedor:** `border-border`, `bg-card`. Evitar `border-slate-200`, `bg-white`.
- **Filas:** zebra con `bg-card` (impar) y `bg-blue-50/50` (par); `border-b border-border`; hover `hover:bg-primary/10`.
- **Texto:** `text-foreground` para el contenido principal; `text-muted-foreground` para mensajes secundarios (ej. "Sin resultados").

**No duplicar** colores slate/white en estas listas; usar siempre las variables del tema y, si hace falta, una clase compartida en `globals.css` que agrupe este patrón.

### Dónde se usa

- **TablaAumentos** (`src/components/tienda/TablaAumentos.tsx`): componente `ListaProductos` (panel "Productos con variación") usa contenedor con `border-border`/`bg-card` y filas con zebra y `hover:bg-primary/10`.

---

## Contenedor de tabla con borde de marca

Para listados dentro de un Card o div con borde azul tenue (identidad de marca).

### Regla

**No usar** `style={{ borderColor: "rgba(0,114,187,0.25)" }}`. Usar siempre clases que referencien la variable del tema.

### Clases

- **Contenedor de tabla:** `border border-card-border bg-card` (o la clase `.contenedor-tabla-card` si se prefiere un único nombre). Definido en `globals.css`; `--card-border` en `:root`.

### Dónde se usa

- **TablaListaPrecios**, **TablaStock**, contenedores de tabla en listados. Cualquier nuevo listado debe usar `border-card-border` y `bg-card`.

---

## Variación de costo (positiva / negativa / neutra)

Para mostrar porcentajes o indicadores de variación (subida/bajada/sin cambio). En esta versión de la app se unifica el color del texto en negro (`foreground`) para maximizar legibilidad en todos los contextos (tablas y modales).

### Clases CSS globales (`globals.css`)

| Clase | Uso |
|-------|-----|
| `.variacion-costo--positiva` | Texto en negro (subida): `color: var(--foreground)`. |
| `.variacion-costo--negativa` | Texto en negro (bajada): `color: var(--foreground)`. |
| `.variacion-costo--neutra` | Texto en negro (sin cambio): `color: var(--foreground)`. |
| `.variacion-costo-icon--positiva` | Mismo color para iconos (ej. ArrowUp). |
| `.variacion-costo-icon--negativa` | Mismo color para iconos (ej. ArrowDown). |

**No duplicar** `text-red-600`, `text-emerald-600`, `text-slate-500` en componentes de variación; usar estas clases para mantener un solo criterio de color.

### Dónde se usa

- **TablaAumentos**: `ColorPct` e `IconTendencia` (y celdas de variación en listas).

---

## Modal "Vínculos con Proveedores"

### Objetivo

Unificar el diseño del modal de comparación de costos entre proveedores vinculados a un ítem de tienda. Todo el layout y estilos viven en `globals.css` y se reutilizan desde el componente `VincularModal`.

### Clases CSS globales (`src/app/globals.css`)

| Clase | Uso |
|-------|-----|
| `.modal-vinculos-listado-contenedor` | Contenedor interno con padding y layout vertical para las filas del modal. |
| `.modal-vinculos-fila` | Fila base (grid) con 4 columnas: prefijo, precio, variación, acciones; borde y fondo de tarjeta. |
| `.modal-vinculos-fila--solo-principal` | Modificador para la fila del proveedor principal: grid en 2 columnas (`1fr auto`): contenido centrado + acciones. |
| `.modal-vinculos-fila-principal-contenido` | Contenedor flex (columna, centrado) que agrupa Prefijo y Cx Final de Compra del proveedor principal; ambos quedan centrados en el div. |
| `.modal-vinculos-fila--zebra-impar` / `--zebra-par` | Zebra para filas impares/pares, usando `bg-card` y mezcla suave con `primary`. |
| `.modal-vinculos-seccion-titulo` | Títulos de sección del modal ("Proveedor Principal", "Proveedores Alternativos"): mayúsculas, tamaño pequeño, color muted, centrados. |
| `.modal-vinculos-celda` | Celda base, texto centrado. |
| `.modal-vinculos-celda--acciones` | Celda de acciones: flex, botones alineados a la derecha (`justify-content: flex-end`), con `padding-right` para que el tacho no quede pegado al borde. |
| `.modal-vinculos-celda--principal` | Celda del proveedor principal (solo en filas alternativas si se usa): centrar prefijo/etiqueta. |
| `.modal-vinculos-celda--principal-numero` | Precio del proveedor principal: número centrado, más grande y en negrita (usado dentro de `.modal-vinculos-fila-principal-contenido`). |
| `.modal-vinculos-prefijo` | Estilo del prefijo del proveedor (fuente monoespaciada, tamaño reducido, bold). |
| `.modal-vinculos-celda--numero` | Precio en filas de proveedores alternativos (tamaño pequeño, tabular-nums). |
| `.modal-vinculos-celda--variacion` | Contenedor de la variación de costo (`≈0%`, `+X%`, `-X%`) usando las clases de variación de costo. |
| `.btn-convertir-proveedor-principal` | Botón base "Proveedor Principal": outline compacto con padding vertical y tipografía pequeña. |
| `.btn-convertir-proveedor-principal--destacado` | Variante destacada para el proveedor alternativo más económico: borde y texto en `foreground`, fondo gris muy suave y negrita. Se aplica solo al botón, no a toda la fila. |
| `.btn-desvincular-icono` | Botón de borrar vínculo (icono de tacho): tamaño mínimo fijo, `padding` para área de clic, alineado al margen derecho del div (la celda de acciones tiene `padding-right`). |

### Comportamiento de diseño

- El modal se divide en dos secciones:
  - **Proveedor Principal**: la fila usa `modal-vinculos-fila--solo-principal` y un único bloque `modal-vinculos-fila-principal-contenido` donde **Prefijo y Cx Final de Compra** van centrados (flex centrado) dentro del div; el botón del tacho va a la derecha con padding y margen derecho.
  - **Proveedores Alternativos**: muestra prefijo, precio, variación de costo y botones de acción; el tacho tiene padding y queda alineado al margen derecho del div.
- El proveedor alternativo con **menor costo** se resalta únicamente a través de la variante del botón `btn-convertir-proveedor-principal--destacado` (texto negro, negrita, fondo gris suave), evitando bordes gruesos en toda la fila para no romper la jerarquía visual del modal.

**Regla:** cualquier ajuste futuro al layout o colores de este modal debe hacerse modificando estas clases globales, manteniendo la separación conceptual entre:
- layout de filas/celdas (`modal-vinculos-*`),
- semántica de variación de costos (`variacion-costo-*`),
- y botones reutilizables (`btn-convertir-proveedor-principal*`, `btn-desvincular-icono`).
