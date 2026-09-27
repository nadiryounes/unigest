# UniGest MVP v0.4.1 Cloud Ready

UniGest est un prototype de système d'information universitaire. La v0.4.1 conserve les fonctions de la v0.4 et ajoute les éléments nécessaires à un déploiement de test gratuit avec Vercel, Render et Supabase.

## Nouveautés cloud

- `DATABASE_URL` prioritaire pour PostgreSQL distant.
- SSL PostgreSQL configurable.
- migration initiale complète pour une base vierge ;
- stockage abstrait `local` ou `supabase` ;
- bucket Supabase privé pour les pièces de candidature ;
- téléchargement des pièces par l'API authentifiée ;
- endpoint `/health` qui vérifie PostgreSQL et le stockage ;
- CORS limité aux origines configurées ;
- prise en charge du port `PORT` imposé par Render ;
- `render.yaml` fourni ;
- configuration Vercel fournie dans `apps/web/vercel.json` ;
- seed de démonstration désactivé automatiquement en production ;
- création d'un administrateur initial via variables d'environnement.

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

Architecture recommandée :

```text
Vercel
  Next.js
     |
     v
Render
  NestJS
     |
     +------> Supabase PostgreSQL
     |
     +------> Supabase Storage
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

Pour Supabase, utiliser de préférence la chaîne fournie directement par `Connect` dans le tableau de bord. Pour un environnement IPv4-only, le Session pooler peut être nécessaire.

`DATABASE_SSL_REJECT_UNAUTHORIZED=false` chiffre la connexion mais ne vérifie pas le certificat serveur. Pour une vérification complète, fournir le certificat CA Supabase en base64 dans `DATABASE_SSL_CA_BASE64`.

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

La clé de service ne doit jamais être envoyée au frontend ni placée dans une variable `NEXT_PUBLIC_*`.

Le bucket est privé. L'API crée/vérifie le bucket à la première utilisation ou lors du health check. Les agents autorisés téléchargent les pièces à travers l'API NestJS.

## Base vierge et migrations

La v0.4.1 ajoute une migration initiale :

```text
1770000000000-V02BaseSchema
1780000000000-V03ProfilesAndAudit
1790000000000-V04AcademicStructureAdmissions
```

Une base PostgreSQL vide peut donc être préparée uniquement avec :

```bash
npm run build -w apps/api
npm run migration:run:prod -w apps/api
```

En cloud, `npm run start:cloud` exécute d'abord les migrations puis démarre l'API. Ce choix est adapté au déploiement de test sur une instance unique.

## Administrateur initial en production

Les comptes de démonstration sont désactivés en production. Définir :

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
CORS_ORIGINS=https://votre-projet.vercel.app
```

Plusieurs origines sont possibles, séparées par des virgules.

## Portail de candidature

- `/apply` : dépôt d'une candidature.
- `/application-status` : suivi par numéro de candidature et email.

Les pièces acceptées sont PDF, JPEG et PNG, 10 Mo maximum par fichier.

## Structure du projet

```text
apps/
  api/       NestJS + TypeORM
  web/       Next.js
render.yaml  Blueprint Render
samples/     exemples d'import
DEPLOY_FREE.md
docker-compose.yml
```

## Sécurité avant production réelle

La v0.4.1 reste une version de test. Avant une exploitation universitaire réelle, ajouter au minimum tests E2E, sauvegardes, supervision, récupération de compte, 2FA, antivirus des fichiers entrants, limitation de débit, politique de conservation des données et audit de sécurité.
