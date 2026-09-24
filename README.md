# BIEM ONE

BIEM ONE is a mobile-first business operations platform for Biem Teknoloji. This monorepo includes:

- `apps/api`: NestJS API starter with Prisma, PostgreSQL, JWT auth, RBAC guard skeleton, and Swagger
- `apps/admin`: Next.js admin panel starter with login, dashboard, customers, projects, tasks, and settings pages
- `apps/mobile`: Flutter mobile starter with clean feature folders and the requested screens
- `packages/shared`, `packages/types`, `packages/config`: shared constants, shared types, and base config
- `infrastructure/docker`: Docker Compose for PostgreSQL, Redis, and the API
- `docs`: product, architecture, and API standards

## Tech Stack

- Monorepo: `pnpm`
- Backend: `NestJS`
- Database: `PostgreSQL`
- ORM: `Prisma`
- Mobile: `Flutter`
- Admin panel: `Next.js`
- Auth: `JWT + refresh token`
- Authorization: `RBAC`
- API Docs: `Swagger`
- Infrastructure: `Docker`

## Project Structure

```text
BIEM-ONE/
  apps/
    api/
    admin/
    mobile/
  packages/
    shared/
    types/
    config/
  docs/
    architecture/
    product/
    api/
  infrastructure/
    docker/
  scripts/
```

## Quick Start

### 1. Install workspace dependencies

```bash
pnpm install
```

### 2. Prepare API environment

```bash
powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1
```

Or create `apps/api/.env` from `apps/api/.env.example`.

### 3. Start Docker services

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d --build
```

### 4. Generate Prisma client and seed the database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Default seed credentials:

- Email: `admin@biem.one`
- Password: `Admin123!`

### 5. Run the backend

```bash
pnpm dev:api
```

Useful endpoints:

- API base: `http://localhost:3000/api/v1`
- Swagger docs: `http://localhost:3000/docs`
- Health check: `http://localhost:3000/api/v1/health`

### 6. Run the admin panel

```bash
pnpm dev:admin
```

Expected local URL:

- Admin: `http://localhost:3001` or the port chosen by Next.js

### 7. Run the mobile app

```bash
cd apps/mobile
flutter pub get
flutter run
```

## Backend Notes

- Prisma schema includes users, roles, permissions, refresh tokens, customers, contacts, projects, project stages, tasks, file assets, notifications, audit logs, and timeline events.
- JWT auth includes login, refresh, and current-user endpoints.
- RBAC is implemented with a `@Roles(...)` decorator and `RbacGuard`.
- Swagger is enabled in `apps/api/src/main.ts`.

## Admin Notes

- Uses the Next.js App Router.
- Includes a mobile-first shell with navigation and starter operational screens.
- Ready to connect to the NestJS auth and resource endpoints.

## Mobile Notes

- Uses a clean feature-based folder structure.
- Includes screens for login, dashboard, projects, project detail, my tasks, task detail, customers, and notifications.
- Navigation is route-based and easy to replace with a richer state management approach later.

## Next Suggested Steps

1. Add Prisma migrations and connect all read screens to live API data.
2. Implement CRUD flows for customers, projects, tasks, and documents.
3. Add refresh-token rotation cleanup, password reset, and audit logging hooks.
4. Introduce background jobs and workflow automation on top of Redis.
5. Add CI, tests, and deployment manifests once the first business flows are confirmed.
