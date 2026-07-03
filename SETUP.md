# Setup de la base de datos — Fase 0 lista

## Paso 1: provisionar Postgres (Neon o Supabase)

### Opción A — Neon (recomendado, free tier suficiente)
1. Crea cuenta en https://neon.tech
2. Crea un proyecto nuevo (`sgsi-platform` por ejemplo)
3. En el dashboard del proyecto, copia las dos cadenas:
   - **Pooled connection** → va a `DATABASE_URL`
   - **Direct connection** → va a `DIRECT_URL`

### Opción B — Supabase
1. Crea cuenta en https://supabase.com
2. Nuevo proyecto, espera el provisionamiento (~2 min)
3. **Settings → Database → Connection string**:
   - **Connection Pooling (Transaction mode)** → `DATABASE_URL` (puerto 6543)
   - **Direct connection** → `DIRECT_URL` (puerto 5432)

## Paso 2: completar `.env`

Edita el archivo `.env` (ya está en el repo, pero gitignored) y reemplaza:

```env
DATABASE_URL="postgresql://...pooled..."
DIRECT_URL="postgresql://...direct..."
AUTH_SECRET="..." # generar con:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Paso 3: correr la migración inicial

```bash
npx prisma migrate dev --name init
```

Esto:
- Conecta a tu Neon/Supabase
- Crea las 22 tablas del schema
- Genera el Prisma Client tipado

## Paso 4: levantar la app

```bash
npm run dev
```

La app arranca en http://localhost:3000

---

## Estado actual del repo (Fase 0)

✅ Dependencias instaladas (prisma, next-auth v5, bcryptjs, zod)
✅ `prisma/schema.prisma` — schema completo con ajustes aprobados
✅ `lib/db.ts` — Prisma client singleton
✅ `lib/rbac.ts` — matriz de permisos (Administrador, CISO, Gerencia, Auditor)
✅ `auth.ts` — Auth.js v5 con Credentials + Microsoft simulado
✅ `app/api/auth/[...nextauth]/route.ts` — handlers Auth.js
✅ TypeScript compila sin errores

## Siguiente paso (Fase 1+)

Una vez tengas el `.env` configurado y la migración corrida, retomamos con:
- **Fase 2**: portar shell del prototipo (Card, Sidebar, etc.) a TSX nativo
- **Fase 3-7**: HU02 → HU01 → HU05 → HU04 → HU03

Avísame cuando hayas corrido `prisma migrate` y reanudo.
