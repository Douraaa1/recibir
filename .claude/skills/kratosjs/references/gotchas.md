# Gotchas

Non-obvious pitfalls. Read this first when a relation, deeplink, total, or projection misbehaves.

## 0. v2: HTTP adapter is required; handlers are framework-neutral

Since v2 the core has no HTTP framework built in. Every panel needs an adapter or `start()` throws — Express (default), Fastify, Hapi, or Koa, same neutral handler API:

```ts
import { ExpressAdapter } from '@maxal_studio/kratosjs-express';
Panel.make('admin').httpAdapter(new ExpressAdapter());
// or FastifyAdapter / HapiAdapter / KoaAdapter from @maxal_studio/kratosjs-fastify / -hapi / -koa
// fastify & hapi: set bodyLimit on the adapter (new FastifyAdapter({ bodyLimit })), not panel.http()
```

Custom routes get `(req: KratosRequest, reply: KratosReply)` — NOT Express `req`/`res`. Use `reply.json/send/html/redirect/redirectTo`, `reply.header(k, v)` (not `res.setHeader`), `req.header('x')` / `req.host` (not `req.get(...)`). New in v2: `getRequestContext()` and server `t()` work inside custom routes. For raw framework access use `getExpressApp(panel)` and register raw routes **before** `start()` (after it, the admin SPA catch-all swallows them). `panel.middleware([...])` takes `(req, reply, next)` where `next()` returns a promise.

## 0b. Relocating the admin UI: `.panelPath()` (backend-only)

By default the admin SPA is served at the domain root `/` (API is separate, at `.path()`, default `/kratosjs/api`). To move the UI to e.g. `/admin` and free `/`, set ONLY `panel.panelPath('/admin')` on the backend — **no vite.config change**. `kratosAdminVite()` builds with a relative asset base and the server drives the Vite base from `panelPath` (dev server base + rewriting the built index.html). The React client auto-picks the router basename from an injected global. Outside the panel path everything 404s (own `/` via the raw framework instance before `start()`). Default `'/'` = root, no config needed.

## 1. `extraFields` before `populate`

On `TableBuilder`, `.extraFields([...])` **replaces** the projected-field list, while `.populate([...])` **appends** relation paths to it. If you call them in the wrong order, `extraFields` wipes the populated relations off each row.

```ts
.extraFields(['image'])                                 // ✅ first
.populate([{ path: 'brand' }, { path: 'category' }])    // ✅ then
```

## 2. Name a formatted relation column differently from the field

A column's `formatStateUsing` result is written back to `row[columnName]`. If the column is named `brand` and returns HTML, it **overwrites the raw `row.brand` object** that your deeplink `id: (_, row) => row.brand?.id` needs → the id is `undefined` → the deeplink falls back to the resource **list** instead of the record.

Fix: name the virtual column `brandCard` (not `brand`) and read `row.brand` inside the formatter/deeplink.

## 3. Relation-create drops the FK unless it's in the child form

Creating a related record from a parent's relation panel only persists the parent link if the **child's `form()` declares the foreign-key field**. Add it as a hidden select:

```ts
SelectInput.make('order').relationship('order', 'orderNumber', 'orders').hidden(),
```

Otherwise the child is created orphaned.

## 4. Deeplink id must be a non-empty string

`deeplink({ resource, id })` routes to the list when `id` resolves to a falsy value. Coerce and guard: `id: (_, row) => String(row.brand?.id ?? '')`. A falsy id is the usual cause of "clicking the cell goes to the list, not the record."

## 5. After-delete hooks only get ids

In `afterDelete`, `ctx.output.records` holds only ids — the rows are already gone. Capture anything you need (e.g. affected parent ids to recompute a total) in `beforeDelete` and stash it on `ctx` (`(ctx as any).__ids`). See `references/hooks.md`.

## 6. Media resolves from `key`, not just `url`

Local media is served from `uploadPath/<key>`. Seeding image URLs alone isn't enough — copy the files under the uploads directory keyed to match, and resolve with `panel.resolveMediaUrl(media)`. Clear + re-copy seed images on every reseed.

## 7. Truncating tables: FK checks + reserved words

To reset tables (and auto-increment ids) in a seeder, disable FK checks and truncate children-first. Backtick reserved table names:

```ts
const conn = (em as any).getConnection();
await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
for (const table of ['order_item', '`order`', 'product', 'brand']) {
	await conn.execute(`TRUNCATE TABLE ${table}`);
}
await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
```

## 8. Use forked EntityManagers

In hooks, actions, widgets, and seeders, always work on a fork: `panel.getEm().fork()` or `(ctx.adapter as any).getEm().fork()`. Don't reuse the global EM across requests.

## 9. Packages are public — treat breaking changes with care

The KratosJs packages are published on npm with real external consumers. When changing framework code, prefer deprecation paths and semver-appropriate versioning over silently deleting old behavior; don't make breaking changes casually.
