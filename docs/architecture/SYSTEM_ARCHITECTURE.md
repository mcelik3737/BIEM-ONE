# System Architecture

## Overview

BIEM ONE is structured as a single monorepo with three main applications:

- `apps/api`: NestJS backend
- `apps/admin`: Next.js admin console
- `apps/mobile`: Flutter mobile app

Shared packages provide configuration, cross-project constants, and common types.

## Backend Architecture

The backend follows a simple, maintainable module-first structure:

- `common/`
  - shared guards, decorators, enums, and request interfaces
- `database/`
  - Prisma service and database integration
- `modules/`
  - business modules such as auth, users, customers, projects, and tasks

This starter keeps the architecture intentionally light:

- Controllers expose HTTP endpoints
- Services contain application logic
- Prisma handles persistence
- Guards enforce authentication and authorization

## Security Model

- Access tokens authenticate API requests
- Refresh tokens support session renewal
- RBAC is enforced with `@Roles(...)` metadata and `RbacGuard`
- Permissions are modeled in the database so role/permission management can expand later

## Data Flow

1. Admin or mobile client authenticates with the API.
2. API returns JWT access and refresh tokens.
3. Protected endpoints are accessed with bearer tokens.
4. Prisma reads and writes PostgreSQL data.
5. Redis is reserved for queueing, caching, notifications, and workflow automation.

## Infrastructure

Local development infrastructure includes:

- PostgreSQL for relational data
- Redis for ephemeral messaging and automation support
- Docker Compose for service orchestration

## Future Expansion

- Add background workers for notifications and automation
- Add file storage abstraction for S3-compatible storage
- Introduce module-level DTO validation and richer CRUD commands
- Add observability with structured logging and metrics
- Add CI/CD with automated lint, build, test, and migration checks
