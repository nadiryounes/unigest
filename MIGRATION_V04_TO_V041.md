# Migration UniGest v0.4 → v0.4.1 Cloud Ready

La v0.4.1 ne modifie pas les entités métier de la v0.4. Elle ajoute une migration initiale idempotente, un stockage abstrait et la configuration cloud.

## Base de données existante

Avant toute opération :

1. sauvegarder PostgreSQL ;
2. sauvegarder le dossier/volume `uploads` ;
3. déployer le code v0.4.1 ;
4. définir `DB_SYNCHRONIZE=false` ;
5. exécuter les migrations.

La migration `1770000000000-V02BaseSchema` utilise `CREATE TABLE IF NOT EXISTS` et des créations d'enums tolérant les doublons. Elle peut donc être enregistrée sur une base déjà créée par les anciennes versions sans recréer les tables.

## Fichiers locaux existants

La v0.4 stockait des clés de type :

```text
uploads/candidates/<application-id>/<fichier>
```

Le driver local v0.4.1 reste compatible avec ces clés.

## Passage d'un stockage local à Supabase

Changer simplement `STORAGE_DRIVER=local` vers `STORAGE_DRIVER=supabase` ne transfère pas les fichiers déjà présents sur disque.

Pour une base v0.4 contenant déjà des pièces :

- conserver une copie du volume `uploads` ;
- transférer chaque objet vers le bucket Supabase ;
- adapter sa clé au format `candidates/<application-id>/<fichier>` ou conserver une convention cohérente ;
- mettre à jour `candidate_documents.storageKey` seulement après vérification du transfert.

Pour un nouveau déploiement de test avec une base Supabase vide, aucune migration de fichiers n'est nécessaire.

## Production

Les comptes de démonstration connus ne sont plus créés par défaut lorsque `NODE_ENV=production`.

Définir un administrateur initial avec :

```env
BOOTSTRAP_ADMIN_EMAIL=...
BOOTSTRAP_ADMIN_PASSWORD=...
DEMO_SEED_ENABLED=false
```

Le mot de passe doit contenir au moins 12 caractères.
