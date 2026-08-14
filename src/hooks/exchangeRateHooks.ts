import { t, type ResourceHooks, type HookContext } from '@maxal_studio/kratosjs';
import { ExchangeRate } from '../entities/ExchangeRate';
import { coerceNumericFields } from '../utils/coerceNumeric';
import { isAdminLike, isSuperAdmin } from '../utils/roles';

// The UAE Dirham is pegged to the US Dollar at roughly this rate —
// essentially fixed, unlike GNF/USD which moves often. AED's own rateToGNF
// is therefore derived from USD's rateToGNF ÷ this constant by default (the
// form locks the field for everyone), so editing USD is normally the only
// thing an admin has to do to keep both currencies current. SuperAdmin can
// still override AED's rate directly when needed (see the beforeCreate/
// beforeUpdate guards below) — update this constant instead if the peg
// itself changes for good.
const AED_PER_USD = 3.67;

function assertAdminLike(ctx: HookContext) {
	if (!isAdminLike(ctx.user?.role)) {
		throw new Error(t('app:exchangeRates.errors.adminLikeOnly'));
	}
}

function round4(value: number): number {
	return Math.round(value * 10000) / 10000;
}

async function derivedAedRate(em: any): Promise<number> {
	const usd = await em.findOne(ExchangeRate, { code: 'USD' });
	return round4((usd?.rateToGNF ?? 0) / AED_PER_USD);
}

export const exchangeRateHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			assertAdminLike(ctx);
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['rateToGNF']);
			if (data.code === 'GNF') data.rateToGNF = 1;
			// SuperAdmin creating an AED row directly (rare — normally seeded
			// once) keeps whatever rate they submitted; anyone else gets the
			// derived value enforced, matching the locked form field.
			if (data.code === 'AED' && !isSuperAdmin(ctx.user?.role)) {
				const em = (ctx.adapter as any).getEm().fork();
				data.rateToGNF = await derivedAedRate(em);
			}
		},
	],
	// GNF is the pivot currency — it must stay at 1. AED is pegged to USD by
	// default; the form only unlocks that field for the literal SuperAdmin,
	// so anyone else's edit (or a direct API call bypassing the disabled UI)
	// still gets the derived value enforced here as a backstop.
	beforeUpdate: [
		async (ctx: HookContext) => {
			assertAdminLike(ctx);
			const data = ctx.input.data?.[0];
			const id = ctx.input.ids?.[0];
			if (!data || !id) return;
			coerceNumericFields(data, ['rateToGNF']);
			const em = (ctx.adapter as any).getEm().fork();
			const existing = await em.findOne(ExchangeRate, { id });
			if (existing?.code === 'GNF') {
				data.rateToGNF = 1;
			} else if (existing?.code === 'AED' && !isSuperAdmin(ctx.user?.role)) {
				data.rateToGNF = await derivedAedRate(em);
			}
		},
	],
	// USD is the one rate an admin actually adjusts (GNF/USD moves often) —
	// whenever it changes, cascade the fixed peg onto AED so the two never
	// fall out of sync.
	afterUpdate: [
		async (ctx: HookContext) => {
			const updated = ctx.output.records?.[0];
			if (!updated || updated.code !== 'USD') return;
			const em = (ctx.adapter as any).getEm().fork();
			const aed = await em.findOne(ExchangeRate, { code: 'AED' });
			if (aed) {
				aed.rateToGNF = round4(updated.rateToGNF / AED_PER_USD);
				await em.flush();
			}
		},
	],
	beforeDelete: [
		async (ctx: HookContext) => {
			assertAdminLike(ctx);
			const em = (ctx.adapter as any).getEm().fork();
			const ids = ctx.input.ids ?? [];
			const rows = await em.find(ExchangeRate, { id: { $in: ids } } as any);
			if (rows.some((r: any) => r.code === 'GNF')) {
				throw new Error(t('app:exchangeRates.errors.cannotDeleteBase'));
			}
			// USD/AED are load-bearing for the peg derivation above (and for the
			// AED converter / treasury conversions elsewhere in the app) — not
			// safe to remove now that only these three currencies exist.
			if (rows.some((r: any) => r.code === 'USD' || r.code === 'AED')) {
				throw new Error(t('app:exchangeRates.errors.cannotDeleteCore'));
			}
		},
	],
};
