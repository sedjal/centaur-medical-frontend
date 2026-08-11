# Centaur Medical — Frontend

**Medical Records Management System — Hospital Patient Management**

Vue 3 + TypeScript (strict) + **JSX** plugin, consumed by `example/`.

## Stack

- Vue 3 / TypeScript / JSX (no SFC `.vue`)
- Axios, Pinia, Vue Router
- Vue CLI 5 + Webpack
- Medical SaaS UI (Inter, blue/teal palette)

## Integration example

```bash
npm install
npm run serve
```

`example/main.ts` mounts the plugin:

```ts
import { createCentaurMedicalApp } from '../src';
createCentaurMedicalApp().mount('#app');
```

## Environment

Optional:

```env
VUE_APP_API_URL=http://127.0.0.1:3000/api/v1
```

Default points to the Gateway.

## Screens

- Login + MFA
- Dashboard (KPIs + recent patients)
- Patients list (search, filter, edit/delete by permission)
- Dynamic patient form per department
- Users & Audit logs (RBAC)

## Tests

```bash
npm run test:unit
npm run test:coverage
```

## Seed users (backend)

See backend README. Demo password: `Admin123!`
