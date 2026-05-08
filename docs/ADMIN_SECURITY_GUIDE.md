# Admin Security Guide

## What changed

Flowmerce admin security is designed around **a dedicated admin login token**.

The admin account is **not a normal `User` entity row**.  
It is currently validated through environment variables:

- `ADMIN_LOGIN_ID`
- `ADMIN_PASSWORD`

After successful admin login, the backend issues a signed admin token and the
frontend attaches that token to every admin request.

---

## How it works

### 1. Separate admin login

Admin login now uses:

- `POST /user/admin/login`

This endpoint:

- checks the admin credentials
- applies login throttling
- returns an `adminToken`

### 2. Signed admin token

The backend creates a signed token using:

- `ADMIN_AUTH_SECRET`

If `ADMIN_AUTH_SECRET` is missing, the current implementation falls back to:

- `ADMIN_PASSWORD`

This fallback keeps the system working, but for real launch you should set
`ADMIN_AUTH_SECRET` explicitly.

### 3. Guarded admin APIs

These admin routes should be called with:

`Authorization: Bearer <adminToken>`

The backend guard verifies:

- token signature
- admin role
- token expiration

If the token is missing, invalid, or expired, the request is rejected.

### 4. Login throttling

Admin login attempts are rate limited in memory.

Defaults:

- 5 failed attempts
- 10 minute block

You can override them with:

- `ADMIN_LOGIN_MAX_ATTEMPTS`
- `ADMIN_LOGIN_BLOCK_MINUTES`

### 5. Token lifetime

Default admin token lifetime:

- 12 hours

Override with:

- `ADMIN_AUTH_TOKEN_TTL_HOURS`

---

## Environment variables to add

At minimum:

- `ADMIN_LOGIN_ID`
- `ADMIN_PASSWORD`
- `ADMIN_AUTH_SECRET`

Recommended example:

```env
ADMIN_LOGIN_ID=your-admin-id
ADMIN_PASSWORD=your-admin-password
ADMIN_AUTH_SECRET=replace-this-with-a-long-random-secret
ADMIN_AUTH_TOKEN_TTL_HOURS=12
ADMIN_LOGIN_MAX_ATTEMPTS=5
ADMIN_LOGIN_BLOCK_MINUTES=10
```

---

## Frontend flow

1. Admin signs in from `/admin-flowmerce`
2. Frontend calls `POST /user/admin/login`
3. Backend returns `adminToken`
4. Frontend stores it in the admin session
5. Admin API calls automatically send:

```http
Authorization: Bearer <adminToken>
```

If the token expires, the frontend signs the admin session out and asks for
login again.

---

## Routes that should stay protected

### User admin routes

- `/user/contacts`
- `/user/contacts/:id/read`
- `/user/admin/users`
- `/user/admin/users/:id`

### Hosting admin routes

- `/hosting/admin/accounts`
- `/hosting/admin/accounts/:id`

### Schedule admin routes

- `/schedule`
- `/schedule/delete`
- `/schedule/run/:id`
- `/schedule/custom-ids`
- `/schedule/account-platforms`

---

## Why this is better than hiding the admin page URL

Hiding `/admin-flowmerce` only hides the screen.

What matters is that the backend itself refuses admin actions unless:

- the admin is logged in
- the admin token is valid

That is the real lock.

---

## Recommended next hardening after launch

Not required for v1, but good next steps:

- admin action audit log
- IP allowlist for admin APIs
- hosting key masking in list views
- password rotation policy for admin credentials
