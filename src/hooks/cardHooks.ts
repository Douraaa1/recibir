import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';
import { Card } from '../entities/Card';
import { isAdminLike } from '../utils/roles';

// Backstops the entity-level `unique: true` on `identifier` with a readable
// error instead of a raw driver constraint violation.
async function assertIdentifierAvailable(em: any, identifier: string, excludeId?: string) {
	const where: any = excludeId === undefined ? { identifier } : { identifier, id: { $ne: excludeId } };
	const existing = await em.findOne(Card, where);
	if (existing) {
		throw new Error('Ce numéro de carte est déjà utilisé par une autre carte.');
	}
}

function assertAdminLike(ctx: HookContext) {
	if (!isAdminLike(ctx.user?.role)) {
		throw new Error('Seuls SuperAdmin et adminGN peuvent gérer les cartes.');
	}
}

export const cardHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			assertAdminLike(ctx);
			const em = (ctx.adapter as any).getEm().fork();
			for (const data of ctx.input.data ?? []) {
				if (data?.identifier) await assertIdentifierAvailable(em, data.identifier);
			}
		},
	],
	beforeUpdate: [
		async (ctx: HookContext) => {
			assertAdminLike(ctx);
			const em = (ctx.adapter as any).getEm().fork();
			const ids = ctx.input.ids ?? [];
			for (const [i, data] of (ctx.input.data ?? []).entries()) {
				if (data?.identifier) await assertIdentifierAvailable(em, data.identifier, ids[i]);
			}
		},
	],
	beforeDelete: [async (ctx: HookContext) => assertAdminLike(ctx)],
};
