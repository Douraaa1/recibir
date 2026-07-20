# Plugins & the React client

## The React client entry

The admin UI is mounted in `src/admin/main.tsx`. The scaffold auto-imports every installed plugin's manifest via `virtual:kratos-client` — you don't edit this file to add a plugin:

```tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import { pluginClients } from 'virtual:kratos-client';
import '@maxal_studio/kratosjs-react/styles.css';
import { ResetTimer } from './ResetTimer';

mountAdminPanel({
	plugins: pluginClients, // auto-discovered from deps' `kratosjs.client` package.json field
	slots: {
		'panel.footer': { id: 'reset-timer', render: () => <ResetTimer /> },
	},
});
```

- `plugins` — client manifests; `pluginClients` from `virtual:kratos-client` is the auto-discovered list. You can still import a manifest explicitly (`import x from 'pkg/client'`) and append it.
- `slots` — inject custom React into named UI slots (e.g. `panel.footer`, `detail.afterDetails`). Each slot entry is `{ id, render }`; `render` receives the slot context.

## Using plugins on the backend

Register plugin instances on the panel: `.plugins([new LoggingPlugin(), new CsvExportPlugin(), new PermissionsPlugin({ superAdminRoleIds: [1] })])`. Common official plugins: 2FA, logging, profile, csv-export, permissions. Each ships a matching client manifest imported in `main.tsx`.

## Scaffolding a plugin

```bash
npx @maxal_studio/kratosjs-cli plugin my-plugin              # server + React client (default)
npx @maxal_studio/kratosjs-cli plugin my-plugin --no-client  # server-only
```

Generates a plugin package with a server plugin class (`{{PluginName}}Plugin.ts`) and — by default — a client entry (`src/client/index.tsx`) with a `definePluginClient` manifest plus sample `{{PluginName}}Field.tsx` (custom field) and `{{PluginName}}Panel.tsx` (a `detail.afterDetails` slot) components. `@maxal_studio/kratosjs-react`/`react`/`react-dom` are added as devDependencies, and `package.json` gets a `"kratosjs": { "client": "kratosjs-plugin-my-plugin/client" }` field so the app's `virtual:kratos-client` auto-imports the manifest (no `main.tsx` edit). A slot manifest looks like:

```tsx
export default definePluginClient({
	name: 'audit',
	slots: {
		'detail.afterDetails': {
			id: 'audit-trail',
			render: ({ resourceSlug, record }) => <AuditTrail resourceSlug={resourceSlug} record={record} />,
		},
	},
});
```

Slot context supplies `{ slot, resourceSlug?, record? }` depending on placement; give your component its own props (don't type it as the full `SlotContext`) and pass the fields you need.

## Plugin shape

A plugin is a class the panel calls during setup. It can:

- register **resources**, admin **pages**, **routes**, **hooks**, **validation rules**;
- register public **SSR view routes** via `panel.route('get', '/path', (req, reply) => reply.view('{name}::Page', props))` — the page component ships in the client manifest's `pages` (namespaced `{name}::`);
- add **auth providers** or **login steps**;
- patch existing entities (e.g. the permissions plugin adds a `role` relation to `User`);
- register **translations** (`registerTranslations`).

Keep plugin entities **driver-agnostic**. Declare `@maxal_studio/kratosjs` (and React libs for the client) as **peer dependencies**.

## Client customizations

Custom **fields**, **columns**, **widgets**, **blocks**, and SSR view **pages** follow the same two-part pattern: a backend class/route that serializes config + data, and a React component registered on the client via the plugin manifest (`definePluginClient` from `@maxal_studio/kratosjs-react/plugin`), referenced by name. Register the component in the plugin's client manifest, then include that manifest in `mountAdminPanel({ plugins: [...] })` (or let `virtual:kratos-client` auto-import it via the package's `kratosjs.client` field). SSR pages go under the manifest `pages` key and are referenced as `'{name}::Key'`; see `references/views.md`.

**Auto-discovery contract** (both halves required): export the manifest from a `./client` export AND declare `"kratosjs": { "client": "<pkg>/client" }` in the plugin's package.json. The CLI writes both; a plugin missing the field loads on the server while its components are silently never registered. Plugin clients are bundled into the app's admin and SSR builds by Vite — never imported by Node directly — so they may ship bundler-targeted ESM.

For the full plugin authoring guide (routes, resource plugins, hooks plugins, custom validation rules, custom components), see the framework's plugin documentation.
