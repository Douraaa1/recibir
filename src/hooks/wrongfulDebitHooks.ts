import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { Shift } from '../entities/Shift';
import { Card } from '../entities/Card';
import { coerceNumericFields } from '../utils/coerceNumeric';
import { assertWithinExpected } from '../utils/withdrawalCycleLedger';

export const wrongfulDebitHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['amountAED']);

			const em = (ctx.adapter as any).getEm().fork();
			const shift = await em.findOne(Shift, { id: data.shift }, { populate: ['cycle', 'cycle.group'] });
			if (!shift) throw new Error('Shift introuvable.');

			if (ctx.user?.role !== 'admin' && String(shift.agent?.id ?? shift.agent) !== String(ctx.user?.id)) {
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
	// after the fact except by an admin correcting a mistake.
	beforeUpdate: [
		async (ctx: HookContext) => {
			if (ctx.user?.role !== 'admin') {
				throw new Error('Un débit à tort déjà enregistré ne peut être modifié que par un administrateur.');
			}
			coerceNumericFields(ctx.input.data?.[0] ?? {}, ['amountAED']);
		},
	],
	// Agents only ever see wrongful debits from their own shifts; admins see everything.
	beforeList: [
		async (ctx: HookContext) => {
			if (ctx.user?.role === 'admin') return;
			ctx.input.params = ctx.input.params ?? {};
			ctx.input.params.filters = { ...ctx.input.params.filters, agent: ctx.user?.id };
		},
	],
};
