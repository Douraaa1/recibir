import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { ExchangeRate } from '../entities/ExchangeRate';
import { coerceNumericFields } from '../utils/coerceNumeric';

export const exchangeRateHooks: ResourceHooks = {
	beforeCreate: [async (ctx: HookContext) => coerceNumericFields(ctx.input.data?.[0] ?? {}, ['rateToGNF'])],
	// GNF is the pivot currency every rate is quoted against — it must stay at 1.
	beforeUpdate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			const id = ctx.input.ids?.[0];
			if (!data || !id) return;
			coerceNumericFields(data, ['rateToGNF']);
			const em = (ctx.adapter as any).getEm().fork();
			const existing = await em.findOne(ExchangeRate, { id });
			if (existing?.code === 'GNF') {
				data.rateToGNF = 1;
			}
		},
	],
	beforeDelete: [
		async (ctx: HookContext) => {
			const em = (ctx.adapter as any).getEm().fork();
			const ids = ctx.input.ids ?? [];
			const rows = await em.find(ExchangeRate, { id: { $in: ids } } as any);
			if (rows.some((r: any) => r.code === 'GNF')) {
				throw new Error('La devise de base (GNF) ne peut pas être supprimée.');
			}
		},
	],
};
