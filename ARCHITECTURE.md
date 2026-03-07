# Arquitectura Frontend — Gestión Productos Tienda

Documento de referencia para el desarrollo de la interfaz: estructura de carpetas, convenciones y patrones.  
**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix + cva + Lucide), Geist, Sonner.

---

## 1. Estructura de carpetas

```
src/
├── app/                          # App Router (rutas, layouts, loading, error)
│   ├── layout.tsx                # Root layout (Geist, Toaster, AppShell)
│   ├── page.tsx                  # Home / redirección
│   ├── globals.css               # Tailwind 4 + @theme + variables + capas
│   ├── (módulos)/                # Rutas por dominio (proveedores, tienda, stock, pedidos)
│   │   ├── proveedores/
│   │   ├── tienda/
│   │   ├── stock/
│   │   └── pedidos/
│   └── api/                      # Rutas API solo cuando haga falta (webhooks, cron)
│
├── components/
│   ├── ui/                       # Primitivos atómicos (shadcn + cva)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── sonner.tsx
│   │   └── ...
│   ├── layout/                   # Shell, Sidebar, cabeceras de app
│   │   ├── AppShell.tsx
│   │   └── Sidebar.tsx
│   ├── shared/                   # Componentes reutilizables entre módulos
│   │   ├── ModalTablaConFiltros.tsx
│   │   └── SyncModal.tsx
│   ├── providers/                # Context/Provider (TooltipProvider, etc.)
│   └── [dominio]/                # Componentes por módulo (proveedores, tienda, pedidos, stock)
│       ├── proveedores/
│       ├── tienda/
│       ├── pedidos/
│       └── stock/
│
├── lib/                          # Utilidades, DB, validaciones
│   ├── utils.ts                  # cn() (clsx + tailwind-merge)
│   ├── prisma.ts
│   ├── format.ts
│   ├── validations/
│   └── ...
│
├── types/                        # Interfaces y tipos globales
│   ├── index.ts                  # Re-exportaciones
│   ├── producto.types.ts
│   ├── service.types.ts
│   └── components.types.ts       # Tipos para Modal/Drawer genéricos
│
├── actions/                      # Server Actions ("use server")
├── services/                     # Lógica de negocio y acceso a datos
└── hooks/                        # Hooks reutilizables
```

- **Nuevas vistas:** se añaden bajo `src/app/` siguiendo las rutas definidas en `.cursor/rules/rutas-frontend.mdc`.
- **Nuevos primitivos:** en `components/ui/`; los compuestos por dominio en `components/[dominio]/`.

---

## 2. Diseño atómico y DRY

### 2.1 Componentes en `/components/ui`

- **Un solo nivel de primitivos:** cada archivo exporta un componente (o grupo relacionado, ej. `Dialog`, `DialogTrigger`, `DialogContent`) con variantes controladas por **cva**.
- **Estilos:** solo clases Tailwind (o variables CSS definidas en `globals.css`). No estilos inline ni módulos CSS adicionales para estos componentes.
- **Variantes:** usar `cva()` con `variants` y `defaultVariants`; exponer los tipos con `VariantProps<typeof xxxVariants>`.

Ejemplo de patrón (ya usado en `button.tsx`):

```ts
const buttonVariants = cva("base...", {
  variants: { variant: { default: "...", outline: "..." }, size: { default: "...", icon: "..." } },
  defaultVariants: { variant: "default", size: "default" },
})

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>
```

- **Reutilización:** los módulos importan desde `@/components/ui` y opcionalmente desde `@/components/shared`. No duplicar lógica de estilo; si un patrón se repite, extraer a `ui` o `shared`.

### 2.2 Utilidad `cn()`

- Centralizada en `@/lib/utils` (clsx + tailwind-merge). Usar siempre `cn()` para combinar clases en componentes.

---

## 3. Componentes dinámicos (Modal / Drawer)

- **Objetivo:** un mismo componente base (por ejemplo `Dialog` de shadcn) se instancia con **props y genéricos**; el contenido y los datos dependen de la ruta o del caso de uso, sin duplicar la lógica del modal.
- **Patrón recomendado:**
  - Definir una **interfaz genérica** para el “contenido” del modal (por ejemplo `ModalContentProps<T>` en `src/types/components.types.ts`).
  - El componente de presentación recibe `data: T` y `onConfirm(data)` (o callbacks equivalentes). Quien usa el modal (página o componente de módulo) pasa los datos y las acciones.
  - No crear un modal nuevo por cada pantalla; componer con el mismo `Dialog`/`Drawer` y diferentes `children` o slots (header, body, footer) inyectados por props.

Ejemplo de tipo (ver `src/types/components.types.ts`):

```ts
// Modal genérico: el contenido recibe T y callbacks
export interface ModalContentProps<T, TSubmit = void> {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: T
  onSubmit?: (payload: TSubmit) => void | Promise<void>
  onCancel?: () => void
}
```

- **Drawer:** cuando se necesite, usar el mismo patrón (props + genéricos) con el componente Drawer de Radix/shadcn; el contenido y los datos se inyectan por props.

**Plantilla Modal App (referencia de diseño):** Para ventanas modales con el mismo diseño, estética y tamaño que “Edición masiva” en Lista Precios, usar la **Plantilla Modal App**. Nombre de referencia: **`modal-app`** (clase CSS en `DialogContent`). Estructura: `DialogContent className="modal-app"` → `DialogHeader` con `modal-app__header` + `DialogTitle` con `modal-app__title`; cuerpo en `div.modal-app__content` con `div.modal-app__body` y `div.modal-app__footer`. Los estilos están en `globals.css` (bloque “Modales .modal-app”). Implementación de referencia: `EdicionMasivaListaPreciosModal.tsx`.

**AppModal (componente estándar):** Layout wrapper para modales (`@/components/shared/AppModal`). **Header:** fondo corporativo #0072BB (`bg-primary`), texto blanco Geist centrado, sin bordes internos. **Cuerpo:** contenedor externo gris claro (`bg-background`); card interna blanca (`bg-white`) centrada con padding; contenido dinámico vía `children`. **Footer:** mismo gris claro (`bg-background`), botonera centrada verticalmente; acciones principales #0072BB con texto blanco; cancelar `variant="outline"` o `"ghost"`. Props documentadas: `title` (ReactNode), `children` (ReactNode), `actions` (ReactNode). Uso: `<Dialog open={open} onOpenChange={setOpen}><AppModal title="..." actions={<>...</>}>{contenido}</AppModal></Dialog>`.

**Fondo de superficie (contraste con blanco):** El gris de la **página** usa **`--surface`** (#64748b, `bg-surface`) en `body` y `main` (AppShell). El **AppModal** usa **`--background`** (#f8fafc, `bg-background`) para el contenedor externo del cuerpo y el footer, con header #0072BB y card blanca centrada en el cuerpo.

---

## 4. Tipado estricto

- **Por componente:** cada componente en `ui/` y en `shared/` debe tener sus props tipadas (interfaces o tipos exportados).
- **Genéricos:** para modales/drawers que trabajan con “datos de formulario” o “entidad”, usar `<T>` (y si aplica `TSubmit`) para que el tipo de `data` y `onSubmit` sea coherente en toda la ruta.
- **Tipos de dominio:** en `src/types/` (producto, proveedor, servicio, etc.); re-exportar desde `types/index.ts` cuando sea útil.
- **Evitar:** `any`; preferir `unknown` y narrowing si hace falta.

---

## 5. Configuración de archivos clave

| Archivo | Rol |
|--------|-----|
| `next.config.ts` | Configuración Next.js 16 |
| `tsconfig.json` | `paths`: `@/*` → `./src/*` |
| `components.json` | shadcn: style new-york, aliases `@/components`, `@/lib/utils`, `@/components/ui` |
| `src/app/globals.css` | Tailwind 4 (`@import "tailwindcss"`), `@theme inline`, variables, capas base/components/utilities |
| `src/app/layout.tsx` | Fuentes Geist, Toaster (Sonner), TooltipProvider, AppShell |
| `src/lib/utils.ts` | `cn()` para clases |
| `src/types/components.types.ts` | Interfaces base para modales/drawers reutilizables |

---

## 6. Flujo para nuevas vistas

1. **Ruta:** crear (o reutilizar) la ruta bajo `src/app/` según `.cursor/rules/rutas-frontend.mdc`.
2. **Página:** en la página, usar Server Components por defecto; cargar datos con Server Actions o `getData()` en el servidor.
3. **Ensamblado:** importar de `@/components/ui` y `@/components/shared` (o del dominio); inyectar contenido en modales/drawers mediante props y, si aplica, genéricos.
4. **Estilos:** respetar las reglas de `.cursor/rules/modulos.mdc` (header, filtros, tablas, botones, colores).

Cuando se indique una ruta concreta, se ensamblarán los componentes existentes inyectando el contenido necesario sin duplicar lógica.
