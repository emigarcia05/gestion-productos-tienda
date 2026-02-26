# Recuperar tablas borradas en Neon

## Qué pudo pasar

Si el **schema de Prisma** solo tiene el modelo `Proveedor` y en Neon había más tablas (creadas antes a mano o con otro schema), al ejecutar **`prisma db push`** o **`prisma migrate reset`**, Prisma puede:

- **`db push`**: en algunos casos alinea la base al schema y puede eliminar tablas que ya no están en el schema.
- **`migrate reset`**: **borra toda la base**, la recrea y aplica migraciones. Solo usarlo en desarrollo cuando quieras empezar de cero.

Por eso es importante no ejecutar `migrate reset` en producción y tener cuidado con `db push` si la base ya tenía tablas que no están en el schema.

---

## Cómo recuperar con Neon (Point-in-Time Restore)

Neon permite restaurar la base a un momento anterior:

1. Entrá a **[Neon Console](https://console.neon.tech)** y elegí tu proyecto.
2. En el branch de la base (p. ej. `main`), buscá la opción **Restore** / **Point-in-time restore** (o **Branch restore**).
3. Elegí la **fecha y hora anteriores** a cuando se borraron las tablas.
4. Confirmá la restauración. Neon puede crear un branch de respaldo antes.

Documentación: [Neon – Backup & restore](https://neon.tech/docs/guides/backup-restore) y [Point-in-time restore](https://neon.tech/docs/introduction/point-in-time-restore).

---

## Después de restaurar

1. **Configurá la URL por entorno** (ya no va en el repo):
   - En tu máquina: creá o editá `.env` y poné:
     ```env
     DATABASE_URL="postgresql://usuario:contraseña@tu-endpoint-pooler.region.aws.neon.tech/neondb?sslmode=require"
     ```
   - En Vercel: **Settings → Environment Variables** y agregá `DATABASE_URL` con la misma URL (la de conexión pooled de Neon).

2. **No ejecutes** `prisma migrate reset` en la base de producción.

3. Si en el schema solo tenés `Proveedor` pero en Neon tenés más tablas que querés conservar, **no uses** `db push` hasta que esas tablas estén también definidas en el schema (o usá migraciones y revisá qué hace cada una).

---

## Crear solo la tabla `proveedores` sin tocar el resto

Si preferís **no** restaurar y solo volver a tener la tabla de proveedores:

```bash
npx prisma db push
```

Eso crea o actualiza las tablas que definís en `schema.prisma` (en este caso `proveedores`). Si en el schema no están otras tablas que existían en Neon, no las borres a mano; mejor restaurar con point-in-time y luego ajustar el schema y las migraciones.
