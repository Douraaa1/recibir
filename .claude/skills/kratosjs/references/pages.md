# Pages

Pages are custom screens (dashboards, reports) built from **blocks**. A page extends `Page` with static config and an async `blocks()` method. Register it on the panel with `.pages([DashboardPage])`.

```ts
// src/pages/DashboardPage.ts
import { Page, WidgetBlock, type Widget } from '@maxal_studio/kratosjs';
import { ProductResource } from '../resources/ProductResource';
import { OrderResource } from '../resources/OrderResource';

export class DashboardPage extends Page {
	static slug = 'dashboard';
	static label = 'Dashboard';
	static icon = 'LayoutDashboard';
	static navigationSort = -100; // negative sorts it to the top of the sidebar

	static async blocks() {
		// Reuse the widgets declared on resources, resolved by name.
		const all: Widget[] = [...ProductResource.widgets(), ...OrderResource.widgets()];
		const w = (name: string) => all.find(x => x.getName() === name)!;

		return [
			WidgetBlock.make(w('shop.revenue')).columns(3),
			WidgetBlock.make(w('shop.totalProducts')).columns(3),
			WidgetBlock.make(w('shop.lowStock')).columns(3),
			WidgetBlock.make(w('shop.ordersByStatus')).columns(6).title('Orders by status'),
		];
	}
}
```

## Page config

`static slug` (required, URL segment), `static label`, `static icon` (Lucide), `static navigationSort`, `static navigationGroup`. `static async blocks()` returns the block list.

## Blocks

Import from `@maxal_studio/kratosjs`:

| Block                      | Purpose                      |
| -------------------------- | ---------------------------- |
| `WidgetBlock.make(widget)` | Render a stats/chart widget. |
| `TableBlock.make(...)`     | Embed a table.               |
| `FormBlock.make(...)`      | Embed a form.                |
| `TabsBlock.make(...)`      | Group blocks into tabs.      |

Block layout methods: `.columns(n)` (12-column grid width), `.title(text)`, `.subtitle(text)`.

## Reusing resource widgets

The dashboard pattern above resolves widgets from `ResourceX.widgets()` by `getName()`. Define the aggregation once on the resource; the page just lays it out. This keeps dashboard numbers consistent with the resource's own widgets.

## Custom page routes

For pages that need bespoke server logic, register a route on the panel with the admin middleware: `panel.route('get', '/my-endpoint', adminRoute(panel), handler)` — `adminRoute(panel)` prefixes the base path and requires auth, so the admin client can fetch it (same-origin, `credentials: 'include'`). This is how, e.g., a footer countdown polls a `/reseed-info` endpoint. (`panel.registerRoute(...)` is the deprecated alias for this exact call.)
