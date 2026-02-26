# Auditoría del sistema de diseño — Tailwind CSS 4 + shadcn/ui

**Objetivo:** Garantizar que `@/app` y `@/components` respeten estrictamente `globals.css` y `components.json`, para que al pedir "crea un módulo nuevo siguiendo el estilo de X" el diseño sea idéntico.

---

## 1. No hardcodear — Variables de tema

### ✅ Correcto
- Uso de `bg-primary`, `text-primary-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `bg-background`, `text-foreground`, `text-accent2` (definido en tema).
- No se encontraron clases arbitrarias `bg-[#0072BB]` en componentes.

### ⚠️ Desviaciones

| Archivo | Problema | Corrección |
|---------|----------|------------|
| **FilterBar.tsx** | `FILTER_TEXT_COLOR_CLASS = "text-black"` | Usar `text-foreground` para modo oscuro. |
| **FilterBar.tsx** | `INPUT_FILTER_CLASS` / `SELECT_TRIGGER_FILTER_CLASS`: `border-slate-300`, `placeholder:text-slate-400` | `border-input`, `placeholder:text-muted-foreground`. |
| **FilterBar.tsx** | `LimpiarFiltrosButton`: `border-slate-300`, `text-slate-600`, `hover:bg-slate-100`, `hover:text-slate-900` | `border-border`, `text-muted-foreground`, `hover:bg-accent`, `hover:text-foreground`. |
| **SectionHeader.tsx** | `text-slate-950`, `text-slate-500` | Opcional: `text-foreground`, `text-muted-foreground` para dark. |
| **AppShell.tsx** | `main` con `bg-slate-50` | `bg-background` para que el tema (claro/oscuro) lo controle. |
| **SyncModal.tsx** | Botón "Sí, continuar" con `text-white` | `text-primary-foreground` (o dejar que Button lo aplique). |
| **Sidebar.tsx** | `bg-primary`, `text-white`, `border-white/10` | Usar `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border` para que el tema defina colores. |
| **TablaAumentos.tsx** | Varios `text-slate-900`, `text-slate-500`, `text-slate-600`, `border-slate-100`, `bg-blue-50/50` | Preferir `text-foreground`, `text-muted-foreground`, `border-border`, fondos de tema. |
| **TablaProductosFiltrada.tsx** | Celda editable: `text-slate-700`, `text-slate-400` | `text-foreground`, `text-muted-foreground`. |
| **SeleccionarProductoModal.tsx** | `text-slate-600` en `<code>` | `text-muted-foreground`. |
| **FiltrosProductos.tsx** / **FiltrosTienda.tsx** / **BuscadorSimple.tsx** | Botón limpiar búsqueda: `text-slate-400 hover:text-slate-600` | `text-muted-foreground hover:text-foreground`. |
| **PrintStock.tsx** | Estilos inline para impresión (`#111`, `#555`, etc.) | Aceptable para PDF/print; considerar `var(--primary)` donde aplique. |

---

## 2. Uso de variantes (CVA) — Botones

### Regla
Los botones deben usar el componente `Button` y `buttonVariants` (CVA). No añadir padding/color manualmente salvo cuando se extiende con constantes del design system (`ACTION_BUTTON_PRIMARY`, `ACTION_BUTTON_SECONDARY`).

### ✅ Correcto
- `GenerarPedidoButton`, `CrearProveedorModal`, `ImportarModal`, `SyncButton`, `ExportarAumentosButton`, `ImprimirStockButton`: usan `<Button>` + `ACTION_BUTTON_*`.
- `EliminarProveedorBtn`, `AccionMasivaModal`, modales: usan `<Button variant="...">`.

### ⚠️ Desviaciones — `<button>` sin componente Button

| Archivo | Uso | Corrección |
|---------|-----|------------|
| **SyncModal.tsx** | Dos `<button>` (No / Sí, continuar) | `<Button variant="outline">` y `<Button>` (default). |
| **TablaProductosFiltrada.tsx** | `<button>` para celda editable (porcentaje) | `<Button variant="ghost" size="xs">` o mantener con clases de tema. |
| **TablaAumentos.tsx** | `<button>` para filas de grupo, "Borrar filtros", chips (X) | Botón principal: `<Button variant="outline" size="sm">`. Chips: `<Button variant="ghost" size="icon-xs">`. |
| **StockCard.tsx** | `<button className={TARJETA}>` (tarjeta clicable) | Opcional: `<Button variant="ghost" className={TARJETA} asChild><div>...</div></Button>` o documentar como excepción. |
| **SelectorRol.tsx** | "Salir" / "Cambiar a Editor" y toggle ojo | `<Button variant="ghost" size="sm">` para acciones; toggle ojo puede quedarse como `<button>` con clases de tema. |
| **VincularModal.tsx** | DialogTrigger `<button>`, "Convertir en proveedor", "Desvincular" (X) | Trigger y acciones: `<Button variant="ghost" size="sm">`; icono X: `<Button variant="ghost" size="icon" className="h-6 w-6">`. |
| **ImportarModal.tsx** | Toggle "El archivo tiene encabezados" | Sustituir por `<Switch>` de shadcn o `<Button variant="outline">` según diseño. |
| **FiltrosProductos.tsx**, **FiltrosTienda.tsx**, **BuscadorSimple.tsx** | Botón X para limpiar búsqueda | `<Button variant="ghost" size="icon" className="h-8 w-8">` con `text-muted-foreground hover:text-foreground`. |
| **SeleccionarProductoModal.tsx** | Botón X limpiar búsqueda | Mismo patrón que arriba. |
| **TablaStock.tsx** | Botón limpiar búsqueda | Mismo patrón. |

---

## 3. Consistencia en tablas

### Regla
Todas las tablas deben usar o bien el componente `Table` de `@/components/ui/table` (que ya aplica `tabla-global`) o `<table className="tabla-global ...">`. Encabezados con color primario (equivalente a #0072BB vía `bg-primary`).

### ✅ Correcto
- **ui/table.tsx**: `className={cn("tabla-global w-full ...", className)}`.
- **TablaListaPrecios.tsx**, **TablaProductosFiltrada.tsx**, **TablaTienda.tsx**, **ImportarModal.tsx**, **proveedores/[id]/page.tsx**, **importar/page.tsx**, **SeleccionarProductoModal.tsx**, **TablaStock.tsx**: usan `tabla-global`.

### ⚠️ Desviaciones
- **PrintStock.tsx**: `<table>` sin `tabla-global`; estilos en `<style>` para impresión. Aceptable si el PDF tiene diseño propio; si debe parecerse a la app, usar clase que reutilice variables (p. ej. `--primary`).

### Modo oscuro en tablas
- **globals.css**: `.tabla-global` usa `bg-white`, `text-black`, `bg-blue-50/50`, `border-slate-100`. No hay variantes `.dark`. Para tema oscuro fluido, añadir reglas `.dark .tabla-global ...` con `bg-card`, `text-foreground`, `border-border`, etc.

---

## 4. Layout y espaciado

### SectionHeader
- **Regla:** Botones del header con `h-10 px-4` obligatorio.
- **Estado:** SectionHeader no fuerza altura/ancho en los botones hijos.
- **Corrección:** Añadir en el contenedor de acciones: `[&_button]:!h-10 [&_button]:!px-4` (o la constante que use el design system).

### FilterBar
- **FilterRowSearch:** Contenedor al 75% (`w-[75%] max-w-2xl`) — ✅ correcto.
- **INPUT_FILTER_CLASS:** Incluye `h-10 min-h-10` — ✅ correcto.
- **LimpiarFiltrosButton:** Usa `h-10 w-10` — ✅ correcto.

### Main buttons (globals.css)
- `main button` y `.btn-main` tienen `height: 2.5rem`, `padding-left/right: 1rem` — coherente con `h-10 px-4`.

---

## 5. Modo oscuro

### Elementos a revisar
- **AppShell** `main`: `bg-slate-50` → `bg-background`.
- **FilterBar** (INPUT_FILTER_CLASS, SELECT_TRIGGER_FILTER_CLASS, LimpiarFiltrosButton): sustituir slate/black por variables (`foreground`, `muted-foreground`, `input`, `border`, `accent`).
- **SectionHeader**: título y subtítulo con `text-foreground` y `text-muted-foreground` para dark.
- **Sidebar**: usar variables `--sidebar`, `--sidebar-foreground`, `--sidebar-border`, `--sidebar-accent` en lugar de primary/white.
- **globals.css**: `.tabla-global` — añadir variantes para `.dark` (fondos y texto desde variables de tema).
- **SyncModal**: ya usa `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`; solo unificar botones con `<Button>` y evitar `text-white`.

---

## 6. Resumen de acciones recomendadas

### Críticas (hacer ya)
1. **SectionHeader**: Añadir `[&_button]:!h-10 [&_button]:!px-4` al wrapper de acciones.
2. **FilterBar**: Cambiar constantes y LimpiarFiltrosButton a variables de tema (foreground, border, muted-foreground, accent).
3. **SyncModal**: Reemplazar los dos `<button>` por `<Button variant="outline">` y `<Button>`.
4. **AppShell**: `main` de `bg-slate-50` a `bg-background`.
5. **globals.css**: Añadir variantes `.dark .tabla-global` para filas, celdas y bordes.

### Importantes (coherencia y CVA)
6. **Sidebar**: Usar `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border` (y acentos con `sidebar-accent`).
7. **TablaAumentos**: "Borrar filtros" y botones de chips con `<Button>`; reemplazar colores slate por variables.
8. **VincularModal**: DialogTrigger y botones "Convertir" / "Desvincular" con `<Button>`.
9. **SelectorRol**: Acciones "Salir" / "Cambiar a Editor" con `<Button variant="ghost">`.
10. **FiltrosProductos, FiltrosTienda, BuscadorSimple, TablaStock, SeleccionarProductoModal**: Botón limpiar búsqueda con `<Button variant="ghost" size="icon">` y clases de tema.

### Opcionales
11. **TablaProductosFiltrada**: Celda editable con `text-foreground` / `text-muted-foreground`.
12. **ImportarModal**: Toggle encabezados como `<Switch>` o Button.
13. **StockCard**: Documentar o refactorizar el `<button>` como Button con `asChild`.
14. **PrintStock**: Usar `var(--primary)` en estilos de impresión si se quiere alinear con el tema.

---

## 7. Referencia rápida para nuevos módulos

- **Colores:** Solo variables del tema: `primary`, `primary-foreground`, `foreground`, `muted-foreground`, `background`, `card`, `border`, `input`, `accent`, `accent-foreground`, `destructive`, `sidebar-*`, `accent2` (críticos).
- **Botones:** Siempre `<Button>` de `@/components/ui/button` con `variant` y `size`; en headers de sección usar `ACTION_BUTTON_PRIMARY` o `ACTION_BUTTON_SECONDARY` si aplica.
- **Tablas:** `Table` de `@/components/ui/table` o `<table className="tabla-global w-full text-sm">`; no añadir estilos propios a thead/tbody/tr/th/td.
- **Header de sección:** `SectionHeader` con título, opcional subtítulo y acciones a la derecha; los botones se forzarán a `h-10 px-4`.
- **Filtros:** `FilterBar` > `FilterRowSelection` (Selects) + `FilterRowSearch` (input 75%) + `LimpiarFiltrosButton`; usar `INPUT_FILTER_CLASS`, `SELECT_TRIGGER_FILTER_CLASS`, `FILTER_SELECT_WRAPPER_CLASS`.
- **Clases de utilidad:** `cn()` de `@/lib/utils` para combinar clases; no hardcodear hex ni slate cuando exista variable.

Con estas correcciones, "crea un módulo nuevo siguiendo el estilo de X" puede apoyarse en este documento y en los mismos componentes/tokens para un diseño idéntico.

---

## 8. Cambios aplicados (auditoría ejecutada)

- **SectionHeader:** Añadido `[&_button]:!h-10 [&_button]:!px-4`; título/subtítulo con `text-foreground` y `text-muted-foreground`.
- **FilterBar:** `FILTER_TEXT_COLOR_CLASS` → `text-foreground`; `INPUT_FILTER_CLASS` y `SELECT_TRIGGER_FILTER_CLASS` con `border-input`, `bg-background`, `placeholder:text-muted-foreground`; `LimpiarFiltrosButton` con variables de tema (`border-border`, `text-muted-foreground`, `hover:bg-accent`, `hover:text-foreground`).
- **SyncModal:** Los dos `<button>` reemplazados por `<Button variant="outline">` y `<Button>`; barra de progreso y loader con `bg-primary`/`text-primary`/`text-foreground`.
- **AppShell:** `main` con `bg-background` en lugar de `bg-slate-50`.
- **globals.css:** Añadidas variantes `.dark .tabla-global` para thead, tbody, bordes y filas (bg-card, bg-muted/50, text-foreground, border-border, hover bg-accent/50).
- **Sidebar:** Uso de `bg-sidebar`, `border-sidebar-border`, `text-sidebar-foreground`, `hover:bg-sidebar-accent`, `border-sidebar-accent`, `text-sidebar-primary` (iconos), `bg-sidebar-accent` (bloque perfil), `border-sidebar-border` (hr). Indicador Pedido Urgente mantiene `[&_svg]:text-accent2` cuando activo.
- **VincularModal:** DialogTrigger y botones "Convertir"/"Desvincular" pasan a `<Button variant="ghost" size="sm">` y `<Button variant="ghost" size="icon">`.
- **FiltrosProductos, FiltrosTienda, BuscadorSimple, TablaStock, SeleccionarProductoModal:** Botón limpiar búsqueda reemplazado por `<Button variant="ghost" size="icon">` con clases de tema.
- **TablaAumentos:** "Borrar filtros" y botones X de chips reemplazados por `<Button variant="outline" size="sm">` y `<Button variant="ghost" size="icon-xs">`; estilos con variables de tema.
- **TablaProductosFiltrada:** Celda editable con `text-muted-foreground` y `hover:text-foreground`.
- **SeleccionarProductoModal:** `<code>` con `text-muted-foreground`.

**Nota:** En `globals.css`, el tema claro define `--sidebar: #ffffff`. Si se desea sidebar azul (estilo primario) en modo claro, cambiar en `:root` a `--sidebar: #0072BB` (o usar `var(--primary)`).
