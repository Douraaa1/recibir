# Custom actions

Actions have two halves that link by **name**:

1. **UI builders** — `Action.make(name)` / `BulkAction.make(name)` — placed in `table().actions()` / `.bulkActions()` / `.headerActions()`.
2. **Handlers** — a `Record<string, ActionHandler>` returned from the resource's `static actions()`, keyed by the same name.

Keep both in `src/actions/` and import them into the resource.

```ts
// src/actions/productActions.ts
import { Action, BulkAction, FormBuilder, TextInput, type Panel } from '@maxal_studio/kratosjs';

type ActionHandler = (data: { records?: any[]; formData?: any }) => Promise<{
	success: boolean;
	message?: string;
	data?: any;
	redirect?: string;
	refreshBadges?: boolean;
}>;
interface ActionResource {
	getPanel(): Panel;
	entity: any;
}

export function productRowActions(): Action[] {
	return [
		// Row action WITH a form (collects input before running)
		Action.make('restock')
			.label('Restock')
			.icon('PackagePlus')
			.form(
				FormBuilder.make().schema([
					TextInput.make('amount').label('Units to add').type('number').required().minValue(1).default(10),
				]),
			),
		// Row action WITH a confirmation dialog (no form)
		Action.make('duplicate')
			.label('Duplicate')
			.icon('Copy')
			.requiresConfirmation()
			.modalHeading('Duplicate product')
			.modalDescription('Create a 0-stock copy of this product?'),
	];
}

export function productBulkActions(): BulkAction[] {
	return [
		BulkAction.make('bulkDiscount')
			.label('Apply discount')
			.icon('Percent')
			.form(
				FormBuilder.make().schema([
					TextInput.make('percent').label('Discount %').type('number').required().minValue(1).maxValue(90),
				]),
			),
		BulkAction.make('bulkOutOfStock').label('Mark out of stock').icon('Ban').color('danger').requiresConfirmation(),
	];
}

export function productHeaderActions(): Action[] {
	// Header action: operates on the whole table, no selection
	return [
		Action.make('restockLowStock')
			.label('Restock low stock')
			.icon('TrendingUp')
			.form(
				FormBuilder.make().schema([
					TextInput.make('threshold').label('At or below').type('number').required().default(10),
					TextInput.make('amount').label('Add units').type('number').required().default(25),
				]),
			),
	];
}

export function productActionHandlers(resource: ActionResource): Record<string, ActionHandler> {
	return {
		restock: async ({ records = [], formData = {} }) => {
			const em = resource.getPanel().getEm().fork();
			const id = records[0]?.id;
			const current = await em.findOne(resource.entity, { id });
			const next = (current?.quantity ?? 0) + Number(formData.amount ?? 0);
			await em.nativeUpdate(resource.entity, { id }, { quantity: next });
			return { success: true, message: `Restocked to ${next}.`, refreshBadges: true };
		},
		duplicate: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			const src = await em.findOne(resource.entity, { id: records[0]?.id });
			const copy = em.create(resource.entity, {
				...src,
				id: undefined,
				name: `${src.name} (copy)`,
				quantity: 0,
			} as any);
			await em.persistAndFlush(copy);
			return { success: true, message: 'Duplicated.', refreshBadges: true };
		},
		bulkDiscount: async ({ records = [], formData = {} }) => {
			const em = resource.getPanel().getEm().fork();
			const ids = records.map(r => r.id);
			const pct = Number(formData.percent ?? 0);
			const rows = await em.find(resource.entity, { id: { $in: ids } });
			for (const r of rows) r.price = Math.round(r.price * (1 - pct / 100) * 100) / 100;
			await em.flush();
			return { success: true, message: `${rows.length} discounted ${pct}%.` };
		},
		bulkOutOfStock: async ({ records = [] }) => {
			const em = resource.getPanel().getEm().fork();
			await em.nativeUpdate(resource.entity, { id: { $in: records.map(r => r.id) } }, { quantity: 0 });
			return { success: true, message: `${records.length} marked out of stock.`, refreshBadges: true };
		},
		restockLowStock: async ({ formData = {} }) => {
			const em = resource.getPanel().getEm().fork();
			const affected = await em.nativeUpdate(
				resource.entity,
				{ quantity: { $lte: Number(formData.threshold) } },
				{ quantity: Number(formData.amount) },
			);
			return { success: true, message: `Restocked ${affected} products.`, refreshBadges: true };
		},
	};
}
```

Wire into the resource:

```ts
static table() {
	return TableBuilder.make()
		.columns([...])
		.actions(productRowActions())
		.bulkActions(productBulkActions())
		.headerActions(productHeaderActions());
}
static actions(): Record<string, ActionHandler> { return productActionHandlers(this); }
```

`this` satisfies the structural `ActionResource` (`{ getPanel(), entity }`), so the handlers can reach the panel/EM and the resource's entity.

## Builder methods

`.label(text)`, `.icon(lucideName)`, `.color(color)`, `.form(FormBuilder)`, `.requiresConfirmation()`, `.modalHeading(text)`, `.modalDescription(text)`. `BulkAction` adds `.deselectRecordsAfterCompletion(bool)`.

- **Form action** → the client shows the form, then calls the handler with `formData`.
- **Confirmation action** → `.requiresConfirmation()` + optional `.modalHeading()/.modalDescription()`; no form.
- **Header action** → placed in `.headerActions()`; runs against the whole table, so its handler ignores `records`.

## Handler contract

Signature: `async ({ records, formData }) => result`.

- `records` — the selected row(s) (single-element array for a row action).
- `formData` — values from the action's form, if any.
- Return `{ success, message?, data?, redirect?, refreshBadges? }`. Set `refreshBadges: true` when the mutation changes navigation badge counts (e.g. stock/status), and `redirect: '/path'` to navigate after the action.

Use forked EMs (`resource.getPanel().getEm().fork()`) and `nativeUpdate` / `find` / `create` + `flush`. Validate `formData` in the handler and return `{ success: false, message }` on bad input.
