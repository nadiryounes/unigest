# Changelog

## 0.5.2 — Account Security

### Comptes et authentification
- Récupération de mot de passe avec jeton aléatoire, haché en base, expirant après 30 minutes et à usage unique.
- MFA TOTP compatible avec les applications d’authentification standards.
- Chiffrement AES-256-GCM des secrets TOTP.
- Codes de récupération à usage unique.
- Challenge MFA JWT distinct du JWT d’accès.
- Écran utilisateur « Sécurité du compte ».

### Protection distribuée
- Remplacement du rate limiting mémoire par des compteurs PostgreSQL partagés entre instances Vercel.
- Repli mémoire temporaire si la table V06 n’est pas encore présente.
- Politiques dédiées pour login, MFA, récupération de mot de passe et admissions publiques.

### Traçabilité et qualité
- Classification des opérations d’authentification comme événements de sécurité dans l’audit.
- Migration `1810000000000-V06AccountSecurity`.
- Health check enrichi avec état du schéma de sécurité et du transport e-mail.
- Tests unitaires TOTP/chiffrement/rate limiting, E2E récupération+MFA et Playwright écran Sécurité.


## 0.5.1 — Production Hardening

### Authentification et sessions
- Versionnement des JWT avec `authVersion`.
- Changement de mot de passe authentifié.
- Révocation globale des sessions.
- Invalidation des sessions lors de la désactivation d'un compte.

### Sécurité HTTP
- Rate limiting ciblé sur `/auth/login` et les POST d'admissions publiques.
- Headers API : HSTS en production, CSP restrictive, nosniff, anti-framing, referrer policy et permissions policy.
- Headers/CSP équivalents sur Next.js.

### Qualité
- Migration `1800000000000-V05SecurityHardening`.
- Tests unitaires de session/version JWT et rate limiting.
- E2E de changement de mot de passe et révocation de sessions.
- Test navigateur Playwright de la connexion administrateur et du dashboard.

## 0.5.0 — Core Operations

### Fiabilité cloud

- Initialisation TypeORM différée sur Vercel.
- Bascule automatique vers le Transaction pooler Supabase en environnement serverless.
- Pool PostgreSQL limité pour réduire la pression sur Supabase.
- Suppression du build Vercel personnalisé et des migrations automatiques au build.
- Seed de production rendu explicite et idempotent.

### Tableau de bord

- Année universitaire active.
- Campagnes d'admission ouvertes.
- Candidatures à examiner.
- Séances du jour.
- Répartition des candidatures par statut.
- Répartition des étudiants par filière.
- Dernières candidatures.
- Prochaines séances.
- Action administrateur de chargement des données de démonstration.

### Interface

- Recherche générique dans les listes.
- Tri par colonne.
- Pagination côté client.
- Export CSV.
- Navigation active.
- Version UI v0.5.0.

### Qualité

- CI GitHub permanente API + Web.
- Documentation Vercel/Supabase réalignée avec l'architecture réellement testée.

# Changelog

## 0.4.1 — Cloud Ready

### Déploiement

- Ajout de `render.yaml` pour l'API NestJS.
- Ajout de `apps/web/vercel.json` pour le frontend Next.js.
- Prise en charge du port `PORT` fourni par Render.
- Ajout d'un endpoint `/health`.
- Ajout de `DEPLOY_FREE.md`.

### PostgreSQL

- Ajout de `DATABASE_URL` avec priorité sur les paramètres PostgreSQL séparés.
- SSL PostgreSQL configurable.
- Ajout d'une migration initiale idempotente `1770000000000-V02BaseSchema`.
- Une base PostgreSQL vierge peut maintenant être construite entièrement par migrations.
- `DB_SYNCHRONIZE=false` devient la valeur recommandée.

### Stockage

- Ajout d'un `StorageService` abstrait.
- Driver local conservé pour Docker/développement.
- Driver Supabase Storage pour le cloud.
- Bucket privé `candidate-documents`.
- Téléchargement authentifié des pièces depuis l'administration.

### Sécurité

- CORS limité à `CORS_ORIGINS`.
- Seed de démonstration désactivé par défaut en production.
- Création du premier administrateur par `BOOTSTRAP_ADMIN_EMAIL` et `BOOTSTRAP_ADMIN_PASSWORD`.
- La clé Supabase reste exclusivement côté serveur.

## 0.4.0

### Structure académique

- Ajout des niveaux académiques par filière.
- Ajout des semestres structurés par niveau.
- Rattachement facultatif des modules à un semestre structuré.
- Ajout des éléments de module.
- Rattachement des groupes à un niveau académique.
- Ajout de règles de validation configurables.
- Délibération mise à jour pour lire les règles filière/niveau.

### Candidatures et admissions

- Campagnes d'admission par année universitaire.
- Association d'une campagne à une ou plusieurs filières ouvertes.
- Portail public de candidature.
- Numéro de candidature généré automatiquement.
- Contrôle de la période d'ouverture.
- Présélection et classement configurables.
- Workflow jusqu'à la conversion en étudiant.
- Dépôt public de pièces PDF/JPEG/PNG limité à 10 Mo.
- Suivi public d'une candidature.
