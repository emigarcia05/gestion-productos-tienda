# Guía Backend — Next.js 16 App Router

Documento de referencia para desarrolladores y **asistentes IA** que crean o modifican Server Actions, servicios y validaciones. Sigue estas reglas para mantener seguridad, integridad de datos y arquitectura limpia.

---

## 1. Principios de implementación

### 1.1 Server Actions (`src/actions/`)

- **Ubicación**: Todas las Server Actions viven en `src/actions/`, con `"use server"` al inicio del archivo.
- **Firma**: Siempre `async`, con tipado estricto. **Prohibido `any`**.
- **Rol**: Son **controladores de entrada/salida**: validan sesión/rol, validan payload con Zod, delegan lógica a servicios, devuelven un formato de respuesta estándar.
- **No** contienen lógica de negocio compleja ni acceso directo a Prisma (salvo casos legacy documentados); esa lógica va en `src/services/`.

### 1.2 Seguridad y autorización

- **Sesión**: Se usa **iron-session** vía `@/lib/sesion`: `getSesion()`, `getRol()`, `esEditor()`.
- **Regla de oro**: Toda Action que **modifique datos** (crear, actualizar, eliminar) o exponga datos sensibles **debe** comprobar sesión/rol **al inicio**, antes de cualquier lógica.
- **Lecturas**: Las Actions de solo lectura pueden no comprobar rol si la página ya restringe acceso; para consistencia y futuras APIs, se recomienda comprobar acceso con `getRol()` + `puede(rol, PERMISOS.*)` cuando exista permiso definido en `@/lib/permisos`.
- **Helpers**: `esEditor()` para “solo editor”; para permisos granulares usar `getRol()` y `puede(rol, PERMISOS.modulo.accion)` desde `@/lib/permisos`.

### 1.3 Integridad de datos

- **Validación obligatoria**: Todo payload que toque la base de datos (IDs, FormData, objetos de entrada) **debe** validarse con **Zod (v4)** antes de usarse.
- **Dónde validar**: En la Action (recomendado) o en el servicio si la misma validación se reutiliza en varios puntos.
- **Método**: Usar `.safeParse()`. En caso de error, mapear a mensaje legible y devolver `{ ok: false, error: string }`.

### 1.4 Arquitectura limpia

- **Servicios** (`src/services/`): Encapsulan acceso a datos (Prisma, SQL raw) y lógica de negocio. Las Actions los invocan; no al revés.
- **Actions**: Orquestan: sesión → validación → servicio → revalidatePath → respuesta.

### 1.5 Manejo de errores y respuestas

- **Formato estándar para el frontend**:  
  - **Actions que pueden fallar**: `ActionResult<T>` desde `@/lib/types`:  
    `{ ok: true, data: T } | { ok: false, error: string }`.  
  - **Servicios**: `ServiceResult<T>` desde `@/types` (o `@/types/service.types`):  
    `{ success: true, data: T } | { success: false, error: string }`.
- **No** lanzar errores al cliente desde Actions; capturar y devolver `{ ok: false, error: string }`.
- **Excepciones**: `sesion.ts` (activar/desactivar editor) puede devolver `{ ok, error? }` por conveniencia; el resto debe tender a `ActionResult` cuando haya flujo de éxito/error.

---

## 2. Esquemas de referencia

### 2.1 Action con sesión + Zod + servicio (patrón “perfecto”)

```ts
"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import { createProveedorSchema } from "@/lib/validations/proveedor";
import * as proveedorService from "@/services/proveedor.service";

export async function crearProveedor(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const raw = {
    nombre: (formData.get("nombre") as string) ?? "",
    prefijo: (formData.get("prefijo") as string) ?? "",
  };
  const parsed = createProveedorSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = first.nombre?.[0] ?? first.prefijo?.[0] ?? "Datos inválidos.";
    return { ok: false, error: msg };
  }

  try {
    const { id } = await proveedorService.createProveedor(parsed.data);
    revalidatePath("/proveedores");
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al crear el proveedor.";
    return { ok: false, error: message };
  }
}
```

### 2.2 Action con permiso granular (getRol + puede)

```ts
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export async function actualizarListaPreciosMasivoAction(
  ids: string[],
  data: ActualizacionMasivaListaPrecios
): Promise<ActionResult<{ actualizados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para edición masiva." };
  }
  const parsedIds = z.array(z.string().uuid()).safeParse(ids);
  if (!parsedIds.success) return { ok: false, error: "IDs inválidos." };
  const parsedData = actualizacionMasivaListaPreciosSchema.safeParse(data);
  if (!parsedData.success) return { ok: false, error: "Datos de actualización inválidos." };

  const result = await actualizarListaPreciosMasivo(parsedIds.data, parsedData.data);
  if (result.error) return { ok: false, error: result.error };
  revalidatePath("/proveedores/lista-precios");
  return { ok: true, data: { actualizados: result.actualizados } };
}
```

### 2.3 Esquema Zod (v4) típico

```ts
// src/lib/validations/proveedor.ts
import { z } from "zod";

export const createProveedorSchema = z.object({
  nombre: z.string().min(1).transform((s) => s.trim()).refine((s) => s.length >= 2, "Mín. 2 caracteres"),
  prefijo: z.string().min(1).transform((s) => s.trim().toUpperCase()).refine((s) => /^[A-Z]{3}$/.test(s), "3 letras A-Z"),
});
export type CreateProveedorFormData = z.infer<typeof createProveedorSchema>;
```

### 2.4 Tipos de respuesta estándar

```ts
// @/lib/types (para Actions)
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// @/types o @/types/service.types (para servicios)
export type ServiceResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```

---

## 3. Diccionario de tipos

| Origen | Uso |
|--------|-----|
| `@/lib/types` | `ActionResult<T>` — respuestas de Server Actions |
| `@/types` o `@/types/service.types` | `ServiceResult<T>` — respuestas de servicios |
| `@/types/producto.types` | `ProductoCompleto`, `ProveedorResumen`, etc. |
| `@/types/components.types` | Props de modales, drawers, confirmaciones |
| `@/lib/permisos` | `Rol`, `PERMISOS`, función `puede(rol, permiso)` |
| `@/lib/sesion` | `SesionData`, `getSesion()`, `getRol()`, `esEditor()` |

Al extender tipos de dominio, preferir `src/types/*.ts`; para tipos ligados a validación, usar `z.infer<typeof schema>` en `src/lib/validations/*.ts`.

---

## 4. Checklist de autocorrección (para IAs)

Antes de entregar código nuevo o modificado, verificar:

- [ ] **Sesión/rol**: ¿Toda Action que modifica datos comprueba `esEditor()` o `getRol()` + `puede()` al inicio?
- [ ] **Zod**: ¿Todo payload de entrada (IDs, FormData, objetos) se valida con un esquema Zod antes de usarse en BD o servicios?
- [ ] **Sin `any`**: ¿El código evita `any` y usa tipos explícitos o inferidos?
- [ ] **ActionResult**: ¿Las Actions que pueden fallar devuelven `ActionResult<T>` con `{ ok, data? }` o `{ ok: false, error }`?
- [ ] **No throw al cliente**: ¿Los errores se capturan y se devuelven como `{ ok: false, error: string }` en lugar de lanzar?
- [ ] **Lógica en servicios**: ¿La lógica de negocio y el acceso a Prisma están en `src/services/` y no en la Action?
- [ ] **revalidatePath**: ¿Se llama a `revalidatePath` (o `revalidateTag`) tras mutaciones que afectan a rutas concretas?
- [ ] **Permisos**: Si existe un permiso en `PERMISOS` para la funcionalidad, ¿se usa `puede(rol, PERMISOS.*)` en lugar de solo `esEditor()` cuando aplique?

---

## 5. Resumen de auditoría (edición actual)

### 5.1 Cumplen bien

- **proveedores.ts**: `esEditor()`, Zod para crear/editar, `ActionResult`, servicios.
- **listaPrecios.ts**: `getRol()` + `puede()` para edición masiva; falta validación Zod del payload en la Action.
- **comparacionCategorias.ts**: `getRol()` + `puede()` en todas las Actions; falta Zod en parámetros (ids, nombres, etc.) y unificación de formato de respuesta (`ok`/`data`/`error`).

### 5.2 A mejorar

- **pedidos.ts**: Sin comprobación de sesión; datos mock. Cuando haya datos reales, añadir al menos verificación de acceso y, si hay escritura, validación Zod.
- **tienda.ts**: `getTiendaPageData` y `getControlAumentos` sin verificación de sesión (aceptable si la ruta ya está protegida); `convertirEnProveedor` correcto con `esEditor()`. Lógica de tienda muy cargada en la Action; considerar mover a servicio.
- **stock.ts**: Sin comprobación de sesión en `getControlStock` ni en `registrarImpresion`; `registrarImpresion` sin validación de `ids`.
- **syncListaPrecioTienda.ts**: La Action no comprueba rol; la sincronización con DUX debe restringirse a editores (`esEditor()` o `PERMISOS.tienda.acciones.sincronizar`).
- **importar.ts**: Usa `throw new Error` en lugar de `return { ok: false, error }`; no devuelve `ActionResult`. Falta validación Zod de `proveedorId`, `filasCrudas`, `mapeo`.
- **vinculos.ts**: `vincularProducto` / `desvincularProducto` correctos en sesión; falta validación Zod de IDs (UUIDs). Lógica de vinculación podría moverse a servicio.
- **productos.ts**: `esEditor()` correcto; sin Zod para `id`, `campos`, `campo`, `valor`; respuestas ya en formato `ActionResult`.
- **sesion.ts**: `activarModoEditor` recibe `clave` sin validación Zod (string no vacío); aceptable por contexto; respuesta ya coherente.

### 5.3 Reglas añadidas en esta guía

- Validar con Zod **todos** los payloads que afecten a la BD.
- Acción de sincronización DUX protegida por rol.
- Estandarizar respuestas de error: no `throw`, sí `ActionResult` con `error`.
- Documentar uso de `getRol()` + `puede()` para permisos granulares.

### 5.4 Cambios aplicados en esta auditoría

| Archivo / Área | Cambio |
|----------------|--------|
| `src/actions/syncListaPrecioTienda.ts` | Comprobación `esEditor()` al inicio; si no hay permiso, se devuelve resultado vacío con `errores: ["Sin permisos de editor."]`. |
| `src/actions/importar.ts` | `importarProductos` e `importarListaPreciosProveedor` devuelven `ImportActionResult` (éxito con `data` o error con `error`) en lugar de lanzar; try/catch en importar lista para devolver error controlado. |
| `src/actions/listaPrecios.ts` | `actualizarListaPreciosMasivoAction`: validación con `idsUuidSchema` y `actualizacionMasivaListaPreciosSchema` antes de llamar al servicio. |
| `src/lib/validations/listaPrecios.ts` | Nuevo: esquemas `idsUuidSchema` y `actualizacionMasivaListaPreciosSchema` para edición masiva. |
| `src/components/proveedores/ImportarModal.tsx` | Manejo de respuesta: comprueba `res.ok` y usa `res.data` o `res.error` según corresponda. |
| **Fase 2 (cierre de auditoría)** | |
| `src/actions/pedidos.ts` | `getPedidoUrgenteData`: comprobación `getRol()` + `puede(rol, PERMISOS.pedidos.acceso)`; si no hay acceso se devuelve estructura vacía (proveedores mock, productos [], total 0). |
| `src/actions/stock.ts` | `getControlStock`: comprobación `getRol()` + `puede(rol, PERMISOS.stock.acceso)`; retorno vacío si no hay acceso. `registrarImpresion`: retorno `ActionResult<void>`, validación de `ids` con Zod (UUIDs), comprobación de acceso; componente muestra toast en error. |
| `src/actions/vinculos.ts` | `vincularProducto` y `desvincularProducto`: validación de IDs con `uuidSchema` antes de tocar Prisma. |
| `src/actions/productos.ts` | `editarProducto`: validación con `editarProductoSchema` (id + campos). `aplicarCampoMasivo`: validación con `aplicarCampoMasivoSchema` (proveedorId, campo, valor, q). |
| `src/actions/comparacionCategorias.ts` | Todas las acciones devuelven `ActionResult<T>` unificado; validación Zod para todos los parámetros (UUIDs, nombres, etc.) vía `src/lib/validations/comparacionCategorias.ts`; respuestas de error solo `{ ok: false, error }`; asignar/quitar asignación devuelven `data: { count }`. |
| `src/lib/validations/common.ts` | Nuevo: `uuidSchema`, `uuidsSchema`, `paramsPaginaSchema` reutilizables. |
| `src/lib/validations/productos.ts` | Nuevo: `camposEditablesProductoSchema`, `editarProductoSchema`, `campoMasivoSchema`, `aplicarCampoMasivoSchema`. |
| `src/lib/validations/comparacionCategorias.ts` | Nuevo: esquemas para CRUD categorías, subcategorías, presentaciones y asignación de productos. |
| Componentes comparación/stock | `ComparacionCategoriasClient`: uso de `res.data` en `getProductosPorPresentacionAction`. `AsignarProductosModal`: uso de `res.data?.count`. `TablaStock`: manejo de `registrarImpresion` con toast en error. |

---

*Última actualización: auditoría backend completada — sesión, Zod, ActionResult y permisos en todas las actions.*
