import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { ClientPayment } from '../entities/ClientPayment';
import { coerceNumericFields } from '../utils/coerceNumeric';
import { isAdminLike, isTeamLead, seesTeamWideData } from '../utils/roles';

export const clientPaymentHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			// Not every agent can pay clients — only the Dubai team lead
			// (chef_equipe) and admin/superviseur. Mirrors the capabilities
			// filter hook in index.ts (which hides the "New" button); this is
			// the server-side enforcement, never trust the client.
			if (!isAdminLike(ctx.user?.role) && !isTeamLead(ctx.user?.role)) {
				throw new Error('Seul adminEAU peut enregistrer un paiement client.');
			}
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['amountAED']);
			data.agent = ctx.user?.id;

			// Backstops the entity-level `unique: true` on `code` with a readable
			// error instead of a raw driver constraint violation.
			if (data.code) {
				const em = (ctx.adapter as any).getEm().fork();
				const existing = await em.findOne(ClientPayment, { code: data.code });
				if (existing) {
					throw new Error('Ce code a déjà été utilisé pour un autre paiement.');
				}
			}
		},
	],
	// Immutable once created — a payment already handed to a client shouldn't
	// be edited after the fact, even by whoever logged it (chef_equipe's
	// extra privileges don't include editing others' records).
	beforeUpdate: [
		async (ctx: HookContext) => {
			if (!isAdminLike(ctx.user?.role)) {
				throw new Error("Un paiement déjà enregistré ne peut être modifié que par SuperAdmin ou adminGN.");
			}
			coerceNumericFields(ctx.input.data?.[0] ?? {}, ['amountAED']);
		},
	],
	// A plain agent only ever sees their own payments (though in practice they
	// can't create any); admin/superviseur/chef_equipe see everyone's.
	beforeList: [
		async (ctx: HookContext) => {
			if (seesTeamWideData(ctx.user?.role)) return;
			ctx.input.params = ctx.input.params ?? {};
			ctx.input.params.filters = { ...ctx.input.params.filters, agent: ctx.user?.id };
		},
	],
};
