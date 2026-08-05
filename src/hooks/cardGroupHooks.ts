import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { isAdminLike } from '../utils/roles';

// Card groups (and their agent assignment) are admin/superviseur territory —
// the nav entry is already hidden from everyone else (see index.ts), this is
// the server-side backstop (never trust the client).
function assertAdminLike(ctx: HookContext) {
	if (!isAdminLike(ctx.user?.role)) {
		throw new Error('Seuls SuperAdmin et adminGN peuvent gérer les groupes de cartes.');
	}
}

export const cardGroupHooks: ResourceHooks = {
	beforeCreate: [async (ctx: HookContext) => assertAdminLike(ctx)],
	beforeUpdate: [async (ctx: HookContext) => assertAdminLike(ctx)],
	beforeDelete: [async (ctx: HookContext) => assertAdminLike(ctx)],
};
