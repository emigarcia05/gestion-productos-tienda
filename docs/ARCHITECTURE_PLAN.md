# Plan de profesionalización — Backend y base de datos

**Objetivo:** Centralizar Prisma, introducir capa de servicios, tipado estricto, manejo de errores uniforme e índices en el schema, con una estructura de carpetas clara.

---

## 1. Centralización de Prisma (Singleton)

### Estado actual

- `src/lib/prisma.ts` ya usa el patrón singleton con `globalThis` en desarrollo para no multiplicar conexiones con el hot reload.
- En producción no se asigna a `globalForPrisma`, por lo que en entornos serverless cada cold start puede crear un nuevo `Pool` y un nuevo `PrismaClient`.

### Cambios recomendados

1. **Persistir el cliente también en producción**  
   Asignar siempre a `globalThis` (no solo en desarrollo) para reutilizar una única instancia por proceso y evitar agotar conexiones:

   ```ts
   // src/lib/prisma.ts
   const prisma = globalForPrisma.prisma ?? createPrismaClient();
   if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;
   export { prisma };
   ```

2. **Configuración del Pool (opcional)**  
   Si en producción hay muchos workers, limitar `max` del pool según conexiones máximas de la BD (ej. `max: 10`) para no superar el límite de PostgreSQL.

3. **Documentar**  
   En el propio archivo o en un README de infra: “Un solo PrismaClient por proceso; no importar ni instanciar Prisma en otros sitios”.

**Resultado:** Un único cliente Prisma por proceso, sin riesgo de agotar conexiones en desarrollo ni en producción.

---

## 2. Patrón de servicios (Actions como “pasamanos”)

### Estado actual

- Toda la lógica (validación, Prisma, cálculos, revalidatePath) está dentro de `src/actions/*.ts`.
- Las actions son largas y mezclan: sesión, parseo de FormData, reglas de negocio y acceso a datos.

### Objetivo

- **`src/actions/`** → Solo funciones `"use server"` que: validan sesión/permisos, adaptan entrada (FormData/query params), llaman a **un único punto**: `src/services/`, y devuelven el resultado (con formato estándar si aplica).
- **`src/services/`** → Toda la lógica pesada: queries, transacciones, cálculos, transformaciones. Sin `"use server"`, sin `revalidatePath` (eso lo hace la action).

### Mapeo propuesto

| Action actual (lógica a mover) | Servicio nuevo | Responsabilidad del servicio |
|--------------------------------|----------------|------------------------------|
| `proveedores.ts` (crear, editar, eliminar, get*) | `services/proveedores.service.ts` | CRUD proveedores, generación de `codigoUnico`, comprobación de sufijo único. |
| `tienda.ts` (getControlAumentos, getUltimoSync, convertirEnProveedor) | `services/tienda.service.ts` | Cálculo de aumentos, lectura de SyncLog, lógica de “convertir ítem tienda en proveedor”. |
| `vinculos.ts` (getVinculos, buscarProductos, vincular, desvincular, autoVincular) | `services/vinculos.service.ts` | Búsqueda, vinculación/desvinculación ItemTienda–Producto. |
| `importar.ts` (importarProductos) | `services/importar.service.ts` | Aplicar mapeo, diff con existentes, create/update/delete en lote (transacciones). |
| `productos.ts` (actualizarPrecio, actualizarDisponible, accionMasiva) | `services/productos.service.ts` | Actualización de precios, disponibilidad y acciones masivas. |
| `stock.ts` (getControlStock, marcarImpresion) | `services/stock.service.ts` | Lectura de ítems por sucursal, agregación de marcas/rubros/subrubros, actualización de `ultimaImpresion`. |
| `sesion.ts` | **No mover** | Mantener en `lib/` o `actions/`; es infraestructura de sesión, no dominio. |

### Ejemplo de refactor (Actions → Services)

**Antes (action con lógica):**

```ts
// src/actions/proveedores.ts
export async function crearProveedor(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const nombre = (formData.get("nombre") as string)?.trim();
  // ... validaciones ...
  const sufijoExiste = await prisma.proveedor.findUnique({ where: { sufijo } });
  // ... más lógica y prisma.proveedor.create ...
  revalidatePath("/proveedores");
  return { ok: true, data: { id: proveedor.id } };
}
```

**Después:**

```ts
// src/actions/proveedores.ts
"use server";
import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import { crearProveedor as crearProveedorService } from "@/services/proveedores.service";
import type { ActionResult } from "@/lib/types";

export async function crearProveedor(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const nombre = (formData.get("nombre") as string)?.trim();
  const sufijo = (formData.get("sufijo") as string)?.trim().toUpperCase();
  const result = await crearProveedorService({ nombre, sufijo });
  if (result.ok) revalidatePath("/proveedores");
  return result;
}
```

```ts
// src/services/proveedores.service.ts
import { prisma } from "@/lib/prisma";
import { generarCodigoUnico } from "@/lib/codigos";
import type { ActionResult } from "@/lib/types";

export async function crearProveedor(payload: { nombre: string; sufijo: string }): Promise<ActionResult<{ id: string }>> {
  // Validaciones de negocio, findUnique, create, etc.
  // Sin revalidatePath, sin esEditor()
}
```

**Orden sugerido de migración:** proveedores → productos → stock → importar → vinculos → tienda (de más simple a más complejo).

---

## 3. Tipado estricto

### Estado actual

- Existe `ActionResult<T>` en `src/lib/types.ts` y se usa en varias actions.
- Algunas funciones devuelven tipos de Prisma sin envolver (ej. `getProveedores()`, `getControlStock()`).
- Interfaces de dominio (ej. `ItemAumento`, `ControlAumentosData`) están definidas en `actions/tienda.ts`.

### Cambios recomendados

1. **Mover tipos de dominio a `src/types/`**
   - `src/types/proveedores.ts` (si hace falta algo más que Prisma)
   - `src/types/tienda.ts` → `ItemAumento`, `GrupoAumento`, `ControlAumentosData`
   - `src/types/stock.ts` → `ItemStock`, `ControlStockData`, `Sucursal`
   - `src/types/importar.ts` → re-exportar/definir lo relacionado con importación
   - `src/types/vinculos.ts` → tipos de vínculos si no salen de Prisma

2. **Tipos de retorno explícitos**
   - Services: siempre `Promise<ActionResult<T>>` para mutaciones; para lecturas, `Promise<T>` con `T` inferido de Prisma o definido en `src/types/`.
   - Actions: mismo tipo que el servicio que llaman (o `ActionResult<T>` unificado).

3. **Reutilizar Prisma**
   - Donde el retorno sea exactamente un modelo o un `findMany`/`findUnique`, usar `Prisma.ProveedorGetPayload<{ include: ... }>` o tipos generados por Prisma para no duplicar interfaces.

4. **`src/types/index.ts`**
   - Re-exportar todos los tipos públicos para importaciones del tipo `import type { ItemAumento } from "@/types"`.

**Resultado:** Un solo lugar para tipos de dominio, retornos claros y alineados con Prisma o con `ActionResult<T>`.

---

## 4. Manejo de errores estándar (respuestas de Server Actions)

### Estado actual

- Parte de las actions usan `ActionResult<T>` (`{ ok, data?, error? }`).
- Otras (ej. `importar.ts`) hacen `throw new Error(...)` y no devuelven un objeto estándar.

### Estándar a adoptar

- **Todas las Server Actions que puedan fallar** deben devolver un objeto con forma conocida, sin `throw` para errores de negocio:

  ```ts
  type ActionResult<T = void> =
    | { success: true; data: T }
    | { success: false; error: string };
  ```

  (Se puede mantener `ok` si ya está muy usado; lo importante es unificar forma y nombre en todo el proyecto, p. ej. `success` + `data` + `error`.)

- **Responsabilidades:**
  - **Actions:** validar sesión, adaptar entrada, llamar al servicio, ejecutar `revalidatePath`, devolver el resultado del servicio.
  - **Services:** capturar excepciones de Prisma (o de lógica) y devolver `{ success: false, error: "mensaje" }` en lugar de relanzar; nunca hacer `throw` para errores de reglas de negocio esperables.

- **Migración:** Sustituir en `importarProductos` (y cualquier otra que haga `throw`) por un flujo que llame a un servicio y devuelva `ActionResult<ImportResult>` (o el tipo que defináis para importación).

- **Errores inesperados:** En el servicio se puede hacer `try/catch`: en el `catch` loguear y devolver `{ success: false, error: "No se pudo completar la operación." }` (o un mensaje genérico) para no filtrar detalles internos al cliente.

**Resultado:** Contratos claros para el front: siempre inspeccionar `success` y `error`/`data`, sin depender de excepciones.

---

## 5. Optimización de queries (índices en Prisma)

### Schema actual

- `Proveedor`: `codigoUnico` y `sufijo` tienen `@unique` (implícitamente indexados).
- `Producto`: `@@index([proveedorId])`, `codExt` unique.
- `ItemTienda`: `@@index([rubro])`, `@@index([marca])`, `codItem` unique.
- `ItemTiendaProducto`: `@@index([productoId])`.
- `Pedido`: `@@index([proveedorId])`.
- `PedidoItem`: `@@index([pedidoId])`.
- `ImportLog`: sin índices adicionales.

### Índices sugeridos

| Modelo | Campo(s) | Uso |
|--------|----------|-----|
| **ItemTienda** | `codigoExterno` | Búsquedas y joins por código externo (vinculos, aumentos). |
| **ItemTienda** | `habilitado` | Filtro en listados de stock/tienda. |
| **ItemTienda** | `(habilitado, descripcion)` o `(habilitado, codItem)` | Listados ordenados de stock. |
| **Producto** | `(proveedorId, codExt)` | Ya existe índice en `proveedorId`; si hay muchas búsquedas por `codExt` dentro de un proveedor, considerar compuesto. |
| **ImportLog** | `proveedorId`, `createdAt` | Consultas “últimas importaciones por proveedor” o por fecha. |

Ejemplo en `schema.prisma`:

```prisma
model ItemTienda {
  // ...
  @@index([codigoExterno])
  @@index([habilitado])
  @@index([rubro])
  @@index([marca])
  @@map("items_tienda")
}

model ImportLog {
  // ...
  @@index([proveedorId])
  @@index([createdAt])
  @@map("import_logs")
}
```

Después de tocar el schema: `npx prisma migrate dev --name add_search_indexes` (o el nombre que prefieras).

**Resultado:** Menos full scans en tablas grandes en filtros por `codigoExterno`, `habilitado`, `proveedorId` e `createdAt`.

---

## 6. Estructura de carpetas recomendada

```
src/
├── actions/           # Solo "use server": validar sesión, llamar a services, revalidar, devolver resultado
│   ├── proveedores.ts
│   ├── tienda.ts
│   ├── vinculos.ts
│   ├── importar.ts
│   ├── productos.ts
│   ├── stock.ts
│   └── sesion.ts      # Sesión: se puede dejar aquí o en lib
├── services/          # Lógica de negocio y datos (sin "use server")
│   ├── proveedores.service.ts
│   ├── tienda.service.ts
│   ├── vinculos.service.ts
│   ├── importar.service.ts
│   ├── productos.service.ts
│   └── stock.service.ts
├── lib/               # Configuración e infraestructura compartida
│   ├── prisma.ts
│   ├── sesion.ts
│   ├── types.ts       # ActionResult y tipos compartidos mínimos
│   ├── codigos.ts
│   ├── calculos.ts
│   ├── busqueda.ts
│   ├── parsearImport.ts
│   ├── duxApi.ts
│   ├── format.ts
│   ├── permisos.ts
│   └── utils.ts
├── types/             # Tipos de dominio y DTOs
│   ├── index.ts
│   ├── tienda.ts
│   ├── stock.ts
│   ├── importar.ts
│   └── vinculos.ts
└── app/
    ├── api/           # Solo webhooks e integraciones externas (ej. Dux sync)
    │   └── sync-tienda/
    │       └── route.ts
    └── ...
```

**Reglas rápidas:**

- **actions:** Solo entrada/salida de usuario, permisos y revalidación; delegar todo lo demás a `services/`.
- **services:** Sin `"use server"`, sin `revalidatePath`; reciben datos ya parseados y devuelven tipos claros o `ActionResult<T>`.
- **lib:** Prisma, sesión, utilidades, helpers de negocio reutilizables (codigos, calculos, parsearImport, duxApi).
- **types:** Interfaces y tipos de dominio/DTO; re-export en `types/index.ts`.
- **app/api:** Solo para integraciones externas (sync Dux, futuros webhooks); no poner lógica de negocio pesada aquí, sino llamar a un servicio si hace falta.

---

## 7. Orden de implementación sugerido

1. **Prisma singleton** (y opcionalmente Pool) en `src/lib/prisma.ts` — cambio acotado.
2. **Tipos** — Crear `src/types/`, mover interfaces de `actions/tienda.ts`, `actions/stock.ts`, etc., y unificar `ActionResult` en `lib/types.ts` (o re-export desde `types`).
3. **Estándar de errores** — Decidir nombre (`ok` vs `success`) y que todas las actions que hoy hacen `throw` pasen a devolver `ActionResult<T>`; adaptar servicios que se vayan extrayendo.
4. **Primer servicio** — Extraer lógica de `proveedores.ts` a `services/proveedores.service.ts` y dejar las actions como pasamanos.
5. **Resto de servicios** — Repetir el patrón para productos, stock, importar, vinculos, tienda.
6. **Índices** — Añadir en `schema.prisma` y crear migración.
7. **Documentación** — Actualizar README o un doc de arquitectura indicando: “Actions = pasamanos; Services = cerebro; API = solo integraciones externas”.

---

## 8. Checklist final

- [ ] Prisma: un solo cliente por proceso (global en dev y prod).
- [ ] Services: toda la lógica pesada en `src/services/`; actions solo validan y llaman.
- [ ] Tipos: dominio en `src/types/`; retornos explícitos y alineados con Prisma o `ActionResult<T>`.
- [ ] Errores: todas las actions devuelven `{ success, data?, error? }` (o equivalente unificado); sin `throw` para errores de negocio.
- [ ] Schema: índices en `codigoExterno`, `habilitado` (y compuestos si aplica), `ImportLog(proveedorId, createdAt)`.
- [ ] Estructura: `actions/` delgadas, `services/` como cerebro, `lib/` para configuración, `types/` para tipos de dominio, `app/api/` solo para integraciones externas.

Con esto la webapp queda con una base backend más clara, mantenible y alineada con Next.js 15+ y Prisma 7.

---

## 9. Implementación DAL (Lista Proveedores ↔ TiendaColor) — Realizado

- **Schema:** Añadidos `@@index([codigoExterno])` y `@@index([habilitado])` en `ItemTienda`. Auditoría en `docs/SCHEMA_AUDIT.md`.
- **Tipos:** `src/types/service.types.ts` (`ServiceResult<T>`), `src/types/producto.types.ts` (`ProductoCompleto`, `ProveedorResumen`), `src/types/index.ts`.
- **Servicio:** `src/services/producto.service.ts` con `BASE_QUERY_INCLUDE_PRODUCTO` (Single Source of Truth), `getProductosVinculadosPorItemTienda` y `buscarProductos` devolviendo `ServiceResult<ProductoCompleto[]>`.
- **Actions:** `getVinculos` y `buscarProductos` en `src/actions/vinculos.ts` delegan al servicio y devuelven `ServiceResult<ProductoCompleto[]>`.
- **UI:** `VincularModal` y `SeleccionarProductoModal` actualizados para usar `result.success` y `result.data` / `result.error`.
