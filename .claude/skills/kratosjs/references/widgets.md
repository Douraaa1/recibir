# Widgets

Widgets show aggregated data. A resource declares them via `static widgets(): Widget[]`. Each widget has a **globally unique name** and a `.render(async (em, entity) => ...)` that queries the database.

```ts
import { StatsWidget, ChartWidget, type Widget } from '@maxal_studio/kratosjs';

static widgets(): Widget[] {
	return [
		StatsWidget.make('shop.totalProducts')
			.label('Total products')
			.icon('Package')
			.render(async (em, entity) => em.count(entity, {})),

		StatsWidget.make('shop.lowStock')
			.label('Low stock')
			.icon('TriangleAlert')
			.suffix('items')
			.render(async (em, entity) => em.count(entity, { quantity: { $lte: 10 } } as any)),

		StatsWidget.make('shop.revenue')
			.label('Revenue')
			.currency('USD')
			.precision(2)
			.render(async em => {
				const orders = await em.find(Order, {});
				return orders.reduce((sum, o) => sum + o.total, 0);
			}),

		ChartWidget.make('shop.ordersByStatus')
			.label('Orders by status')
			.type('pie')
			.showLegend()
			.render(async em => {
				const orders = await em.find(Order, {});
				const counts: Record<string, number> = {};
				for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;
				return Object.entries(counts).map(([label, value]) => ({ label, value }));
			}),
	];
}
```

## StatsWidget

`StatsWidget.make(name)` → `.label(text)`, `.icon(lucideName)`, `.color(color)`, `.prefix(text)`, `.suffix(text)`, `.currency(code)`, `.precision(n)`, `.format(fn)`, `.render(async (em, entity) => number)`. The render returns a scalar.

## ChartWidget

`ChartWidget.make(name)` → `.label(text)`, `.icon(lucideName)`, `.color(color)`, `.type('pie' | 'bar' | 'line')`, `.showLegend()`, `.render(async (em, entity) => ChartDataPoint[])`. The render returns `{ label: string; value: number }[]`.

`render` receives `(em, entity)` — the MikroORM `EntityManager` and the resource's entity schema. Query other entities directly (`em.find(Order, ...)`).

## Where widgets appear

Widgets defined on a resource are reused on **pages** (dashboards) by name — the page resolves each `Widget` from the resource's `widgets()` by its `getName()`, so a page and a resource never drift. See `references/pages.md`.

## Custom widgets

For a bespoke visualization, create a custom widget class on the backend (extending the widget base, returning serialized data) and a matching React component registered on the client, then reference it by name. This mirrors the custom-block / custom-field registration flow in `references/plugins.md`.
