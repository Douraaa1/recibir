import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import { pluginClients } from 'virtual:kratos-client';
import twoFactorClient from '@maxal_studio/kratosjs-plugin-2fa/client';
import { CustomStatsWidget } from './CustomStatsWidget';
import { AmountConverter } from './AmountConverter';
import { PasswordLinkColumn } from './PasswordLinkColumn';
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
	// Overrides the built-in 'stats' widget renderer (registry keys are
	// merged, custom wins) so dashboard stat cards use our dot-thousands
	// formatter instead of Intl.NumberFormat(undefined, ...) — see
	// CustomStatsWidget.tsx for why that can't be fixed any other way.
	widgets: { stats: CustomStatsWidget },
	// UserResource.ts's passwordSetupLink column overrides its own columnType
	// to 'password-link' specifically so this only affects that one column —
	// every other TextColumn in the app keeps the built-in renderer.
	columns: { 'password-link': PasswordLinkColumn },
	// Renders above every resource's create/edit form (AmountConverter itself
	// no-ops outside 'client-payments') — lets an agent convert a USD/GNF
	// amount to AED right there instead of leaving the app to do the math.
	slots: {
		'form.header': { id: 'amount-converter', render: ctx => <AmountConverter resourceSlug={ctx.resourceSlug} /> },
	},
});
