import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { Transaction } from '../entities/Transaction';
import { Setting } from '../entities/Setting';

// Above this amount (GNF) a transfer is held for extra scrutiny instead of
// going straight to "pending" — it still shows up for the admin to validate
// or cancel, it just also counts against the "Transferts Bloqués" KPI.
const BLOCK_THRESHOLD = 5_000_000;

function generateReference(): string {
	return `TX-${Date.now().toString(36).toUpperCase()}`;
}

export const transactionHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			if (!data) return;

			data.reference = generateReference();
			data.agent = ctx.user?.id;

			const em = (ctx.adapter as any).getEm().fork();
			const setting = await em.findOne(Setting, { id: 1 });
			const feeRate = setting?.feeRate ?? 0.01;
			const minFee = setting?.minFee ?? 0;
			const maxFee = setting?.maxFee ?? Infinity;

			const amount = Number(data.amount ?? 0);
			data.feeRate = feeRate;
			const rawFee = amount * feeRate;
			data.fee = Math.round(Math.min(Math.max(rawFee, minFee), maxFee) * 100) / 100;
			data.status = amount > BLOCK_THRESHOLD ? 'blocked' : 'pending';
		},
	],
	// Agents only ever see their own transfers; admins see everything.
	beforeList: [
		async (ctx: HookContext) => {
			if (ctx.user?.role === 'admin') return;
			ctx.input.params = ctx.input.params ?? {};
			ctx.input.params.filters = { ...ctx.input.params.filters, agent: ctx.user?.id };
		},
	],
	// Close the same ownership gap for direct-by-id lookups (list scoping
	// alone wouldn't stop an agent from guessing another agent's record id).
	beforeFindById: [
		async (ctx: HookContext) => {
			if (ctx.user?.role === 'admin') return;
			const em = (ctx.adapter as any).getEm().fork();
			const id = ctx.input.ids?.[0];
			const existing = await em.findOne(Transaction, { id });
			if (!existing || String(existing.agent?.id ?? existing.agent) !== String(ctx.user?.id)) {
				throw new Error('Transfert introuvable.');
			}
		},
	],
	// An agent may only correct a transfer they created themselves, and only
	// while it's still open (not yet validated or cancelled by the admin).
	beforeUpdate: [
		async (ctx: HookContext) => {
			if (ctx.user?.role === 'admin') return;
			const em = (ctx.adapter as any).getEm().fork();
			const id = ctx.input.ids?.[0];
			const existing = await em.findOne(Transaction, { id });
			if (!existing || String(existing.agent?.id ?? existing.agent) !== String(ctx.user?.id)) {
				throw new Error("Vous ne pouvez modifier que vos propres transferts.");
			}
			if (existing.status !== 'pending' && existing.status !== 'blocked') {
				throw new Error('Ce transfert a déjà été traité et ne peut plus être modifié.');
			}
		},
	],
};