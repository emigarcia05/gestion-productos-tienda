# Componentes y estilos reutilizables

Documentación de componentes compartidos y clases CSS globales para mantener consistencia y evitar duplicación.

---

## Indicador de proceso en curso (MensajeProceso)

### Descripción

Indica al usuario que una operación está en curso (sincronizar, importar, guardar, etc.). Estilo unificado en toda la app: borde y acentos en color `accent2` (amarillo), texto en `foreground`.

### Clases CSS globales (`src/app/globals.css`)

| Clase | Uso |
|-------|-----|
| `.mensaje-proceso` | Contenedor base: borde, fondo suave, padding y tipografía. |
| `.mensaje-proceso__detalle` | Detalle numérico o secundario (ej. "1.234 de 5.000"): color accent2, font-weight 600. |
| `.mensaje-proceso--sidebar` | Modificador: tamaño reducido (font 0.75rem, padding menor) para barra lateral. |

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

- **Siempre 5 columnas.** El contenedor debe usar `grid-cols-5` en todos los módulos que tengan barra de filtros con desplegables. No se usa 4, 6 ni otro número: la fila tiene exactamente 5 huecos (slots).
- **Cada módulo coloca de 1 a 5 filtros** en esa fila. Los slots no usados quedan vacíos; los Selects no se expanden para ocupar todo el ancho. Así se mantiene el mismo aspecto visual en Lista Precios, Sugeridos, Comparación Tienda, etc.
- **Cada filtro ocupa siempre el mismo tamaño**: mismo ancho para todos (1/5 del ancho de la fila), independientemente de si tienen valor seleccionado o no.
- La fila ocupa todo el ancho disponible (`w-full`).

Al agregar una **nueva página con filtros desplegables**, hay que usar este mismo formato (siempre 5 columnas) para no romper la uniformidad del diseño.

### Implementación

- **Contenedor:** Clase `.fila-filtros-5` (definida en `globals.css`; `.fila-filtros-desplegables` es alias con los mismos estilos). Estilos: cada hijo (`> div`) con `min-width: 0` y `width: 100%`; los triggers de los Select con ancho completo y texto con ellipsis.
- **Layout:** Siempre `grid grid-cols-5 gap-3 w-full`. Cada columna tiene el mismo ancho (1/5).
- **Cada celda:** `FILTER_SELECT_WRAPPER_CLASS` (`min-w-0 flex-1`) en el wrapper de cada Select, dentro del grid. No se añaden divs vacíos para los slots sin filtro: el grid ya reserva las 5 columnas.

### Distancia simétrica (encabezado ↔ filtros ↔ tabla)

La distancia desde el **recuadro de filtros** hasta el **encabezado** y hasta la **tabla** debe ser la misma en toda la app. Todo se controla desde **clases y variables globales** en `globals.css`; al cambiar ahí, se actualiza en todas las páginas.

- **Clase global del contenedor:** `.contenedor-pagina-con-filtros`. Se aplica al div que envuelve filtros + tabla (p. ej. en `ClassicFilteredTableLayout` y en la página de Control Aumentos). Define `padding-top` y `padding-bottom` con `var(--espacio-filtros-vertical)`.
- **Variable en `:root`:** `--espacio-filtros-vertical` (p. ej. `1rem`). Cambiarla modifica el hueco arriba y abajo del recuadro en toda la app.
- **Debajo del recuadro:** el recuadro (`.seccion-filtros`) usa `margin-bottom: var(--filtros-margin-bottom-tabla)`, y `--filtros-margin-bottom-tabla` = `var(--espacio-filtros-vertical)`. Entre el bloque de filtros y el de la tabla no se usa `gap` extra.

**Regla:** Cualquier página con estructura encabezado → filtros → tabla debe usar la clase `.contenedor-pagina-con-filtros` en el contenedor de contenido para heredar el espaciado simétrico sin duplicar estilos.

**Cuando FilterBar y contenido (tabla/cards) están en el mismo componente** (p. ej. Control Aumentos): el contenedor que envuelve FilterBar y el bloque de contenido debe usar `gap-0` entre ambos. No insertar `Separator` ni `gap` entre el FilterBar y el inicio del contenido; así la única distancia es el `margin-bottom` del recuadro (variable global) y se mantiene la misma que entre encabezado y filtros.

### Ejemplo (4 filtros — Lista Tienda / Comp. Px. Prov.)

```tsx
<FilterRowSelection>
  <div className="fila-filtros-5 grid grid-cols-5 gap-3 w-full">
    <div className={FILTER_SELECT_WRAPPER_CLASS}>
      <Select>…</Select>
    </div>
    {/* 3 Selects más; el 5.º slot queda vacío */}
  </div>
</FilterRowSelection>
```

### Dónde se usa

- **Lista Tienda – Comp. Px. Prov.** (`/tienda`): 4 filtros (Marca, Rubro, SubRubro, COSTO). Misma fila de 5 columnas; 5.º slot vacío.
- **Control Aumentos** (`/tienda/aumentos`): 3 filtros (MARCA, RUBRO, SUB-RUBRO). Misma fila de 5 columnas; 2 slots vacíos.
- **Lista Precios** (`/proveedores/lista-precios`): 5 filtros (Proveedor, Marca, Rubro, Habilitado, etc.). Las 5 columnas ocupadas.
- **Px Vta. Sugeridos** (`/proveedores/sugeridos`): 2 filtros (Proveedor, Marca). Misma fila de 5 columnas; 3 slots vacíos.
