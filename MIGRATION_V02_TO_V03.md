# Migration UniGest v0.2 → v0.3

La v0.3 ajoute les liens `User ↔ Student/Teacher`, le champ `updatedAt` et la table `audit_logs`.

## Installation de développement neuve

`DB_SYNCHRONIZE=true` laisse TypeORM créer le schéma automatiquement. C'est la valeur par défaut du MVP.

## Base v0.2 existante

1. Effectuer une sauvegarde PostgreSQL.
2. Arrêter l'API v0.2.
3. Installer les dépendances de la v0.3.
4. Positionner les variables `DATABASE_*` vers la base existante.
5. Exécuter :

```bash
npm run migration:run -w apps/api
```

6. Démarrer ensuite l'API v0.3 avec `DB_SYNCHRONIZE=false`.

La migration est conçue pour conserver les données v0.2 et ajouter uniquement les structures nécessaires à la v0.3.
