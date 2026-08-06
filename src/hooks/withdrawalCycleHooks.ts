import { t, type ResourceHooks, type HookContext } from '@maxal_studio/kratosjs';
import { Shift } from '../entities/Shift';
import { CardGroup } from '../entities/CardGroup';
import { coerceNumericFields } from '../utils/coerceNumeric';
import { isAdminLike } from '../utils/roles';

export const withdrawalCycleHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			if (!isAdminLike(ctx.user?.role)) {
				throw new Error(t('app:withdrawalCycles.errors.createAdminLikeOnly'));
			}
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['sentGNF', 'expectedAED']);
			// Attendu is entered directly by the admin — kept as a round AED
			// number rather than derived from the exchange rate.
			if (data.expectedAED !== undefined) data.expectedAED = Math.round(Number(data.expectedAED));
			// Always today — no date picker on the form (see WithdrawalCycleResource).
			data.date = new Date();

			const em = (ctx.adapter as any).getEm().fork();
			const groupId = data.group?.id ?? data.group;
			const group = groupId ? await em.findOne(CardGroup, { id: groupId }) : null;
			if (!group?.agent) {
				throw new Error(t('app:withdrawalCycles.errors.noAgentAssigned'));
			}
			(ctx as any).__agent = group.agent;
		},
	],
	afterCreate: [
		async (ctx: HookContext) => {
			const cycle = ctx.output.records?.[0];
			if (!cycle) return;
			const em = (ctx.adapter as any).getEm().fork();
			const agent = (ctx as any).__agent;

			// Same agent runs both shifts — the group's standing assignment (see
			// CardGroup.agent); admin can still reassign shift 2 individually
			// afterwards from the Shift itself if needed.
			const shift1 = em.create(Shift, { cycle: cycle.id, agent, shiftNumber: 1, date: cycle.date, withdrawnAED: 0 });
			const shift2 = em.create(Shift, { cycle: cycle.id, agent, shiftNumber: 2, date: cycle.date, withdrawnAED: 0 });
			em.persist([shift1, shift2]);
			await em.flush();
		},
	],
	beforeUpdate: [
		async (ctx: HookContext) => {
			if (!isAdminLike(ctx.user?.role)) {
				throw new Error(t('app:withdrawalCycles.errors.updateAdminLikeOnly'));
			}
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['sentGNF', 'expectedAED']);
			if (data.expectedAED !== undefined) data.expectedAED = Math.round(Number(data.expectedAED));
		},
	],
};
