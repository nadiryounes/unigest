# Déployer UniGest v0.5.1 pour test

Cette procédure décrit l'architecture validée : Vercel pour le frontend et l'API, Supabase pour PostgreSQL et Storage.

## 1. Supabase

Créer un projet Supabase et un bucket Storage privé `candidate-documents`.

Variables à conserver côté serveur :

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SECRET_KEY=...
SUPABASE_STORAGE_BUCKET=candidate-documents
```

UniGest accepte une URL Session pooler `:5432`. Sur Vercel, le backend utilise automatiquement le Transaction pooler `:6543`.

## 2. Migrations avant déploiement

La v0.5.1 ajoute une migration de sécurité. Exécuter :

```bash
npm ci
npm run build -w apps/api
npm run migration:run:prod -w apps/api
```

Vérifier que quatre migrations sont enregistrées, dont :

```text
1800000000000-V051SecurityHardening
```

Ne pas activer `DB_SYNCHRONIZE` en production.

## 3. Projet Vercel API

Configuration :

```text
Project name   : unigest-api
Root Directory : apps/api
Framework      : NestJS détecté automatiquement
```

Ne pas définir de build command personnalisé.

Variables Production :

```env
NODE_ENV=production

DATABASE_URL=postgresql://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DB_SYNCHRONIZE=false

JWT_SECRET=une-valeur-longue-aleatoire

BOOTSTRAP_ADMIN_EMAIL=admin@example.org
BOOTSTRAP_ADMIN_PASSWORD=minimum-12-caracteres
BOOTSTRAP_ADMIN_FIRST_NAME=Administrateur
BOOTSTRAP_ADMIN_LAST_NAME=UniGest

STORAGE_DRIVER=supabase
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SECRET_KEY=...
SUPABASE_STORAGE_BUCKET=candidate-documents

CORS_ORIGINS=https://unigest-web.vercel.app
DEMO_SEED_ENABLED=false

PASSWORD_RESET_WEB_URL=https://unigest-web.vercel.app/reset-password
RESEND_API_KEY=...
EMAIL_FROM=UniGest <noreply@example.org>
```

`RESEND_API_KEY` et `EMAIL_FROM` sont nécessaires pour envoyer réellement les liens de récupération. Sans eux, l'API reste fonctionnelle mais `/health` indique `passwordRecovery.ready=false`.

Après déploiement :

```text
https://unigest-api.vercel.app/health
```

doit retourner `status: ok`, `database: ok`, `storage.ready: true` et `version: 0.5.1`.

## 4. Projet Vercel Web

```text
Project name   : unigest-web
Root Directory : apps/web
Framework      : Next.js
```

Variable :

```env
NEXT_PUBLIC_API_URL=https://unigest-api.vercel.app
```

## 5. Vérifications de sécurité

Tester :

```text
GET  /health
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/change-password
POST /auth/logout-all
```

Vérifier également :

- CSP présente sur le frontend ;
- `X-Frame-Options: DENY` ;
- `X-Content-Type-Options: nosniff` ;
- ancien JWT refusé après changement de mot de passe ou `logout-all` ;
- reset token inutilisable une deuxième fois ;
- compte temporairement verrouillé après plusieurs mots de passe incorrects ;
- rate limiting actif sur les routes publiques sensibles.

## 6. Données de démonstration

Pour une démonstration, activer temporairement `DEMO_SEED_ENABLED=true`, charger les données depuis le tableau de bord, puis remettre la variable à `false`.

Les comptes de démonstration à mots de passe connus ne sont jamais créés en `NODE_ENV=production`.

## 7. Limites

Le plan gratuit convient à la démonstration et aux tests. Une exploitation institutionnelle nécessite encore sauvegardes, monitoring, 2FA, scan malware, politique de conservation et support opérationnel.
