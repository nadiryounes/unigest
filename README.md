# UniGest v0.5.1 — Production Hardening

UniGest est un prototype de système d'information universitaire construit avec Next.js, NestJS, TypeORM, PostgreSQL et Supabase Storage.

## Architecture

```text
Vercel
  +-- unigest-web  (apps/web, Next.js)
  |
  +-- unigest-api  (apps/api, NestJS)
         |
         +--> Supabase PostgreSQL
         +--> Supabase Storage
         +--> Resend (optionnel, récupération de compte)
```

Sur Vercel, TypeORM est initialisé à la première requête HTTP. UniGest accepte une URL Supabase Session pooler `:5432` et bascule automatiquement vers le Transaction pooler `:6543` en environnement Vercel.

## Nouveautés v0.5.1

- verrouillage temporaire d'un compte après échecs répétés de connexion ;
- versionnement des JWT et révocation immédiate de toutes les sessions ;
- changement de mot de passe depuis l'espace utilisateur ;
- récupération de compte par jeton opaque, expirant et à usage unique ;
- livraison optionnelle du lien de reset via Resend ;
- rate limiting persistant en PostgreSQL pour login, reset et admissions publiques ;
- CSP et headers de sécurité sur l'API et le frontend ;
- migration dédiée `V051SecurityHardening` ;
- tests unitaires sécurité/authentification supplémentaires ;
- tests E2E API sur reset et révocation de session ;
- tests navigateur Chromium avec Playwright ;
- lockfile npm reproductible et CI basé sur `npm ci`.

## Modules

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

Services :

- Web : `http://localhost:3000`
- API : `http://localhost:4000`
- Health : `http://localhost:4000/health`
- PostgreSQL : `localhost:5432`

## Déploiement Vercel + Supabase

Voir `DEPLOY_FREE.md`.

Deux projets Vercel utilisent le même dépôt :

```text
unigest-api  -> apps/api
unigest-web  -> apps/web
```

Variables principales API :

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DB_SYNCHRONIZE=false

JWT_SECRET=une-valeur-aleatoire-de-32-caracteres-minimum

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

Frontend :

```env
NEXT_PUBLIC_API_URL=https://unigest-api.vercel.app
```

## Migrations

Les migrations sont explicites et ne sont pas exécutées automatiquement au build Vercel :

```bash
npm run build -w apps/api
npm run migration:run:prod -w apps/api
```

Migrations actuelles :

```text
1770000000000-V02BaseSchema
1780000000000-V03ProfilesAndAudit
1790000000000-V04AcademicStructureAdmissions
1800000000000-V051SecurityHardening
```

La migration v0.5.1 ajoute notamment le versionnement des sessions, le verrouillage de compte, les jetons de reset et les compteurs de rate limiting.

## Données de démonstration

En production/test, activer temporairement :

```env
DEMO_SEED_ENABLED=true
```

Puis utiliser **Charger les données de test** depuis le tableau de bord administrateur.

Les comptes de démonstration à mots de passe connus sont créés uniquement hors `NODE_ENV=production`. En production, le seed peut créer les données académiques fictives mais aucun compte public connu.

## Sécurité v0.5.1

Cette version réduit nettement les risques du MVP, mais elle ne doit pas encore être considérée comme prête pour des données institutionnelles sensibles sans mesures opérationnelles supplémentaires.

Déjà couvert :

- JWT secret fort obligatoire en production ;
- révocation de session par `tokenVersion` ;
- lockout après échecs répétés ;
- reset à usage unique et expiration 30 minutes ;
- rate limiting persistant ;
- CORS par origine exacte ;
- CSP et headers anti-framing / anti-MIME sniffing ;
- redaction de données sensibles dans l'audit ;
- validation de signature PDF/JPEG/PNG ;
- scan CI des secrets committés ;
- audit npm high/critical bloquant ;
- tests unitaires, E2E, migrations, smoke production et Chromium.

Encore requis avant exploitation institutionnelle :

- 2FA pour les comptes privilégiés ;
- antivirus/scan malware des fichiers ;
- sauvegardes avec tests de restauration ;
- monitoring et alerting centralisés ;
- permissions plus fines que les quatre rôles actuels ;
- politique de conservation et suppression des données ;
- revue de sécurité externe.

Ne jamais placer `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `JWT_SECRET` ou `RESEND_API_KEY` dans une variable `NEXT_PUBLIC_*`.
