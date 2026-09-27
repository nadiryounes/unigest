# Déployer UniGest v0.4.1 gratuitement pour test

Cette procédure vise une démonstration ou des tests fonctionnels avec des données fictives. Elle n'est pas destinée à une exploitation universitaire réelle.

## Architecture

Le dépôt GitHub contient deux applications déployées comme deux projets Vercel distincts :

```text
GitHub: nadiryounes/unigest
   |
   +--> Vercel Project 1: apps/api  --> NestJS API
   |                                  |
   |                                  +--> Supabase PostgreSQL
   |                                  +--> Supabase Storage
   |
   +--> Vercel Project 2: apps/web  --> Next.js
```

Vercel prend actuellement en charge NestJS directement. Aucun adaptateur serverless personnalisé n'est nécessaire.

## 1. Supabase

Créer un projet Supabase puis récupérer :

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SECRET_KEY=...
SUPABASE_STORAGE_BUCKET=candidate-documents
```

Pour un accès IPv4, utiliser le Session pooler si nécessaire.

Créer dans Supabase Storage un bucket privé nommé exactement :

```text
candidate-documents
```

Ne jamais committer les secrets dans GitHub.

## 2. Déployer l'API NestJS sur Vercel

Dans Vercel :

1. choisir `Add New > Project` ;
2. importer le dépôt `nadiryounes/unigest` ;
3. définir `Root Directory` sur `apps/api` ;
4. laisser Vercel détecter NestJS automatiquement ;
5. ne pas modifier l'Output Directory ;
6. ajouter les variables d'environnement ci-dessous.

Variables API :

```env
NODE_ENV=production

DATABASE_URL=postgresql://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
DB_SYNCHRONIZE=false

JWT_SECRET=une-valeur-longue-aleatoire

DEMO_SEED_ENABLED=false
BOOTSTRAP_ADMIN_EMAIL=admin@example.org
BOOTSTRAP_ADMIN_PASSWORD=un-mot-de-passe-de-12-caracteres-minimum
BOOTSTRAP_ADMIN_FIRST_NAME=Administrateur
BOOTSTRAP_ADMIN_LAST_NAME=UniGest

STORAGE_DRIVER=supabase
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SECRET_KEY=...
SUPABASE_STORAGE_BUCKET=candidate-documents
```

`CORS_ORIGINS` peut être laissé vide au premier déploiement de l'API. Il sera défini après création du frontend.

Le fichier `apps/api/package.json` contient :

```text
vercel-build = npm run build && npm run migration:run:prod
```

Ainsi, lors du déploiement, NestJS est compilé puis les migrations TypeORM sont appliquées à Supabase avant mise en ligne.

Après déploiement, noter l'URL de production, par exemple :

```text
https://unigest-api.vercel.app
```

Tester :

```text
https://unigest-api.vercel.app/health
```

Le résultat doit indiquer un statut `ok` ou éventuellement `degraded` si le bucket Storage n'est pas encore prêt.

## 3. Déployer le frontend Next.js sur Vercel

Créer un deuxième projet Vercel à partir du même dépôt :

1. `Add New > Project` ;
2. sélectionner encore `nadiryounes/unigest` ;
3. définir `Root Directory` sur `apps/web` ;
4. conserver le Framework Preset `Next.js` ;
5. ajouter :

```env
NEXT_PUBLIC_API_URL=https://unigest-api.vercel.app
```

Déployer.

Noter l'URL du frontend, par exemple :

```text
https://unigest-web.vercel.app
```

## 4. Configurer CORS sur l'API

Retourner dans le projet Vercel de l'API :

`Settings > Environment Variables`

Ajouter :

```env
CORS_ORIGINS=https://unigest-web.vercel.app
```

Puis redéployer l'API.

Pour plusieurs domaines :

```env
CORS_ORIGINS=https://unigest-web.vercel.app,https://demo.example.org
```

UniGest exige des origines exactes ; les jokers ne sont pas activés.

## 5. Premier test

Tester dans cet ordre :

1. `/health` sur l'API ;
2. page de connexion du frontend ;
3. connexion avec `BOOTSTRAP_ADMIN_EMAIL` ;
4. création d'une année universitaire ;
5. création d'une filière ;
6. création d'une campagne d'admission ;
7. ouverture de `/apply` dans une fenêtre privée ;
8. dépôt d'un PDF fictif ;
9. retour dans `Candidatures & admissions` ;
10. téléchargement de la pièce depuis l'interface administrative.

## 6. Migrations

Les migrations suivantes préparent une base Supabase vierge :

```text
1770000000000-V02BaseSchema
1780000000000-V03ProfilesAndAudit
1790000000000-V04AcademicStructureAdmissions
```

Elles sont rejouables sans recréer les migrations déjà appliquées grâce à la table de migrations TypeORM.

## 7. Sécurité

Pour un test public :

- utiliser uniquement des données fictives ;
- ne jamais exposer `SUPABASE_SECRET_KEY` dans le frontend ;
- ne jamais utiliser un nom de variable commençant par `NEXT_PUBLIC_` pour un secret ;
- utiliser un `JWT_SECRET` aléatoire et long ;
- conserver `DEMO_SEED_ENABLED=false` ;
- garder le bucket `candidate-documents` privé.

Si un secret a été communiqué dans un canal non prévu pour le stockage de secrets, le régénérer après validation du déploiement et remplacer la valeur dans Vercel.

## 8. Limites

Les offres gratuites Vercel et Supabase sont adaptées au développement et à la démonstration, avec des quotas et limites qui peuvent évoluer.

Avant une exploitation réelle :

- domaine institutionnel ;
- sauvegardes testées ;
- vérification SSL complète ;
- limitation de débit ;
- antivirus pour les fichiers entrants ;
- récupération de compte et 2FA ;
- supervision ;
- journalisation centralisée ;
- tests E2E et tests d'intrusion ;
- politique de conservation et suppression des données.
