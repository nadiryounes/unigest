# UniGest v0.5.2 Account Security

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

## Nouveautés v0.5.2

- tableau de bord enrichi avec activité académique et admissions ;
- indicateurs de candidatures à traiter, campagnes ouvertes et séances du jour ;
- répartition des candidatures par statut ;
- répartition des étudiants par filière ;
- dernières candidatures et prochaines séances ;
- chargement explicite et idempotent des données de démonstration ;
- recherche, tri, pagination et export CSV sur les listes CRUD ;
- navigation active et version UI `v0.5.1` ;
- CI GitHub permanente pour compiler l'API et le frontend à chaque push/PR ;
- révocation des JWT après changement de mot de passe ou déconnexion globale ;
- récupération de mot de passe par jeton temporaire à usage unique ;
- authentification multifacteur TOTP avec codes de récupération ;
- chiffrement AES-GCM du secret MFA côté serveur ;
- rate limiting PostgreSQL partagé entre instances, avec repli mémoire si V06 n'est pas encore appliquée ;
- limitation spécifique de la connexion, du MFA, de la récupération de compte et des admissions publiques ;
- journalisation dédiée des événements de sécurité ;
- headers HTTP/CSP sur l'API et le frontend ;
- tests navigateur Playwright du flux de connexion et de l'écran Sécurité ;
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
MFA_ENCRYPTION_KEY=...
MFA_ISSUER=UniGest
RATE_LIMIT_SALT=...

MAIL_DRIVER=resend
RESEND_API_KEY=...
MAIL_FROM=UniGest <no-reply@example.org>
WEB_BASE_URL=https://unigest-web.vercel.app

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
1800000000000-V05SecurityHardening
1810000000000-V06AccountSecurity
```

## Données de démonstration

En production/test, définir :

```env
DEMO_SEED_ENABLED=true
```

Puis, connecté comme administrateur, utiliser le bouton **Charger les données de test** depuis le tableau de bord.

Le chargement est idempotent : les mêmes objets de démonstration ne sont pas recréés à chaque appel.

Les comptes de démonstration à mots de passe connus sont créés uniquement en développement/test local. Sur un déploiement `NODE_ENV=production`, le seed charge les données académiques de démonstration mais ne crée aucun compte public connu. Utiliser le compte bootstrap administrateur et créer explicitement les autres comptes nécessaires.

Après chargement des données, remettre `DEMO_SEED_ENABLED=false` pour empêcher un chargement accidentel ultérieur.

## Sécurité

La v0.5.2 renforce nettement le contrôle des comptes. Pour activer toutes ses fonctions en production, appliquer la migration V06 puis configurer `MFA_ENCRYPTION_KEY`, `RATE_LIMIT_SALT` et, pour les e-mails de récupération, un fournisseur de messagerie. Le pilote institutionnel exige encore :

- régénérer tous les secrets utilisés pendant les tests ;
- renforcer le modèle rôles/permissions ;
- analyser les fichiers entrants avec un moteur antimalware ;
- automatiser et tester sauvegarde/restauration ;
- centraliser logs, métriques et alertes ;
- formaliser rétention/suppression des données et procédures d'incident ;
- maintenir les tests E2E API/navigateur et compléter par un audit de sécurité externe.

Ne jamais placer `SUPABASE_SECRET_KEY`, `DATABASE_URL` ou `JWT_SECRET` dans une variable `NEXT_PUBLIC_*`.
