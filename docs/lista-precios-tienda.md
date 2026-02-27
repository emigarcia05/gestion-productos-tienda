# lista_precios_tienda

Tabla alimentada **exclusivamente por una API externa**. Sin Foreign Keys; datos de solo lectura para el usuario final en el frontend.

## Cruce con proveedores

El campo `proveedor` es texto libre. Para buscar coincidencias con la tabla `proveedores` (por nombre):

```sql
SELECT t.*, p.id AS proveedor_id, p.sufijo
FROM lista_precios_tienda t
LEFT JOIN proveedores p ON p.nombre ILIKE t.proveedor OR p.nombre = t.proveedor;
```

En la aplicación (Prisma o SQL), usar la misma lógica: `proveedores.nombre ILIKE lista_precios_tienda.proveedor` para matchear aunque el texto de la API no sea exactamente igual.

## Cruce con lista_precios_proveedores

Para unir por producto (código externo):

```sql
SELECT t.*, lp.px_lista_proveedor, lp.px_compra_final
FROM lista_precios_tienda t
LEFT JOIN lista_precios_proveedores lp ON lp.cod_ext = t.cod_externo;
```

El índice en `cod_externo` (PK) hace que estos JOINs sean rápidos.

## Seguridad

- **Solo la lógica de sincronización con la API** debe escribir (INSERT/UPDATE upsert) en esta tabla.
- El frontend debe usar **solo lectura** (SELECT); no exponer create/update/delete de `lista_precios_tienda` al usuario final.
