import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { Shift } from '../entities/Shift';
import { coerceNumericFields } from '../utils/coerceNumeric';
import { assertWithinExpected } from '../utils/withdrawalCycleLedger';

export const shiftHooks: ResourceHooks = {
	// Shifts are only ever created in pairs by withdrawalCycleHooks.afterCreate
	// — canCreate=false on the resource already blocks the route, this is
	// defense in depth.
	beforeCreate: [
		async () => {
			throw new Error('Les shifts sont créés automatiquement avec leur cycle de retrait.');
		},
	],
	// Agents only ever see their own shifts; admins see everything.
	beforeList: [
		async (ctx: HookContext) => {
			if (ctx.user?.role === 'admin') return;
			ctx.input.params = ctx.input.params ?? {};
			ctx.input.params.filters = { ...ctx.input.params.filters, agent: ctx.user?.id };
		},
	],
	beforeFindById: [
		async (ctx: HookContext) => {
			if (ctx.user?.role === 'admin') return;
			const em = (ctx.adapter as any).getEm().fork();
			const id = ctx.input.ids?.[0];
			const existing = await em.findOne(Shift, { id });
			if (!existing || String(existing.agent?.id ?? existing.agent) !== String(ctx.user?.id)) {
				throw new Error('Shift introuvable.');
			}
		},
	],
	// Admin can reassign agent/date. An agent may only report the amount they
	// withdrew on their own shift — every other field is rejected even if
	// somehow submitted. Either way, the new withdrawnAED can't push the
	// cycle's running total past its Attendu.
	beforeUpdate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			const id = ctx.input.ids?.[0];
			if (!data || !id) return;
			coerceNumericFields(data, ['withdrawnAED', 'shiftNumber']);

			const em = (ctx.adapter as any).getEm().fork();
			const existing = await em.findOne(Shift, { id }, { populate: ['cycle'] });
			if (!existing) throw new Error('Shift introuvable.');

			if (ctx.user?.role !== 'admin') {
				if (String(existing.agent?.id ?? existing.agent) !== String(ctx.user?.id)) {
					throw new Error('Vous ne pouvez modifier que vos propres shifts.');
				}
				const allowed = ['withdrawnAED'];
				for (const key of Object.keys(data)) {
					if (!allowed.includes(key)) delete data[key];
				}
			}

			if (data.withdrawnAED !== undefined) {
				const cycleId = existing.cycle?.id ?? existing.cycle;
				await assertWithinExpected(em, cycleId, {
					withdrawnDelta: Number(data.withdrawnAED) - existing.withdrawnAED,
				});
			}
		},
	],
};
