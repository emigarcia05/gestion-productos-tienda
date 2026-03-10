# API DUX – Actualización de costos

Este documento describe el contrato del endpoint de la API DUX para **actualizar costos** de ítems.  
**No** existe en la documentación DUX un POST para actualizar stock; solo se puede actualizar costo mediante este endpoint.

## Endpoint

- **Método:** `POST`
- **URL:** `https://erp.duxsoftware.com.ar/WSERP/rest/services/item/nuevoItem`
- **Headers:**
  - `accept: application/json`
  - `authorization: <DUX_API_TOKEN>` (credencial en variable de entorno `DUX_API_TOKEN`)
  - `content-type: application/json`

## Cuerpo del request (JSON)

Formato según [documentación DUX](https://duxsoftware.readme.io/reference/modificar-preciosproductos):

```json
{
  "productos": [
    { "cod_item": "2578", "id_proveedor": 1960007, "costo": 100 }
  ]
}
```

- **Clave raíz:** `productos` (array de hasta 50 ítems).
- **`id_proveedor`** debe ser **número** (la app convierte desde `proveedores.id_proveedor_dux`).

| Campo          | Tipo   | Descripción                                      |
|----------------|--------|--------------------------------------------------|
| `cod_item`     | string | Código del ítem en DUX (ej. código de tienda).  |
| `costo`        | number | Nuevo costo a enviar.                            |
| `id_proveedor` | number | ID del proveedor en DUX (origen del costo).      |

En nuestra aplicación, el valor de `id_proveedor` se obtiene del campo **`proveedores.id_proveedor_dux`** (convertido a número al enviar). La exportación envía lotes de hasta 50 ítems por petición, con una pausa de 5 segundos entre lotes (límite de la API).
