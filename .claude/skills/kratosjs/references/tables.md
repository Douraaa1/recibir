# Tables

`table()` returns `TableBuilder.make().columns([ ...columns ])` plus optional actions, filters, and query settings.

```ts
import { TableBuilder, TextColumn, ImageColumn, ToggleColumn } from '@maxal_studio/kratosjs';

static table() {
	return TableBuilder.make()
		.columns([
			TextColumn.make('name').searchable().sortable(),
			TextColumn.make('price').money('USD').sortable(),
			TextColumn.make('status').badge(),
			ToggleColumn.make('active').sortable(),
			TextColumn.make('createdAt').dateTime(),
		])
		.searchable()
		.paginate(10)
		.defaultSort('createdAt', 'desc');
}
```

## Column types

`TextColumn`, `IconColumn`, `ImageColumn`, `VideoColumn`, `MediaColumn`, `ColorColumn`, `TagsColumn`, `BadgeColumn`, `ViewColumn`, `ToggleColumn`, `CheckboxColumn`, `SelectColumn`, `TextInputColumn`.

> There is **no** `BooleanColumn` — use `ToggleColumn` or `CheckboxColumn`. `ImageColumn` supports `.circular()`.

## Formatting methods (shared)

- `.formatStateUsing((value, row) => ...)` — transform the cell. **May be async.** Return a string/number, or HTML (with `.stripHtml(false)`).
- `.stripHtml(false)` — render the returned string as HTML (default strips tags). Required for `references/cells.md` identity cells.
- `.money(currency = 'USD', divideBy?)` — `1234.56` → `$1,234.56`.
- `.date(format?)` / `.dateTime(format?)` — format dates.
- `.badge(condition?)` — render the value in a colored badge.
- `.color(color)` — colored swatch/value.
- `.sortable(cond?)` / `.searchable(cond?)` — enable sorting / per-column search.
- `.deeplink({ resource | page, id, edit? })` — make the cell link to a record (see below).
- `TextColumn` extras: `.limit(n)`, `.limitedListExpandable()`, `.weight(...)`, `.lineClamp(n)`, `.rowIndex()`.

## Deeplinks

```ts
TextColumn.make('brandCard')
	.formatStateUsing(async (_, row) => brandCell(this.getPanel(), row.brand))
	.stripHtml(false)
	.deeplink({ resource: 'brands', id: (_, row) => String(row.brand?.id ?? '') });
```

`DeeplinkConfig`: `{ resource?: slug, page?: slug, id?: string | (value, row) => string, edit?: boolean }`. `resource` and `page` are mutually exclusive; for a resource, `id` is required. If `id` resolves to a falsy value, the link falls back to the resource **list** — a common source of the "goes to the list, not the record" bug (see `references/gotchas.md`).

## Projecting extra fields — `extraFields` + `populate`

By default only fields with a column are loaded onto each row. To use raw fields (e.g. a media `image` for a cell) or relation objects (for deeplinks), project them:

```ts
.extraFields(['image'])            // MUST come first — extraFields REPLACES the projection list
.populate([{ path: 'brand' }, { path: 'category' }])  // populate APPENDS relation paths
```

**Order matters:** call `.extraFields()` before `.populate()`. `extraFields()` replaces the internal projection list; `populate()` appends to it. Reversed, `extraFields` wipes the populated relations. (Gotcha #1.)

## Actions on a table

```ts
.actions(productRowActions())         // per-row custom actions
.bulkActions(productBulkActions())    // operate on selected rows
.headerActions(productHeaderActions())// whole-table actions (no selection)
```

See `references/actions.md`. Do not add view/edit/delete here — they're built in.

## Query & layout methods

`.searchable()`, `.paginate(n)`, `.paginationPageOptions([...])`, `.defaultSort(field, 'asc'|'desc')`, `.filters([...])` (→ `references/filters.md`), `.groupBy(field)` / `.grouping(...)`, `.metrics([...])`, `.tabs([...])`, `.poll(ms)`, `.striped()`, `.exportable()`, `.queryBuilder(...)`, `.defaultLayout(...)`, `.gridColumns(...)`, `.showColumnSettings()`.
