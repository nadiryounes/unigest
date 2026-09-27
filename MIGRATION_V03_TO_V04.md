# Migration UniGest v0.3 → v0.4

La v0.4 conserve les tables de la v0.3 et ajoute la structure académique détaillée ainsi que les admissions.

## Sauvegarde

Avant toute migration d'une base réelle :

```bash
pg_dump -Fc -h <host> -U <user> <database> > unigest_v03_before_v04.dump
```

Les pièces jointes de candidature n'existent pas en v0.3. À partir de la v0.4 elles sont stockées sous `uploads/candidates/` et doivent être incluses dans les sauvegardes.

## Migration recommandée

1. Installer/déployer le code v0.4.
2. Définir `DB_SYNCHRONIZE=false`.
3. Exécuter les migrations TypeORM :

```bash
npm run build -w apps/api
npm run migration:run:prod -w apps/api
```

Avec Docker Compose :

```bash
docker compose build api
docker compose run --rm api npm run migration:run:prod
```

4. Démarrer ensuite l'application :

```bash
docker compose up -d
```

## Objets ajoutés

- `academic_levels`
- `academic_semesters`
- `module_elements`
- `validation_rules`
- `application_campaigns`
- `application_campaign_programs`
- `candidates`
- `applications`
- `candidate_documents`
- `academic_modules.semesterRefId`
- `student_groups.academicLevelId`

La colonne numérique historique `academic_modules.semester` est conservée pour compatibilité. La nouvelle relation `semesterRefId` devient la référence structurée à privilégier.

## Après migration

Vérifier au minimum :

```bash
npm run migration:show:prod -w apps/api
```

Puis contrôler dans l'interface : Structure académique, Promotions & groupes, Candidatures & admissions, Délibérations.
