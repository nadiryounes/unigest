# Déployer UniGest v0.5.2 gratuitement pour test

Cette procédure décrit l'architecture actuellement validée pour les tests : Vercel pour le frontend et l'API, Supabase pour PostgreSQL et Storage.

## 1. Supabase

Créer un projet Supabase et un bucket Storage privé :

```text
candidate-documents
```

Conserver localement :

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SECRET_KEY=...
SUPABASE_STORAGE_BUCKET=candidate-documents
```

UniGest accepte une URL Session pooler `:5432`. Lorsqu'il tourne sur Vercel, le backend utilise automatiquement le Transaction pooler `:6543`.

## 2. Projet Vercel API

Importer le dépôt `nadiryounes/unigest`.

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
MFA_ENCRYPTION_KEY=une-autre-valeur-aleatoire-de-32-caracteres-minimum
MFA_ISSUER=UniGest
RATE_LIMIT_SALT=une-troisieme-valeur-aleatoire

MAIL_DRIVER=resend
RESEND_API_KEY=...
MAIL_FROM=UniGest <no-reply@votre-domaine.tld>
WEB_BASE_URL=https://unigest-web.vercel.app

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
```

Après déploiement :

```text
https://unigest-api.vercel.app/health
```

doit retourner un statut `ok` avec `database: ok` et `storage.ready: true`.

## 3. Projet Vercel Web

Importer une deuxième fois le même dépôt.

```text
Project name   : unigest-web
Root Directory : apps/web
Framework      : Next.js
```

Variable :

```env
NEXT_PUBLIC_API_URL=https://unigest-api.vercel.app
```

Après déploiement :

```text
https://unigest-web.vercel.app
```

## 4. Migrations

La v0.5.2 ajoute `1810000000000-V06AccountSecurity` pour MFA, récupération de compte et rate limiting distribué. Les migrations sont lancées explicitement depuis un environnement autorisé à accéder à la base :

```bash
npm run build -w apps/api
npm run migration:run:prod -w apps/api
```

Ne pas les relancer automatiquement à chaque build Vercel. Appliquer V06 avant d'activer MFA/récupération de compte en production. Le login principal reste compatible si V06 n'est pas encore présente, mais ces nouvelles fonctions restent indisponibles.

## 5. Données de démonstration

Pour une démonstration :

1. définir `DEMO_SEED_ENABLED=true` sur le projet `unigest-api` ;
2. redéployer l'API ;
3. se connecter avec l'administrateur principal ;
4. ouvrir le tableau de bord ;
5. cliquer sur **Charger les données de test** ;
6. vérifier les étudiants, enseignants, filière DGI, module, campagne et note de démonstration ;
7. vérifier qu'aucun compte de démonstration à mot de passe connu n'a été créé en production ;
8. remettre ensuite `DEMO_SEED_ENABLED=false`.

## 6. Vérifications

Tester :

```text
GET  /health
POST /auth/login
POST /auth/mfa/verify
POST /auth/password-reset/request
POST /auth/password-reset/confirm
GET  /auth/security-status
GET  /dashboard/stats
GET  /system/demo-status
```

Puis, depuis l'interface :

- connexion administrateur ;
- dashboard ;
- étudiants et enseignants ;
- emploi du temps ;
- notes ;
- candidatures ;
- téléchargement d'une pièce ;
- compte étudiant/enseignant.

## 7. Limites du plan gratuit

Vercel et Supabase conviennent aux tests et démonstrations dans leurs quotas respectifs. Une exploitation institutionnelle nécessite une architecture et des garanties supplémentaires : sauvegardes, supervision, sécurité, capacité, conformité et support.
