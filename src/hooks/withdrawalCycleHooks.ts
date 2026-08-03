import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { Shift } from '../entities/Shift';
import { ExchangeRate } from '../entities/ExchangeRate';
import { coerceNumericFields } from '../utils/coerceNumeric';

async function computeExpectedAED(em: any, sentGNF: number): Promise<{ expectedAED: number; rate: number }> {
	const aed = await em.findOne(ExchangeRate, { code: 'AED' });
	const rate = aed?.rateToGNF ?? 0;
	// rateToGNF is "1 AED = X GNF" — invert to convert GNF sent into AED expected.
	const expectedAED = rate > 0 ? Math.round((sentGNF / rate) * 100) / 100 : 0;
	return { expectedAED, rate };
}

export const withdrawalCycleHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			if (ctx.user?.role !== 'admin') {
				throw new Error("Seul l'administrateur peut créer un cycle de retrait.");
			}
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['sentGNF']);

			const em = (ctx.adapter as any).getEm().fork();
			const { expectedAED, rate } = await computeExpectedAED(em, Number(data.sentGNF ?? 0));
			data.expectedAED = expectedAED;
			data.exchangeRateUsed = rate;
		},
	],
	// Runs after the form-schema required-field check (which needs `agent`
	// still present) but before the adapter persists the record (which would
	// choke on the unknown entity property) — stash it for afterCreate, strip.
	afterValidate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			if (!data) return;
			(ctx as any).__agent = data.agent;
			delete data.agent;
		},
	],
	afterCreate: [
		async (ctx: HookContext) => {
			const cycle = ctx.output.records?.[0];
			if (!cycle) return;
			const em = (ctx.adapter as any).getEm().fork();
			const agent = (ctx as any).__agent;

			// Same agent runs both shifts by default — admin can still reassign
			// shift 2 individually afterwards from the Shift itself if needed.
			const shift1 = em.create(Shift, { cycle: cycle.id, agent, shiftNumber: 1, date: cycle.date, withdrawnAED: 0 });
			const shift2 = em.create(Shift, { cycle: cycle.id, agent, shiftNumber: 2, date: cycle.date, withdrawnAED: 0 });
			em.persist([shift1, shift2]);
			await em.flush();
		},
	],
	beforeUpdate: [
		async (ctx: HookContext) => {
			if (ctx.user?.role !== 'admin') {
				throw new Error("Seul l'administrateur peut modifier un cycle de retrait.");
			}
			const data = ctx.input.data?.[0];
			if (!data) return;
			// Editing a cycle after its shifts exist is a correction path only —
			// re-assigning agents post-creation happens on the Shift itself.
			delete data.agent;
			coerceNumericFields(data, ['sentGNF']);
			if (data.sentGNF !== undefined) {
				const em = (ctx.adapter as any).getEm().fork();
				const { expectedAED, rate } = await computeExpectedAED(em, Number(data.sentGNF));
				data.expectedAED = expectedAED;
				data.exchangeRateUsed = rate;
			}
		},
	],
};
