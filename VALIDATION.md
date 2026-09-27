# Validation technique UniGest v0.5.1 — Production Hardening

Date : 2026-09-27

## Statut

La branche `hardening/v0.5.1` a été validée sur GitHub Actions avec PostgreSQL 16, Node.js 22, les builds de production NestJS/Next.js et un navigateur Chromium réel.

Run de référence entièrement vert avant la mise à jour documentaire/optimisation CI :

```text
GitHub Actions run : 36357263978
Commit testé       : 144a0ed7a79039968f08b5b3382fd000e25eca32
```

Les modifications suivantes après ce run concernent uniquement l'optimisation du pipeline CI et la présente documentation ; elles ne changent pas la logique applicative validée.

## Résultats automatisés

### Tests unitaires API

```text
Test Suites : 12 passed / 12
Tests       : 38 passed / 38
```

Les suites couvrent notamment :

- authentification et normalisation des identifiants ;
- secret JWT fort ;
- versionnement/révocation des JWT ;
- verrouillage après échecs de connexion ;
- administrateur bootstrap création-only ;
- récupération et changement de mot de passe ;
- jetons de reset à usage unique ;
- rate limiting persistant ;
- rôles/RBAC ;
- initialisation différée PostgreSQL ;
- Storage local ;
- étudiants/imports ;
- notes et contrôle enseignant ;
- conflits d'emploi du temps ;
- délibérations.

### Tests frontend Vitest

```text
Test files : 2 passed / 2
Tests      : 4 passed / 4
```

Contrôles :

- helper API et bearer token ;
- remontée des erreurs de validation ;
- recherche CRUD ;
- tri et pagination.

### Tests E2E API

```text
Test Suites : 1 passed / 1
Tests       : 11 passed / 11
```

Scénarios vérifiés :

1. health PostgreSQL/Storage ;
2. bootstrap et authentification administrateur ;
3. accès administratif anonyme refusé ;
4. seed de démonstration idempotent ;
5. dashboard enrichi ;
6. RBAC enseignant/étudiant ;
7. reset de mot de passe à usage unique avec révocation de l'ancien JWT ;
8. `logout-all` avec révocation de session ;
9. validation des bornes de note ;
10. détection de conflit d'emploi du temps ;
11. workflow admissions complet jusqu'à la conversion en étudiant et connexion du nouveau compte.

Le workflow admissions E2E contrôle aussi :

- rejet des candidatures dupliquées ;
- suivi public avec email associé ;
- upload d'un PDF valide ;
- rejet d'un fichier exécutable ;
- rejet d'un faux PDF dont la signature ne correspond pas au MIME ;
- téléchargement authentifié ;
- décision d'admission ;
- création de l'inscription et du compte étudiant.

### Tests navigateur Chromium — Playwright

```text
3 passed / 3
```

Scénarios :

- présence effective des headers de sécurité frontend ;
- connexion administrateur dans un vrai navigateur, ouverture du dashboard et de l'espace Sécurité du compte ;
- demande « mot de passe oublié » sans divulgation de l'existence d'un compte.

L'exécution Playwright a également permis de détecter puis corriger un défaut d'accessibilité : les labels des formulaires sont désormais associés explicitement à leurs champs par `htmlFor/id`.

## Builds et exécution de production

Validés :

- `npm ci` avec lockfile ;
- build NestJS ;
- build Next.js ;
- démarrage réel du binaire NestJS compilé ;
- démarrage réel du serveur Next.js compilé ;
- login administrateur sur le binaire de production ;
- CORS ;
- health endpoint ;
- seed production sans comptes de démonstration à mots de passe connus.

Réponse health observée lors du smoke test :

```json
{
  "status": "ok",
  "database": "ok",
  "storage": {
    "driver": "local",
    "ready": true
  },
  "passwordRecovery": {
    "provider": "resend",
    "ready": false
  },
  "version": "0.5.1"
}
```

`passwordRecovery.ready=false` est attendu dans le CI : aucune clé Resend réelle n'est utilisée dans les tests.

## PostgreSQL et migrations

Les migrations sont exécutées sur une base PostgreSQL 16 vierge puis exécutées une seconde fois pour vérifier l'idempotence opérationnelle.

Migrations enregistrées :

1. `1770000000000-V02BaseSchema`
2. `1780000000000-V03ProfilesAndAudit`
3. `1790000000000-V04AcademicStructureAdmissions`
4. `1800000000000-V051SecurityHardening`

Le CI contrôle explicitement l'existence de :

- `users` ;
- `applications` ;
- `audit_logs` ;
- `password_reset_tokens` ;
- `request_rate_limits` ;
- colonne `users.tokenVersion`.

## Durcissement sécurité vérifié

La v0.5.1 apporte :

- mot de passe administrateur bootstrap création-only ;
- minimum de 12 caractères pour les nouveaux mots de passe ;
- JWT secret de 32 caractères minimum en production ;
- expiration JWT existante + révocation via `tokenVersion` ;
- révocation de toutes les sessions après changement/reset de mot de passe ;
- verrouillage temporaire après cinq échecs de connexion ;
- reset opaque SHA-256, durée 30 minutes et usage unique ;
- réponse générique du « mot de passe oublié » contre l'énumération directe des comptes ;
- rate limiting PostgreSQL compatible serverless ;
- purge automatique des anciens buckets de rate limiting ;
- CORS à origines exactes ;
- CSP ;
- `X-Frame-Options: DENY` ;
- `X-Content-Type-Options: nosniff` ;
- politique de référent ;
- restrictions Permissions-Policy ;
- HSTS API en production ;
- redaction de champs sensibles dans l'audit ;
- contrôle de signature des PDF/JPEG/PNG ;
- absence de secrets runtime suivis par Git ;
- scan CI des motifs de secrets ;
- `npm audit --omit=dev --audit-level=high` bloquant.

## Dépendances

Le CI ne détecte aucune vulnérabilité de sévérité `high` ou `critical` dans les dépendances de production.

Il subsiste actuellement deux alertes de sévérité modérée dans l'arbre de production, liées à la dépendance transitive `uuid < 11.1.1` utilisée via `exceljs`. Le correctif automatique proposé par npm impose un changement de version majeur/régressif d'ExcelJS ; il n'a donc pas été appliqué aveuglément.

Cette dette doit rester suivie avant la v1.0.

## Ordre obligatoire de déploiement v0.5.1

La v0.5.1 dépend de nouvelles colonnes et tables PostgreSQL. **Le code API v0.5.1 ne doit pas être déployé sur la base Supabase v0.5.0 avant application de la migration de sécurité.**

Ordre :

```text
1. Sauvegarder la base Supabase
2. Exécuter 1800000000000-V051SecurityHardening
3. Vérifier les 4 migrations
4. Configurer les nouvelles variables de production
5. Déployer unigest-api v0.5.1
6. Vérifier /health
7. Déployer unigest-web v0.5.1
8. Exécuter le smoke fonctionnel
```

Variables supplémentaires pour la récupération réelle par email :

```env
PASSWORD_RESET_WEB_URL=https://unigest-web.vercel.app/reset-password
RESEND_API_KEY=...
EMAIL_FROM=UniGest <noreply@example.org>
```

Sans Resend, le reste de l'application fonctionne mais aucun email de récupération n'est délivré.

## Limites avant exploitation institutionnelle

La v0.5.1 est nettement plus robuste que la v0.5.0, mais les points suivants restent à traiter avant utilisation avec des données universitaires sensibles en production :

- 2FA pour les comptes privilégiés ;
- scan antivirus/malware des pièces déposées ;
- sauvegardes automatisées avec tests de restauration ;
- monitoring/alerting centralisé ;
- permissions fines au-delà des quatre rôles généraux ;
- politique de rétention/suppression des données ;
- revue de sécurité externe ;
- tests de charge et dimensionnement ;
- procédure d'incident et rotation documentée des secrets.

## Conclusion technique

Le socle v0.5.1 est validé pour développement, démonstration et pilote contrôlé. Les builds, migrations, règles d'authentification, principaux workflows métier, smoke tests de production et tests Chromium sont reproductibles dans le CI.

La fusion/déploiement production doit cependant respecter impérativement l'ordre de migration indiqué ci-dessus.
