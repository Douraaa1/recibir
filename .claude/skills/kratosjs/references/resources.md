# Resources

A resource extends `BaseResource` with static config members and static builder methods. It ties an entity to its admin UI.

```ts
// src/resources/ProductResource.ts
import {
	BaseResource,
	FormBuilder,
	TableBuilder,
	TextInput,
	TextColumn,
	type ActionHandler,
} from '@maxal_studio/kratosjs';
import { Product } from '../entities/Product';

export class ProductResource extends BaseResource {
	static slug = 'products'; // URL segment + API path (required, unique)
	static entity = Product; // the EntitySchema (required)
	static label = 'Product';
	static pluralLabel = 'Products';
	static icon = 'Package'; // Lucide icon name
	static navigationGroup = 'Shop'; // sidebar group heading
	static navigationSort = 1; // order within the group
	static recordTitleAttribute = 'name'; // shown in "Editing {title}" — string OR (record) => string
	static recordFeaturedImageAttribute = 'image'; // media field used as the record thumbnail
	static globallySearchableAttributes = ['name', 'sku', 'slug']; // fields the global search hits

	static form() {
		return FormBuilder.make().schema([TextInput.make('name').required().min(2).max(120)]);
	}

	static table() {
		return TableBuilder.make().columns([TextColumn.make('name').searchable().sortable()]);
	}

	// Optional:
	// static relations(): RelationConfig[] { ... }              // → references/relations.md
	// static widgets(): Widget[] { ... }                        // → references/widgets.md
	// static hooks(): ResourceHooks { return productHooks; }    // → references/hooks.md
	// static actions(): Record<string, ActionHandler> { ... }   // → references/actions.md
}
```

Register it on the panel: `.resources([ProductResource])`.

## Static config members

| Member                                            | Type                           | Purpose                                                                 |
| ------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| `slug`                                            | `string`                       | **Required.** Unique URL/API segment.                                   |
| `entity`                                          | `EntitySchema`                 | **Required.** The MikroORM entity.                                      |
| `label` / `pluralLabel`                           | `string`                       | Display names.                                                          |
| `icon`                                            | `string`                       | Lucide icon name (e.g. `'Package'`, `'Users'`).                         |
| `navigationGroup`                                 | `string`                       | Sidebar group heading.                                                  |
| `navigationSort`                                  | `number`                       | Order within the group.                                                 |
| `recordTitleAttribute`                            | `string \| (record) => string` | Title in edit/view modals. A function may return HTML.                  |
| `recordFeaturedImageAttribute`                    | `string`                       | Media field used as the record thumbnail.                               |
| `globallySearchableAttributes`                    | `string[]`                     | Fields included in global search.                                       |
| `hidden`                                          | `boolean`                      | Hide from the sidebar (still routable — used for join/child resources). |
| `excluded`                                        | `boolean`                      | Exclude the resource entirely.                                          |
| `canCreate` / `canEdit` / `canDelete` / `canView` | `boolean`                      | Toggle the built-in standard actions (all default `true`).              |

> **Note:** the current search config member is `globallySearchableAttributes`, not `searchableColumns`. Per-column search is enabled with `.searchable()` on a `TextColumn` (see `references/tables.md`).

## Static builder methods

| Method        | Returns                         | Reference                 |
| ------------- | ------------------------------- | ------------------------- |
| `form()`      | `FormBuilder`                   | `references/forms.md`     |
| `table()`     | `TableBuilder`                  | `references/tables.md`    |
| `relations()` | `RelationConfig[]`              | `references/relations.md` |
| `widgets()`   | `Widget[]`                      | `references/widgets.md`   |
| `hooks()`     | `ResourceHooks`                 | `references/hooks.md`     |
| `actions()`   | `Record<string, ActionHandler>` | `references/actions.md`   |

## Standard (built-in) actions

View, edit, delete, and the create header button are rendered automatically for every resource — do **not** add them to `table().actions()`. Control them with the `canView` / `canEdit` / `canDelete` / `canCreate` static flags (default `true`):

```ts
export class LogResource extends BaseResource {
	static canCreate = false;
	static canEdit = false;
	static canDelete = false; // records remain viewable
}
```

`table().actions([...])` / `.bulkActions([...])` / `.headerActions([...])` are only for your **custom** actions.

## Accessing the panel / EM inside a resource

Static methods can reach the panel with `this.getPanel()`, and an EntityManager with `this.getPanel().getEm().fork()`. This is how table cells resolve media (`this.getPanel().resolveMediaUrl(...)`) and how action handlers query the database.
