# Scripts de base de datos (Neon)

Todos los scripts se ejecutan **desde la terminal** en la raíz del proyecto. Solo usá el dashboard de Neon para revisar datos o estructura.

## Comandos npm

| Comando | Descripción |
|--------|-------------|
| `npm run db:test` | Prueba la conexión a la base de datos (DATABASE_URL en .env). |
| `npm run db:init-schema` | Crea o actualiza la tabla `proveedores` para que coincida con el schema de Prisma (id TEXT, nombre, sufijo, codigo_unico, created_at, updated_at). |
| `npm run db:migrate-neon` | Igual que `db:init-schema`: ejecuta la migración que alinea `proveedores` con Prisma (renombra `abreviatura` → `sufijo`, añade columnas si faltan, convierte id a TEXT). |
| `npm run db:migrate-descripciones` | Aplica cambios de columnas: agrega `lista_precios_proveedores.descripcion_proveedor` y renombra `lista_precios_tienda.descripcion` → `descripcion_tienda`. |
| `npm run db:create-lista-precios` | Crea la tabla `lista_precios_proveedores` en Neon (FK a `proveedores` ON DELETE CASCADE, trigger para `cod_ext`, columna generada `px_compra_final`). |
| `npm run db:create-lista-precios-tienda` | Crea la tabla `lista_precios_tienda` (columna `cod_ext`; sin FK; índice en `cod_ext`). |
| `npm run db:fix-lista-precios-tienda-cod-ext` | Solo para tablas creadas con versión antigua: renombra `cod_externo` → `cod_ext`. |
| `npm run db:simulate-api-tienda` | Simula llegada de datos de la API: hace upsert de filas de prueba en `lista_precios_tienda`. |
| `npm run db:generate` | Regenera el cliente Prisma. |
| `npm run db:push` | Sincroniza el schema de Prisma con la BD (crea/actualiza tablas). |
| `npm run db:studio` | Abre Prisma Studio para ver/editar datos. |

## Cuándo usar qué

- **Primera vez o tabla desactualizada:** `npm run db:migrate-neon` (o `npm run db:init-schema`).
- **Solo probar conexión:** `npm run db:test`.
- **Revisar datos:** Neon Dashboard o `npm run db:studio`.

Asegurate de tener `DATABASE_URL` en el `.env` antes de ejecutar cualquier script.

## Error P2022 en lista_precios_tienda

Si al usar la app o la sincronización DUX ves **"The column (not available) does not exist"** (P2022) en `listaPrecioTienda`, la tabla en la base de datos tiene la columna `cod_externo` y Prisma espera `cod_ext`. Ejecutá **una** de estas opciones:

1. **Recomendado:** `npx prisma migrate deploy` (aplica todas las migraciones pendientes, incluyendo el renombrado).
2. **Solo esta tabla:** `npm run db:fix-lista-precios-tienda-cod-ext` (renombra `cod_externo` → `cod_ext` si existe).

## Seguridad: lista_precios_tienda

La tabla `lista_precios_tienda` es **solo escritura desde la lógica de sincronización con la API**. En el frontend, el usuario final solo debe tener **lectura** (SELECT). No exponer en la UI acciones de crear, editar o borrar filas de esta tabla; solo la integración con la API externa debe hacer INSERT/UPDATE (upsert).
