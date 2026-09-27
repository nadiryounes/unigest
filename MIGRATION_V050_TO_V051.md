# Migration UniGest v0.5.0 → v0.5.1

Cette migration doit être appliquée **avant** le déploiement de l'API v0.5.1.

## Option A — recommandée : TypeORM

Depuis un environnement où `DATABASE_URL` pointe vers la base Supabase de production :

```bash
npm ci
npm run build -w apps/api
npm run migration:run:prod -w apps/api
npm run migration:show:prod -w apps/api
```

La sortie doit montrer quatre migrations appliquées, dont :

```text
V051SecurityHardening1800000000000
```

## Option B — Supabase SQL Editor

Faire d'abord une sauvegarde de la base. Dans **Supabase → SQL Editor**, exécuter le bloc suivant en une seule fois :

```sql
BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "tokenVersion" integer NOT NULL DEFAULT 0;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" integer NOT NULL DEFAULT 0;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "lockedUntil" timestamptz;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "passwordChangedAt" timestamptz;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "tokenHash" varchar NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "usedAt" timestamptz,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_password_reset_tokens_hash" UNIQUE ("tokenHash"),
  CONSTRAINT "FK_password_reset_tokens_user"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_user_used"
  ON "password_reset_tokens" ("userId", "usedAt");

CREATE TABLE IF NOT EXISTS "request_rate_limits" (
  "scope" varchar NOT NULL,
  "keyHash" varchar NOT NULL,
  "windowStart" timestamptz NOT NULL,
  "count" integer NOT NULL DEFAULT 1,
  CONSTRAINT "PK_request_rate_limits"
    PRIMARY KEY ("scope", "keyHash", "windowStart")
);

CREATE INDEX IF NOT EXISTS "IDX_request_rate_limits_window"
  ON "request_rate_limits" ("windowStart");

INSERT INTO "migrations" ("timestamp", "name")
SELECT 1800000000000, 'V051SecurityHardening1800000000000'
WHERE NOT EXISTS (
  SELECT 1
  FROM "migrations"
  WHERE "timestamp" = 1800000000000
     OR "name" = 'V051SecurityHardening1800000000000'
);

COMMIT;
```

Le script utilise `IF NOT EXISTS` et l'enregistrement de migration est protégé contre les doublons.

## Vérification SQL

Exécuter ensuite :

```sql
SELECT "timestamp", "name"
FROM "migrations"
ORDER BY "timestamp";

SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'tokenVersion'
  ) AS token_version_ok,
  to_regclass('public.password_reset_tokens') IS NOT NULL AS reset_tokens_ok,
  to_regclass('public.request_rate_limits') IS NOT NULL AS rate_limits_ok;
```

Résultat attendu :

```text
4 migrations
token_version_ok = true
reset_tokens_ok  = true
rate_limits_ok   = true
```

## Après la migration

Configurer côté API Vercel :

```env
PASSWORD_RESET_WEB_URL=https://unigest-web.vercel.app/reset-password
RESEND_API_KEY=...
EMAIL_FROM=UniGest <noreply@example.org>
```

Puis déployer v0.5.1 et vérifier :

```text
GET https://unigest-api.vercel.app/health
```

Le champ `version` doit être `0.5.1`. Si Resend est correctement configuré, `passwordRecovery.ready` doit être `true`.

## Important

Ne pas fusionner/déployer l'API v0.5.1 avant cette migration : le nouveau code utilise les colonnes `tokenVersion`, `failedLoginAttempts`, `lockedUntil`, `passwordChangedAt` et la table `request_rate_limits`.
