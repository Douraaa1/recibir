import { t, type ResourceHooks, type HookContext } from '@maxal_studio/kratosjs';
import { ClientPayment } from '../entities/ClientPayment';
import { coerceNumericFields } from '../utils/coerceNumeric';
import { isAdminLike, seesTeamWideData } from '../utils/roles';

const CODE_GENERATION_RETRIES = 3;

async function generateUniqueCode(em: any): Promise<string> {
	for (let attempt = 0; attempt < CODE_GENERATION_RETRIES; attempt++) {
		const count = await em.count(ClientPayment, {});
		const code = `env-${String(count + 1 + attempt).padStart(4, '0')}`;
		const existing = await em.findOne(ClientPayment, { code });
		if (!existing) return code;
	}
	// Extremely unlikely (would need concurrent creates on every retry) — a
	// timestamp suffix guarantees uniqueness even in that case.
	return `env-${Date.now()}`;
}

export const clientPaymentHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			// AdminGN initiates payments now — chef_equipe's role moved to
			// validating/refusing them (see clientPaymentActions.ts), not
			// creating them. Mirrors withdrawalCycleHooks' exact rule.
			if (!isAdminLike(ctx.user?.role)) {
				throw new Error(t('app:clientPayments.errors.createAdminLikeOnly'));
			}
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['amountAED']);
			data.agent = ctx.user?.id;
			data.status = 'pending';

			const em = (ctx.adapter as any).getEm().fork();
			data.code = await generateUniqueCode(em);
		},
	],
	// Tiered by status: nothing's been debited yet while pending, so the
	// creator-equivalent role (isAdminLike) can still fix/cancel it; once
	// AdminEAU validates it (treasury debited), only SuperAdmin exactly can
	// touch it; refused/cancelled are terminal for everyone.
	beforeUpdate: [
		async (ctx: HookContext) => {
			const id = ctx.input.ids?.[0];
			const data = ctx.input.data?.[0];
			if (!id || !data) return;

			const em = (ctx.adapter as any).getEm().fork();
			const existing = await em.findOne(ClientPayment, { id });
			if (!existing) throw new Error(t('app:clientPayments.errors.notFound'));

			if (existing.status === 'pending') {
				if (!isAdminLike(ctx.user?.role)) {
					throw new Error(t('app:clientPayments.errors.updatePendingAdminLikeOnly'));
				}
			} else if (existing.status === 'validated') {
				if (ctx.user?.role !== 'admin') {
					throw new Error(t('app:clientPayments.errors.updateValidatedAdminOnly'));
				}
			} else {
				throw new Error(t('app:clientPayments.errors.updateTerminal'));
			}

			coerceNumericFields(data, ['amountAED']);
			// Status/code/agent are only ever changed via clientPaymentActions.ts
			// (validate/refuse/cancel) or beforeCreate, never through a plain edit.
			delete data.status;
			delete data.code;
			delete data.agent;
		},
	],
	// A plain agent only ever sees their own payments (though in practice they
	// can't create any); admin/superviseur/chef_equipe see everyone's.
	beforeList: [
		async (ctx: HookContext) => {
			if (seesTeamWideData(ctx.user?.role)) return;
			ctx.input.params = ctx.input.params ?? {};
			ctx.input.params.filters = { ...ctx.input.params.filters, agent: ctx.user?.id };
		},
	],
};
