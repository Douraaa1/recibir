# Hooks

Lifecycle hooks let you run code around resource operations. A resource exposes them via `static hooks(): ResourceHooks`. Keep the hook object in `src/hooks/`.

```ts
// src/hooks/orderHooks.ts
import type { ResourceHooks, HookContext } from '@maxal_studio/kratosjs';

export const orderHooks: ResourceHooks = {
	beforeCreate: [
		async (ctx: HookContext) => {
			const data = ctx.input.data?.[0];
			if (data && !data.orderNumber) {
				data.orderNumber = `ORD-${Date.now()}`;
			}
		},
	],
};
```

```ts
// in the resource
static hooks(): ResourceHooks { return orderHooks; }
```

## Available hooks

Each is an **array of handlers** `(ctx: HookContext) => void | Promise<void>`:

`beforeCreate` / `afterCreate`, `beforeUpdate` / `afterUpdate`, `beforeDelete` / `afterDelete`, `beforeList` / `afterList`, `beforeListRelated` / `afterListRelated`, `beforeFindById` / `afterFindById`, `beforeValidate` / `afterValidate`, `beforeAction` / `afterAction`, and `onError`.

## `HookContext`

```ts
{
	resourceClass,           // the resource being operated on
	adapter,                 // DataAdapter — get an EM with (ctx.adapter as any).getEm().fork()
	operation,               // 'create' | 'update' | 'delete' | 'list' | 'listRelated' | 'findById' | 'action'
	input: {
		data?: any[],          // create/update payload (ALWAYS an array)
		ids?: string[],        // update/delete/findById target ids (ALWAYS an array)
		params?: QueryParams,  // list query params
	},
	output: {
		records: any[],        // results (after* hooks); for delete this holds ids only
		previous?: any[],      // prior state (updates)
		action?: any,          // result returned by a custom action handler
	},
	user?,                    // authenticated user, when available
	http?,                    // { request } when called from a route
}
```

- **`before*`** hooks mutate `ctx.input` (e.g. set defaults, normalize data).
- **`after*`** hooks read/modify `ctx.output.records`.
- **Get an EM inside a hook**: `const em = (ctx.adapter as any).getEm().fork();`

## Delete recompute pattern

On delete, `ctx.output.records` contains only ids — the deleted rows are gone. To act on data derived from them (e.g. recompute a parent's total), capture what you need in `beforeDelete` and consume it in `afterDelete`:

```ts
export const orderItemHooks: ResourceHooks = {
	beforeDelete: [
		async ctx => {
			const em = (ctx.adapter as any).getEm().fork();
			const items = await em.find(OrderItem, { id: { $in: ctx.input.ids ?? [] } }, { populate: ['order'] });
			(ctx as any).__orderIds = [...new Set(items.map(i => i.order?.id).filter(Boolean))];
		},
	],
	afterDelete: [
		async ctx => {
			const em = (ctx.adapter as any).getEm().fork();
			for (const orderId of (ctx as any).__orderIds ?? []) {
				await recomputeOrderTotal(em, orderId);
			}
		},
	],
	afterCreate: [
		/* recompute on write */
	],
	afterUpdate: [
		/* recompute on write */
	],
};
```

Stash intermediate data on the shared `ctx` object (`(ctx as any).__foo`) to pass it between the before/after phases of the same operation.
