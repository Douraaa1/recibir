import { t, type ResourceHooks, type HookContext } from '@maxal_studio/kratosjs';
import { CardGroup } from '../entities/CardGroup';
import { ClientPayment } from '../entities/ClientPayment';
import { Shift } from '../entities/Shift';
import { TreasuryDeposit } from '../entities/TreasuryDeposit';
import { WrongfulDebit } from '../entities/WrongfulDebit';

const capitalize = (str: string | undefined): string => {
	if (!str || typeof str !== 'string') return str || '';
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Managing Collaborateurs (creating/editing accounts, assigning roles) is
// admin-exclusive — not even superviseur, despite their otherwise
// admin-equivalent access (see src/utils/roles.ts). The nav entry is already
// hidden from everyone else (see ADMIN_ONLY_RESOURCE_SLUGS in index.ts);
// this is the server-side backstop (never trust the client) — without it,
// any authenticated user could hit the API directly and, e.g., promote
// themselves to admin.
function assertAdmin(ctx: HookContext) {
	if (ctx.user?.role !== 'admin') {
		throw new Error(t('app:users.errors.adminOnly'));
	}
}

// `password`/`passwordSetupToken`/`passwordSetupExpiresAt` are never part of
// the form (see UserResource) — SuperAdmin can't set a collaborator's
// password directly, only generate a setup link (src/actions/userActions.ts)
// that the collaborator uses to choose their own (src/routes/passwordSetup.ts).
// Stripped here too so a raw API call can't smuggle them in.
function stripPasswordFields(data: Record<string, any>) {
	delete data.password;
	delete data.passwordSetupToken;
	delete data.passwordSetupExpiresAt;
}

export const userHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			assertAdmin(ctx);
			const data = ctx.input.data?.[0];
			if (!data) return;
			stripPasswordFields(data);

			if (data.firstname) {
				data.firstname = capitalize(data.firstname);
			}
			if (data.lastname) {
				data.lastname = capitalize(data.lastname);
			}
		},
	],
	beforeUpdate: [
		async (ctx: HookContext) => {
			assertAdmin(ctx);
			const data = ctx.input.data?.[0];
			if (!data) return;
			stripPasswordFields(data);

			if (data.firstname) {
				data.firstname = capitalize(data.firstname);
			}
			if (data.lastname) {
				data.lastname = capitalize(data.lastname);
			}
		},
	],
	// Reading the Collaborateurs list/records is admin-exclusive too — the nav
	// entry is already admin-only client-side, this is the server-side backstop.
	beforeList: [async (ctx: HookContext) => assertAdmin(ctx)],
	beforeFindById: [async (ctx: HookContext) => assertAdmin(ctx)],
	// None of the m:1 relations pointing at User (Shift.agent, ClientPayment.agent,
	// WrongfulDebit.agent, CardGroup.agent, TreasuryDeposit.createdBy) declare
	// onDelete: 'cascade' or 'set null' — deliberately, since silently cascading
	// or orphaning financial history on a user delete would be worse than
	// blocking it. Without this guard, deleting any collaborator who's ever
	// worked a shift or touched a payment fails with a raw Postgres foreign-key
	// constraint error instead of a clear message — this turns that into an
	// actionable one and points at the `active` toggle as the real tool for
	// "removing" someone with history.
	beforeDelete: [
		async (ctx: HookContext) => {
			assertAdmin(ctx);
			const ids = ctx.input.ids ?? [];
			if (ids.length === 0) return;
			const em = (ctx.adapter as any).getEm().fork();
			const [shifts, payments, debits, cardGroups, deposits] = await Promise.all([
				em.count(Shift, { agent: { $in: ids } } as any),
				em.count(ClientPayment, { agent: { $in: ids } } as any),
				em.count(WrongfulDebit, { agent: { $in: ids } } as any),
				em.count(CardGroup, { agent: { $in: ids } } as any),
				em.count(TreasuryDeposit, { createdBy: { $in: ids } } as any),
			]);
			if (shifts + payments + debits + cardGroups + deposits > 0) {
				throw new Error(t('app:users.errors.hasRelatedRecords'));
			}
		},
	],
};
