# Patrones Backend — Refactorización y convenciones

Documento de referencia para mantener coherencia en actions, services, lib y Prisma. Usar estos patrones en nuevas implementaciones y refactors.

---

## 1. Formato de respuesta de Server Actions

**Problema:** Respuestas inconsistentes (`ok` vs `success`, `data` vs propiedades sueltas).

**Solución:** Todas las Server Actions que pueden fallar deben devolver `ActionResult<T>` desde `@/lib/types`:

- Éxito: `{ ok: true, data: T }`
- Error: `{ ok: false, error: string }`

**Snippet de referencia:**

```ts
import type { ActionResult } from "@/lib/types";

export async function miAction(id: string): Promise<ActionResult<{ count: number }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos." };
  try {
    const result = await miServicio.ejecutar(id);
    return { ok: true, data: { count: result.count } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado.";
    return { ok: false, error: msg };
  }
}
```

En el cliente, comprobar `result.ok` y usar `result.data` o `result.error` según corresponda.

---

## 2. Validación con Zod (DRY crear/editar)

**Problema:** Validación duplicada en crear y editar (mismos campos, misma lógica).

**Solución:** Definir un schema Zod (ej. `createProveedorSchema`) y reutilizarlo en editar como `updateProveedorSchema` (mismo shape). En la action usar `.safeParse()` y mapear errores de campo al mensaje de `ActionResult`.

**Snippet de referencia:**

```ts
// lib/validations/proveedor.ts
export const createProveedorSchema = z.object({
  nombre: z.string().min(1).transform(s => s.trim()).refine(s => s.length >= 2, "Mínimo 2 caracteres."),
  prefijo: z.string().min(1).transform(s => s.trim().toUpperCase()).refine(s => /^[A-Z]{3}$/.test(s), "3 letras A-Z."),
});
export const updateProveedorSchema = createProveedorSchema;

// action
const parsed = updateProveedorSchema.safeParse(raw);
if (!parsed.success) {
  const first = parsed.error.flatten().fieldErrors;
  const msg = first.nombre?.[0] ?? first.prefijo?.[0] ?? "Datos inválidos.";
  return { ok: false, error: msg };
}
await proveedorService.updateProveedor({ id, ...parsed.data, idProveedorDux });
```

---

## 3. Obtener un solo proveedor sin cargar toda la lista

**Problema:** Llamar a `getProveedores()` y hacer `.find(p => p.id === id)` cuando solo se necesita un proveedor (ej. importar lista de precios).

**Solución:** Usar `getProveedorById(id)` del servicio de proveedores. Devuelve `Pick<ProveedorListItem, "id" | "nombre" | "prefijo"> | null`.

**Snippet de referencia:**

```ts
import { getProveedorById } from "@/services/proveedor.service";

const proveedor = await getProveedorById(proveedorId);
if (!proveedor) throw new Error("Proveedor no encontrado.");
const prefijo = proveedor.prefijo;
```

---

## 4. Respuesta vacía con opciones de filtros (tienda / stock)

**Problema:** Mismo bloque repetido: sin filtros o sin resultados, devolver `items: []` y las listas de marcas/rubros/subRubros para los desplegables.

**Solución:** Extraer una función interna (ej. `getTiendaEmptyWithOpciones()`) que ejecuta los `findMany` distinct de marcas, rubros y subRubros y devuelve el objeto con `items: []`, `total: 0`, `marcas`, `rubros`, `subRubros`, etc. Reutilizarla en todos los early-return que comparten ese shape.

**Snippet de referencia:**

```ts
async function getTiendaEmptyWithOpciones() {
  const [rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({ select: { rubro: true }, distinct: ["rubro"], where: { rubro: { not: null } }, orderBy: { rubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { subRubro: true }, distinct: ["subRubro"], where: { subRubro: { not: null } }, orderBy: { subRubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { marca: true }, distinct: ["marca"], where: { marca: { not: null } }, orderBy: { marca: "asc" } }),
  ]);
  return {
    items: [],
    total: 0,
    marcas: marcasDistinct.filter(m => m.marca != null).map(m => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter(r => r.rubro != null).map(r => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct.filter(s => s.subRubro != null).map(s => ({ subRubro: s.subRubro! })),
    setMejorPrecio: new Set<string>(),
    totalPaginas: 0,
  };
}
```

---

## 5. Where para dimensiones “distinct” (excluir una dimensión)

**Problema:** Construir `whereMarcas`, `whereRubros`, `whereSubRubros` repitiendo la misma lógica: `baseWhere("marca")` + `{ marca: { not: null } }`.

**Solución:** Helper `toWhereWithNotNull(exclude)` que recibe la dimensión a excluir, llama a `baseWhere(exclude)` y combina con `{ [key]: { not: null } }`. Reutilizar para las tres dimensiones.

**Snippet de referencia:**

```ts
const toWhereWithNotNull = (exclude: "marca" | "rubro" | "subRubro"): Prisma.ListaPrecioTiendaWhereInput => {
  const parts = baseWhere(exclude);
  const key = exclude;
  const notNull = { [key]: { not: null } } as Prisma.ListaPrecioTiendaWhereInput;
  return parts.length > 0 ? { AND: [...parts, notNull] } : notNull;
};
const whereMarcas = toWhereWithNotNull("marca");
const whereRubros = toWhereWithNotNull("rubro");
const whereSubRubros = toWhereWithNotNull("subRubro");
```

---

## 6. Porcentajes 0–100 (dto_*, cx_transporte)

**Problema:** Repetir `Math.round(Math.max(0, Math.min(100, value)))` en varios sitios.

**Solución:** Usar `clampPercent(value)` de `@/lib/calculos` en servicios que actualicen campos de porcentaje (lista precios masivo, etc.).

**Snippet de referencia:**

```ts
import { clampPercent } from "@/lib/calculos";

if (data.dtoRubro !== undefined) updatePayload.dtoRubro = clampPercent(data.dtoRubro);
if (data.cxTransporte !== undefined) updatePayload.cxTransporte = clampPercent(data.cxTransporte);
```

---

## 7. Tipado en updates Prisma (evitar `Record<string, unknown>`)

**Problema:** Construir el payload de `update()` con `Record<string, unknown>` y perder type-safety.

**Solución:** Definir un tipo explícito para los campos actualizables (ej. `UpdatePresentacionData`) y usarlo tanto para el parámetro de la función como para el objeto que se pasa a `prisma.*.update({ data: payload })`.

**Snippet de referencia:**

```ts
export type UpdatePresentacionData = {
  nombre?: string;
  orden?: number;
  subcategoriaId?: string;
  costoCompraObjetivo?: number | null;
};

export async function updatePresentacion(id: string, data: UpdatePresentacionData) {
  const payload: UpdatePresentacionData = {};
  if (data.nombre !== undefined) payload.nombre = data.nombre;
  if (data.orden !== undefined) payload.orden = data.orden;
  // ...
  return prisma.presentacionComparacion.update({ where: { id }, data: payload });
}
```

---

## 8. Código muerto y logs de depuración

**Problema:** Llamadas a `fetch()` de agent log o exports no usados (ej. `BASE_QUERY_INCLUDE_PRODUCTO`, `buscarProductos` mock) que no aportan en producción.

**Solución:** Eliminar bloques `#region agent log` y funciones/exports que no sean referenciados por ningún módulo. Mantener solo lo que usa la app o tests.

---

## Resumen de archivos tocados en la auditoría

| Área        | Cambio principal                                                                 |
|------------|------------------------------------------------------------------------------------|
| actions    | `ActionResult` en listaPrecios; Zod en editarProveedor; getTiendaEmptyWithOpciones |
| services   | getProveedorById; clampPercent en listaPrecios; UpdatePresentacionData; sin agent log |
| lib        | updateProveedorSchema; clampPercent en calculos                                    |
| stock/tienda | toWhereWithNotNull; getTiendaEmptyWithOpciones                                   |
