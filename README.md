# UniGest v0.5.0 Core

UniGest est un prototype de système d'information universitaire construit avec Next.js, NestJS, TypeORM, PostgreSQL et Supabase Storage.

## Architecture de test actuelle

```text
Vercel
  +-- unigest-web  (apps/web, Next.js)
  |
  +-- unigest-api  (apps/api, NestJS)
         |
         +--> Supabase PostgreSQL
         +--> Supabase Storage
```

Sur Vercel, TypeORM est initialisé à la première requête HTTP afin d'éviter de bloquer le démarrage serverless. Pour Supabase, UniGest bascule automatiquement du Session pooler `:5432` vers le Transaction pooler `:6543` lorsqu'il détecte l'environnement Vercel.

## Nouveautés v0.5.0

- tableau de bord enrichi avec activité académique et admissions ;
- indicateurs de candidatures à traiter, campagnes ouvertes et séances du jour ;
- répartition des candidatures par statut ;
- répartition des étudiants par filière ;
- dernières candidatures et prochaines séances ;
- chargement explicite et idempotent des données de démonstration ;
- recherche, tri, pagination et export CSV sur les listes CRUD ;
- navigation active et version UI `v0.5.0` ;
- CI GitHub permanente pour compiler l'API et le frontend à chaque push/PR ;
- documentation alignée sur le déploiement Vercel + Supabase actuel.

## Modules disponibles

- authentification JWT et rôles ADMIN, SCOLARITE, TEACHER, STUDENT ;
- comptes liés aux profils étudiant/enseignant ;
- années universitaires, filières, niveaux, semestres et groupes ;
- modules et éléments de module ;
- étudiants, enseignants et inscriptions ;
- évaluations, notes, absences et emploi du temps ;
- règles de validation et délibérations préparatoires ;
- candidatures, admissions et conversion en étudiant ;
- documents imprimables depuis le navigateur ;
- journal d'audit ;
- espace enseignant/étudiant ;
- stockage Supabase privé pour les pièces de candidature.

## Développement local

```bash
cp .env.example .env
docker compose up --build
```

Services locaux :

- Web : `http://localhost:3000`
- API : `http://localhost:4000`
- Health : `http://localhost:4000/health`
- PostgreSQL : `localhost:5432`

## Déploiement Vercel + Supabase

Voir `DEPLOY_FREE.md`.

Les deux projets Vercel utilisent le même dépôt GitHub avec une Root Directory différente :

```text
unigest-api  -> apps/api
unigest-web  -> apps/web
```

Variables principales de l'API :

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DB_SYNCHRONIZE=false

JWT_SECRET=...

BOOTSTRAP_ADMIN_EMAIL=admin@example.org
BOOTSTRAP_ADMIN_PASSWORD=mot-de-passe-long
BOOTSTRAP_ADMIN_FIRST_NAME=Administrateur
BOOTSTRAP_ADMIN_LAST_NAME=UniGest

STORAGE_DRIVER=supabase
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SECRET_KEY=...
SUPABASE_STORAGE_BUCKET=candidate-documents

CORS_ORIGINS=https://unigest-web.vercel.app
DEMO_SEED_ENABLED=false
```

Frontend :

```env
NEXT_PUBLIC_API_URL=https://unigest-api.vercel.app
```

## Migrations

Les migrations TypeORM restent exécutées explicitement :

```bash
npm run build -w apps/api
npm run migration:run:prod -w apps/api
```

Elles ne sont plus exécutées automatiquement à chaque build Vercel.

Migrations actuelles :

```text
1770000000000-V02BaseSchema
1780000000000-V03ProfilesAndAudit
1790000000000-V04AcademicStructureAdmissions
```

## Données de démonstration

En production/test, définir :

```env
DEMO_SEED_ENABLED=true
```

Puis, connecté comme administrateur, utiliser le bouton **Charger les données de test** depuis le tableau de bord.

Le chargement est idempotent : les mêmes objets de démonstration ne sont pas recréés à chaque appel.

Comptes de démonstration :

```text
admin@unigest.local        / Admin123!
scolarite@unigest.local   / Scolarite123!
enseignant@unigest.local  / Teacher123!
etudiant@unigest.local    / Student123!
```

Après chargement des données, remettre `DEMO_SEED_ENABLED=false` pour empêcher un chargement accidentel ultérieur.

## Sécurité

La v0.5.0 reste une version de test. Avant exploitation réelle :

- régénérer tous les secrets utilisés pendant les tests ;
- activer récupération de compte et 2FA ;
- renforcer le modèle rôles/permissions ;
- ajouter limitation de débit ;
- analyser les fichiers entrants ;
- vérifier/restaurer les sauvegardes ;
- centraliser logs et supervision ;
- ajouter tests E2E et audit de sécurité ;
- définir une politique de conservation/suppression des données.

Ne jamais placer `SUPABASE_SECRET_KEY`, `DATABASE_URL` ou `JWT_SECRET` dans une variable `NEXT_PUBLIC_*`.
