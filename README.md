# UniGest MVP v0.4.1 Cloud Ready

UniGest est un prototype de système d'information universitaire. La v0.4.1 comprend les éléments nécessaires à un déploiement de test avec Vercel et Supabase.

## Architecture cloud recommandée

```text
Vercel
  +-- NestJS API (apps/api)
  |      +--> Supabase PostgreSQL
  |      +--> Supabase Storage
  |
  +-- Next.js Web (apps/web)
```

Le même dépôt GitHub est importé deux fois dans Vercel, avec une Root Directory différente pour chaque projet.

## Fonctions cloud

- `DATABASE_URL` pour PostgreSQL distant ;
- SSL PostgreSQL configurable ;
- migrations TypeORM pour une base vierge ;
- exécution automatique des migrations lors du build Vercel de l'API ;
- stockage abstrait `local` ou `supabase` ;
- bucket Supabase privé pour les pièces de candidature ;
- téléchargement des pièces par l'API authentifiée ;
- endpoint `/health` pour PostgreSQL et le stockage ;
- CORS limité aux origines configurées ;
- frontend Next.js déployable depuis `apps/web` ;
- backend NestJS déployable nativement depuis `apps/api` ;
- seed de démonstration désactivé automatiquement en production ;
- administrateur initial configurable par variables d'environnement.

## Modules disponibles

- authentification JWT et rôles ADMIN, SCOLARITE, TEACHER, STUDENT ;
- comptes liés aux dossiers étudiant/enseignant ;
- filières, années universitaires, niveaux, semestres, groupes ;
- modules et éléments de module ;
- étudiants, enseignants et inscriptions ;
- évaluations, notes, absences et emplois du temps ;
- détection des conflits salle/enseignant/groupe ;
- règles de validation configurables et délibérations préparatoires ;
- relevés/PV imprimables depuis le navigateur ;
- journal d'audit des écritures ;
- campagnes de candidature, filières ouvertes, dépôt de dossier, suivi, présélection, décision et conversion en étudiant.

## Démarrage local

```bash
cp .env.example .env
docker compose up --build
```

Adresses locales :

- Interface : `http://localhost:3000`
- API : `http://localhost:4000`
- Health check : `http://localhost:4000/health`
- PostgreSQL : `localhost:5432`

En développement, le seed de démonstration est activé par défaut.

```text
Administrateur : admin@unigest.local / Admin123!
Scolarité      : scolarite@unigest.local / Scolarite123!
Enseignant     : enseignant@unigest.local / Teacher123!
Étudiant       : etudiant@unigest.local / Student123!
```

Ces comptes ne sont pas créés lorsque `NODE_ENV=production`, sauf si `DEMO_SEED_ENABLED=true` est explicitement défini.

## Déploiement gratuit

Voir `DEPLOY_FREE.md`.

## API sur Vercel

Vercel prend en charge NestJS directement. Le projet API doit être importé avec :

```text
Root Directory : apps/api
```

Le script `vercel-build` compile NestJS puis exécute les migrations TypeORM :

```text
npm run build && npm run migration:run:prod
```

## PostgreSQL cloud

Si `DATABASE_URL` est défini, il est utilisé à la place de `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD` et `DATABASE_NAME`.

Exemple :

```env
DATABASE_URL=postgresql://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DB_SYNCHRONIZE=false
```

Pour Supabase sur un réseau IPv4, le Session pooler peut être utilisé.

`DATABASE_SSL_REJECT_UNAUTHORIZED=false` chiffre la connexion sans vérifier le certificat serveur. Pour une vérification complète, fournir le certificat CA Supabase en base64 dans `DATABASE_SSL_CA_BASE64`.

## Stockage des pièces

### Local

```env
STORAGE_DRIVER=local
LOCAL_UPLOAD_DIR=uploads
```

### Supabase Storage

```env
STORAGE_DRIVER=supabase
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SECRET_KEY=...
SUPABASE_STORAGE_BUCKET=candidate-documents
```

La clé secrète ne doit jamais être envoyée au frontend ni placée dans une variable `NEXT_PUBLIC_*`.

Le bucket est privé. L'API crée ou vérifie le bucket lors de l'utilisation du stockage.

## Base vierge et migrations

```text
1770000000000-V02BaseSchema
1780000000000-V03ProfilesAndAudit
1790000000000-V04AcademicStructureAdmissions
```

Exécution manuelle :

```bash
npm run build -w apps/api
npm run migration:run:prod -w apps/api
```

Sur Vercel, cette opération est intégrée au build de l'API.

## Administrateur initial en production

```env
BOOTSTRAP_ADMIN_EMAIL=admin@example.org
BOOTSTRAP_ADMIN_PASSWORD=un-mot-de-passe-long
BOOTSTRAP_ADMIN_FIRST_NAME=Administrateur
BOOTSTRAP_ADMIN_LAST_NAME=UniGest
DEMO_SEED_ENABLED=false
```

Le mot de passe bootstrap doit contenir au moins 12 caractères.

## CORS

En production :

```env
CORS_ORIGINS=https://votre-frontend.vercel.app
```

Plusieurs origines exactes sont possibles, séparées par des virgules.

## Portail de candidature

- `/apply` : dépôt d'une candidature ;
- `/application-status` : suivi par numéro de candidature et email.

Les pièces acceptées sont PDF, JPEG et PNG, 10 Mo maximum par fichier.

## Structure du projet

```text
apps/
  api/       NestJS + TypeORM
  web/       Next.js
render.yaml  configuration Render conservée comme solution alternative
samples/     exemples d'import
DEPLOY_FREE.md
docker-compose.yml
```

## Sécurité avant production réelle

La v0.4.1 reste une version de test. Avant une exploitation universitaire réelle, ajouter au minimum des tests E2E, sauvegardes, supervision, récupération de compte, 2FA, antivirus des fichiers entrants, limitation de débit, politique de conservation des données et audit de sécurité.
