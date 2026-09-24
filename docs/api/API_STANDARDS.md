# API Standards

## Base Principles

- Keep endpoints predictable and resource-oriented
- Prefer simple DTOs and explicit validation
- Version the API from the beginning
- Return data that is safe for client consumption

## Versioning

- Base path: `/api/v1`
- Future breaking changes should move to `/api/v2`

## Authentication

- Use bearer tokens for protected endpoints
- Access tokens should be short-lived
- Refresh tokens should be rotated and revocable

## Authorization

- Use role-based access control for module access
- Expand to permission-based checks where business rules need finer control

## Response Shape

Recommended standard response shape for future CRUD endpoints:

```json
{
  "data": {},
  "meta": {
    "requestId": "optional-request-id"
  }
}
```

Error shape:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## Naming

- Use plural resource paths such as `/customers`, `/projects`, `/tasks`
- Use kebab-case for route segments when needed, such as `/project-stages`
- Use descriptive DTO names such as `CreateProjectDto`

## Validation

- Validate every write endpoint with `class-validator`
- Enable global validation pipes
- Reject unknown fields for write operations unless there is a clear compatibility reason

## Documentation

- Swagger should stay enabled in development and staging
- Annotate sensitive endpoints with auth requirements
- Document required headers, DTOs, and expected status codes as the API grows

## Auditability

- Mutating business actions should emit audit logs
- Important project transitions should emit timeline events
- User-facing notifications should remain traceable back to their trigger
