# Authentication

Configure auth once on the panel with `.auth({...})`. Sessions use **HTTP-only cookies** (no localStorage); the access-token cookie is set by the server.

```ts
import { EmailAuthProvider } from '@maxal_studio/kratosjs';
import { User } from './entities/User';

adminPanel.auth({
	jwt: {
		secret: process.env.JWT_SECRET || 'change-me',
		accessTokenExpiry: '15m',
		refreshTokenExpiry: '7d',
	},
	userEntity: User,
	providers: [new EmailAuthProvider()],
	// extendUser: user => ({ role: user.role }),   // expose extra columns to the client + req.user
	// userFields: { email: 'emailAddress' },        // map non-standard field names
});
```

## `userEntity` defaults

With `userEntity` set, `EmailAuthProvider` gets sensible defaults: `validateCredentials` looks the user up and verifies the password (core uses `bcryptjs`; helpers `hashPassword` / `verifyPassword`), and `getUserById` is provided. Override any of them by passing your own to the provider or to `.auth()`.

## User shaping — one place

Providers return the **raw entity**. A single `serializeUser` shapes it for the client across every provider and endpoint. To expose extra columns without rewriting providers, use **`extendUser`** — it merges over the default serialized user and applies everywhere:

```ts
extendUser: user => ({ role: user.role, department: user.department }),
```

The full serialized user is encoded in the JWT. `role` is included only when present (core stays role-free; a permissions plugin adds it).

## OAuth

Add OAuth providers alongside email in the `providers` array. Each provider returns the raw user entity, which flows through the same `serializeUser` / `extendUser`. See the framework's authentication docs for the specific OAuth provider setup (client id/secret, callback URL).

## Refresh (important)

Refresh is **stateless**: the server verifies the refresh JWT's signature and re-issues tokens (no server-side session store — survives restarts, multi-instance-safe). Concurrency is handled on the **frontend** via a single-flight guard: when a burst of requests 401 together, the first performs one `/auth/refresh` and the rest await it.

The refresh cookie's `path` must match the auth mount (`${basePath}/auth/refresh`, default base `/kratosjs/api`) — the framework derives this automatically. **Do not hardcode `/auth/refresh`**, or the browser won't send the cookie and users get logged out ~15 min after login.

## Client

The React client picks up auth automatically — no client auth config. Login posts `{ provider: 'email', email, password }` to `${basePath}/auth/login`.
