import { t, type ResourceHooks, type HookContext } from '@maxal_studio/kratosjs';
import { Shift } from '../entities/Shift';
import { coerceNumericFields } from '../utils/coerceNumeric';
import { assertWithinExpected } from '../utils/withdrawalCycleLedger';
import { isAdminLike, seesTeamWideData } from '../utils/roles';

export const shiftHooks: ResourceHooks = {
	// Shifts are only ever created in pairs by withdrawalCycleHooks.afterCreate
	// — canCreate=false on the resource already blocks the route, this is
	// defense in depth.
	beforeCreate: [
		async () => {
			throw new Error(t('app:shifts.errors.autoCreatedOnly'));
		},
	],
	// A plain agent only ever sees their own shifts; admin/superviseur/
	// chef_equipe see the whole Dubai team's.
	beforeList: [
		async (ctx: HookContext) => {
			if (seesTeamWideData(ctx.user?.role)) return;
			ctx.input.params = ctx.input.params ?? {};
			ctx.input.params.filters = { ...ctx.input.params.filters, agent: ctx.user?.id };
		},
	],
	beforeFindById: [
		async (ctx: HookContext) => {
			if (seesTeamWideData(ctx.user?.role)) return;
			const em = (ctx.adapter as any).getEm().fork();
			const id = ctx.input.ids?.[0];
			const existing = await em.findOne(Shift, { id });
			if (!existing || String(existing.agent?.id ?? existing.agent) !== String(ctx.user?.id)) {
				throw new Error(t('app:shifts.errors.notFound'));
			}
		},
	],
	// Admin/superviseur can reassign the agent. Everyone else (including
	// chef_equipe, despite seeing the whole team's shifts) may only report
	// the amount they withdrew on their own shift — every other field is
	// rejected even if somehow submitted. Either way, the new withdrawnAED
	// can't push the cycle's running total past its Attendu.
	beforeUpdate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			const id = ctx.input.ids?.[0];
			if (!data || !id) return;
			coerceNumericFields(data, ['withdrawnAED', 'shiftNumber']);

			const em = (ctx.adapter as any).getEm().fork();
			const existing = await em.findOne(Shift, { id }, { populate: ['cycle'] });
			if (!existing) throw new Error(t('app:shifts.errors.notFound'));

			if (!isAdminLike(ctx.user?.role)) {
				if (String(existing.agent?.id ?? existing.agent) !== String(ctx.user?.id)) {
					throw new Error(t('app:shifts.errors.notOwnShift'));
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
				// The shift's date tracks the last withdrawal edit (no manual date
				// field on the form — see ShiftResource) rather than staying frozen
				// at the cycle's creation date.
				data.date = new Date();
			}
		},
	],
};
