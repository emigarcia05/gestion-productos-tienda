# Manual: cálculo de sobrestock en pedidos de reposición

Documento orientado a **desarrollo frontend** (y revisión funcional). Describe cómo el backend determina si hay “sobrestock” antes de generar un pedido al proveedor, **sin** depender de columnas en base de datos que guarden “excedente”: el valor se **calcula** en cada consulta.

---

## 1. Cuándo aplica

- Solo en el flujo de **Generar pedido** cuando la selección de tipos incluye **`REPOSICION`**.
- El cálculo considera **un proveedor** y **una sucursal** a la vez (`guaymallen` o `maipu`), igual que la tabla de envío.
- Objetivo de producto: **advertir** al usuario si va a pedir mercadería teniendo ya stock “de más” según reglas de negocio, y opcionalmente **bloquear** hasta que confirme.

---

## 2. Fuentes de datos (lectura)

| Concepto | Origen | Notas para UI |
|----------|--------|----------------|
| Stock por sucursal | Tabla `precios_tienda` (`ListaPrecioTienda`) | Campos `stock_maipu` y `stock_guaymallen`. Se elige uno según la sucursal del pedido. |
| Tope / configuración de reposición | Tabla `pedidos_mercaderia` (modelo `ItemPedidoEnvio`) | Campo `reposicion_cant_conf`. Si es **mayor que 0**, se considera que el ítem **tiene configuración de reposición**. Si es `null` o `≤ 0`, **no** tiene tope configurado para estas reglas. |
| Cantidad a pedir | Misma fila de ítem | `cant_pedir`. |

**Importante:** no existe una columna tipo `tiene_excedente` o `sobrestock` en base de datos. Lo que ve el usuario en el modal son campos **derivados** del cálculo.

---

## 3. Qué filas entran al cálculo (antes de las reglas)

El servicio `getSobreStockReposicionItems` solo mira filas que cumplan **todas** estas condiciones:

1. `id_proveedor` = proveedor seleccionado  
2. `sucursal_id` = sucursal seleccionada  
3. `tipo_de_pedido` = **`REPOSICION`**  
4. `cant_pedir` **>** `0`  
5. Existe fila en `precios_tienda` para el mismo `cod_ext` (si no hay catálogo tienda para ese código, el ítem **se omite**).

Si no queda ninguna fila tras estos filtros, la respuesta es `tieneSobreStock: false` e `items: []`.

---

## 4. Reglas de sobrestock (por ítem)

Para cada ítem que pasó la sección 3, se obtiene:

- **`stockSucursal`**: `stock_maipu` o `stock_guaymallen` según sucursal.  
- **¿Tiene configuración de reposición?**: **`reposicion_cant_conf > 0`** (tras interpretar el valor como número finito).

### Regla A — Con configuración (`reposicion_cant_conf > 0`)

- **Hay sobrestock** si: `stockSucursal > reposicion_cant_conf`  
- **Valor mostrado `sobreStock`**: `stockSucursal - reposicion_cant_conf`  
- **`topeReposicion` en la respuesta**: el mismo `reposicion_cant_conf` (número)

**Ejemplos**

| `reposicion_cant_conf` | `stockSucursal` | ¿Lista en modal? | `sobreStock` |
|------------------------|-----------------|------------------|--------------|
| 10 | 15 | Sí | 5 |
| 10 | 10 | No (stock no es mayor que el tope) | — |
| 10 | 8 | No | — |

### Regla B — Sin configuración (`reposicion_cant_conf` nulo o ≤ 0)

- **Hay sobrestock** si: `stockSucursal > 0`  
- **Valor mostrado `sobreStock`**: igual a **`stockSucursal`** (toda la cantidad en sucursal se trata como excedente bajo esta regla)  
- **`topeReposicion` en la respuesta**: **`null`** (en UI la celda **TOPE REPOSICIÓN** queda vacía)

**Ejemplos**

| `reposicion_cant_conf` | `stockSucursal` | ¿Lista en modal? | `sobreStock` | `topeReposicion` |
|------------------------|-----------------|------------------|--------------|------------------|
| 0 | 3 | Sí | 3 | `null` |
| 0 | 0 | No | — | — |
| `null` | 12 | Sí | 12 | `null` |

---

## 5. Forma de la respuesta hacia el cliente (Server Action)

La action `getSobreStockReposicionParaModalAction` devuelve algo equivalente a:

```ts
{
  ok: true,
  data: {
    tieneSobreStock: boolean;  // true si items.length > 0
    items: Array<{
      idItemPedidoEnvio: string;
      codExt: string;
      codTienda: string | null;
      descripcionProveedor: string;
      descripcionTienda: string | null;
      stockSucursal: number;
      topeReposicion: number | null;  // null = sin tope (Regla B)
      sobreStock: number;
      cantPedir: number;
    }>;
  };
}
```

**Convención de UI (alineada a `FRONTEND_GUIDELINES.md`):** en la columna **TOPE REPOSICIÓN**, si `topeReposicion === null`, la celda queda **vacía** (string vacío), sin guiones.

---

## 6. Cómo encaja con “Generar pedido”

1. El usuario confirma **Generar Pedido** en el modal de filtros.  
2. El cliente llama `generarPdfEnviarPedidoAction` **sin** `confirmarSobreStock` (o con `confirmarSobreStock: false`).  
3. Si `tipos` incluye **REPOSICION** y hay ítems con sobrestock, el servidor responde **`SOBRESTOCK_REQUIERE_CONFIRMACION:{n}`** **antes** de crear el snapshot en base — no hay persistencia de historial todavía.  
4. El cliente entonces llama `getSobreStockReposicionParaModalAction` y abre el modal con la tabla.  
5. **Pedir al proveedor igual** reintenta `generarPdfEnviarPedidoAction` con **`confirmarSobreStock: true`**.

El bloqueo lo define siempre el backend; el cliente solo rellena el modal tras el error o puede confiar en esa respuesta como única señal de bloqueo.

---

## 7. Referencias en código

| Pieza | Ubicación |
|-------|-----------|
| Lógica de cálculo | `src/services/sobreStock.service.ts` → `getSobreStockReposicionItems` |
| Exposición al cliente | `src/actions/pedidos.ts` → `getSobreStockReposicionParaModalAction`, validación en `generarPdfEnviarPedidoAction` |
| Modal de advertencia | `src/components/shared/SobreStockReposicionAdvertenciaModal.tsx` |
| Orquestación del botón | `src/components/pedidos/GenerarPedidoToolbarButton.tsx` |

---

## 8. Resumen en una frase

**Sobrestock** = resultado de comparar el **stock en tienda** (`precios_tienda`) con **`reposicion_cant_conf`** si hay tope (**>** 0), o con **cero** si no hay tope, solo para ítems **REPOSICION** con **`cant_pedir > 0`** y proveedor/sucursal acotados; **no se persiste** en una columna de “excedente”.
