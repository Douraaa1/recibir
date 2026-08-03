import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { coerceNumericFields } from '../utils/coerceNumeric';

const NUMERIC_FIELDS = ['sessionTimeoutMinutes'];

export const settingHooks: ResourceHooks = {
	beforeUpdate: [async (ctx: HookContext) => coerceNumericFields(ctx.input.data?.[0] ?? {}, NUMERIC_FIELDS)],
};
