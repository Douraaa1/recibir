import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { coerceNumericFields } from '../utils/coerceNumeric';

export const clientPaymentHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['amountAED']);
			data.agent = ctx.user?.id;
		},
	],
	// Immutable once created — a payment already handed to a client shouldn't
	// be edited after the fact, even by the agent who logged it.
	beforeUpdate: [
		async (ctx: HookContext) => {
			if (ctx.user?.role !== 'admin') {
				throw new Error('Un paiement déjà enregistré ne peut être modifié que par un administrateur.');
			}
			coerceNumericFields(ctx.input.data?.[0] ?? {}, ['amountAED']);
		},
	],
	// Agents only ever see their own payments; admins see everything.
	beforeList: [
		async (ctx: HookContext) => {
			if (ctx.user?.role === 'admin') return;
			ctx.input.params = ctx.input.params ?? {};
			ctx.input.params.filters = { ...ctx.input.params.filters, agent: ctx.user?.id };
		},
	],
};
