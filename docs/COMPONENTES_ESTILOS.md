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
