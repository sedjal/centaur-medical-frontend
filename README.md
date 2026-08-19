# Centaur Medical — Frontend

**Medical Records Management System — Hospital Patient Management**

Vue 3 + TypeScript (strict) + **JSX** plugin, consumed by `example/`.

## Stack

- Vue 3 / TypeScript / JSX (no SFC `.vue`)
- Axios, Pinia, Vue Router
- Vue CLI 5 + Webpack
- Medical SaaS UI

## Integration example

```bash
npm install
npm run serve
```

Open http://localhost:8084/

`example/main.ts` mounts the plugin:

```ts
import { createCentaurMedicalApp } from '../src';
createCentaurMedicalApp().mount('#app');
```

## Environment

Optional:

```env
VUE_APP_API_URL=http://127.0.0.1:3000/api
```

Default uses the Gateway via Vue CLI proxy (`/api`).

## Screens

- Login + MFA email
- Forced password change (1ʳᵉ connexion)
- Forgot password by **email code** (not link)
- Dashboard (KPIs + occupancy)
- Patients list / create / edit (4 services)
- Users CRUD + Roles & permissions matrix
- Historique (audit)

## Tests

```bash
npm run test:unit
npm run test:integration
npm run test:all
npm run test:coverage
```

Stack : **tape** + **sinon** (stubs axios `api`) + **tsx** + **jsdom** + **Vue Test Utils**.

```text
tests/
├── unit/            # services, stores, interceptors, utils
└── integration/     # LoginView / MfaView / PatientsView + garde router
```

| Fichier | Couvre |
|---------|--------|
| `unit/utils.test.ts` | `can()`, labels, validation spécialité |
| `unit/api.interceptor.test.ts` | Bearer + purge 401 (sauf pages auth) |
| `unit/authService.test.ts` | endpoints `/auth/*` |
| `unit/authStore.test.ts` | login OK/MFA/CHANGE_PASSWORD, MFA, reset, loadMe |
| `unit/patientsService.test.ts` | CRUD patients / dashboard / audit |
| `integration/login.flow.test.ts` | LoginView → dashboard / mfa / change-password / erreur |
| `integration/mfa.flow.test.ts` | MfaView → dashboard |
| `integration/router.guard.test.ts` | visiteur, RBAC, session expirée |
| `integration/patients.view.test.ts` | liste + bouton créer selon permission |

## Token storage

Les JWT (`centaur_token`, `centaur_mfa_token`, `centaur_temp_token`) sont dans **`localStorage`**. Un XSS peut les lire. Mitigations : TTL court, purge sur 401 (hors pages auth) et au logout.

**Production** : access **15 min** + refresh en cookie **HttpOnly**. Le frontend masque les services via `service:*` ; le backend bloque (403).

## Seed users (backend)

See backend README. Set `SEED_ADMIN_PASSWORD` in the environment; do not commit it.
