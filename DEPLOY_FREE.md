# Déployer UniGest v0.4.1 gratuitement pour test

Cette procédure vise une démonstration ou des tests fonctionnels, pas une production universitaire.

## 1. Mettre le projet sur GitHub

Créer un dépôt GitHub puis y pousser le contenu de `unigest-mvp-v0.4.1`.

Ne jamais committer `.env`, les mots de passe, la chaîne PostgreSQL ou la clé Supabase.

## 2. Créer le projet Supabase

Créer un projet Supabase.

Dans `Project > Connect`, copier une chaîne PostgreSQL adaptée au backend Render. Si la connexion directe n'est pas accessible depuis le réseau utilisé, choisir le Session pooler.

Variables nécessaires pour l'API :

```env
DATABASE_URL=postgresql://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_SECRET_KEY=...
SUPABASE_STORAGE_BUCKET=candidate-documents
```

La clé `SUPABASE_SECRET_KEY` est un secret serveur. Ne jamais la placer dans Vercel côté navigateur et ne jamais la préfixer par `NEXT_PUBLIC_`.

Le bucket `candidate-documents` peut être créé manuellement comme bucket privé. Si le compte de service dispose des droits nécessaires, UniGest le crée aussi automatiquement.

## 3. Déployer l'API sur Render

Le fichier `render.yaml` configure le service.

Depuis Render :

1. connecter le dépôt GitHub ;
2. choisir `New > Blueprint` ;
3. sélectionner le dépôt ;
4. Render détecte `render.yaml` ;
5. renseigner les variables marquées `sync: false`.

Valeurs à fournir :

```text
DATABASE_URL
CORS_ORIGINS
SUPABASE_URL
SUPABASE_SECRET_KEY
BOOTSTRAP_ADMIN_EMAIL
BOOTSTRAP_ADMIN_PASSWORD
```

Pour le premier déploiement, `CORS_ORIGINS` peut contenir une URL temporaire. Elle sera remplacée par l'URL Vercel à l'étape 5.

Le mot de passe bootstrap doit contenir au moins 12 caractères.

Le service exécute :

```text
Build : npm install && npm run build
Start : npm run start:cloud
```

`start:cloud` applique les migrations puis démarre NestJS.

Après le déploiement, noter l'URL, par exemple :

```text
https://unigest-api.onrender.com
```

Tester :

```text
https://unigest-api.onrender.com/health
```

Le résultat doit signaler `status: "ok"`.

## 4. Déployer le frontend sur Vercel

Importer le même dépôt dans Vercel.

Configurer :

```text
Root Directory : apps/web
Framework       : Next.js
```

Créer la variable :

```env
NEXT_PUBLIC_API_URL=https://unigest-api.onrender.com
```

Déployer.

Vercel fournit ensuite une URL de type :

```text
https://unigest-xxxx.vercel.app
```

Les variables `NEXT_PUBLIC_*` sont intégrées au bundle lors du build. Toute modification de `NEXT_PUBLIC_API_URL` nécessite donc un nouveau déploiement du frontend.

## 5. Corriger CORS dans Render

Dans Render, définir :

```env
CORS_ORIGINS=https://unigest-xxxx.vercel.app
```

Puis redémarrer ou redéployer l'API.

Si plusieurs domaines sont utilisés :

```env
CORS_ORIGINS=https://unigest.vercel.app,https://demo.example.org
```

## 6. Premier test

Tester dans cet ordre :

1. `/health` sur l'API ;
2. page de connexion ;
3. connexion avec `BOOTSTRAP_ADMIN_EMAIL` ;
4. création d'une année et d'une filière ;
5. création d'une campagne ;
6. `/apply` depuis une fenêtre privée ;
7. dépôt d'un PDF ;
8. retour dans `Candidatures & admissions` ;
9. téléchargement de la pièce depuis l'interface administrative.

## 7. Limites du déploiement gratuit

Selon les conditions des fournisseurs, le service gratuit peut être mis en veille, démarrer lentement après une période d'inactivité et disposer de quotas limités.

Ne pas utiliser cette configuration gratuite pour des dossiers étudiants réels ou sensibles. Utiliser des données fictives pour les tests publics.

## 8. Passage ultérieur en production

Avant une exploitation réelle :

- domaine institutionnel ;
- sauvegardes PostgreSQL testées ;
- stockage avec politique de rétention ;
- chiffrement et vérification SSL complète ;
- scans antivirus ;
- limitation de débit ;
- journalisation centralisée ;
- 2FA ;
- tests d'intrusion ;
- procédures de restauration ;
- suppression de tous les comptes et données de démonstration.
