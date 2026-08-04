import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import { pluginClients } from 'virtual:kratos-client';
import twoFactorClient from '@maxal_studio/kratosjs-plugin-2fa/client';
import '@maxal_studio/kratosjs-react/styles.css';
import './brand.css';

// `virtual:kratos-client` auto-imports the client manifest of every installed
// KratosJs plugin (any dependency whose package.json declares a `kratosjs.client`
// entry) — you no longer edit this file when adding a plugin. To register app-level
// components directly, pass `fields`/`columns`/`widgets` alongside `plugins`.
//
// The 2FA plugin's client is imported explicitly (per its README) rather than
// relying on auto-discovery, to guarantee it's registered.

// Languages are configured once on the backend (src/index.ts) and injected into
// the page, so no i18n config is needed here.
mountAdminPanel({
	plugins: [...pluginClients, twoFactorClient],
});
