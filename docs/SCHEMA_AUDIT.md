# Auditoría schema.prisma — Lista Proveedores y Lista TiendaColor

## Relaciones actuales

```
Proveedor 1──N Producto
    │              │
    │              │ codExt (único) ←→ ItemTienda.codigoExterno (lógica de negocio)
    │              │
    │              N
    │         ItemTiendaProducto (tabla de vínculo many-to-many)
    │              N
    │              1
    └──────── ItemTienda
```

- **Producto.codExt** es el código externo único (por ejemplo `"ABC-123"`). Es la clave de enlace con TiendaColor.
- **ItemTienda.codigoExterno** es opcional y debe coincidir con algún **Producto.codExt** para vincular. No tiene restricción única en BD porque un mismo código puede venir de Dux con otro formato; el vínculo explícito es **ItemTiendaProducto**.

## Mejoras aplicadas

| Cambio | Motivo |
|--------|--------|
| `@@index([codigoExterno])` en **ItemTienda** | Búsquedas frecuentes por código externo (vinculos, aumentos, auto-vincular). Sin índice = full scan. |
| `@@index([habilitado])` en **ItemTienda** | Filtro `where: { habilitado: true }` en stock y listados. |

## Índices ya correctos

- **Producto:** `codExt` tiene `@unique` (índice único). Búsquedas por código externo sobre productos son eficientes.
- **Producto:** `@@index([proveedorId])` para listados por proveedor.
- **ItemTienda:** `codItem` `@unique`; `@@index([rubro])`, `@@index([marca])`.
- **ItemTiendaProducto:** `@@index([productoId])`; clave compuesta `(itemTiendaId, productoId)` como PK.

## Recomendaciones

1. **Mantener SSoT:** Todas las queries que devuelvan Producto con Proveedor o con vínculos a ItemTienda deben usar el mismo `include`/`select` (BASE_QUERY_INCLUDE) para evitar inconsistencias en la UI.
2. **No poner @unique en ItemTienda.codigoExterno:** Puede haber duplicados desde Dux; el vínculo canónico es ItemTiendaProducto.
3. Tras añadir índices: `npx prisma migrate dev --name add_codigo_externo_index`.
