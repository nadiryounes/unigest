# Validation technique UniGest v0.4.1 Cloud Ready

Date : 2026-09-27

## Contrôles réalisés

- 125 fichiers TypeScript/TSX analysés par le parseur TypeScript : aucune erreur de syntaxe.
- 126 fichiers TypeScript/TSX contrôlés pour les imports locaux : aucun import local manquant.
- Fichiers JSON : valides.
- `render.yaml` et `docker-compose.yml` : YAML valides.
- Trois migrations enregistrées dans le DataSource, dans l'ordre :
  1. `1770000000000-V02BaseSchema`
  2. `1780000000000-V03ProfilesAndAudit`
  3. `1790000000000-V04AcademicStructureAdmissions`
- `DATABASE_URL` et SSL cloud pris en charge.
- `STORAGE_DRIVER=local|supabase` pris en charge.
- Nouvelle clé Supabase `sb_secret_*` prise en charge via l'en-tête `apikey`.
- Fallback legacy `service_role` maintenu côté serveur.
- Health check `/health` présent.
- CORS configurable via `CORS_ORIGINS`.
- Seed de démonstration désactivé par défaut en production.
- Administrateur bootstrap configurable.
- Configuration Render et Vercel incluse.

## Contrôle npm

Le build complet `npm install && npm run build` n'a pas pu être exécuté dans l'environnement de génération.

Le 27 septembre 2026, `npm ping` échoue avec :

```text
EAI_AGAIN registry.npmjs.org
```

Le cache npm local est vide ; une installation offline n'est donc pas possible.

Cela signifie que la syntaxe et la structure du projet ont été contrôlées, mais qu'un build avec les dépendances réelles doit encore être exécuté lors du premier déploiement Render/Vercel ou sur une machine disposant d'un accès npm.

## Point à vérifier lors du premier déploiement

Après déploiement Render :

1. vérifier `/health` ;
2. vérifier que les trois migrations sont marquées comme exécutées ;
3. vérifier la création/lecture du bucket `candidate-documents` ;
4. déposer un PDF depuis `/apply` ;
5. télécharger cette pièce depuis l'espace administratif.

## Périmètre

Cette version est destinée à la démonstration et aux tests fonctionnels. Elle n'est pas encore durcie pour héberger des données universitaires réelles.
