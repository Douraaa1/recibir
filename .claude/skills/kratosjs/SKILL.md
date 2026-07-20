---
name: kratosjs
description: Build admin panels with the KratosJs framework (@maxal_studio/kratosjs + @maxal_studio/kratosjs-react, MikroORM, pluggable HTTP adapters with Express as the default). Use when creating or editing a KratosJs resource, entity, FormBuilder form, TableBuilder table, hook, custom/bulk action, dashboard widget, page, relation, media adapter, auth config, i18n, or plugin — or when scaffolding a new KratosJs app.
---

# KratosJs

KratosJs is a code-first admin-panel framework: you declare **resources** (backed by MikroORM entities) and it renders CRUD UI, forms, tables, dashboards, auth, and media. Backend is `@maxal_studio/kratosjs` (HTTP-framework agnostic since v2; every panel needs an adapter — `.httpAdapter(new ExpressAdapter())` from `@maxal_studio/kratosjs-express` (the default), or `FastifyAdapter`/`HapiAdapter`/`KoaAdapter` from `@maxal_studio/kratosjs-fastify`/`-hapi`/`-koa`); the React client is `@maxal_studio/kratosjs-react`.

**Everything in this skill reflects the current, verified API.**

## Imports

- Backend authoring: `@maxal_studio/kratosjs` — `Panel`, `BaseResource`, `Page`, `FormBuilder` + inputs, `TableBuilder` + columns, `Action`/`BulkAction`, `StatsWidget`/`ChartWidget`, `WidgetBlock`, `LocalMediaAdapter`/`S3MediaAdapter`, `EmailAuthProvider`, and types `ActionHandler`, `ResourceHooks`, `HookContext`, `RelationConfig`, `Widget`, `FormContext`, `KratosRequest`/`KratosReply` (framework-neutral custom-route types).
- HTTP adapter (required on every panel), same neutral API on all: `@maxal_studio/kratosjs-express` — `ExpressAdapter` + `getExpressApp(panel)`; `-fastify` — `FastifyAdapter` + `getFastifyApp`; `-hapi` — `HapiAdapter` + `getHapiApp`; `-koa` — `KoaAdapter` + `getKoaApp`. E.g. `.httpAdapter(new ExpressAdapter())`.
- Entities: `@mikro-orm/core` (`EntitySchema`) + a driver (`@mikro-orm/mysql`, `-postgresql`, `-mariadb`, `-sqlite`, `-mongodb`) + `@mikro-orm/migrations`.
- React client: `@maxal_studio/kratosjs-react` (`mountAdminPanel`) + `@maxal_studio/kratosjs-react/styles.css`.

## The authoring loop

1. Define a MikroORM **entity** (`EntitySchema`). → `references/entities.md`
2. Create a **resource** class extending `BaseResource` with static config + `form()`, `table()`, and optionally `relations()`, `widgets()`, `hooks()`, `actions()`. → `references/resources.md`
3. Register it on the **panel**: `Panel.make('admin').orm(...).resources([X]).pages([...]).plugins([...])`. → `references/getting-started.md`

The CLI scaffolds all of this: `npx @maxal_studio/kratosjs-cli new my-app --driver mysql --http express` (`--http express|fastify|hapi|koa`, Express is the default). (`@maxal_studio/kratosjs` is the runtime, `@maxal_studio/kratosjs-cli` is the scaffolder.)

## Reference map — load on demand

| Load when the task involves…                                                         | File                            |
| ------------------------------------------------------------------------------------ | ------------------------------- |
| Scaffolding an app, project structure, panel bootstrap, running/login                | `references/getting-started.md` |
| Entities, primary keys per driver, m:1 / 1:m / self-ref relations, JSON media fields | `references/entities.md`        |
| Resource class: static members, navigation, visibility, title/featured image         | `references/resources.md`       |
| Forms: every input type, validation, conditional required/hidden, custom fields      | `references/forms.md`           |
| Tables: every column type, formatting, deeplinks, money/badge/date, populate         | `references/tables.md`          |
| Table filters (select, date, ternary, query builder, custom)                         | `references/filters.md`         |
| Rich HTML "image + name" identity cells                                              | `references/cells.md`           |
| Lifecycle hooks (before/after create/update/delete, list, validate, action)          | `references/hooks.md`           |
| Custom row / bulk / header actions with forms or confirmation                        | `references/actions.md`         |
| Dashboard stats & chart widgets + custom widgets                                     | `references/widgets.md`         |
| Pages and widget/table/form blocks                                                   | `references/pages.md`           |
| Relations: hasMany panels, m:n via join resource, relation-create FK                 | `references/relations.md`       |
| Media adapters (local / S3), resolving URLs, media hooks                             | `references/media.md`           |
| Auth: email/OAuth providers, JWT, `extendUser`, refresh                              | `references/auth.md`            |
| Internationalization (backend source of truth)                                       | `references/i18n.md`            |
| Authoring plugins + the React client (`mountAdminPanel`, slots)                      | `references/plugins.md`         |
| Public SSR pages (Views): `panel.route()` + `reply.view()`                           | `references/views.md`           |
| Any non-obvious bug — READ THIS when a relation/deeplink/total misbehaves            | `references/gotchas.md`         |

## Top gotchas (full list in `references/gotchas.md`)

1. **`extraFields` before `populate`.** On `TableBuilder`, `.extraFields([...])` _replaces_ the projected-field list while `.populate([...])` _appends_ to it. Call `.extraFields()` first, then `.populate()`, or your populated relations get wiped from the row.
2. **Name formatted relation columns differently from the field.** A column whose `formatStateUsing` returns HTML overwrites `row[columnName]`. If you name it `brand`, you clobber the raw `row.brand` object your deeplink `id: (_, row) => row.brand?.id` needs. Name it `brandCard` and read `row.brand`.
3. **Relation-create needs the FK in the child form.** To create a related record from a parent panel, the child's `form()` must declare the foreign-key field (usually a hidden `SelectInput`), or the FK is dropped and the record is orphaned.
