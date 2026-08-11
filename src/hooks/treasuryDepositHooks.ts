import { t, type ResourceHooks, type HookContext } from '@maxal_studio/kratosjs';
import { coerceNumericFields } from '../utils/coerceNumeric';
import { isSuperAdmin } from '../utils/roles';

export const treasuryDepositHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			if (!isSuperAdmin(ctx.user?.role)) {
				throw new Error(t('app:treasuryDeposits.errors.createSuperAdminOnly'));
			}
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['amountAED']);
			data.createdBy = ctx.user?.id;
		},
	],
	beforeUpdate: [
		async (ctx: HookContext) => {
			if (!isSuperAdmin(ctx.user?.role)) {
				throw new Error(t('app:treasuryDeposits.errors.updateSuperAdminOnly'));
			}
			const data = ctx.input.data?.[0];
			if (!data) return;
			coerceNumericFields(data, ['amountAED']);
			// Who recorded it never changes on edit.
			delete data.createdBy;
		},
	],
};
