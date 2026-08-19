# Centaur Medical — Frontend

Medical Records Management System — Hospital Patient Management**

Vue 3 + TypeScript (strict) + **JSX** (no SFC `.vue`), consommé via `example/`.

## Stack

- Vue 3 / TypeScript / JSX
- Axios, Pinia, Vue Router
- Vue CLI 5 + Webpack


## Quick start

bash
npm install
npm run serve
```

Open http://localhost:8084/

Le dev server proxy `/api` → `http://127.0.0.1:3000` (Gateway backend).

### Prérequis

Le backend doit tourner (`npm run dev` dans `centaur-medical-backend`).

## Environment

Copier `.env.example` → `.env.local` (optionnel) :

```env
# URL de l'API Gateway (optionnel — le proxy Vue CLI suffit en dev)
VUE_APP_API_URL=http://127.0.0.1:3000/api
```

| Variable | Défaut | Description |
|----------|--------|-------------|
| `VUE_APP_API_URL` | proxy `/api` | Base URL Axios en production |

## Architecture

```text
example/main.ts
    └── createCentaurMedicalApp()
            ├── Pinia (auth)
            ├── Vue Router (RBAC guards)
            ├── Axios client + interceptors
            └── Views / Components / Composables

text
src/
├── api/              # Appels HTTP (patients, prescriptions, documents…)
├── composables/      # État local par domaine (usePatients, usePrescriptions…)
├── components/
│   ├── layout/       # Sidebar, Topbar, AppLayout
│   ├── ui/           # Button, Card, DataTable, Pagination, Modal…
│   ├── patient/      # PatientHeader, MedicalRecordCard
│   ├── prescription/ # Ordonnances, impression PDF
│   ├── document/     # Documents du dossier
│   ├── clinical-note/# Comptes rendus
│   └── history/      # Timeline historique médical
├── views/            # Pages (Dashboard, Patients, Notifications…)
├── stores/           # Pinia (auth)
└── styles/           # tokens.css + global.css


## Fonctionnalités

### Authentification

- Login + MFA email (ADMIN / DIRECTION)
- Changement de mot de passe obligatoire (1ʳᵉ connexion) en cas d'ajout des utilisateur l'utilisateur doit changer le mdps attribué par admin 
- Mot de passe oublié par code d'identification par  email puis il introduit nouveau mdps
- Refresh token automatique (~10 min)

### Dashboard

- KPIs patients (total, critiques, admis aujourd'hui, lits)
- Occupation par service (Chirurgie générale, Urgences, Oncologie, Cardiologie)

### Patients

- Liste avec recherche (nom, prénom, code patient) + filtre service
- Pagination  : affichage 5 par page , chargement par chunks de 50 depuis l'API
- CRUD patient (4 services, spécialités par département)
- Fiche patient : onglets Informations / Dossier médical / Ordonnances

Dossier médical

- Documents: upload (ECG, Carte de groupage, Ordonnance, Autre), visualisation, téléchargement, suppression
- Comptes rendus cliniques : création, consultation, suppression
- Historique médical : timeline chronologique  (prescription, document, admission…)

 Ordonnances

- Création multi-médicaments depuis le dossier patient
- Liste globale (`/prescriptions`) avec filtres statut / service + pagination
- Détail, annulation (soft), impression et export PDF
- Imprimé format A4 (en-tête établissement, patient, médicaments, signature)

Notifications

- Inbox avec filtres (lues / non lues / type)
- Pagination (5 affichées, chunks de 50)
- Badge temps réel via **SSE (`/api/notifications/stream`)
- Création planifiable (ADMIN, DIRECTION, MEDECIN, SECRETAIRE)

### Administration

- Utilisateurs CRUD + matrice rôles / permissions (ADMIN)
- Historique audit

Pagination (frontend)

Stratégie **« fetch 50, afficher 5 »** :

| Couche | Comportement |
|--------|--------------|
| **Backend** | `?page=1&limit=50` → `{ items, total, page, limit }` |
| **Frontend buffer** | Stocke jusqu'à 50 enregistrements en mémoire |
| **Affichage** | 5 lignes par page avec flèches ‹ › |
| **Page suivante** | Si le buffer est épuisé, fetch du chunk backend suivant |
| **Recherche** | Repart toujours du backend (chunk 1) — cherche dans **tous** les enregistrements |

Composables concernés : `usePatients`, `usePrescriptions`, `NotificationsView`.

## Tests

```bash
npm run test:unit          # tests unitaires
npm run test:integration   # tests intégration (jsdom + Vue Test Utils)
npm run test:all           # les deux
npm run test:coverage      

Stack : **tape** + **sinon** + **tsx** + **jsdom** + **Vue Test Utils**.

```text
tests/
├── unit/            # API, composables, stores, utils, composants UI
├── integration/     # vues complètes + garde router
└── e2e/             # SSE notifications (optionnel)
```

### Tests unitaires

| Fichier | Couvre |
|---------|--------|
| `unit/utils.test.ts` | Permissions, labels, validation spécialité |
| `unit/api.interceptor.test.ts` | Bearer + purge 401 |
| `unit/authService.test.ts` | Endpoints `/auth/*` |
| `unit/authStore.test.ts` | Login, MFA, reset, loadMe |
| `unit/patientsService.test.ts` | CRUD patients, dashboard, audit |
| `unit/prescriptions.api.test.ts` | API ordonnances |
| `unit/documents.api.test.ts` | API documents, labels |
| `unit/clinical-notes.api.test.ts` | API comptes rendus |
| `unit/medical-history.api.test.ts` | API historique |
| `unit/notifications.api.test.ts` | API notifications |
| `unit/notifications.sse.test.ts` | Stream SSE |
| `unit/api.composables.test.ts` | Composables API error |
| `unit/ui.components.test.ts` | Composants UI |
| `unit/usersService.test.ts` | CRUD utilisateurs |
| `unit/userStore.test.ts` | Store utilisateurs |

### Tests intégration

| Fichier | Couvre |
|---------|--------|
| `integration/login.flow.test.ts` | LoginView → dashboard / MFA / change-password |
| `integration/mfa.flow.test.ts` | MfaView → dashboard |
| `integration/router.guard.test.ts` | Visiteur, RBAC, session expirée |
| `integration/patients.view.test.ts` | Liste + bouton créer selon permission |
| `integration/patient.form.test.ts` | Formulaire création / édition |
| `integration/patient.detail.test.ts` | Fiche patient, onglets |
| `integration/prescriptions.view.test.ts` | Liste ordonnances globale |
| `integration/documents.view.test.ts` | Documents dossier + suppression |
| `integration/clinical-notes.view.test.ts` | Comptes rendus + suppression |
| `integration/history.view.test.ts` | Timeline historique médical |
| `integration/notifications.view.test.ts` | Inbox + badge Topbar |
| `integration/dashboard.view.test.ts` | KPIs dashboard |

## Token storage

Les JWT (`centaur_token`, `centaur_mfa_token`, `centaur_temp_token`) sont dans **`localStorage`**.

Mitigations : TTL court (15 min), refresh automatique, purge sur 401 et au logout.

Le frontend masque les services via `service:*` ; le backend bloque (403) si hors périmètre.

## Comptes de démonstration

Voir le README backend. Mot de passe = variable `SEED_ADMIN_PASSWORD` dans le `.env` backend (**ne jamais committer**).

| Email | Rôle |
|-------|------|
| sedjalkhouloud@gmail.com | ADMIN (MFA) | mdps lydia2001
| lydia.sedjal@gmail.com | DIRECTION (MFA) |mdps lydia2001
| rachasl720@gmail.com | MEDECIN | mdps lydia2001
| khouloudsed2@gmail.com | SECRETAIRE |mdps lydia2001

## Scripts npm

| Script | Description |
|--------|-------------|
| `npm run serve` | Dev server (:8084) |
| `npm run build` | Build production |
| `npm run test:unit` | Tests unitaires |
| `npm run test:integration` | Tests intégration |
| `npm run test:all` | Tous les tests |
| `npm run test:coverage` | Couverture de code |
