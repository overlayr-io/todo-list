# Objectifs — Application de gestion de tâches

Application Kanban mono-utilisateur, thème sombre/clair, fidèle aux maquettes
`design-reference/`. Projets, tâches, sous-tâches, checklist, étiquettes, liens
(aperçu OpenGraph), progression pondérée, récurrence, et **synchronisation Google
Agenda** des échéances.

Quatre vues par projet — **Kanban** (glisser-déposer), **Liste**, **Tableau**,
**Gantt** — plus une **Vue d'ensemble**, une page **À venir** (échéances groupées),
la gestion des **Étiquettes** et une page **Synchronisation**.

## Stack

| Couche      | Techno                                             |
|-------------|----------------------------------------------------|
| Frontend    | Vue 3 + Vite, Pinia, Vue Router, CSS variables     |
| Backend     | Node 20 + Express (ESM), `pg`, `googleapis`        |
| Base        | PostgreSQL 16                                      |
| Orchestration | Docker Compose (db · backend · frontend/nginx)   |

```
todo-list/
├── docker-compose.yml        # db + backend + frontend
├── .env.example              # variables d'environnement (copier vers .env)
├── backend/                  # API REST Express
│   └── src/
│       ├── db/               # pool, migrations SQL, runner, seed
│       ├── routes/           # projects, tasks, labels, views, sync
│       ├── services/         # progress, recurrence, og, google, tasks
│       └── index.js          # bootstrap : migrate → seed → listen
└── frontend/                 # SPA Vue
    └── src/
        ├── components/       # Sidebar, TaskCard, TaskDetailModal, project/*
        ├── views/            # Overview, Upcoming, Project, Labels, Sync
        └── stores/           # data, ui, theme (Pinia)
```

## Démarrage rapide (Docker)

Prérequis : Docker + Docker Compose.

```bash
cp .env.example .env      # ajustez si besoin (voir « Configuration »)
docker compose up -d --build
```

- Frontend : <http://localhost:8080>
- API : <http://localhost:4000/api> (santé : `/api/health`)

Au premier démarrage le backend applique les **migrations** puis charge un **seed**
reproduisant les données des maquettes (2 projets, 7 étiquettes, 10 tâches avec
sous-tâches / checklist / liens). Le seed est idempotent : il ne s'exécute que si la
base est vide.

Arrêter : `docker compose down` — repartir de zéro (efface la base) :
`docker compose down -v`.

## Développement local (sans Docker pour le front)

La base et l'API peuvent tourner en Docker pendant que le front tourne en mode dev
(HMR). Le CORS autorise déjà `http://localhost:5173`.

```bash
docker compose up -d db backend        # base + API
cd frontend && npm install && npm run dev   # http://localhost:5173
```

Pour lancer le backend hors Docker : `cd backend && npm install`, exposez
`DATABASE_URL`, puis `npm start` (ou `npm run migrate` / `npm run seed`).

## Configuration (`.env`)

| Variable | Rôle | Défaut |
|----------|------|--------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Identifiants Postgres | `objectifs` |
| `POSTGRES_PORT` | Port Postgres exposé | `5432` |
| `BACKEND_PORT` / `FRONTEND_PORT` | Ports hôte API / front | `4000` / `8080` |
| `RUN_SEED` | Recharger le seed au boot (si base vide) | `true` |
| `CORS_ORIGIN` | Origines autorisées (séparées par des virgules) | `http://localhost:8080,http://localhost:5173` |
| `APP_BASE_URL` | URL du front (retour après OAuth) | `http://localhost:8080` |
| `VITE_API_BASE` | URL de l'API vue par le navigateur (build front) | `http://localhost:4000/api` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Identifiants OAuth Google | _(vide)_ |
| `GOOGLE_REDIRECT_URI` | URI de redirection OAuth | `http://localhost:4000/api/sync/google/callback` |

> `VITE_API_BASE` est injecté **au build** de l'image frontend. Si vous changez
> l'URL de l'API, reconstruisez le front : `docker compose build frontend`.

## Configurer la synchronisation Google Agenda

Sans identifiants Google, l'application fonctionne normalement ; la page
**Synchronisation** affiche simplement « non configurée ». Pour l'activer :

1. **Google Cloud Console** → <https://console.cloud.google.com/> — créez (ou
   sélectionnez) un projet.
2. **APIs & Services → Library** → activez **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** :
   - Type **External**, renseignez le nom de l'app et l'e-mail de support.
   - Ajoutez le scope `.../auth/calendar.events`.
   - En mode *Testing*, ajoutez votre adresse Google dans **Test users**.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** :
   - Type d'application : **Web application**.
   - **Authorized redirect URIs** : ajoutez exactement
     `http://localhost:4000/api/sync/google/callback`
     (identique à `GOOGLE_REDIRECT_URI`).
5. Copiez le **Client ID** et le **Client secret** dans `.env` :
   ```
   GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxxxxx
   ```
6. Redémarrez le backend : `docker compose up -d backend`.
7. Dans l'app, page **Synchronisation → Connecter mon compte Google**, autorisez
   l'accès, puis **Synchroniser maintenant**. Chaque tâche ayant une échéance devient
   un événement (journée entière) dans l'agenda choisi.

Réglages disponibles sur la page : synchronisation automatique, sens
Objectifs → Google, rappels 24 h avant. **Déconnecter le compte** révoque les jetons
stockés et délie les événements.

> En production, remplacez `localhost` par votre domaine dans
> `GOOGLE_REDIRECT_URI`, `APP_BASE_URL`, `CORS_ORIGIN` et l'URI de redirection
> déclarée dans Google Cloud.

## Déploiement sur Render

Le compte Render gratuit ne supporte pas les *Blueprints* (`render.yaml`) — ce
fichier reste dans le repo pour un compte payant, mais sur le plan gratuit il faut
créer les trois ressources **manuellement** dans le dashboard. Les deux services
sont des **web services Docker** (backend : `backend/Dockerfile`, frontend : nginx
via `frontend/Dockerfile`) — même image qu'en local avec Docker Compose.

### 1. Base de données

**New + → PostgreSQL**
- Name : `objectifs-db`, plan **Free**.
- Une fois créée, notez l'**Internal Database URL** (onglet *Connect*) — c'est la
  valeur de `DATABASE_URL` pour le backend.

### 2. Backend (web service Docker)

**New + → Web Service** → connectez le repo GitHub.
- **Runtime** : `Docker`.
- **Root Directory** : `backend`.
- **Dockerfile Path** : `backend/Dockerfile` (ou `./Dockerfile` si le root est déjà
  `backend`).
- **Plan** : Free.
- **Health Check Path** : `/api/health`.
- **Variables d'environnement** :

  | Variable | Valeur |
  |----------|--------|
  | `NODE_ENV` | `production` |
  | `PORT` | `4000` |
  | `DATABASE_URL` | l'Internal Database URL notée ci-dessus |
  | `DATABASE_SSL` | `true` |
  | `RUN_MIGRATIONS` | `true` |
  | `RUN_SEED` | `true` |
  | `CORS_ORIGIN` | *(à renseigner après l'étape 3, avec l'URL du frontend)* |
  | `APP_BASE_URL` | *(idem — URL du frontend)* |
  | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | *(optionnel, sync Google)* |

- Créez le service. Notez son URL une fois déployé, ex.
  `https://objectifs-backend.onrender.com`.

### 3. Frontend (web service Docker, nginx)

**New + → Web Service** → même repo.
- **Runtime** : `Docker`.
- **Root Directory** : `frontend`.
- **Dockerfile Path** : `frontend/Dockerfile`.
- **Plan** : Free.
- **Variables d'environnement** :

  | Variable | Valeur |
  |----------|--------|
  | `VITE_API_BASE` | URL du backend + `/api`, ex. `https://objectifs-backend.onrender.com/api` |

  Render transmet automatiquement cette variable comme *build arg* Docker
  (`ARG VITE_API_BASE` dans `frontend/Dockerfile`), donc elle est figée dans le
  bundle Vite à la construction de l'image — pas besoin de la redéfinir ailleurs.
  Le port d'écoute nginx est généré dynamiquement depuis la variable `PORT` fournie
  par Render (`frontend/templates/default.conf.template`).

- Créez le service, notez son URL, ex. `https://objectifs-frontend.onrender.com`.

### 4. Boucler les deux URLs

Revenez sur le service **backend** et mettez à jour :
- `CORS_ORIGIN` = URL du frontend
- `APP_BASE_URL` = URL du frontend

Sauvegarder déclenche automatiquement un redéploiement du backend.

> Pensez à mettre à jour l'URI de redirection OAuth dans Google Cloud avec le
> domaine Render si vous utilisez la synchronisation.

### 5. Redéploiements — `npm run deploy`

Le `package.json` racine fournit des scripts pour rebuild et déclencher un déploiement
Render **du dernier commit poussé** :

```bash
npm run build            # build de sanity du frontend (dist/)
npm run deploy           # déclenche backend + frontend
npm run deploy:backend   # backend uniquement
npm run deploy:frontend  # frontend uniquement
```

Le script [`scripts/deploy-render.mjs`](scripts/deploy-render.mjs) lit `.env` et
déclenche le déploiement via, au choix :

- **Deploy Hooks** — copiez l'URL *Deploy Hook* de chaque service (Render →
  service → *Settings → Deploy Hook*) dans `.env` :
  ```
  RENDER_DEPLOY_HOOK_BACKEND=https://api.render.com/deploy/srv-…?key=…
  RENDER_DEPLOY_HOOK_FRONTEND=https://api.render.com/deploy/srv-…?key=…
  ```
- **API Render** — alternativement, `RENDER_API_KEY` + `RENDER_SERVICE_ID_BACKEND` /
  `RENDER_SERVICE_ID_FRONTEND`.

> Render construit à partir de la branche connectée : **poussez vos changements
> avant** de lancer `npm run deploy`. Sur le plan gratuit, le backend se met en
> veille après inactivité (premier appel un peu lent) et la base Postgres gratuite
> expire après 90 jours.

## Aperçu de l'API

Base : `/api`.

| Méthode & route | Description |
|-----------------|-------------|
| `GET /health` | Sonde de vie |
| `GET /overview` | Consultations récentes + tâches actives |
| `GET /upcoming` | Échéances groupées (en retard / semaine / mois / plus tard) |
| `GET /projects` · `GET /projects/:id` | Projets (+ colonnes, tâches) |
| `POST/PATCH/DELETE /projects[...]` | CRUD projets et colonnes |
| `POST /tasks` · `GET/PATCH/DELETE /tasks/:id` | CRUD tâches (déplacement Kanban via `columnId`/`position`) |
| `POST /tasks/:id/complete` | Termine (ou fait avancer une tâche récurrente) |
| `POST /tasks/:id/view` | Marque une consultation |
| `.../subtasks` · `.../checklist` · `.../links` | Sous-tâches, checklist, liens (aperçu OpenGraph) |
| `PUT /tasks/:id/labels` | Remplace les étiquettes d'une tâche |
| `GET/POST/PATCH/DELETE /labels[...]` | CRUD étiquettes |
| `GET /sync/google/status` · `.../connect` · `.../callback` · `POST .../run` · `.../disconnect` · `PATCH .../settings` | Synchronisation Google |

**Progression pondérée** : pour une tâche en mode auto, la progression est la part
d'items terminés (sous-tâches + checklist). Sinon, la valeur saisie manuellement est
utilisée.

## Notes

- Application **mono-utilisateur** : l'avatar « Tharshigan » est décoratif, il n'y a
  pas d'authentification (à ajouter avant une exposition publique).
- Les jetons Google sont stockés dans la table `settings` (ligne unique). Ne
  committez jamais votre `.env`.
