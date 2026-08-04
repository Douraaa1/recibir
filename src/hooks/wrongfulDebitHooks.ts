import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { Shift } from '../entities/Shift';
import { Card } from '../entities/Card';
import { coerceNumericFields } from '../utils/coerceNumeric';
import { assertWithinExpected } from '../utils/withdrawalCycleLedger';
import { isAdminLike, seesTeamWideData } from '../utils/roles';

export const wrongfulDebitHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['amountAED']);

			const em = (ctx.adapter as any).getEm().fork();
			const shift = await em.findOne(Shift, { id: data.shift }, { populate: ['cycle', 'cycle.group'] });
			if (!shift) throw new Error('Shift introuvable.');

			// A plain agent can only report on their own shift; chef_equipe (per
			// their team-lead privileges) and admin/superviseur can report on any.
			if (!seesTeamWideData(ctx.user?.role) && String(shift.agent?.id ?? shift.agent) !== String(ctx.user?.id)) {
				throw new Error("Vous ne pouvez signaler un débit à tort que sur l'un de vos propres shifts.");
			}

			const card = await em.findOne(Card, { id: data.card });
			if (!card) throw new Error('Carte introuvable.');
			if (String(card.group?.id ?? card.group) !== String(shift.cycle.group?.id ?? shift.cycle.group)) {
				throw new Error("Cette carte n'appartient pas au groupe de ce shift.");
			}

			await assertWithinExpected(em, shift.cycle.id, { wrongfulDebitDelta: Number(data.amountAED) });

			// Denormalized purely so beforeList can filter by agent directly,
			// like every other resource — WrongfulDebit has no other own field
			// that identifies who was working the shift.
			data.agent = shift.agent?.id ?? shift.agent;
		},
	],
	// Immutable once logged — a reported wrongful debit shouldn't be edited
	// after the fact except by an admin/superviseur correcting a mistake
	// (chef_equipe's extra privileges don't include editing others' records).
	beforeUpdate: [
		async (ctx: HookContext) => {
			if (!isAdminLike(ctx.user?.role)) {
				throw new Error("Un débit à tort déjà enregistré ne peut être modifié que par l'administrateur ou le superviseur.");
			}
			coerceNumericFields(ctx.input.data?.[0] ?? {}, ['amountAED']);
		},
	],
	// A plain agent only ever sees wrongful debits from their own shifts;
	// admin/superviseur/chef_equipe see the whole Dubai team's.
	beforeList: [
		async (ctx: HookContext) => {
			if (seesTeamWideData(ctx.user?.role)) return;
			ctx.input.params = ctx.input.params ?? {};
			ctx.input.params.filters = { ...ctx.input.params.filters, agent: ctx.user?.id };
		},
	],
};
