# Identity cells (image + name)

A common pattern: show a relation as a small avatar/thumbnail plus a name and sub-line, linking to the record. Implement it as an **async HTML cell formatter** in `src/cells/` and use it from a column with `.stripHtml(false)`.

```ts
// src/cells/index.ts
import type { Panel } from '@maxal_studio/kratosjs';

function escapeHtml(s: string): string {
	return String(s ?? '').replace(
		/[&<>"']/g,
		c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
	);
}

async function mediaBox(panel: Panel, media: any, rounded = false): Promise<string> {
	const url = media ? panel.resolveMediaUrl(media) : '';
	const radius = rounded ? '50%' : '6px';
	const bg = url ? `background-image:url('${escapeHtml(url)}');background-size:cover;` : 'background:#e5e7eb;';
	return `<div style="width:36px;height:36px;border-radius:${radius};${bg}flex:0 0 auto;"></div>`;
}

function card(box: string, title: string, sub: string): string {
	return `<div style="display:flex;align-items:center;gap:10px;">
		${box}
		<div style="min-width:0;">
			<div style="font-weight:600;">${title}</div>
			<div style="color:#6b7280;font-size:12px;">${sub}</div>
		</div>
	</div>`;
}

const EMPTY = `<span style="color:#9ca3af;">—</span>`;

export async function productCell(panel: Panel, product: any): Promise<string> {
	if (!product) return EMPTY;
	const box = await mediaBox(panel, product.image);
	return card(box, escapeHtml(product.name), escapeHtml(product.sku ?? ''));
}

export async function customerCell(panel: Panel, customer: any): Promise<string> {
	if (!customer) return EMPTY;
	const box = await mediaBox(panel, customer.image, true); // rounded avatar
	return card(box, escapeHtml(customer.name), escapeHtml(customer.email ?? ''));
}
```

Use it from the table (see `references/tables.md`):

```ts
TextColumn.make('name')
	.formatStateUsing(async (_, row) => productCell(this.getPanel(), row))
	.stripHtml(false)
	.searchable();

// For a RELATION identity cell, name the column differently from the field and deeplink:
TextColumn.make('customerCard')
	.formatStateUsing(async (_, row) => customerCell(this.getPanel(), row.customer))
	.stripHtml(false)
	.deeplink({ resource: 'customers', id: (_, row) => String(row.customer?.id ?? '') });
```

## Rules

- **Always HTML-escape** interpolated data (`escapeHtml`) — cell HTML is rendered raw.
- **Resolve media through the panel**: `panel.resolveMediaUrl(media)` returns the stored URL (or derives one from the media key). Don't hand-build URLs.
- Use **inline styles**, not Tailwind classes — cell HTML isn't processed by the client's Tailwind build.
- **Project the fields you read.** If the cell reads `row.image`, add `.extraFields(['image'])`; if it reads `row.customer`, add `.populate([{ path: 'customer' }])`. Remember: `extraFields` before `populate` (Gotcha #1).
- **Name a relation column differently from the relation field** (`customerCard`, not `customer`) so the returned HTML doesn't overwrite the raw `row.customer` object the deeplink `id` needs (Gotcha #2).
